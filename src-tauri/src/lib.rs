pub mod scanner;
pub mod storage;
pub mod video;

use scanner::{move_video_status, scan_learning_directory, ScanResult};
use std::path::Path;
use std::sync::Mutex;
use storage::{load_user_data, save_user_data, AppUserData, ChecklistItem, LessonUserData};
use tauri::State;

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
    folder_to_rescan: Option<String>,
) -> Result<Option<ScanResult>, String> {
    let path = Path::new(&video_path);
    move_video_status(path, mark_as_watched)?;

    // If folder_to_rescan was provided, rescan and return the updated tree
    if let Some(folder) = folder_to_rescan {
        let scan_res = scan_learning_directory(Path::new(&folder))?;
        return Ok(Some(scan_res));
    }

    Ok(None)
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

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let item = ChecklistItem {
        id: format!("chk_{}", now),
        text,
        completed: false,
        created_at: now,
    };

    entry.checklist.push(item.clone());
    entry.updated_at = now;

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
        }
    }
    Ok(())
}

#[tauri::command]
fn delete_lesson_checklist_item(
    lesson_id: String,
    item_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut data = state.user_data.lock().map_err(|e| e.to_string())?;
    if let Some(entry) = data.lessons_data.get_mut(&lesson_id) {
        entry.checklist.retain(|c| c.id != item_id);
        save_user_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn open_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
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
        // Try xdg-open on parent directory if it's a file
        let p = Path::new(&path);
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
