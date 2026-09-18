# Scratchpad

## Complete Product & Technical Specification

**Product:** Scratchpad
**Type:** Browser-based local-first document editor / advanced online notepad
**Primary experience:** IDE-inspired writing environment
**Backend:** None
**Database:** None
**Authentication:** None
**Cloud synchronization:** None
**Default storage:** Browser IndexedDB
**Primary platform:** Desktop web
**Secondary platform:** Tablet and mobile responsive web
**Deployment:** Static hosting only
**Data principle:** User documents remain in the user's browser unless the user explicitly exports them.

---

# 1. Product Vision

Scratchpad is a powerful browser-based notepad designed for people who want much more capability than a traditional textarea while retaining the simplicity and privacy of a local application.

It should feel like a combination of:

* a modern notepad
* a lightweight word processor
* a Markdown editor
* a coding editor
* an IDE workspace

It must **not** feel like an unnecessarily complicated enterprise document-management application.

The central product philosophy is:

> **Open Scratchpad, start writing, and everything is automatically saved locally.**

There should be:

* no registration
* no login
* no account
* no backend
* no cloud database
* no server-side document storage
* no requirement for an internet connection after the application assets have loaded

Scratchpad should be useful both as:

> “I need somewhere to quickly type something.”

and:

> “I want a powerful workspace for maintaining structured notes, projects, code, ideas and documents.”

---

# 2. Core Product Principles

## 2.1 Local-first

Documents are stored locally in IndexedDB.

The application should not transmit document contents to a server.

## 2.2 Zero-friction

Opening the application should immediately provide an editor.

The user should never encounter:

> Create account → verify email → create workspace → start writing

Instead:

> Open → write.

## 2.3 Progressive complexity

Scratchpad should contain advanced functionality without forcing advanced functionality on every user.

Basic users should primarily see:

* document
* formatting
* save state
* basic navigation

Power users can access:

* command palette
* advanced formatting
* outline
* tabs
* folders
* Markdown
* code blocks
* advanced search
* version history
* workspace backup

## 2.4 IDE-inspired, not IDE-exclusive

The interface should borrow useful concepts from IDEs:

* explorer
* tabs
* command palette
* status bar
* keyboard shortcuts
* outline
* workspace
* settings

But writing should remain the primary activity.

## 2.5 Data ownership

Scratchpad must make it clear that local documents belong to the browser/device.

Because browser storage can be deleted by users or browsers, backup/export functionality must be easy to discover.

---

# 3. Initial User Experience

When a user visits Scratchpad for the first time:

```text
┌──────────────────────────────────────────────────────────────┐
│ Scratchpad                                      ⚙   ◐       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                     Welcome to Scratchpad                    │
│                                                              │
│                 Your writing stays in your browser.          │
│                                                              │
│                     [+ New Scratchpad]                       │
│                                                              │
│                No account required.                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

A first-use welcome document can optionally be created automatically.

The welcome document must be:

* editable
* renameable
* deletable

The user should be able to remove it completely.

After the first document is created, the normal editor interface appears.

---

# 4. Main Application Layout

The application should use an IDE-style desktop layout.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Scratchpad   File   Edit   View   Insert   Format   Help        ⚙  ◐ │
├────────────────────────────────────────────────────────────────────────┤
│ [Explorer] │ [Ideas ×] [Project ×] [Todo ×]                           │
├────────────┼───────────────────────────────────────────────────────────┤
│            │                                                           │
│ EXPLORER   │                    DOCUMENT EDITOR                       │
│            │                                                           │
│ + New      │              Untitled Document                           │
│            │                                                           │
│ WORKSPACE  │              Heading                                     │
│            │                                                           │
│ 📁 Notes   │              Paragraph text goes here...                 │
│   📄 Ideas │                                                           │
│   📄 Todo  │              • Item                                      │
│   📄 Work  │              • Item                                      │
│            │                                                           │
│ 📁 Projects│                                                           │
│   📄 App   │                                                           │
│            │                                                           │
│            │                                                           │
├────────────┴───────────────────────────────────────────────────────────┤
│ Ln 12 Col 18   Words 1,482   Characters 8,231   Saved locally ✓       │
└────────────────────────────────────────────────────────────────────────┘
```

The interface consists of:

1. Application menu bar
2. Main toolbar
3. Tab bar
4. Explorer/sidebar
5. Editor
6. Optional contextual panels
7. Status bar

---

# 5. Application Menu

The menu bar should contain:

```text
File
Edit
View
Insert
Format
Tools
Help
```

## File

```text
New Document
New Folder
Open File
Import
Save
Export
Print
Duplicate
Rename
Move
Backup Workspace
Restore Workspace
Close Document
Close All Documents
```

## Edit

```text
Undo
Redo
Cut
Copy
Paste
Paste as Plain Text
Select All
Find
Replace
```

## View

```text
Explorer
Outline
Tabs
Toolbar
Status Bar
Focus Mode
Distraction Free Mode
Word Wrap
Line Numbers
Zoom In
Zoom Out
Reset Zoom
```

## Insert

```text
Link
Image
Table
Horizontal Rule
Code Block
Quote
Callout
Checklist
Bullet List
Numbered List
Date
Time
Emoji
Special Character
```

## Format

```text
Bold
Italic
Underline
Strikethrough
Superscript
Subscript
Text Color
Highlight
Paragraph
Heading
Alignment
Lists
Indent
Clear Formatting
```

## Tools

```text
Word Count
Document Statistics
Command Palette
Format Document
Find & Replace
Version History
Backup
Restore
Keyboard Shortcuts
Settings
```

## Help

```text
Keyboard Shortcuts
About Scratchpad
Privacy
Storage Information
```

---

# 6. Explorer / Sidebar

