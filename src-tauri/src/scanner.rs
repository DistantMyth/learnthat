use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::video::{get_video_duration, is_video_file};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoItem {
    pub name: String,
    pub path: String,
    pub duration_seconds: f64,
    pub formatted_duration: String,
    pub is_watched: bool,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lesson {
    pub id: String,
    pub name: String,
    pub path: String,
    pub done_path: String,
    pub watched_videos: Vec<VideoItem>,
    pub pending_videos: Vec<VideoItem>,
    pub total_videos_count: usize,
    pub watched_videos_count: usize,
    pub pending_videos_count: usize,
    pub watched_duration_seconds: f64,
    pub pending_duration_seconds: f64,
    pub total_duration_seconds: f64,
    pub progress_percent: f64,
    pub formatted_watched_duration: String,
    pub formatted_pending_duration: String,
    pub formatted_total_duration: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub root_path: String,
    pub root_folder_name: String,
    pub lessons: Vec<Lesson>,
    pub total_lessons_count: usize,
    pub completed_lessons_count: usize,
    pub total_videos_count: usize,
    pub watched_videos_count: usize,
    pub pending_videos_count: usize,
    pub total_duration_seconds: f64,
    pub watched_duration_seconds: f64,
    pub pending_duration_seconds: f64,
    pub overall_progress_percent: f64,
    pub formatted_total_duration: String,
    pub formatted_watched_duration: String,
    pub formatted_pending_duration: String,
}

pub fn format_duration(seconds: f64) -> String {
    let total_secs = seconds.round() as u64;
    let hours = total_secs / 3600;
    let minutes = (total_secs % 3600) / 60;
    let secs = total_secs % 60;

    if hours > 0 {
        format!("{}h {:02}m {:02}s", hours, minutes, secs)
    } else if minutes > 0 {
        format!("{}m {:02}s", minutes, secs)
    } else {
        format!("{}s", secs)
    }
}

/// Collect videos in a direct directory (non-recursive for current lesson level, or direct in done)
fn collect_videos_in_dir(dir: &Path, is_watched: bool) -> Vec<VideoItem> {
    let mut videos = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if is_video_file(&path) {
                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
                let duration = get_video_duration(&path).unwrap_or(0.0);

                videos.push(VideoItem {
                    name,
                    path: path.to_string_lossy().to_string(),
                    duration_seconds: duration,
                    formatted_duration: format_duration(duration),
                    is_watched,
                    size_bytes,
                });
            }
        }
    }

    // Sort videos naturally by filename
    videos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    videos
}

/// Recursively find all folders named "done" (case-insensitive) under `root`.
/// Wherever a "done" directory is found, its parent directory is treated as a Lesson.
pub fn scan_learning_directory(root_path: &Path) -> Result<ScanResult, String> {
    if !root_path.exists() {
        return Err(format!("Path does not exist: {:?}", root_path));
    }
    if !root_path.is_dir() {
        return Err(format!("Path is not a directory: {:?}", root_path));
    }

    let root_folder_name = root_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Learning Library")
        .to_string();

    let mut lesson_dirs: Vec<(PathBuf, PathBuf)> = Vec::new();

    for entry in WalkDir::new(root_path)
        .follow_links(false)
        .into_iter()
        .flatten()
    {
        if entry.file_type().is_dir() {
            let folder_name = entry.file_name().to_string_lossy();
            if folder_name.eq_ignore_ascii_case("done") {
                let done_path = entry.path().to_path_buf();
                if let Some(parent) = done_path.parent() {
                    // Parent is the lesson folder
                    lesson_dirs.push((parent.to_path_buf(), done_path));
                }
            }
        }
    }

    // Deduplicate lesson dirs if any
    lesson_dirs.sort_by(|a, b| a.0.cmp(&b.0));
    lesson_dirs.dedup_by(|a, b| a.0 == b.0);

    let mut lessons = Vec::new();
    let mut total_watched_secs = 0.0;
    let mut total_pending_secs = 0.0;
    let mut total_videos = 0;
    let mut watched_videos_count = 0;
    let mut pending_videos_count = 0;
    let mut completed_lessons = 0;

    for (lesson_path, done_path) in lesson_dirs {
        let lesson_name = lesson_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Untitled Lesson")
            .to_string();

        let watched_videos = collect_videos_in_dir(&done_path, true);
        let pending_videos = collect_videos_in_dir(&lesson_path, false);

        let watched_count = watched_videos.len();
        let pending_count = pending_videos.len();
        let lesson_total_videos = watched_count + pending_count;

        let watched_duration: f64 = watched_videos.iter().map(|v| v.duration_seconds).sum();
        let pending_duration: f64 = pending_videos.iter().map(|v| v.duration_seconds).sum();
        let lesson_total_duration = watched_duration + pending_duration;

        let progress = if lesson_total_duration > 0.0 {
            (watched_duration / lesson_total_duration) * 100.0
        } else if lesson_total_videos > 0 {
            (watched_count as f64 / lesson_total_videos as f64) * 100.0
        } else {
            0.0
        };

        if progress >= 99.9 || (pending_count == 0 && watched_count > 0) {
            completed_lessons += 1;
        }

        total_watched_secs += watched_duration;
        total_pending_secs += pending_duration;
        total_videos += lesson_total_videos;
        watched_videos_count += watched_count;
        pending_videos_count += pending_count;

        let id = lesson_path.to_string_lossy().to_string();

        lessons.push(Lesson {
            id,
            name: lesson_name,
            path: lesson_path.to_string_lossy().to_string(),
            done_path: done_path.to_string_lossy().to_string(),
            watched_videos,
            pending_videos,
            total_videos_count: lesson_total_videos,
            watched_videos_count: watched_count,
            pending_videos_count: pending_count,
            watched_duration_seconds: watched_duration,
            pending_duration_seconds: pending_duration,
            total_duration_seconds: lesson_total_duration,
            progress_percent: progress,
            formatted_watched_duration: format_duration(watched_duration),
            formatted_pending_duration: format_duration(pending_duration),
            formatted_total_duration: format_duration(lesson_total_duration),
        });
    }

    // Sort lessons by path/name naturally
    lessons.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));

    let overall_total_secs = total_watched_secs + total_pending_secs;
    let overall_progress = if overall_total_secs > 0.0 {
        (total_watched_secs / overall_total_secs) * 100.0
    } else if total_videos > 0 {
        (watched_videos_count as f64 / total_videos as f64) * 100.0
    } else {
        0.0
    };

    Ok(ScanResult {
        root_path: root_path.to_string_lossy().to_string(),
        root_folder_name,
        total_lessons_count: lessons.len(),
        completed_lessons_count: completed_lessons,
        total_videos_count: total_videos,
        watched_videos_count,
        pending_videos_count,
        total_duration_seconds: overall_total_secs,
        watched_duration_seconds: total_watched_secs,
        pending_duration_seconds: total_pending_secs,
        overall_progress_percent: overall_progress,
        formatted_total_duration: format_duration(overall_total_secs),
        formatted_watched_duration: format_duration(total_watched_secs),
        formatted_pending_duration: format_duration(total_pending_secs),
        lessons,
    })
}

