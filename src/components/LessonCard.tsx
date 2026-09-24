import { useState } from 'react';
import {
  FolderOpen,
  CheckCircle2,
  Play,
  RotateCcw,
  CheckSquare,
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Lesson, LessonUserData, ChecklistItem } from '../types';
import { tauriApi } from '../services/tauriApi';

interface LessonCardProps {
  lesson: Lesson;
  index: number;
  userData?: LessonUserData;
  onRefresh: () => void;
  onToggleVideoStatus: (videoPath: string, markWatched: boolean) => Promise<void>;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  index,
  userData,
  onRefresh,
  onToggleVideoStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(index === 0);
  const [activeTab, setActiveTab] = useState<'videos' | 'checklist' | 'notes'>('videos');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [notesText, setNotesText] = useState(userData?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const isCompleted =
    lesson.progress_percent >= 99.9 ||
    (lesson.pending_videos_count === 0 && lesson.watched_videos_count > 0);

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await tauriApi.saveLessonNotes(lesson.id, notesText);
      onRefresh();
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    await tauriApi.addChecklistItem(lesson.id, newChecklistText.trim());
    setNewChecklistText('');
    onRefresh();
  };

  const handleToggleChecklist = async (item: ChecklistItem) => {
    await tauriApi.toggleChecklistItem(lesson.id, item.id, !item.completed);
    onRefresh();
  };

  const handleDeleteChecklist = async (itemId: string) => {
    await tauriApi.deleteChecklistItem(lesson.id, itemId);
    onRefresh();
  };

  return (
    <div className={`lesson-card ${isExpanded ? 'expanded' : ''}`}>
      <div
        className="lesson-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
      >
        <div className="lesson-info-left">
          <div className={`lesson-badge-number ${isCompleted ? 'completed' : ''}`}>
            {isCompleted ? <CheckCircle2 size={16} /> : String(index + 1).padStart(2, '0')}
          </div>
          <div>
            <div className="lesson-name">{lesson.name}</div>
            <div className="lesson-submeta">
              <span>{lesson.total_videos_count} videos</span>
              <span>•</span>
              <span className="stat-value-inline watched">
                {lesson.watched_videos_count} watched ({lesson.formatted_watched_duration})
              </span>
              <span>•</span>
              <span className="stat-value-inline left">
                {lesson.formatted_pending_duration} remaining
              </span>
            </div>
          </div>
        </div>

        <div className="lesson-progress-chunk">
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: isCompleted ? 'var(--accent-teal)' : 'var(--accent-amber)',
              }}
            >
              {Math.round(lesson.progress_percent)}%
            </div>
            <div className="lesson-mini-bar">
              <div
                className={`lesson-mini-fill ${isCompleted ? 'full' : ''}`}
                style={{ width: `${Math.min(100, Math.max(0, lesson.progress_percent))}%` }}
              />
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              tauriApi.openInFileManager(lesson.path);
            }}
            title="Open folder in File Manager"
          >
            <FolderOpen size={15} />
          </button>

          <div style={{ color: 'var(--text-faint)' }}>
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="lesson-body">
          <div className="lesson-tabs-nav">
            <button
              className={`lesson-tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <Play size={13} />
              Videos ({lesson.total_videos_count})
            </button>
            <button
              className={`lesson-tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklist')}
            >
              <CheckSquare size={13} />
              Tasks & Checklist ({userData?.checklist?.length || 0})
            </button>
            <button
              className={`lesson-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={13} />
              Key Insights & Notes {notesText ? '•' : ''}
            </button>
          </div>

          {activeTab === 'videos' && (
            <div className="videos-columns-grid">
              {/* To Watch (in current lesson folder) */}
              <div>
                <div className="video-column-header">
                  <span style={{ color: 'var(--accent-amber)' }}>
                    To Watch ({lesson.pending_videos_count})
                  </span>
                  <span>{lesson.formatted_pending_duration}</span>
                </div>

                <div className="video-list">
                  {lesson.pending_videos.length === 0 ? (
                    <div
                      style={{
                        padding: '1.25rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      🎉 All videos in this lesson moved to "done"!
                    </div>
                  ) : (
                    lesson.pending_videos.map((vid) => (
                      <div key={vid.path} className="video-row">
                        <div className="video-row-left">
                          <Play size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
                          <span className="video-name" title={vid.name}>
                            {vid.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="video-duration-badge">{vid.formatted_duration}</span>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onToggleVideoStatus(vid.path, true)}
                            title="Mark as watched (moves file to 'done' folder)"
                          >
                            <CheckCircle2 size={13} style={{ color: 'var(--accent-teal)' }} />
                            <span>Done</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Watched (in done folder) */}
              <div>
                <div className="video-column-header">
                  <span style={{ color: 'var(--accent-teal)' }}>
                    Completed in "done/" ({lesson.watched_videos_count})
                  </span>
                  <span>{lesson.formatted_watched_duration}</span>
                </div>

                <div className="video-list">
                  {lesson.watched_videos.length === 0 ? (
                    <div
                      style={{
                        padding: '1.25rem',
                        textAlign: 'center',
                        color: 'var(--text-faint)',
                        fontSize: '0.8rem',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      No videos in "done" folder yet.
                    </div>
                  ) : (
                    lesson.watched_videos.map((vid) => (
                      <div key={vid.path} className="video-row" style={{ opacity: 0.85 }}>
                        <div className="video-row-left">
                          <CheckCircle2
                            size={14}
                            style={{ color: 'var(--accent-teal)', flexShrink: 0 }}
                          />
                          <span
                            className="video-name"
                            style={{ textDecoration: 'line-through' }}
                            title={vid.name}
                          >
                            {vid.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="video-duration-badge">{vid.formatted_duration}</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => onToggleVideoStatus(vid.path, false)}
                            title="Undo (moves file back to lesson folder)"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="checklist-container">
              <form onSubmit={handleAddChecklist} className="checklist-input-row">
                <input
                  type="text"
                  className="checklist-input"
                  placeholder="Add action item (e.g. Code along with chapter 3 exercises, build demo)..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Add
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(!userData?.checklist || userData.checklist.length === 0) && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No checklist items yet. Add practice exercises, project milestones, or comprehension goals.
                  </p>
                )}

                {userData?.checklist?.map((item) => (
                  <div
                    key={item.id}
                    className={`checklist-item-row ${item.completed ? 'completed' : ''}`}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(item)}
                        style={{ accentColor: 'var(--accent-amber)', width: 16, height: 16 }}
                      />
                      <span>{item.text}</span>
                    </label>

                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeleteChecklist(item.id)}
                      title="Delete item"
                    >
                      <Trash2 size={13} style={{ color: 'var(--text-faint)' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                }}
              >
                Capture critical takeaways, links, or timestamps for this lesson:
              </p>
              <textarea
                className="notes-textarea"
                placeholder="Write your study notes here..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                onBlur={handleSaveNotes}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