The sidebar is the document/workspace manager.

It should contain:

```text
EXPLORER

+ New

WORKSPACE

📁 Notes
   📄 Ideas
   📄 Todo
   📄 College

📁 Projects
   📄 Scratchpad
   📄 Website

────────────

RECENT

📄 Ideas
📄 Scratchpad
```

## Explorer functionality

Users can:

* create document
* create folder
* rename document
* rename folder
* delete document
* delete folder
* duplicate document
* move document
* move document into folder
* drag and drop documents
* reorder items
* collapse folders
* search workspace

## Context menu

Right-click:

```text
Open
Open in New Tab
Rename
Duplicate
Move
Delete
Export
Properties
```

For folders:

```text
New Document
New Folder
Rename
Move
Delete
Export Folder
```

Deleting should require confirmation only when appropriate.

A document currently open in another tab must be handled safely when deleted.

---

# 7. Tabs

The top tab bar should work like a lightweight IDE.

Example:

```text
┌──────────────┬────────────────┬──────────────┐
│ 📄 Ideas ×   │ 📄 Project ×   │ 📄 Todo ×    │
└──────────────┴────────────────┴──────────────┘
```

Features:

* open document in tab
* close tab
* close others
* close tabs to the right
* close all
* reopen last closed tab
* tab overflow handling
* dirty-state indicator

Example:

```text
📄 Ideas ●
```

The dot means unsaved changes are pending persistence.

The application should still automatically save; the indicator reflects save status.

Double-clicking a tab should optionally allow renaming.

---

# 8. Editor Engine

The primary editor should be a true structured rich-text editor rather than a single `<textarea>`.

Recommended architecture:

**Tiptap / ProseMirror-based editor**

This is recommended because Scratchpad requires:

* structured documents
* headings
* rich text
* tables
* lists
* links
* code blocks
* custom nodes
* undo/redo
* extensibility

The editor should store structured document JSON rather than HTML as the canonical representation.

---

# 9. Document Types

Scratchpad should support three major document modes.

## 9.1 Rich Document

Default mode.

Supports:

* headings
* paragraphs
* lists
* formatting
* images
* tables
* links
* code blocks
* callouts
* checklists

## 9.2 Plain Text

A true plain-text editing mode.

Ideal for:

* quick notes
* logs
* configuration
* unformatted text

Features should include:

* line numbers
* word wrapping
* find/replace
* character count
* keyboard navigation

## 9.3 Markdown

Markdown source editor.

Example:

```markdown
# My Notes

## Tasks

- Finish project
- Study compiler design

**Important**

> Remember this.
```

Markdown mode should optionally provide:

```text
Editor | Preview
```

or:

```text
Split View
```

Markdown source should remain source-oriented rather than continuously converting itself into rich text and risking formatting loss.

---

# 10. Rich Text Formatting

Scratchpad should provide a comprehensive formatting system.

## Character formatting

* Bold
* Italic
* Underline
* Strikethrough
* Superscript
* Subscript
* Inline code
* Text color
* Highlight color
* Clear formatting

## Paragraph formatting

* Normal paragraph
* Heading 1
* Heading 2
* Heading 3
* Heading 4
* Heading 5
* Heading 6
* Quote
* Code block
* Callout
* Preformatted text

## Alignment

* Left
* Center
* Right
* Justify

## Indentation

* Increase indent
* Decrease indent

---

# 11. Typography Controls

A formatting panel should expose:

### Font family

At minimum:

```text
System
Sans Serif
Serif
Monospace
```

Potential bundled/supported fonts:

```text
Inter
Roboto
Arial
Georgia
Times New Roman
Courier New
JetBrains Mono
```

Font availability should be handled gracefully without requiring external network requests for basic functionality.

### Font size

Preset sizes:

```text
8
10
12
14
16
18
20
24
28
32
36
48
64
72
```

Also allow custom size.

### Line height

Presets:

```text
1.0
1.15
1.25
1.5
1.75
2.0
```

### Letter spacing

Presets and custom values.

### Paragraph spacing

Allow control over paragraph spacing.

---

# 12. Colors

Text color picker:

```text
Default
Black
White
Red
Orange
Yellow
Green
Blue
Purple
Custom
```

Highlight/background color:

```text
None
Yellow
Green
Blue
Pink
Orange
Custom
```

Color pickers should support custom HEX values.

Potentially expose RGB/HSL in advanced mode.

---

# 13. Lists

## Bullet lists

Multiple bullet styles:

```text
•
○
▪
```

## Ordered lists

```text
1.
A.
a.
I.
i.
```

## Task lists

```text
☐ Task
☑ Completed
```

## Nested lists

Support unlimited practical nesting.

Keyboard behavior:

* Enter creates next item
* Enter on empty list item exits list
* Tab increases nesting
* Shift+Tab decreases nesting

---

# 14. Block Elements

Scratchpad should support:

### Blockquote

```text
> This is a quotation.
```

### Code block

Supports:

* syntax highlighting
* language selection
* copy button
* optional line numbers
* horizontal scrolling

### Callout

Types:

```text
Information
Success
Warning
Danger
Note
Tip
```

Example:

```text
┌─────────────────────────────────┐
│ 💡 TIP                          │
│ Remember to export your notes.  │
└─────────────────────────────────┘
```

### Horizontal divider

### Page break

Page breaks are particularly useful for printing/exporting.

---

# 15. Code Blocks

Because Scratchpad has an IDE-inspired interface, code blocks should be a first-class component.

Supported languages should initially include:

```text
JavaScript
TypeScript
HTML
CSS
JSON
Python
Java
C
C++
C#
PHP
SQL
Shell
Markdown
XML
YAML
Plain Text
```

The architecture should allow additional languages later.

Code block functionality:

