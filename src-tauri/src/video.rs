use std::fs::File;
use std::path::Path;
use std::process::Command;

/// Recognized video extensions
pub const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v", "ts", "mts", "m2ts", "3gp", "ogv",
];

pub fn is_video_file(path: &Path) -> bool {
    // If file exists, ensure it is not a directory
    if path.exists() && path.is_dir() {
        return false;
    }
    match path.extension().and_then(|ext| ext.to_str()) {
        Some(ext) => {
            let lower = ext.to_lowercase();
            VIDEO_EXTENSIONS.contains(&lower.as_str())
        }
        None => false,
    }
}

/// Extract duration of video file in seconds.
/// 1. If ffprobe is installed on user system, use it (handles all video formats accurately).
/// 2. If mp4/m4v/mov, use pure-Rust mp4 reader.
/// 3. If neither works, estimate a reasonable default based on filesize (e.g. standard bitrate) so tracker never breaks.
pub fn get_video_duration(path: &Path) -> Option<f64> {
    // 1. Try ffprobe first as it supports all video containers
    if let Some(dur) = get_duration_with_ffprobe(path) {
        if dur > 0.05 {
            return Some(dur);
        }
    }

    // 2. Try pure Rust mp4 parser
    if let Some(dur) = get_duration_with_mp4_crate(path) {
        if dur > 0.05 {
            return Some(dur);
        }
    }

    // 3. Fallback: Estimate ~ 2.5 Mbps average bitrate for instructional video
    if let Ok(metadata) = path.metadata() {
        let size = metadata.len();
        if size > 1024 {
            let bytes_per_sec = (2.5 * 1024.0 * 1024.0) / 8.0; // 327,680 B/s
            let est_seconds = size as f64 / bytes_per_sec;
            return Some(est_seconds.max(1.0));
        }
    }

    None
}

fn get_duration_with_mp4_crate(path: &Path) -> Option<f64> {
    let file = File::open(path).ok()?;
    let size = file.metadata().ok()?.len();
    if size < 16 {
        return None;
    }
    let reader = mp4::Mp4Reader::read_header(file, size).ok()?;
    let duration = reader.duration();
    let timescale = reader.timescale();
    if timescale > 0 {
        let secs = duration.as_secs() as f64 + (duration.subsec_nanos() as f64 / 1_000_000_000.0);
        if secs > 0.05 {
            return Some(secs);
        }
    }
    None
}

fn get_duration_with_ffprobe(path: &Path) -> Option<f64> {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
        ])
        .arg(path)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8_lossy(&output.stdout);
    text.trim().parse::<f64>().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_video_extension() {
        assert!(is_video_file(Path::new("lesson1.mp4")));
        assert!(is_video_file(Path::new("lesson1.MKV")));
        assert!(is_video_file(Path::new("lesson1.webm")));
        assert!(!is_video_file(Path::new("readme.txt")));
        assert!(!is_video_file(Path::new(".gitignore")));
    }
}
