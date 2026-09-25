use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

/// In-memory cache: (PathBuf, file_size, modified_timestamp) -> duration_seconds
type CacheKey = (PathBuf, u64, u64);

static DURATION_CACHE: RwLock<Option<HashMap<CacheKey, f64>>> = RwLock::new(None);

fn get_cache_key(path: &Path) -> Option<CacheKey> {
    let metadata = path.metadata().ok()?;
    let size = metadata.len();
    let mtime = metadata
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    Some((path.to_path_buf(), size, mtime))
}

pub fn get_cached_duration(path: &Path) -> Option<f64> {
    let key = get_cache_key(path)?;
    if let Ok(guard) = DURATION_CACHE.read() {
        if let Some(map) = &*guard {
            if let Some(&duration) = map.get(&key) {
                return Some(duration);
            }
        }
    }
    None
}

pub fn insert_cached_duration(path: &Path, duration: f64) {
    if let Some(key) = get_cache_key(path) {
        if let Ok(mut guard) = DURATION_CACHE.write() {
            if guard.is_none() {
                *guard = Some(HashMap::new());
            }
            if let Some(map) = guard.as_mut() {
                map.insert(key, duration);
            }
        }
    }
}

pub fn transfer_cache_entry(old_path: &Path, new_path: &Path, duration: f64) {
    if let Ok(mut guard) = DURATION_CACHE.write() {
        if let Some(map) = guard.as_mut() {
            if let Some(old_key) = get_cache_key(old_path) {
                map.remove(&old_key);
            }
            if let Some(new_key) = get_cache_key(new_path) {
                map.insert(new_key, duration);
            }
        }
    }
}

pub fn clear_cache() {
    if let Ok(mut guard) = DURATION_CACHE.write() {
        if let Some(map) = guard.as_mut() {
            map.clear();
        }
    }
}