* syntax highlighting
* copy code
* language selector
* line numbers toggle
* word wrap toggle
* horizontal scrolling
* code font settings

The initial implementation should not execute arbitrary code.

Scratchpad is an editor, not an online compiler.

---

# 16. Tables

Rich text tables should support:

* insert table
* add row
* delete row
* add column
* delete column
* resize columns
* merge cells
* split cells
* cell alignment
* bold cells
* cell text color
* cell background
* keyboard navigation

Example:

```text
┌────────────┬───────────┬───────────┐
│ Item       │ Quantity  │ Status    │
├────────────┼───────────┼───────────┤
│ Laptop     │ 1         │ Done      │
│ Keyboard   │ 1         │ Pending   │
│ Mouse      │ 1         │ Done      │
└────────────┴───────────┴───────────┘
```

---

# 17. Images

Users should be able to insert images from:

* local file
* clipboard paste
* drag and drop

Images are stored locally.

Controls:

* resize
* alignment
* alt text
* remove image
* replace image

The application must not automatically upload an image anywhere.

Images should be stored as blobs or attachment records in IndexedDB rather than repeatedly embedding large base64 strings inside document content.

---

# 18. Links

Users should be able to:

* insert link
* edit link
* remove link
* open link
* copy link

Link security:

* only safe protocols should be allowed
* `javascript:` and similar unsafe URLs must be rejected
* pasted HTML must be sanitized

Supported normal protocols:

```text
https://
http://
mailto:
tel:
```

---

# 19. Paste Behavior

Scratchpad needs robust clipboard handling.

### Normal paste

Preserve supported formatting.

### Paste as plain text

Remove all formatting.

Keyboard shortcut:

```text
Ctrl + Shift + V
```

### Pasting HTML

The HTML should be sanitized before insertion.

Remove:

* scripts
* event handlers
* dangerous URLs
* embedded executable content

---

# 20. Drag and Drop

Support:

* images into document
* text into document
* files into application
* documents into folders
* reordering explorer items

Dropped unsupported file types should display a clear message.

---

# 21. Find & Replace

Scratchpad should have a full editor search interface.

```text
┌──────────────────────────────────────────┐
│ Find                                      │
│ [ scratchpad________________ ]           │
│                                           │
│ Replace                                   │
│ [ Scratchpad______________ ]             │
│                                           │
│ [Case] [Whole word] [Regex]              │
│                                           │
│ 4 matches                                 │
│                                           │
│ Replace     Replace All                  │
└──────────────────────────────────────────┘
```

Features:

* next match
* previous match
* replace
* replace all
* case sensitive
* whole word
* regex
* result count

Workspace-wide search should optionally search across all documents.

---

# 22. Command Palette

Keyboard shortcut:

```text
Ctrl + Shift + P
```

UI:

```text
┌─────────────────────────────────────────────┐
│ > Type a command...                         │
├─────────────────────────────────────────────┤
│ New Document                                │
│ Open Document                               │
│ Save Document                               │
│ Export as Markdown                          │
│ Export as PDF                               │
│ Toggle Focus Mode                           │
│ Toggle Explorer                             │
│ Toggle Outline                              │
│ Open Settings                               │
│ Change Theme                                │
│ Insert Table                                │
│ Insert Code Block                           │
└─────────────────────────────────────────────┘
```

Commands should be searchable.

Command categories:

```text
File
Edit
View
Insert
Format
Navigation
Workspace
Appearance
Help
```

---

# 23. Outline

The editor should automatically detect headings.

Example document:

```text
# Introduction

## Background

## Problem

# Implementation

## Frontend

## Storage

# Conclusion
```

Outline:

```text
OUTLINE

Introduction
  Background
  Problem

Implementation
  Frontend
  Storage

Conclusion
```

Clicking an outline item should scroll to that heading.

The outline panel should update automatically when headings are changed.

---

# 24. Document Statistics

Status bar:

```text
Ln 24, Col 18
Words 1,284
Characters 7,521
```

Expanded statistics:

```text
Words
Characters
Characters without spaces
Paragraphs
Lines
Sentences
Reading time
Selected text statistics
```

Reading time should use a reasonable estimated words-per-minute calculation.

---

# 25. Selection Information

When text is selected, the status bar can display:

```text
Selected:
142 words
731 characters
```

The selection-specific statistics should replace or supplement global document statistics.

---

# 26. Autosave

Scratchpad must automatically save.

Recommended behavior:

* debounce persistence
* save after short periods of inactivity
* flush pending changes when document loses focus
* flush on visibility changes
* flush before navigation where possible
* never block typing while saving

Example status:

```text
Saving...
```

then:

```text
✓ Saved locally
```

and optionally:

```text
✓ Saved 12:04 AM
```

The user should never need to press Ctrl+S for normal persistence.

Ctrl+S should still work and force an immediate save.

---

# 27. Offline Behavior

After the application assets are cached/loaded, Scratchpad should continue functioning without internet access.

Offline operation includes:

* writing
* formatting
* saving
* opening documents
* creating folders
* searching
* importing files
* exporting files
* printing
* changing themes

No network connection should be required.

A future PWA implementation can provide stronger offline startup behavior.

---

# 28. Storage Architecture

Use:

```text
React
TypeScript
Vite
IndexedDB
Dexie.js
```

Recommended editor:

```text
Tiptap / ProseMirror
```

Recommended code editor/highlighting technology can be:

```text
CodeMirror 6
```

for advanced code-block editing where appropriate.

---

# 29. Storage Model

IndexedDB should contain logically separated entities.

## Workspace

```text
id
name
createdAt
updatedAt
```

## Document

```text
id
workspaceId
folderId
title
type
content
createdAt
updatedAt
lastOpenedAt
wordCount
characterCount
sortOrder
metadata
```

