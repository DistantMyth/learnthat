pub mod cache;
pub mod scanner;
pub mod storage;
pub mod video;

use cache::transfer_cache_entry;
use scanner::{move_video_status, scan_learning_directory, ScanResult};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use storage::{load_user_data, save_user_data, AppUserData, ChecklistItem, LessonUserData};
use tauri::State;

static CHECKLIST_COUNTER: AtomicU64 = AtomicU64::new(0);

pub struct AppState {
    pub user_data: Mutex<AppUserData>,
}

#[tauri::command]
fn scan_folder(folder_path: String, state: State<'_, AppState>) -> Result<ScanResult, String> {
    let path = Path::new(&folder_path);
    let result = scan_learning_directory(path)?;

    // Update recent folders
    if let Ok(mut data) = state.user_data.lock() {
        data.active_folder = Some(folder_path.clone());
        if !data.recent_folders.contains(&folder_path) {
            data.recent_folders.insert(0, folder_path);
            if data.recent_folders.len() > 10 {
                data.recent_folders.truncate(10);
            }
        } else {
            // Bring to top
            data.recent_folders.retain(|f| f != &folder_path);
            data.recent_folders.insert(0, folder_path);
        }
        let _ = save_user_data(&data);
    }

    Ok(result)
}

#[tauri::command]
fn toggle_video_watched(
    video_path: String,
    mark_as_watched: bool,
    video_duration: Option<f64>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let v_path = Path::new(&video_path);

    // Fail closed: require active root to be present
    let active_root = {
        let data = state.user_data.lock().map_err(|e| e.to_string())?;
        data.active_folder
            .clone()
            .ok_or_else(|| "No active course folder selected; action forbidden".to_string())?
    };

    let root_p = Path::new(&active_root);
    let canon_v = v_path
        .canonicalize()
        .map_err(|_| "Failed to resolve video path".to_string())?;
    let canon_root = root_p
        .canonicalize()
        .map_err(|_| "Failed to resolve active course path".to_string())?;

    if !canon_v.starts_with(&canon_root) {
        return Err("Security violation: video path does not reside within active course root".to_string());
    }

    let new_dest = move_video_status(v_path, mark_as_watched)?;

    // Update in-memory duration cache to point to the new location instantly
    if let Some(dur) = video_duration {
        transfer_cache_entry(v_path, Path::new(&new_dest), dur);
    }

    Ok(new_dest)
}

#[tauri::command]
fn get_user_data(state: State<'_, AppState>) -> Result<AppUserData, String> {
    state
        .user_data
        .lock()
        .map(|d| d.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_lesson_notes(
    lesson_id: String,
    notes: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut data = state.user_data.lock().map_err(|e| e.to_string())?;
    let entry = data
        .lessons_data
        .entry(lesson_id.clone())
        .or_insert_with(|| LessonUserData {
            lesson_id,
            notes: String::new(),
            checklist: Vec::new(),
            rating: None,
            updated_at: 0,
        });

    entry.notes = notes;
    entry.updated_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    save_user_data(&data)?;
    Ok(())
}

#[tauri::command]
fn add_lesson_checklist_item(
    lesson_id: String,
    text: String,
    state: State<'_, AppState>,
) -> Result<ChecklistItem, String> {
    let mut data = state.user_data.lock().map_err(|e| e.to_string())?;
    let entry = data
        .lessons_data
        .entry(lesson_id.clone())
        .or_insert_with(|| LessonUserData {
            lesson_id,
            notes: String::new(),
            checklist: Vec::new(),
            rating: None,
            updated_at: 0,
        });

    let now_nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);

    let counter = CHECKLIST_COUNTER.fetch_add(1, Ordering::SeqCst);
    let item_id = format!("chk_{}_{}", now_nanos, counter);

    let item = ChecklistItem {
        id: item_id,
        text,
        completed: false,
        created_at: (now_nanos / 1_000_000_000) as u64,
    };

    entry.checklist.push(item.clone());
    entry.updated_at = item.created_at;

    save_user_data(&data)?;
    Ok(item)
}

#[tauri::command]
fn toggle_lesson_checklist_item(
    lesson_id: String,
    item_id: String,
    completed: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut data = state.user_data.lock().map_err(|e| e.to_string())?;
    if let Some(entry) = data.lessons_data.get_mut(&lesson_id) {
        if let Some(item) = entry.checklist.iter_mut().find(|c| c.id == item_id) {
            item.completed = completed;
            entry.updated_at = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            save_user_data(&data)?;
            return Ok(());
        }
        return Err("Checklist item not found".to_string());
    }
    Err("Lesson not found".to_string())
}

#[tauri::command]
fn delete_lesson_checklist_item(
    lesson_id: String,
    item_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut data = state.user_data.lock().map_err(|e| e.to_string())?;
    if let Some(entry) = data.lessons_data.get_mut(&lesson_id) {
        let initial_len = entry.checklist.len();
        entry.checklist.retain(|c| c.id != item_id);
        if entry.checklist.len() < initial_len {
            save_user_data(&data)?;
            return Ok(());
        }
        return Err("Checklist item not found".to_string());
    }
    Err("Lesson not found".to_string())
}

#[tauri::command]
fn open_in_file_manager(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist on disk: {:?}", path));
    }

    // Fail closed: enforce active root boundary for opening files/folders
    let active_root = {
        let data = state.user_data.lock().map_err(|e| e.to_string())?;
        data.active_folder.clone()
    };

    if let Some(root) = active_root {
        let root_p = Path::new(&root);
        if let (Ok(canon_p), Ok(canon_root)) = (p.canonicalize(), root_p.canonicalize()) {
            if !canon_p.starts_with(&canon_root) {
                return Err("Security violation: path is outside active course directory".to_string());
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        let target = if p.is_file() {
            p.parent().unwrap_or(p)
        } else {
            p
        };
        std::process::Command::new("xdg-open")
            .arg(target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_user_data = load_user_data();

    tauri::Builder::default()
        .manage(AppState {
            user_data: Mutex::new(initial_user_data),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_folder,
            toggle_video_watched,
            get_user_data,
            save_lesson_notes,
            add_lesson_checklist_item,
            toggle_lesson_checklist_item,
            delete_lesson_checklist_item,
            open_in_file_manager
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
