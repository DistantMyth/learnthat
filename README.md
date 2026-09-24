# LearnThat 🎓

**LearnThat** is a cross-platform desktop application built with **Tauri 2**, **Rust**, **React 19**, and **TypeScript** designed to track and organize self-paced video courses and learning materials with minimal friction.

---

## 🌟 Key Features

### 🎬 Video Progress Tracker
- **Smart Directory Traversal**: Select any course or tutorial folder. LearnThat recursively scans all directories.
- **Done-Folder Convention**: Wherever a folder contains a subfolder named `done/`, that folder is recognized as an active **Lesson** (titled with the parent folder's name).
- **Accurate Duration Metrics**:
  - Calculates total run time of videos remaining in the lesson directory.
  - Calculates total run time of videos completed inside the `done/` subfolder.
  - Multi-tier duration extraction: native MP4 container header parsing with zero external dependencies + automatic `ffprobe` acceleration if installed on the host system.
- **Visual Progress Bars**: Overall course completion percentage and per-lesson progress indicators.
- **One-Click Video Toggling**: Move videos into `done/` (or undo back to the lesson directory) right from the UI without opening your file manager. Includes overwrite protection to prevent accidental file loss.
- **Open in File Explorer**: Instantly reveal lesson folders in Finder (macOS), Explorer (Windows), or your native file manager (Linux).

### 📝 Integrated Study Tools
- **Lesson Checklists**: Track hands-on code-alongs, exercises, and project milestones per lesson.
- **Curriculum Insights & Notes**: Capture key takeaways, commands, and timestamps directly linked to each lesson.
- **Velocity & Completion Forecasts**: View projected completion timelines under different daily study paces (e.g., 30 mins/day, 1 hr/day, 2 hrs/day).
- **Recent Courses**: Fast one-click access to previously opened course directories.
- **Search & Filtering**: Filter lessons by search keyword, In-Progress, or Completed states.

---

## 📥 Download & Installation

Pre-built binaries and installers are automatically published on GitHub Releases for every version:

👉 **[Download Latest Release](https://github.com/DistantMyth/learnthat/releases)**

| Platform | Supported Formats |
|---|---|
| **Windows** | `.msi`, `.exe` (x64) |
| **macOS** | `.dmg`, `.app` (Apple Silicon `aarch64` & Intel `x86_64`) |
| **Linux** | `.AppImage`, `.deb`, `.tar.gz` (x86_64) |

---

## 🛠️ Development & Building from Source

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (1.75+)
- [Bun](https://bun.sh/) (or Node.js 18+)
- OS-specific Tauri dependencies:
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libsoup-3.0-dev`, `libjavascriptcoregtk-4.1-dev`, `librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft C++ Build Tools & WebView2

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/DistantMyth/learnthat.git
   cd learnthat
   ```

2. **Install frontend dependencies**:
   ```bash
   bun install
   ```

3. **Run in development mode**:
   ```bash
   bun run tauri dev
   ```

4. **Build release package**:
   ```bash
   bun run tauri build
   ```

---

## 📂 Folder Structure Convention

For LearnThat to track your lessons, organize your course directory with `done/` folders:

```text
📁 My Fullstack Rust Course/
├── 📁 01 - Getting Started/
│   ├── 01_welcome.mp4
│   └── 📁 done/
│       └── 00_prerequisites.mp4
├── 📁 02 - Ownership & Borrowing/
│   ├── 01_stack_vs_heap.mp4
│   ├── 02_borrow_checker.mp4
│   └── 📁 done/
└── 📁 03 - Concurrency/
    ├── 01_threads.mp4
    └── 📁 done/
```

- Any folder containing a `done` folder is treated as a **Lesson**.
- Unwatched videos stay in the lesson directory.
- Watched videos live in `done/` (or move them automatically using the "Done" button in the app).

---

## 🛡️ Security & Reliability

- **Strict CSP**: Content Security Policy configured to guard against unauthorized resource injection.
- **Fail-Closed Boundary Enforcement**: Native file operations (`move_video_status`, `open_in_file_manager`) strictly validate canonical path prefixes against the active course root.
- **Data Loss Prevention**: Checks for destination collisions before renaming/moving files.
- **Adversarial Dual-Audit**: Verified with independent cross-model Santa-loop code review.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