Where:

```text
type =
rich
plain
markdown
```

## Folder

```text
id
workspaceId
parentId
name
createdAt
updatedAt
sortOrder
```

## Attachment

```text
id
documentId
type
mimeType
name
size
blob
createdAt
```

## Snapshot / Version

```text
id
documentId
createdAt
content
label
```

## Settings

```text
theme
fontFamily
fontSize
lineHeight
editorWidth
showExplorer
showOutline
showToolbar
showStatusBar
wordWrap
spellCheck
zoom
defaultDocumentType
```

---

# 30. Storage Safety

Scratchpad should display storage information in Settings.

Example:

```text
Storage

Documents: 24
Attachments: 13
Estimated usage: 14.2 MB

Browser storage availability varies by browser.

[Export Workspace]
[Delete All Local Data]
```

Before destructive operations:

```text
Delete all local Scratchpad data?

This cannot be undone.

[Cancel] [Export Backup] [Delete Everything]
```

The application should strongly encourage export before wiping everything.

---

# 31. Workspace Backup

A core feature.

Menu:

```text
File → Backup Workspace
```

Generate:

```text
scratchpad-backup-YYYY-MM-DD.json
```

Backup should contain:

* documents
* folder hierarchy
* document metadata
* settings
* version history where selected
* attachments

Attachments can be packaged into a portable format.

The backup format must include a version number so future versions of Scratchpad can migrate older backups.

Example:

```json
{
  "format": "scratchpad-workspace",
  "version": 1,
  "createdAt": "...",
  "workspace": {},
  "folders": [],
  "documents": [],
  "attachments": []
}
```

---

# 32. Restore Workspace

Users can drag a Scratchpad backup into the application or select:

```text
File → Restore Workspace
```

Restore options:

```text
Replace current workspace
Merge with current workspace
```

Because replacement is destructive, require confirmation.

---

# 33. Import

Supported initial imports:

```text
.txt
.md
.markdown
.html
.htm
.json
```

Optional later formats:

```text
.docx
.rtf
```

Imported documents should become normal Scratchpad documents.

---

# 34. Export

Supported:

```text
TXT
Markdown
HTML
JSON
PDF via browser print
```

Potential future:

```text
DOCX
RTF
```

Export should work client-side.

No server should be required to generate downloadable files.

---

# 35. PDF

Scratchpad should provide:

```text
File → Print / Export PDF
```

Use browser print functionality initially.

Create dedicated print CSS that:

* hides the IDE chrome
* hides sidebar
* hides toolbar
* hides tabs
* uses readable margins
* preserves headings
* preserves lists
* preserves tables
* preserves page breaks
* prints images correctly

Do not require a server PDF-generation service.

---

# 36. Themes

Initial themes:

```text
Scratchpad Light
Scratchpad Dark
```

IDE-inspired themes:

```text
One Dark
Dracula
Nord
Monokai
Solarized Dark
Solarized Light
GitHub Light
GitHub Dark
High Contrast
```

Theme architecture must be token-based.

Do not hardcode colors throughout components.

Example tokens:

```text
--background
--foreground
--surface
--surface-hover
--border
--accent
--editor-background
--editor-foreground
--toolbar-background
--sidebar-background
--statusbar-background
--selection
--muted
--success
--warning
--danger
```

---

# 37. Custom Appearance

Settings should allow:

```text
Editor font
Editor font size
Editor width
Line height
UI density
UI scale
Border radius
Toolbar visibility
Sidebar width
```

Editor width presets:

```text
Compact
Comfortable
Wide
Full Width
Custom
```

---

# 38. Focus Mode

Focus mode removes distractions.

Normal:

```text
Explorer
Toolbar
Tabs
Editor
Status Bar
```

Focus mode:

```text
                 DOCUMENT

              clean editor area
```

Options:

* hide sidebar
* hide menus
* hide toolbar
* hide status bar
* center editor
* maximize writing width

Shortcut:

```text
Ctrl + Shift + F
```

Escape should exit focus mode where appropriate.

---

# 39. Zen / Distraction-Free Mode

A stronger mode than Focus Mode.

Hide:

* application menu
* explorer
* tabs
* toolbar
* status bar

Only the editor remains.

Move mouse toward top edge to reveal temporary controls.

This should be optional.

---

# 40. Zoom

Global UI zoom:

```text
75%
80%
90%
100%
110%
125%
150%
```

Separate editor text scaling can also be available.

Shortcuts:

```text
Ctrl + +
Ctrl + -
Ctrl + 0
```

---

# 41. Word Wrap

Support:

```text
Word Wrap: On
Word Wrap: Off
```

For plain/code documents, horizontal scrolling should be available when wrapping is disabled.

---

# 42. Line Numbers

Useful in:

* plain-text mode
* Markdown mode
* code blocks

Optional in rich document mode.

Setting:

```text
Show line numbers
```

---

# 43. Spell Check

Use the browser's native spell-check system where available.

Setting:

```text
Spell check: On / Off
```

Do not send text to a third-party spell-checking service.

---

# 44. Keyboard Shortcuts

Core:

```text
Ctrl + N              New document
Ctrl + S              Force save
Ctrl + O              Open/import
Ctrl + W              Close current tab
Ctrl + Shift + W      Close all tabs
Ctrl + Z              Undo
Ctrl + Shift + Z      Redo
Ctrl + X              Cut
Ctrl + C              Copy
Ctrl + V              Paste
Ctrl + Shift + V      Paste plain text
Ctrl + A              Select all
Ctrl + F              Find
Ctrl + H              Replace
Ctrl + K              Insert/edit link
Ctrl + B              Bold
Ctrl + I              Italic
Ctrl + U              Underline
Ctrl + Shift + P      Command palette
Ctrl + Shift + F      Focus mode
Ctrl + +              Zoom in
Ctrl + -              Zoom out
Ctrl + 0              Reset zoom
```

