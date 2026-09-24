import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  PlayCircle,
  Clock,
  Search,
  RefreshCw,
  Sparkles,
  Layers,
  Award,
  TrendingUp,
} from 'lucide-react';
import type { ScanResult, AppUserData } from '../types';
import { LessonCard } from './LessonCard';
import { tauriApi } from '../services/tauriApi';

interface VideoProgressTrackerProps {
  scanResult: ScanResult | null;
  userData: AppUserData | null;
  isLoading: boolean;
  onSelectFolder: () => void;
  onRefresh: () => void;
  onSelectRecentFolder: (path: string) => void;
}
export const VideoProgressTracker: React.FC<VideoProgressTrackerProps> = ({
  scanResult,
  userData,
  isLoading,
  onSelectFolder,
  onRefresh,
  onSelectRecentFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleVideo = async (videoPath: string, markWatched: boolean) => {
    if (!scanResult) return;
    setErrorMessage(null);
    try {
      await tauriApi.toggleVideoWatched(videoPath, markWatched, scanResult.root_path);
      onRefresh();
    } catch (err: unknown) {
      console.error('Failed to toggle video status:', err);
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Failed to move video file';
      setErrorMessage(message);
    }
  };

  if (!scanResult && !isLoading) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon-bubble">
          <PlayCircle size={36} />
        </div>
        <h2 className="empty-title">Select a Learning Directory</h2>
        <p className="empty-description">
          Choose any course or tutorial folder on your computer. LearnThat will automatically scan
          all subfolders, identify lessons containing a <strong>"done"</strong> folder, and compute
          exact watch time progress.
        </p>

        <div className="convention-callout">
          <strong>Convention Rule:</strong> Whenever a folder contains a subfolder named{' '}
          <code>"done"</code>, LearnThat designates that parent folder as an active Lesson. Videos
          inside <code>done/</code> are tracked as watched; videos in the lesson folder are tracked
          as remaining!
        </div>

        <button className="btn btn-primary" onClick={onSelectFolder}>
          <FolderOpen size={16} /> Choose Course Folder
        </button>

        {userData && userData.recent_folders.length > 0 && (
          <div style={{ marginTop: '2.5rem', width: '100%', maxWidth: '460px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-faint)',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              Recent Courses
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {userData.recent_folders.slice(0, 3).map((path) => (
                <div
                  key={path}
                  className="recent-folder-pill"
                  onClick={() => onSelectRecentFolder(path)}
                  title={path}
                >
                  <Folder size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{path}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading && !scanResult) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon-bubble" style={{ animation: 'spin 1.5s linear infinite' }}>
          <RefreshCw size={32} />
        </div>
        <h2 className="empty-title">Scanning Video Library...</h2>
        <p className="empty-description">
          Analyzing folders and calculating high-precision media durations via Symphonia & FFprobe.
        </p>
      </div>
    );
  }

  if (!scanResult) return null;

  // Filter lessons
  const filteredLessons = scanResult.lessons.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isDone =
      l.progress_percent >= 99.9 || (l.pending_videos_count === 0 && l.watched_videos_count > 0);

    if (!matchesSearch) return false;
    if (filterMode === 'completed') return isDone;
    if (filterMode === 'in-progress') return !isDone;
    return true;
  });

  return (
    <div>
      {errorMessage && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--accent-rose)',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
      {/* Course Hero Stats Card */}
      <div className="course-hero-card">
        <div className="hero-glow-accent" />
        <div className="hero-header-row">
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-amber)',
                marginBottom: '0.35rem',
              }}
            >
              <Sparkles size={12} /> Active Course Tracker
            </div>
            <h1 className="course-title">{scanResult.root_folder_name}</h1>
            <p className="course-subtitle">
              Located at: <code>{scanResult.root_path}</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              title="Rescan directory"
            >
              <RefreshCw size={13} /> Rescan
            </button>
            <button className="btn btn-primary btn-sm" onClick={onSelectFolder}>
              <FolderOpen size={13} /> Change Folder
            </button>
          </div>
        </div>

        {/* 4 Essential Stats Grid */}
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">
              <Clock size={13} /> Watched Time
            </div>
            <div className="stat-value watched">{scanResult.formatted_watched_duration}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {scanResult.watched_videos_count} videos watched
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">
              <TrendingUp size={13} /> Time Left
            </div>
            <div className="stat-value left">{scanResult.formatted_pending_duration}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {scanResult.pending_videos_count} videos remaining
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">
              <Layers size={13} /> Total Curriculum
            </div>
            <div className="stat-value">{scanResult.formatted_total_duration}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {scanResult.total_videos_count} videos in {scanResult.total_lessons_count} lessons
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">
              <Award size={13} /> Completion
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-teal)' }}>
              {Math.round(scanResult.overall_progress_percent)}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {scanResult.completed_lessons_count} of {scanResult.total_lessons_count} lessons done
            </div>
          </div>
        </div>

        {/* Global Progress Rail */}
        <div>
          <div className="progress-rail">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, Math.max(0, scanResult.overall_progress_percent))}%`,
              }}
            />
          </div>
          <div className="progress-legend">
            <span>Progress: {scanResult.overall_progress_percent.toFixed(1)}%</span>
            <span>
              {scanResult.formatted_watched_duration} completed of{' '}
              {scanResult.formatted_total_duration}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="search-controls-bar">
        <div className="search-input-wrapper">
          <Search size={15} />
          <input
            type="text"
            className="search-input"
            placeholder="Search lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tab-filter-group">
          <button
            className={`tab-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All Lessons ({scanResult.lessons.length})
          </button>
          <button
            className={`tab-filter-btn ${filterMode === 'in-progress' ? 'active' : ''}`}
            onClick={() => setFilterMode('in-progress')}
          >
            In Progress ({scanResult.lessons.length - scanResult.completed_lessons_count})
          </button>
          <button
            className={`tab-filter-btn ${filterMode === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterMode('completed')}
          >
            Completed ({scanResult.completed_lessons_count})
          </button>
        </div>
      </div>

      {/* Lessons List Stack */}
      {filteredLessons.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {scanResult.lessons.length === 0 ? (
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                No lessons with "done" subfolders found
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Make sure each lesson folder in your course directory has a <code>done</code>{' '}
                subfolder inside it.
              </p>
            </div>
          ) : (
            <p>No lessons match the search or filter criteria.</p>
          )}
        </div>
      ) : (
        <div className="lessons-stack">
          {filteredLessons.map((lesson, idx) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={idx}
              userData={userData?.lessons_data?.[lesson.id]}
              onRefresh={onRefresh}
              onToggleVideoStatus={handleToggleVideo}
            />
          ))}
        </div>
      )}
    </div>
  );
};
