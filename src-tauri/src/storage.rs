use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistItem {
    pub id: String,
    pub text: String,
    pub completed: bool,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LessonUserData {
    pub lesson_id: String,
    pub notes: String,
    pub checklist: Vec<ChecklistItem>,
    pub rating: Option<u8>,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppUserData {
    pub active_folder: Option<String>,
    pub recent_folders: Vec<String>,
    pub lessons_data: std::collections::HashMap<String, LessonUserData>,
    pub custom_study_goal_hours: Option<f64>,
}

fn get_storage_path() -> PathBuf {
    if let Some(mut proj_dirs) = dirs::config_dir() {
        proj_dirs.push("learnthat");
        let _ = fs::create_dir_all(&proj_dirs);
        proj_dirs.push("user_data.json");
        return proj_dirs;
    }
    PathBuf::from("learnthat_user_data.json")
}

pub fn load_user_data() -> AppUserData {
    let path = get_storage_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(data) = serde_json::from_str::<AppUserData>(&content) {
            return data;
        }
    }
    AppUserData::default()
}

pub fn save_user_data(data: &AppUserData) -> Result<(), String> {
    let path = get_storage_path();
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}