Navigation:

```text
Ctrl + Tab
Ctrl + Shift + Tab
```

for switching tabs.

Editor-specific shortcuts must not unnecessarily conflict with browser/system shortcuts.

---

# 45. Slash Command

Inside the rich editor, typing:

```text
/
```

can optionally open an insertion menu.

Example:

```text
/heading
/bullet
/todo
/quote
/code
/table
/image
/callout
```

This is especially useful for keyboard-oriented users.

---

# 46. Quick Formatting Bubble

When text is selected, display a contextual toolbar:

```text
┌───────────────────────────────────────────────┐
│ B  I  U  S   🎨  🖍   🔗   •  ≡   ...       │
└───────────────────────────────────────────────┘
```

Do not display an enormous toolbar by default.

Advanced options can be under:

```text
...
```

---

# 47. Toolbar

The normal toolbar should contain the most commonly used actions.

Suggested order:

```text
Undo Redo

Paragraph ▼

B I U S

Text Color
Highlight

Align ▼

Bullets
Numbering
Checklist

Link
Image
Table
Code

More...
```

Toolbar must adapt to available width.

On smaller screens it should collapse into an overflow menu.

---

# 48. Responsive Design

## Desktop

Full experience:

```text
Explorer + Tabs + Editor + Status Bar
```

## Tablet

Sidebar becomes collapsible.

## Mobile

Use:

```text
Top bar
Document title
Editor
Bottom/overflow toolbar
```

Explorer opens as a drawer.

Toolbar becomes horizontally scrollable or categorized.

Tabs become a document switcher.

The editor should remain fully usable on touch devices.

---

# 49. Mobile Considerations

Support:

* touch selection
* keyboard input
* formatting toolbar
* document switching
* search
* folders
* import/export
* theme switching

Avoid hover-dependent functionality.

Every important operation must have a touch-accessible equivalent.

---

# 50. Accessibility

Minimum requirements:

* keyboard navigability
* visible focus states
* semantic buttons
* labels for icon buttons
* tooltip text for unfamiliar controls
* sufficient text/background contrast
* screen-reader-friendly menus
* accessible dialogs
* accessible command palette
* accessible tree/explorer
* accessible tabs

Do not communicate important states using color alone.

For example:

```text
✓ Saved locally
```

instead of relying only on a green dot.

---

# 51. Empty States

Workspace with no documents:

```text
No documents yet.

Create your first note to get started.

[+ New Document]
```

Search with no result:

```text
No matches found.
```

Empty folder:

```text
This folder is empty.
```

---

# 52. Error Handling

Errors should be clear and actionable.

Example:

```text
Unable to save this document locally.

Your browser may be low on storage.

[Export Backup]
[Storage Settings]
```

Import failure:

```text
This file could not be imported.

The format may be unsupported or corrupted.
```

Backup failure:

```text
Scratchpad could not create the backup.

Please try again.
```

Never silently lose user data.

---

# 53. Storage Quota Handling

The application should detect storage failures when possible.

When storage is approaching limits:

```text
⚠ Storage space is getting low.

Consider exporting a workspace backup.

[Backup Workspace]
```

If persistence fails:

* retain content in current memory
* warn user
* offer backup/export
* do not clear the document
* do not reload automatically

---

# 54. Crash Recovery

On startup, Scratchpad should detect incomplete/pending persistence states when possible.

The application should prioritize recovering recent content rather than silently reverting to an older version.

A recovery indicator could show:

```text
Recovered unsaved changes.
```

---

# 55. Version History

Version history should be available for rich documents.

Storage should be controlled.

Do not create a full snapshot on every keystroke.

Possible strategy:

* major edit snapshot
* periodic snapshot
* manual snapshot
* snapshot on document close
* snapshot before destructive operations

History UI:

```text
VERSION HISTORY

Today
  12:04 AM
  11:45 PM
  11:20 PM

Yesterday
  08:14 PM

[Restore]
```

Before restore:

```text
Restore this version?

Your current version will be preserved as another snapshot.
```

---

# 56. Document Metadata

Each document should track:

```text
Created
Modified
Last opened
Document type
Word count
Character count
Folder
```

Optional metadata:

```text
Tags
Color
Favorite
```

Favorites can be used in the explorer.

---

# 57. Recent Documents

Show recently opened documents.

Example:

```text
RECENT

📄 Project Notes
📄 Ideas
📄 College
📄 Scratchpad
```

Limit the visible list but maintain a reasonable local history.

---

# 58. Favorites

Users can favorite frequently used documents.

Explorer:

```text
★ Favorites

★ Project Notes
★ Important
```

Favorites are metadata only and do not affect document contents.

---

# 59. Document Properties

Context menu:

```text
Properties
```

Display:

```text
Name:
Project Notes

Type:
Rich Document

Created:
18 September 2026

Modified:
18 September 2026

Words:
1,284

Characters:
7,531

Storage:
14.8 KB
```

---

# 60. Rename Behavior

Document title should be editable.

Options:

* double-click document name
* F2
* context menu → Rename

When document title changes, save automatically.

Avoid invalid/empty titles.

If blank:

```text
Untitled
```

---

# 61. New Document Behavior

Click:

```text
+ New
```

should create a document immediately.

Do not require a modal unless the user selects advanced creation.

Advanced:

```text
New Document

Rich Text
Plain Text
Markdown
```

---

# 62. Duplicate Document

Duplicate should create:

```text
Original
Original copy
```

and place it next to the original.

All content and supported metadata are copied.

Version history may optionally be reset for the new copy.

---

