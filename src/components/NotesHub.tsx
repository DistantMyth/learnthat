import { FileText, CheckCircle2 } from 'lucide-react';
import type { ScanResult, AppUserData } from '../types';

interface NotesHubProps {
  scanResult: ScanResult | null;
  userData: AppUserData | null;
}

export const NotesHub: React.FC<NotesHubProps> = ({ scanResult, userData }) => {
  if (!scanResult) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon-bubble">
          <FileText size={32} />
        </div>
        <h2 className="empty-title">Course Notes & Action Items</h2>
        <p className="empty-description">
          Open a learning folder first to access structured notes and checklists for all your lessons.
        </p>
      </div>
    );
  }

  const lessonEntries = Object.entries(userData?.lessons_data || {}).filter(
    ([_, data]) => (data.notes && data.notes.trim().length > 0) || (data.checklist && data.checklist.length > 0)
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Curriculum Notes & Task Master
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Aggregated insights, study notes, and exercises across all lessons in {scanResult.root_folder_name}
        </p>
      </div>

      {lessonEntries.length === 0 ? (
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
          <FileText size={28} style={{ color: 'var(--text-faint)', marginBottom: '0.5rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No study notes recorded yet</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Expand any lesson in the Video Tracker and switch to the "Notes" or "Checklist" tab to jot down learnings!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {lessonEntries.map(([lessonId, data]) => {
            const lesson = scanResult.lessons.find((l) => l.id === lessonId);
            const lessonName = lesson ? lesson.name : lessonId.split(/[/\\]/).pop();

            return (
              <div
                key={lessonId}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.5rem',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {lessonName}
                  </h3>
                  {lesson && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-amber)',
                      }}
                    >
                      {Math.round(lesson.progress_percent)}% completed
                    </span>
                  )}
                </div>

                {data.notes && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        color: 'var(--text-faint)',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Lesson Notes:
                    </div>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-main)',
                        whiteSpace: 'pre-wrap',
                        background: 'var(--bg-surface)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        lineHeight: 1.6,
                      }}
                    >
                      {data.notes}
                    </div>
                  </div>
                )}

                {data.checklist && data.checklist.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        color: 'var(--text-faint)',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Action Items ({data.checklist.filter((c) => c.completed).length}/
                      {data.checklist.length} done):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {data.checklist.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                            color: item.completed ? 'var(--text-faint)' : 'var(--text-main)',
                            textDecoration: item.completed ? 'line-through' : 'none',
                          }}
                        >
                          <CheckCircle2
                            size={14}
                            style={{
                              color: item.completed ? 'var(--accent-teal)' : 'var(--border-strong)',
                            }}
                          />
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
