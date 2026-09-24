export interface VideoItem {
  name: string;
  path: string;
  duration_seconds: number;
  formatted_duration: string;
  is_watched: boolean;
  size_bytes: number;
}

export interface Lesson {
  id: string;
  name: string;
  path: string;
  done_path: string;
  watched_videos: VideoItem[];
  pending_videos: VideoItem[];
  total_videos_count: number;
  watched_videos_count: number;
  pending_videos_count: number;
  watched_duration_seconds: number;
  pending_duration_seconds: number;
  total_duration_seconds: number;
  progress_percent: number;
  formatted_watched_duration: string;
  formatted_pending_duration: string;
  formatted_total_duration: string;
}

export interface ScanResult {
  root_path: string;
  root_folder_name: string;
  lessons: Lesson[];
  total_lessons_count: number;
  completed_lessons_count: number;
  total_videos_count: number;
  watched_videos_count: number;
  pending_videos_count: number;
  total_duration_seconds: number;
  watched_duration_seconds: number;
  pending_duration_seconds: number;
  overall_progress_percent: number;
  formatted_total_duration: string;
  formatted_watched_duration: string;
  formatted_pending_duration: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  created_at: number;
}

export interface LessonUserData {
  lesson_id: string;
  notes: string;
  checklist: ChecklistItem[];
  rating?: number;
  updated_at: number;
}

export interface AppUserData {
  active_folder?: string;
  recent_folders: string[];
  lessons_data: Record<string, LessonUserData>;
  custom_study_goal_hours?: number;
}

export type ActiveModuleId = 'video-tracker' | 'notes-hub' | 'stats' | 'settings';

export interface ModuleManifest {
  id: ActiveModuleId;
  title: string;
  description: string;
  icon: string;
  badge?: string;
}