# 63. Delete Behavior

Deleted documents should not disappear without feedback.

Recommended:

```text
Document deleted.

Undo
```

This makes accidental deletion recoverable.

A stronger permanent-delete action can be available in a context menu.

---

# 64. Undo / Redo

The editor must have reliable:

* undo
* redo

Separate editor undo from document-management operations where practical.

For example:

Typing → editor undo.

Deleting a document → workspace-level undo notification.

---

# 65. Notifications / Toasts

Use restrained toasts for important events:

```text
Document saved
Document duplicated
Document deleted
Backup created
Workspace restored
Copied to clipboard
```

Do not display a toast for every keystroke or save.

---

# 66. Clipboard Features

Support:

* copy
* paste
* paste plain text
* copy as Markdown
* copy as HTML
* copy code block

For selected rich text:

```text
Copy
Copy as Plain Text
Copy as Markdown
Copy as HTML
```

This is a particularly valuable power-user feature.

---

# 67. Export Selection

Allow exporting the selected portion of a document.

Example:

```text
Right click → Export Selection
```

Formats:

```text
TXT
Markdown
HTML
```

---

# 68. Document Conversion

Allow:

```text
Rich → Markdown
Rich → Plain Text
Markdown → Rich
Rich → HTML
```

The UI should warn that conversion may not preserve unsupported formatting.

---

# 69. Settings

Settings should be grouped.

```text
Settings
│
├── Appearance
├── Editor
├── Documents
├── Keyboard
├── Storage
├── Export
└── About
```

---

# 70. Appearance Settings

```text
Theme
Accent Color
UI Density
UI Scale
Editor Width
Sidebar Width
Show Animations
```

Include:

```text
System theme
```

support.

---

# 71. Editor Settings

```text
Font
Font size
Line height
Letter spacing
Paragraph spacing
Word wrap
Spell check
Line numbers
Editor width
Default document type
```

---

# 72. Document Settings

```text
Autosave
Default title
Open last workspace
Open last documents
Restore previous tabs
```

---

# 73. Privacy Settings

Display a clear statement:

```text
Your Scratchpad documents are stored locally in this browser.

Scratchpad does not require an account and does not upload
your documents to a server.
```

Since the product's main selling point is local-first behavior, privacy should be visible rather than hidden.

---

# 74. No Backend Rule

Version 1 must not introduce:

* Firebase
* Supabase
* MongoDB
* PostgreSQL
* Cloudflare D1
* API endpoints for document storage
* authentication
* account systems
* cloud sync

The application can use static assets and third-party client-side libraries, but document data must remain local.

---

# 75. Network Independence

Scratchpad should not need external APIs for core functionality.

Core features must work with:

```text
Network unavailable
```

after application assets are available.

Avoid making a core editor feature dependent on:

```text
Google Fonts
External icon server
Remote AI API
External spell checker
External storage
```

where possible.

---

# 76. Security

Even though the application is local-only, security still matters.

Input/output handling must protect against:

* XSS
* unsafe HTML
* unsafe links
* malicious imported HTML
* dangerous pasted content

Sanitize imported/pasted HTML.

Never execute:

* scripts from imported documents
* arbitrary embedded JavaScript
* HTML event handlers

---

# 77. Privacy

Do not collect document contents.

Avoid analytics that inspect document contents.

Do not send:

* note titles
* document text
* images
* workspace data

to external servers.

If site analytics are ever added, they should only measure application usage and never inspect user content.

---

# 78. Search Engine / Public Website

The actual editor is an application.

The public landing page should be lightweight.

Possible homepage structure:

```text
Scratchpad

A powerful notepad that lives in your browser.

Write. Organize. Format. Export.
No account required.

[Open Scratchpad]

Features
Privacy
Local Storage
Keyboard Shortcuts
```

The marketing page must not interfere with immediate access to the editor.

An obvious:

```text
Open Scratchpad
```

button should enter the application.

---

# 79. Suggested Routes

Even without backend:

```text
/
```

Landing page / application entry

```text
/app
```

Main editor

Optional future routes:

```text
/help
/privacy
/shortcuts
```

Routes can all be statically generated.

---

# 80. PWA Support

Recommended, but not mandatory for the first implementation.

Possible future PWA features:

* install as desktop application
* stronger offline startup
* app icon
* standalone window
* cached application shell

The application should be structured so PWA support can be added cleanly later.

---

# 81. File System Access API

Optional advanced feature.

On compatible browsers, Scratchpad may eventually support:

```text
Open local folder
Save directly to local file
```

However, this must remain an enhancement.

IndexedDB must remain the fallback.

Do not make the application depend on the File System Access API.

---

# 82. Design Language

Scratchpad should feel:

* modern
* technical
* calm
* clean
* premium
* lightweight

Avoid:

* overly colorful productivity-app design
* excessive glassmorphism
* unnecessary animations
* oversized rounded cards
* giant marketing UI inside the editor

The editor should feel like software, not a marketing dashboard.

---

# 83. Visual Hierarchy

Primary:

```text
Document content
```

Secondary:

```text
Document navigation
```

Tertiary:

```text
Controls
```

The editor must remain visually dominant.

---

# 84. UI Density

Default desktop density:

```text
Compact but comfortable
```

Controls should not consume excessive vertical space.

The application should support:

```text
Compact
Comfortable
Spacious
```

---

# 85. Icons

Use a consistent icon system.

Icon-only buttons must have:

* accessible label
* tooltip

Avoid mixing several icon styles.

---

# 86. Animations

Animations should be minimal.

Suitable:

* sidebar open
* modal open
* dropdown
* tab changes
* toast appearance

Avoid:

* animated typing
* excessive transitions
* distracting editor movement

Respect:

```text
prefers-reduced-motion
```