/// Helper function allowing the user to mark a video as watched by moving it into the "done" directory,
/// or mark as unwatched by moving it back to the lesson directory.
pub fn move_video_status(video_path: &Path, mark_as_watched: bool) -> Result<String, String> {
    if !video_path.exists() {
        return Err(format!("Video file does not exist: {:?}", video_path));
    }

    let file_name = video_path
        .file_name()
        .ok_or_else(|| "Invalid file name".to_string())?;

    let parent_dir = video_path
        .parent()
        .ok_or_else(|| "No parent directory".to_string())?;

    let dest_path = if mark_as_watched {
        // Video is currently in lesson dir, move to lesson_dir/done/
        let done_dir = parent_dir.join("done");
        if !done_dir.exists() {
            fs::create_dir_all(&done_dir).map_err(|e| e.to_string())?;
        }
        done_dir.join(file_name)
    } else {
        // Video is currently in done dir, move to parent of done dir (the lesson dir)
        if !parent_dir
            .file_name()
            .map(|n| n.to_string_lossy().eq_ignore_ascii_case("done"))
            .unwrap_or(false)
        {
            return Err("Video is not in a 'done' folder".to_string());
        }
        let lesson_dir = parent_dir
            .parent()
            .ok_or_else(|| "No lesson directory parent".to_string())?;
        lesson_dir.join(file_name)
    };

    fs::rename(video_path, &dest_path).map_err(|e| format!("Failed to move video: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(45.0), "45s");
        assert_eq!(format_duration(90.0), "1m 30s");
        assert_eq!(format_duration(3665.0), "1h 01m 05s");
    }

    #[test]
    fn test_scan_learning_directory() {
        let temp_dir = std::env::temp_dir().join("learnthat_test_scan");
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let course_dir = temp_dir.join("Rust Mastery");
        let lesson1 = course_dir.join("01 - Basics");
        let lesson1_done = lesson1.join("done");
        fs::create_dir_all(&lesson1_done).unwrap();

        // Create dummy video files
        let mut f1 = File::create(lesson1.join("01_intro.mp4")).unwrap();
        writeln!(f1, "dummy video").unwrap();
        let mut f2 = File::create(lesson1_done.join("00_prerequisites.mp4")).unwrap();
        writeln!(f2, "dummy video").unwrap();

        let result = scan_learning_directory(&temp_dir).unwrap();
        assert_eq!(result.total_lessons_count, 1);
        assert_eq!(result.lessons[0].name, "01 - Basics");
        assert_eq!(result.lessons[0].watched_videos_count, 1);
        assert_eq!(result.lessons[0].pending_videos_count, 1);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
