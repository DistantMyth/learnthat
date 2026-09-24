import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { ScanResult, AppUserData, ChecklistItem } from '../types';

export const tauriApi = {
  async selectFolder(): Promise<string | null> {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Course or Learning Root Folder',
      });
      if (typeof selected === 'string') {
        return selected;
      }
      return null;
    } catch (err) {
      console.warn('Native dialog error or not running in Tauri window:', err);
      // Browser preview fallback prompt
      const fallback = prompt('Enter the absolute path to your learning/course folder:');
      return fallback && fallback.trim() ? fallback.trim() : null;
    }
  },

  async scanFolder(folderPath: string): Promise<ScanResult> {
    return await invoke<ScanResult>('scan_folder', { folderPath });
  },

  async toggleVideoWatched(
    videoPath: string,
    markAsWatched: boolean,
    folderToRescan?: string
  ): Promise<ScanResult | null> {
    return await invoke<ScanResult | null>('toggle_video_watched', {
      videoPath,
      markAsWatched,
      folderToRescan,
    });
  },

  async getUserData(): Promise<AppUserData> {
    return await invoke<AppUserData>('get_user_data');
  },

  async saveLessonNotes(lessonId: string, notes: string): Promise<void> {
    await invoke('save_lesson_notes', { lessonId, notes });
  },

  async addChecklistItem(lessonId: string, text: string): Promise<ChecklistItem> {
    return await invoke<ChecklistItem>('add_lesson_checklist_item', {
      lessonId,
      text,
    });
  },

  async toggleChecklistItem(
    lessonId: string,
    itemId: string,
    completed: boolean
  ): Promise<void> {
    await invoke('toggle_lesson_checklist_item', {
      lessonId,
      itemId,
      completed,
    });
  },

  async deleteChecklistItem(lessonId: string, itemId: string): Promise<void> {
    await invoke('delete_lesson_checklist_item', {
      lessonId,
      itemId,
    });
  },

  async openInFileManager(path: string): Promise<void> {
    await invoke('open_in_file_manager', { path });
  },
};