---

# 87. Mobile Toolbar

On mobile, use a bottom/overflow formatting toolbar.

Example:

```text
┌─────────────────────────────────┐
│  B  I  U   +   ≡   ☰   More    │
└─────────────────────────────────┘
```

Advanced features should be accessible through a bottom sheet/menu.

---

# 88. Accessibility Shortcuts

All major panels should be reachable without a mouse.

The command palette can serve as a universal keyboard navigation mechanism.

---

# 89. Performance Requirements

Scratchpad should feel instantaneous for normal notes.

Target:

* application startup should be lightweight
* typing should never visibly lag
* formatting should feel immediate
* autosave should not block editor input
* opening normal documents should be near-instantaneous
* workspace search should remain responsive

Large documents must be handled gracefully.

---

# 90. Large Document Handling

The application should not assume every document is tiny.

Test with:

```text
10 KB
100 KB
500 KB
1 MB
5 MB
10 MB
```

Very large documents should still behave reasonably, though the UI can warn users when approaching extreme sizes.

Large images should be handled separately from text content.

---

# 91. Testing Requirements

Antigravity should implement tests for critical behavior.

## Editor tests

* create document
* type
* format text
* heading conversion
* lists
* links
* tables
* code blocks
* undo
* redo

## Persistence tests

* autosave
* reload
* reopen document
* reopen application
* multiple documents
* folders
* deletion
* duplication

## Import/export tests

* TXT
* Markdown
* HTML
* JSON
* workspace backup
* workspace restore

## UI tests

* command palette
* search
* settings
* theme switching
* focus mode
* mobile sidebar

---

# 92. Critical Acceptance Tests

The following must all work before calling the initial release complete.

### Test 1

User opens Scratchpad.

They can immediately create a note and type.

### Test 2

User closes the browser.

They reopen Scratchpad.

The note is still present.

### Test 3

User creates five documents.

All remain available.

### Test 4

User creates folders and moves documents between them.

The structure persists after reload.

### Test 5

User applies rich formatting.

Formatting remains after reload.

### Test 6

User inserts an image.

The image remains after reload.

### Test 7

User exports the workspace.

The backup successfully contains the workspace.

### Test 8

User restores the backup into another browser profile.

Documents and folder structure return.

### Test 9

User enters Focus Mode.

Writing remains fully usable.

### Test 10

User uses keyboard shortcuts.

Major operations work without requiring a mouse.

### Test 11

User loses internet connectivity.

The already-loaded application continues working.

### Test 12

User clears site storage.

Scratchpad clearly cannot recover those documents unless the user has a backup.

The application must not falsely claim that cloud recovery is available.

---

# 93. Feature Priority

## P0 — Must have for first usable release

```text
Rich text editor
Plain text mode
Markdown mode
Documents
Folders
Tabs
Explorer
Autosave
IndexedDB
Undo / redo
Headings
Paragraphs
Bold
Italic
Underline
Strikethrough
Font size
Font family
Text color
Highlight
Alignment
Lists
Checklist
Links
Images
Tables
Code blocks
Find
Replace
Word count
Character count
Themes
Dark mode
Light mode
Keyboard shortcuts
Command palette
Import
Export
Print/PDF
Workspace backup
Workspace restore
Settings
Focus mode
Responsive UI
```

## P1 — Add immediately after the core editor is stable

```text
Version history
Favorites
Recent documents
Callouts
Advanced table controls
Copy as Markdown
Copy as HTML
Outline
Selection statistics
Advanced theme collection
Drag/drop reorganization
Storage usage display
Crash recovery
```

## P2 — Advanced enhancements

```text
PWA
File System Access API
DOCX import/export
RTF
Custom themes
Custom keyboard shortcuts
Advanced Markdown preview
Local file synchronization
Advanced document templates
Encrypted backups
```

---

# 94. Features Explicitly Excluded from V1

Do not allow scope creep into:

```text
User accounts
Cloud synchronization
Social sharing
Online collaboration
Real-time multiplayer editing
Server-side AI
Chatbot
Online document sharing
Public document URLs
Server-side search
Cloud storage
```

These may be future products/features, but they violate the initial local-first scope.

---

# 95. Suggested Component Architecture

A possible high-level project structure:

```text
src/
│
├── app/
│
├── components/
│   ├── editor/
│   ├── explorer/
│   ├── tabs/
│   ├── toolbar/
│   ├── statusbar/
│   ├── command-palette/
│   ├── search/
│   ├── settings/
│   ├── dialogs/
│   └── common/
│
├── editor/
│   ├── extensions/
│   ├── nodes/
│   ├── commands/
│   ├── serializers/
│   └── shortcuts/
│
├── storage/
│   ├── database/
│   ├── repositories/
│   ├── migrations/
│   ├── backup/
│   └── import-export/
│
├── hooks/
│
├── contexts/
│
├── services/
│
├── utils/
│
├── styles/
│
└── types/
```

The exact naming can be changed by the implementation agent, but the architecture should preserve separation between:

```text
UI
Editor
Persistence
Import/export
Workspace management
Settings
```

---

# 96. Important Architecture Rule

Do not put all application state into one giant React context.

Separate concerns.

For example:

```text
Workspace state
Editor state
UI state
Settings state
Storage state
```

The editor should not directly contain all database logic.

Use repository/service abstractions:

```text
DocumentRepository
FolderRepository
AttachmentRepository
SnapshotRepository
WorkspaceRepository
```

This keeps the system maintainable.

---

# 97. Data Migration

IndexedDB schema must have migration support.

Future versions may change:

```text
document format
database structure
backup structure
metadata
settings
```

Migration code should be explicit.

Never silently discard existing data during an application update.

---

# 98. Error Recovery Philosophy

