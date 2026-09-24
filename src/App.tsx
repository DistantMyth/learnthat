import { useState, useEffect } from 'react';
import {
  Video,
  FileText,
  BarChart2,
  FolderOpen,
  GraduationCap,
  Info,
} from 'lucide-react';
import './App.css';
import { tauriApi } from './services/tauriApi';
import type { ScanResult, AppUserData, ActiveModuleId, ModuleManifest } from './types';
import { VideoProgressTracker } from './components/VideoProgressTracker';
import { NotesHub } from './components/NotesHub';
import { StatsView } from './components/StatsView';

const MODULES: ModuleManifest[] = [
  {
    id: 'video-tracker',
    title: 'Video Tracker',
    description: 'Curriculum video progress and watch time calculation',
    icon: 'video',
  },
  {
    id: 'notes-hub',
    title: 'Notes & Tasks',
    description: 'Aggregated action items and takeaways',
    icon: 'file-text',
  },
  {
    id: 'stats',
    title: 'Velocity & Stats',
    description: 'Completion pace, predictions and analytics',
    icon: 'bar-chart-2',
  },
];

export function App() {
  const [activeModule, setActiveModule] = useState<ActiveModuleId>('video-tracker');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [userData, setUserData] = useState<AppUserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize and load saved state
  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      const data = await tauriApi.getUserData();
      setUserData(data);
      if (data.active_folder) {
        handleScan(data.active_folder);
      }
    } catch (e) {
      console.warn('Could not load user data from backend:', e);
    }
  };

  const handleScan = async (folderPath: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await tauriApi.scanFolder(folderPath);
      setScanResult(res);
      const updatedUserData = await tauriApi.getUserData();
      setUserData(updatedUserData);
    } catch (err: unknown) {
      console.error('Scan error:', err);
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Failed to scan folder';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const folder = await tauriApi.selectFolder();
      if (folder) {
        await handleScan(folder);
      }
    } catch (err: unknown) {
      console.error('Folder selection error:', err);
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Folder selection failed';
      setErrorMessage(message);
    }
  };

  const handleRefresh = async () => {
    if (scanResult?.root_path) {
      await handleScan(scanResult.root_path);
    }
  };

  return (
    <div className="app-container">
      {/* Modular Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="brand-section">
            <div className="brand-icon">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="brand-title">LearnThat</div>
              <div className="brand-subtitle">Learning Workspace</div>
            </div>
          </div>

          <div className="nav-group-title">Modules</div>

          {MODULES.map((mod) => (
            <div
              key={mod.id}
              className={`nav-item ${activeModule === mod.id ? 'active' : ''}`}
              onClick={() => setActiveModule(mod.id)}
            >
              {mod.id === 'video-tracker' && <Video size={16} />}
              {mod.id === 'notes-hub' && <FileText size={16} />}
              {mod.id === 'stats' && <BarChart2 size={16} />}
              <span>{mod.title}</span>
            </div>
          ))}

          {userData && userData.recent_folders.length > 0 && (
            <div>
              <div className="nav-group-title">Recent Courses</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {userData.recent_folders.slice(0, 5).map((path) => {
                  const folderName = path.split(/[/\\]/).filter(Boolean).pop() || path;
                  const isActive = scanResult?.root_path === path;
                  return (
                    <div
                      key={path}
                      className="recent-folder-pill"
                      style={
                        isActive
                          ? {
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--accent-amber)',
                              fontWeight: 600,
                            }
                          : {}
                      }
                      onClick={() => handleScan(path)}
                      title={path}
                    >
                      <span style={{ fontSize: '0.7rem' }}>📁</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {folderName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-faint)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Info size={12} />
            <span>Tauri 2 Cross-Platform</span>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="top-bar">
          <div className="current-path-display">
            <span style={{ color: 'var(--text-faint)' }}>FOLDER:</span>
            <span className="path-text">
              {scanResult ? scanResult.root_path : 'No directory chosen'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSelectFolder}>
              <FolderOpen size={14} /> Open Course Folder
            </button>
          </div>
        </header>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              borderBottom: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)',
              padding: '0.6rem 1.75rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic Viewport */}
        <div className="content-viewport">
          {activeModule === 'video-tracker' && (
            <VideoProgressTracker
              scanResult={scanResult}
              userData={userData}
              isLoading={isLoading}
              onSelectFolder={handleSelectFolder}
              onRefresh={handleRefresh}
              onSelectRecentFolder={handleScan}
            />
          )}

          {activeModule === 'notes-hub' && (
            <NotesHub scanResult={scanResult} userData={userData} />
          )}

          {activeModule === 'stats' && <StatsView scanResult={scanResult} />}
        </div>
      </main>
    </div>
  );
}

export default App;
