import {
  Clock,
  Video,
  Calendar,
  Flame,
  Zap,
} from 'lucide-react';
import type { ScanResult } from '../types';

interface StatsViewProps {
  scanResult: ScanResult | null;
}

export const StatsView: React.FC<StatsViewProps> = ({ scanResult }) => {
  if (!scanResult) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon-bubble">
          <Zap size={32} />
        </div>
        <h2 className="empty-title">Analytics & Study Insights</h2>
        <p className="empty-description">
          Select your course folder to view deep analytics on watching velocity, time commitment, and lesson completion curves.
        </p>
      </div>
    );
  }

  // Calculate estimated completion at typical daily paces (e.g., 30m/day, 1h/day, 2h/day)
  const remainingHours = scanResult.pending_duration_seconds / 3600;
  const daysAt30m = Math.ceil(remainingHours / 0.5);
  const daysAt1h = Math.ceil(remainingHours / 1.0);
  const daysAt2h = Math.ceil(remainingHours / 2.0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Learning Velocity & Forecasts
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Insights for {scanResult.root_folder_name}
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-box">
          <div className="stat-label">
            <Flame size={14} style={{ color: 'var(--accent-amber)' }} /> Completed Ratio
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-teal)' }}>
            {scanResult.overall_progress_percent.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {scanResult.completed_lessons_count}/{scanResult.total_lessons_count} lessons done
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">
            <Video size={14} /> Total Content
          </div>
          <div className="stat-value">{scanResult.total_videos_count} files</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {scanResult.formatted_total_duration} total run time
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">
            <Clock size={14} /> Time Invested
          </div>
          <div className="stat-value watched">{scanResult.formatted_watched_duration}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {scanResult.watched_videos_count} videos watched
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">
            <Calendar size={14} /> Remaining Deficit
          </div>
          <div className="stat-value left">{scanResult.formatted_pending_duration}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {scanResult.pending_videos_count} videos left
          </div>
        </div>
      </div>

      {/* Completion projections card */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.5rem',
          }}
        >
          Target Completion Estimates
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Based on {remainingHours.toFixed(1)} hours of video lectures left in this course:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Casual Pace (30m/day)</div>
            <div
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginTop: '0.3rem',
              }}
            >
              ~{daysAt30m} days
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Consistency over intensity
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>Steady Pace (1h/day)</div>
            <div
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--accent-amber)',
                marginTop: '0.3rem',
              }}
            >
              ~{daysAt1h} days
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Recommended daily streak
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sprint Pace (2h/day)</div>
            <div
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--accent-teal)',
                marginTop: '0.3rem',
              }}
            >
              ~{daysAt2h} days
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Deep dive mastery
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
