# Scratchpad

> **A production-grade, local-first web notepad and document editor workspace.**

Scratchpad is an offline-capable, zero-account, private document workspace that bridges the gap between quick scratch notes, lightweight word processing, and an IDE-inspired file hierarchy. Built with modern web standards, Scratchpad stores all data locally in the browser, providing sub-millisecond document loading and complete user privacy.

---

## Key Highlights

- **100% Local-First & Private**: Powered by client-side IndexedDB. No mandatory cloud sign-up, no trackers, and no external server storage.
- **Multi-Mode Editor**: Seamlessly edit in **Rich Text** (WYSIWYG), **Markdown**, or **Plain Text / Code** with syntax highlighting.
- **Advanced Table Editing**: Desktop-grade table tools with non-obstructive contextual toolbars and granular border controls.
- **Workspace Organization**: Multi-workspace architecture with nested folders, drag-and-drop navigation, and folder-aware creation.
- **Fast Full-Text Search**: Instant search across titles and document content.
- **Version History**: Automatic snapshotting and manual revision checkpoints with instant restoration.
- **Data Portability**: Full workspace backup/restore (JSON) and individual document exports in Markdown, HTML, text, and JSON.

---

## Core Features

### 1. Multi-Mode Editing Architecture
- **Rich Text Mode (Tiptap / ProseMirror)**:
  - Text styling: Bold, Italic, Underline, Strike, Code, Highlight, Subscript, Superscript, Font Families, and Font Sizes.
  - Structure: Headings (H1–H6), Bullet Lists, Ordered Lists, Task Lists, Blockquotes, Horizontal Rules.
  - Code Blocks: Syntax-highlighted blocks powered by Lowlight / highlight.js with language selector.
  - Media & Links: Inline images, image sizing/alignment, and hyperlink modals.
  - Floating Bubble Menu & Slash Commands (`/`) for rapid block insertion.
- **Markdown Mode (CodeMirror 6)**:
  - Live syntax highlighting, auto-indentation, line numbers, and active line highlight.
- **Plain Text & Code Mode (CodeMirror 6)**:
  - Syntax support for JavaScript, TypeScript, Python, HTML, CSS, SQL, JSON, Rust, Java, PHP, and XML.

### 2. Contextual Table Editing & Border Controls
Scratchpad provides first-class table editing controls that automatically appear when working inside a table:
- **Collision-Aware Positioning**: Contextual table toolbar intelligently positions itself above or below the active table to avoid obscuring user text, with clean minimize (`−`) and expand actions.
- **Row Operations**: Add Row Above, Add Row Below, Delete Row.
- **Column Operations**: Add Column Left, Add Column Right, Delete Column.
- **Cell Operations**: Merge Cells, Split Cells (with selection and capability validation).
- **Header Rows**: One-click toggle for table header rows.
- **Table Border Controls**:
  - **Presets**: All Borders, Outer Borders, Inner Borders, No Borders, Top, Bottom, Left, Right.
  - **Widths**: 1px, 2px, 3px.
  - **Styles**: Solid, Dashed, Dotted, Double.
  - **Color Selector**: Curated swatches and custom HEX color picker with persistent concrete styling.

### 3. Workspaces & Folder Organization
- **Multiple Workspaces**: Maintain isolated environments for Personal, Work, Projects, or Research.
- **Nested Folder Hierarchies**: Create unlimited nested subfolders with drag-and-drop reordering.
- **Folder-Aware Creation**: Clicking `+ New Document` inside a folder automatically places the new document in that folder context.
- **Recycle Bin**: Soft-delete documents and folders with full restore or permanent purge.
- **Document Properties**: View word count, character count, estimated reading time, file format, and creation/modification timestamps.

### 4. Search & Version Control
- **Workspace Search (`Ctrl+Shift+F` / `Cmd+Shift+F`)**: Modal search index filtering across all open and closed documents in real time.
- **Version History Drawer**:
  - Automatic snapshots generated during editing intervals.
  - Manual "Create Snapshot" checkpoint creation with custom labels.
  - Side-by-side or point-in-time review and single-click restoration.

### 5. Import, Export & Backups
- **Import**: Drag-and-drop or select files (`.md`, `.html`, `.txt`, `.json`) into any workspace folder.
- **Export**: Export active document as `.md`, `.html`, `.txt`, or raw JSON.
- **Workspace Backup**: One-click export of the entire workspace as an encrypted/portable JSON snapshot.
- **Restore Backup**: Restore backups with conflict resolution (overwrite or merge).

### 6. Responsive UI & Accessibility
- Adaptive interface tailored for Desktop, Tablet, and Mobile viewport widths.
- High-contrast and theme-aware design system (Light, Dark, and High Contrast).
- Keyboard accessibility: Standard shortcuts for saving, searching, command palette (`Ctrl+K`), and formatting.
- Live storage monitor displaying current browser IndexedDB usage quota.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Bundler & Dev Server** | [Vite 8](https://vite.dev/) |
| **Rich Text Engine** | [Tiptap](https://tiptap.dev/) (ProseMirror ecosystem) |
| **Code & Markdown Engine** | [CodeMirror 6](https://codemirror.net/) |
| **Storage Engine** | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **HTML Sanitization** | [DOMPurify](https://github.com/cure53/DOMPurify) |
| **Testing** | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) + `jsdom` + `fake-indexeddb` |
| **Linting & Code Quality** | [ESLint 9](https://eslint.org/) + [Prettier](https://prettier.io/) |

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/23amtics399/Scratchpad.git
cd Scratchpad
npm install
```

### Development Server
Start the local Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build
Compile TypeScript and build the optimized production bundle:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

---

## Verification & Testing

Scratchpad includes a comprehensive automated test suite covering unit logic, repositories, overlay positioning, table mechanics, and full editor UX workflows.

```bash
# Run TypeScript type check
npm run type-check

# Run automated tests (106 tests across 11 test suites)
npm run test

# Run ESLint validation
npm run lint

# Check code formatting
npm run format:check
```

---

## Intentionally Deferred P2 Features

The following features were intentionally scoped out of the initial release to prioritize performance, offline stability, and zero-account simplicity:
- **Cloud Account Sync**: Direct synchronization with cloud storage providers (Google Drive, Dropbox, OneDrive).
- **Real-Time Collaboration**: Multi-user P2P CRDT syncing via WebRTC / Yjs.
- **Third-Party Plugin Marketplace**: Sandboxed plugin architecture.

---

## License

Copyright © 2026. All Rights Reserved.