At every point where data could be lost:

```text
Preserve current memory state
→ inform user
→ provide backup/export
→ provide recovery option
```

Never:

```text
error
→ reload
→ lose document
```

---

# 99. Default Document

Default new document:

```text
Title:
Untitled
```

Content:

```text
(empty)
```

Cursor should automatically be placed in the editor.

The user should be able to begin typing immediately.

---

# 100. Default Editor Configuration

Recommended defaults:

```text
Theme:
System

Editor font:
Inter/System Sans

Font size:
16px

Line height:
1.6

Editor width:
Comfortable

Word wrap:
On

Spell check:
On

Autosave:
On

Sidebar:
Visible on desktop

Status bar:
Visible

Toolbar:
Visible
```

---

# 101. Product Identity

The application name everywhere should be:

> **Scratchpad**

Do not call it:

```text
Online Notepad
Text Editor
Notes App
```

in the UI.

Those can be SEO descriptions rather than the product name.

Potential SEO positioning:

> Scratchpad — Free Online Notepad & Rich Text Editor

But the application branding remains:

> Scratchpad

---

# 102. Core Message

The product should communicate three things immediately:

```text
Write
Organize
Keep it local
```

A concise value proposition:

> A powerful notepad that stays in your browser.

---

# 103. Definition of “Done”

Scratchpad V1 is considered complete only when:

1. Users can open it and immediately write.
2. Documents persist locally across reloads.
3. Multiple documents and folders work.
4. Rich formatting works reliably.
5. Images and tables work.
6. Code blocks work.
7. Search and replace work.
8. Import/export works.
9. Workspace backup/restore works.
10. Themes and personalization work.
11. Keyboard navigation works.
12. Focus mode works.
13. The editor remains usable on mobile.
14. There is no backend dependency.
15. Core functionality works without an internet connection after the application is loaded.
16. No normal user action can silently overwrite or destroy a document.
17. Existing local data survives application updates.

---

# 104. Antigravity Implementation Philosophy

Antigravity should treat this document as a product specification, not as a suggestion list.

It should:

1. Build the architecture first.
2. Establish the database/storage layer.
3. Establish the editor model.
4. Establish workspace/document management.
5. Establish the UI shell.
6. Build core editor features.
7. Build import/export.
8. Build advanced features.
9. Add responsive/mobile behavior.
10. Add testing.
11. Perform a full production-quality audit.

It should not repeatedly rewrite the architecture as features are added.

Before implementing a new feature, determine which layer it belongs to:

```text
Editor
Workspace
Storage
UI
Settings
Import/Export
```

---

# 105. Most Important Product Rule

Scratchpad should never become a feature-filled application where the editor itself becomes difficult to use.

The guiding rule is:

> **Maximum capability, minimum friction.**

Advanced functionality should be available through:

* menus
* command palette
* contextual menus
* expandable panels
* keyboard shortcuts

rather than permanently occupying the screen.

---

# 106. Final Product Concept

The finished Scratchpad experience should feel approximately like:

```text
                  SCRATCHPAD
          ─────────────────────────

     IDE workspace
            +
     Rich text editor
            +
      Markdown editor
            +
       Code editor
            +
        Notepad
            +
      Local storage
            +
      Document manager

          WITHOUT

     Account
     Backend
     Cloud storage
     Login
```

The user opens Scratchpad, creates a document, and immediately has a powerful writing environment.

Everything else remains optional and discoverable.

**The first-release identity should be:**

> **Scratchpad — a powerful local-first online notepad with an IDE-style workspace.**

---

# 107. Recommended Build Order

### Phase 1 — Foundation

```text
Project setup
TypeScript
React/Vite
Design system
Theme system
IndexedDB/Dexie
Database schema
Workspace model
```

### Phase 2 — IDE shell

```text
Application menu
Sidebar
Explorer
Tabs
Status bar
Responsive shell
```

### Phase 3 — Editor

```text
Tiptap
Paragraphs
Headings
Formatting
Lists
Links
Images
Tables
Code blocks
Quotes
Callouts
```

### Phase 4 — Productivity

```text
Search
Replace
Outline
Command palette
Keyboard shortcuts
Statistics
Focus mode
```

### Phase 5 — Data management

```text
Autosave
Backup
Restore
Import
Export
Print/PDF
Version history
```

### Phase 6 — Polish

```text
Themes
Settings
Mobile
Accessibility
Error handling
Storage warnings
Crash recovery
Performance
Testing
```

### Phase 7 — Optional advanced features

```text
PWA
File System Access
DOCX
Custom themes
Encrypted backups
Advanced Markdown
```

---

# 108. Final Technical Direction

For the initial implementation, the recommended stack is:

```text
Frontend
React + TypeScript + Vite

Styling
Tailwind CSS or equivalent design-token-based styling

Editor
Tiptap / ProseMirror

Code editing / advanced code blocks
CodeMirror 6 where needed

Local database
IndexedDB

Database helper
Dexie.js

Local persistence
IndexedDB for documents and attachments
localStorage only for small UI preferences if useful

Icons
One consistent icon library

PDF
Browser print / print CSS

Hosting
Static hosting only
```

No application server is required.

The entire initial Scratchpad system should be capable of running as a static web application.

---

# 109. Final UX Test

The final product should pass this mental test:

A user lands on Scratchpad and thinks:

> “I can just type.”

After five minutes they discover:

> “Oh, I can format this.”

After ten minutes:

> “I can organize my notes into folders.”

Then:

> “I can open multiple notes like an IDE.”

Then:

> “I can search everything.”

Then:

> “I can insert tables, code, images and checklists.”

Then:

> “Everything is saved automatically.”

And finally:

> “I don't even need an account.”

That progression is the intended Scratchpad experience.
