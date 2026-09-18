# Scratchpad — Master Implementation Prompt

You are the lead product engineer and UI/UX engineer responsible for building **Scratchpad** from the ground up.

The current project directory is intentionally **empty**.

A complete product specification exists at:

`SPECIFICATION.md`

You MUST read `SPECIFICATION.md` completely before making architectural or implementation decisions.

---

# 1. PRIMARY OBJECTIVE

Build Scratchpad as a production-quality, browser-based, local-first document editor.

Scratchpad is not intended to be a basic textarea or simple online notepad.

It should provide the experience of:

* a powerful notepad
* a modern rich-text editor
* a lightweight word processor
* a Markdown editor
* an IDE-inspired workspace
* a local document manager

The final product should feel polished enough to be used as a real standalone product.

Core product principle:

> Maximum capability, minimum friction.

A user should be able to open Scratchpad and immediately start writing without:

* creating an account
* logging in
* entering an email
* configuring a workspace
* connecting a cloud service

---

# 2. ABSOLUTE PRODUCT CONSTRAINTS

These requirements are mandatory.

## No backend

Version 1 must NOT require or implement:

* backend servers
* REST APIs for document storage
* database servers
* authentication
* accounts
* cloud document storage
* cloud synchronization
* Firebase
* Supabase
* MongoDB
* PostgreSQL
* Cloudflare D1
* server-side AI

Scratchpad must be capable of running as a static web application.

## Local-first storage

User documents must be stored locally in the browser.

Use IndexedDB as the primary persistent data store.

The application must not upload document contents to a server.

## Privacy

Do not transmit:

* document contents
* images
* attachments
* workspace structure
* note titles

to external services.

Do not build unnecessary external dependencies into core editor functionality.

## Offline

After the application itself has loaded/cached its required assets, core functionality should continue to work without an internet connection.

---

# 3. IMPORTANT: REQUIREMENTS VS IMPLEMENTATION

`SPECIFICATION.md` is the authoritative source for **product requirements and expected behavior**.

Technical recommendations inside the specification are recommendations rather than immutable implementation requirements.

For example, the specification may recommend technologies such as:

* React
* TypeScript
* Vite
* Tiptap/ProseMirror
* Dexie
* CodeMirror

Before using them, verify that the chosen libraries work well together for the COMPLETE product.

You may substitute a technically superior library when there is a clear reason.

However:

> Do not remove, simplify, or silently omit a product requirement merely because the first implementation is easier.

If a requirement is technically difficult, design an appropriate abstraction rather than deleting the requirement.

---

# 4. DO NOT START BY RANDOMLY BUILDING FEATURES

Do NOT immediately start implementing individual features.

Before significant coding:

1. Read the complete specification.
2. Inspect the empty repository.
3. Determine the project architecture.
4. Determine the editor architecture.
5. Determine the persistence architecture.
6. Determine the application state architecture.
7. Determine the styling/design-token system.
8. Determine how rich documents, plain text, and Markdown documents will coexist.
9. Determine how attachments will be stored.
10. Determine how import/export and workspace backup will work.
11. Determine how version history can be supported.
12. Determine the testing strategy.

Create a concise internal architecture plan based on the specification.

Then begin implementation.

---

# 5. PROJECT INITIALIZATION

The repository is intentionally empty.

Initialize a clean modern frontend project.

Preferred baseline:

* React
* TypeScript
* Vite

Use current stable package versions that are compatible with each other.

Do not install unnecessary dependencies.

Every dependency must have a clear purpose.

Prefer well-maintained libraries with strong browser support.

After initialization:

* ensure the project starts successfully
* ensure production build works
* ensure TypeScript checks pass
* establish linting
* establish formatting if useful
* establish test infrastructure

---

# 6. ARCHITECTURE REQUIREMENT

The codebase must be maintainable and modular.

Do NOT create:

* one giant App component
* one giant context containing all state
* one giant utility file
* database logic directly inside visual components
* editor logic scattered throughout the UI
* hundreds of mutually dependent components

Separate concerns clearly.

Recommended conceptual layers:

```text
Application
    │
    ├── UI Shell
    │
    ├── Workspace
    │
    ├── Editor
    │
    ├── Storage
    │
    ├── Import / Export
    │
    ├── Settings
    │
    └── Utilities
```

The exact directory names are your decision, but the separation of responsibilities must remain.

---

# 7. STATE ARCHITECTURE

Do not put all state into a single React context.

At minimum, conceptually separate:

### Workspace state

* current workspace
* folders
* documents
* active document
* open tabs
* recent documents
* favorites

### Editor state

* editor instance
* active document content
* selection
* formatting state
* undo/redo
* current mode

### UI state

* sidebar visibility
* panels
* dialogs
* command palette
* focus mode
* mobile navigation
* notifications

### Settings state

* theme
* typography
* editor preferences
* UI preferences
* behavior preferences

### Persistence state

* saving
* saved
* storage errors
* recovery state

Use appropriate state-management patterns rather than creating unnecessary global state.

---

# 8. DATABASE ARCHITECTURE

Use IndexedDB for persistent application data.

A wrapper such as Dexie may be used if appropriate.

Create a proper database layer rather than directly calling IndexedDB throughout the UI.

Conceptually support:

```text
Workspace
Folder
Document
Attachment
Snapshot / Version
Settings
Recent Item
```

Create repository/service abstractions where useful.

For example:

```text
DocumentRepository
FolderRepository
AttachmentRepository
SnapshotRepository
WorkspaceRepository
SettingsRepository
```

The actual naming can differ.

Important:

The UI must not care how IndexedDB works.

Example:

```text
Editor
   ↓
Document service
   ↓
Repository
   ↓
IndexedDB
```

---

# 9. DOCUMENT MODEL

Do not use HTML as the only source of truth for rich documents.

Use a structured document representation suitable for editing.

The architecture must support at least:

```text
Rich text document
Plain text document
Markdown document
```

A document must have stable identity.

At minimum support:

```text
id
title
type
content
folderId
createdAt
updatedAt
lastOpenedAt
metadata
```

Additional metadata can be added as appropriate.

---

# 10. ATTACHMENT ARCHITECTURE

Images and attachments must be handled separately from normal document text where appropriate.

Do not repeatedly embed massive base64 strings into document JSON.

Use IndexedDB records/blobs or an equivalent local attachment layer.

Documents should reference attachments safely.

The architecture must be able to support:

* images
* attachment metadata
* deletion
* replacement
* export/backup

---

# 11. EDITOR TECHNOLOGY

Build the main rich editor using a robust structured editing framework.

Tiptap/ProseMirror is the preferred starting point if it fits the complete requirements.

The editor must eventually support:

* paragraphs
* headings 1–6
* bold
* italic
* underline
* strikethrough
* superscript
* subscript
* inline code
* text color
* highlight
* alignment
* lists
* nested lists
* checklists
* links
* images
* tables
* blockquotes
* code blocks
* callouts
* horizontal rules
* page breaks
* undo/redo

Do not implement rich text by manually manipulating `contenteditable` HTML unless there is a very strong technical reason.

---

# 12. EDITOR MODES

Implement architecture for:

## Rich Document

Default mode.

## Plain Text

True plain-text experience.

## Markdown

Markdown source editing.

Potential UI:

```text
Rich
Plain
Markdown
```

Mode switching must not silently destroy content.

Where conversion is lossy, communicate that clearly.

---

# 13. IDE-STYLE APPLICATION SHELL

Scratchpad should feel like an IDE, not a generic SaaS dashboard.

The default desktop layout should conceptually contain:

```text
Application menu
Toolbar
Tabs
Explorer/sidebar
Editor
Status bar
```

The editor must remain visually dominant.

---

# 14. EXPLORER

Implement a proper local workspace explorer.

Support:

* documents
* folders
* nested folders
* create
* rename
* duplicate
* delete
* move
* drag/drop
* favorites
* recent files
* context menus
* search

The explorer should feel familiar to users of IDEs.

---

# 15. TABS

Implement editor tabs.

Support:

* open document
* switch document
* close tab
* close others
* close all
* close to right
* reopen closed tab where practical
* active state
* overflow handling
* modified indicator

Multiple tabs can reference the same workspace documents but must not create duplicate documents.

---

# 16. AUTOSAVE

Autosave is mandatory.

Typing must not trigger expensive persistence on every keystroke.

Implement debounced persistence.

Also flush pending changes when appropriate:

* document loses focus
* tab changes
* page visibility changes
* application is being unloaded where feasible

Ctrl+S must force an immediate save.

Do not block typing while saving.

Display clear state such as:

```text
Saving…
Saved locally ✓
```

Do not show a notification for every autosave.

---

# 17. EDITOR TOOLBAR

Implement a polished toolbar with common formatting controls.

At minimum expose:

* Undo
* Redo
* Paragraph/heading selector
* Bold
* Italic
* Underline
* Strikethrough
* Font
* Font size
* Text color
* Highlight
* Alignment
* Bullets
* Numbered lists
* Checklist
* Link
* Image
* Table
* Code
* More

The toolbar must be responsive.

Advanced functions should be available through overflow rather than making the toolbar unusably large.

---

# 18. CONTEXTUAL FORMATTING

When text is selected, provide a compact contextual formatting bubble when appropriate.

Do not let it obscure the selected content.

It should expose the most common actions.

---

# 19. TYPOGRAPHY

Implement all typography requirements in the specification.

The user must be able to change:

* font family
* font size
* text weight where supported
* line height
* letter spacing
* paragraph spacing
* alignment
* text color
* highlight color

Use reusable controls rather than bespoke implementations for each screen.

---

# 20. HEADINGS

Support:

```text
Normal
H1
H2
H3
H4
H5
H6
```

Heading structure must feed the document outline.

Do not fake headings with larger font sizes.

Use semantic editor nodes.

---

# 21. LISTS

Support:

* bullet lists
* numbered lists
* task lists
* nesting
* indentation
* keyboard-friendly list behavior

Make list behavior feel natural.

---

# 22. TABLES

Tables must support:

* add row
* delete row
* add column
* delete column
* cell selection
* resizing where feasible
* alignment
* formatting

Table interactions must remain usable on smaller screens.

---

# 23. IMAGES

Support:

* file picker
* drag/drop
* clipboard paste
* resize
* alignment
* alt text
* delete
* replace

No upload to a remote server.

---

# 24. CODE BLOCKS

Code blocks must be treated as first-class document elements.

Support:

* language selection
* syntax highlighting
* copy
* optional line numbers
* word wrap
* horizontal scrolling
* code font

Do not implement execution of arbitrary code in V1.

Scratchpad is an editor, not an online code runner.

---

# 25. SEARCH AND REPLACE

Implement both:

## Current document search

And:

## Workspace search

Current document search should support:

* next
* previous
* replace
* replace all
* case sensitivity
* whole word
* regex

Workspace search should allow users to find text across documents.

Results should indicate the matching document.

---

# 26. OUTLINE

Detect document headings automatically.

Build an outline panel.

Clicking a heading should navigate to the associated location.

The outline must update when headings change.

---

# 27. COMMAND PALETTE

Implement a command palette.

Recommended shortcut:

```text
Ctrl + Shift + P
```

It should expose application actions such as:

```text
New Document
Open Document
Save
Export
Backup
Restore
Toggle Explorer
Toggle Outline
Toggle Focus Mode
Change Theme
Insert Table
Insert Code Block
Open Settings
```

Commands must be searchable.

The command palette should be one of the main keyboard-first features of Scratchpad.

---

# 28. KEYBOARD SHORTCUT SYSTEM

Implement centralized keyboard shortcut handling.

Do not scatter shortcuts randomly throughout components.

At minimum support the shortcuts listed in the specification.

Ensure shortcuts do not unnecessarily break normal browser editing behavior.

Build the system so custom shortcuts can potentially be added later.

---

# 29. FOCUS MODE

Implement a distraction-reduced editor mode.

Normal UI may include:

```text
Menu
Toolbar
Explorer
Tabs
Status bar
```

Focus mode can hide:

```text
Explorer
Toolbar
Status bar
```

and center the editor.

Add a stronger distraction-free mode if practical.

---

# 30. THEMING

Build a real design token/theme system.

Do NOT hardcode UI colors across components.

Use CSS variables/design tokens.

At minimum provide:

```text
Light
Dark
System
```

Then add several IDE-inspired themes when the theme infrastructure is stable.

Themes must consistently style:

* application chrome
* sidebar
* tabs
* editor
* menus
* dialogs
* status bar
* selection
* syntax highlighting

---

# 31. DESIGN QUALITY

The interface must feel polished.

Avoid:

* excessive cards
* excessive rounded containers
* unnecessary gradients
* giant headings inside the application
* excessive animation
* excessive whitespace that wastes editor space
* visual clutter

The UI should feel like a professional desktop application translated to the browser.

---

# 32. RESPONSIVE DESIGN

Desktop is the primary experience.

Still implement a good tablet/mobile experience.

On mobile:

* explorer becomes drawer
* tabs become document switcher
* toolbar becomes compact
* advanced actions move into menus/bottom sheets
* touch interactions work correctly

Do not simply shrink the desktop UI.

---

# 33. ACCESSIBILITY

Implement:

* keyboard navigation
* semantic controls
* accessible dialogs
* accessible menus
* accessible tabs
* accessible explorer
* visible focus indicators
* proper ARIA labels where needed
* tooltip/label for icon-only controls
* contrast requirements
* reduced-motion support

Do not rely only on color to communicate state.

---

# 34. IMPORT / EXPORT

Implement client-side import/export.

Initial supported formats:

```text
TXT
Markdown
HTML
JSON
```

Also support:

```text
PDF via browser print
```

where appropriate.

Do not require a backend to generate exports.

---

# 35. WORKSPACE BACKUP

This is a major feature, not an afterthought.

Implement:

```text
Backup Workspace
Restore Workspace
```

Backup should contain:

* documents
* folders
* settings
* metadata
* attachments
* version history if included

Use a versioned backup format:

```json
{
  "format": "scratchpad-workspace",
  "version": 1
}
```

Design this so future versions can migrate old backups.

---

# 36. RESTORE MODES

Support at least:

```text
Replace workspace
Merge into workspace
```

Replacing must require explicit confirmation.

Restoring must not silently overwrite existing documents.

---

# 37. VERSION HISTORY

Architect for version history even if it is implemented after the basic editor.

Do NOT design the storage schema in a way that makes version history impossible later.

When implemented, avoid taking a full document snapshot on every keystroke.

Support meaningful snapshots such as:

* manual snapshot
* periodic snapshot
* pre-destructive-operation snapshot
* document close snapshot

---

# 38. ERROR HANDLING

User data safety comes first.

If persistence fails:

1. Preserve the current in-memory content.
2. Do not silently reload.
3. Inform the user.
4. Offer backup/export.
5. Show relevant storage information if possible.

Example:

```text
Unable to save locally.

Your browser may be low on storage.

[Export Backup]
```

Never silently lose the current document.

---

# 39. STORAGE WARNINGS

Implement storage monitoring where practical.

Expose:

* document count
* attachment count
* estimated storage usage
* storage warning

Allow the user to export before destructive cleanup.

---

# 40. DELETE SAFETY

Deleting a document must be recoverable where practical.

Preferred UX:

```text
Document deleted.

[Undo]
```

Permanent destructive operations must require confirmation.

---

# 41. PERFORMANCE

The editor must remain responsive.

Do not:

* rerender the entire application on every keystroke
* recalculate expensive workspace statistics on every keystroke
* write large document payloads to IndexedDB continuously
* repeatedly serialize large attachments unnecessarily

Use debouncing, memoization, selective subscriptions, and appropriate data structures.

---

# 42. LARGE DOCUMENT TESTING

Test the editor with increasingly large documents.

At minimum test:

```text
10 KB
100 KB
500 KB
1 MB
5 MB
10 MB
```

Also test with:

* many headings
* many lists
* tables
* images
* large code blocks

The app should degrade gracefully.

---

# 43. SECURITY

Sanitize imported and pasted HTML.

Reject dangerous content such as:

* scripts
* event-handler attributes
* unsafe URL schemes
* executable embedded content

Never execute imported HTML or code.

---

# 44. PRIVACY

The application should clearly communicate:

> Your documents are stored locally in this browser.

Do not falsely claim that browser-local documents can always be recovered.

Explain that clearing browser storage can remove them.

Provide backup/export as the recovery mechanism.

---

# 45. ANALYTICS

Do not implement analytics that collect document contents.

If product analytics are later introduced, they must not inspect user documents.

Keep analytics out of the editor data path.

---

# 46. SEO / LANDING PAGE

Create an appropriate lightweight public-facing entry page if the architecture calls for it.

Suggested positioning:

> Scratchpad — Free Online Notepad & Rich Text Editor

The application itself should remain the main focus.

The editor should be only one clear action away from the landing page.

---

# 47. ROUTING

Use sensible client-side routes if routing is beneficial.

For example:

```text
/
```

main entry

```text
/app
```

editor

Optional informational pages:

```text
/help
/privacy
/shortcuts
```

Do not create unnecessary routes.

---

# 48. PWA

Treat PWA as an architecture-friendly enhancement.

Do not let PWA complexity delay the basic product.

However, structure the project so a service worker/offline application shell can be added cleanly.

---

# 49. TESTING STRATEGY

Create real automated tests.

At minimum test:

## Database

* create document
* read document
* update document
* delete document
* create folder
* move document
* attachments
* snapshots

## Editor

* headings
* formatting
* lists
* links
* images
* tables
* code blocks
* undo
* redo

## Persistence

* autosave
* reload
* reopen
* multiple documents
* tabs
* recovery

## Import/export

* TXT
* Markdown
* HTML
* JSON
* backup
* restore

## UI

* command palette
* search
* themes
* focus mode
* sidebar
* settings

Use unit/component/integration tests where appropriate.

Do not create fake tests that merely assert that components render.

---

# 50. TEST USER FLOWS

The following complete user journeys must work.

### Journey 1

Open Scratchpad → create note → type → reload → content remains.

### Journey 2

Create multiple documents → create folders → move documents → reload → structure remains.

### Journey 3

Apply formatting → reload → formatting remains.

### Journey 4

Insert image → reload → image remains.

### Journey 5

Open multiple documents → switch tabs → close/reopen → correct state remains.

### Journey 6

Search current document → replace text → verify content.

### Journey 7

Search workspace → open matching document.

### Journey 8

Create backup → clear/test workspace → restore backup → verify complete structure.

### Journey 9

Disconnect network after application load → continue writing and saving.

### Journey 10

Use application using keyboard only.

### Journey 11

Use application on a mobile-sized viewport.

### Journey 12

Attempt storage failure or quota error → verify user data is preserved and warning is displayed.

---

# 51. DEVELOPMENT ORDER

Follow this implementation sequence unless there is a compelling technical reason to change it.

## Phase 0 — Discovery and architecture

Read specification.

Inspect environment.

Choose dependencies.

Create architecture plan.

Do NOT implement random UI features yet.

## Phase 1 — Foundation

Create:

* project
* TypeScript
* styling system
* design tokens
* theme infrastructure
* routing if needed
* test infrastructure
* linting
* formatting

## Phase 2 — Persistence

Implement:

* IndexedDB
* schema
* migrations
* repositories
* document CRUD
* folder CRUD
* attachment model
* settings persistence

## Phase 3 — Application shell

Implement:

* top menu
* toolbar
* explorer
* tabs
* editor area
* status bar
* responsive shell

## Phase 4 — Editor foundation

Implement:

* rich editor
* document loading
* document saving
* paragraphs
* headings
* selection
* undo/redo

## Phase 5 — Formatting

Implement:

* typography
* font size
* font family
* alignment
* lists
* checklist
* colors
* highlights
* links

## Phase 6 — Advanced blocks

Implement:

* tables
* images
* code blocks
* quote
* callout
* horizontal rules
* page breaks

## Phase 7 — Productivity

Implement:

* search
* replace
* workspace search
* outline
* command palette
* keyboard shortcuts
* statistics
* focus mode

## Phase 8 — Data portability

Implement:

* import
* export
* backup
* restore
* print/PDF
* recovery behavior

## Phase 9 — Advanced state

Implement:

* version history
* recent documents
* favorites
* storage information
* crash recovery

## Phase 10 — Polish

Implement:

* themes
* responsive behavior
* accessibility
* performance improvements
* animations
* error states
* empty states
* loading states
* final UX refinements

## Phase 11 — Production audit

Run:

* type checks
* lint
* tests
* production build
* dependency audit where appropriate
* accessibility checks
* responsive checks

Then review the entire product against `SPECIFICATION.md`.

---

# 52. IMPORTANT: DO NOT FAKE FEATURES

Do not create controls that only look functional.

For example:

If the UI shows:

```text
Font Size
```

it must actually modify selected/current text.

If the UI shows:

```text
Backup Workspace
```

it must actually generate a usable backup.

If the UI shows:

```text
Restore
```

it must actually restore data.

If a feature is not implemented yet, do not present a fake interactive implementation as completed.

---

# 53. IMPORTANT: NO PLACEHOLDER ARCHITECTURE

Do not build the first version using:

```text
textarea + localStorage
```

and assume it will later become the complete product.

The architecture must be capable of supporting the full specification from the start.

Likewise, do not implement a temporary fake document model that will later need to be replaced.

---

# 54. IMPORTANT: DO NOT OVERENGINEER

At the same time, do not build infrastructure for hypothetical features that have no place in the specification.

Avoid unnecessary:

* microservices
* backend abstractions
* networking layers
* overly complex state systems
* excessive dependency chains

Scratchpad is a client-side application.

Keep the architecture sophisticated where it matters and simple where it does not.

---

# 55. DESIGN SYSTEM REQUIREMENT

Create reusable primitives for:

* buttons
* icon buttons
* menus
* dropdowns
* dialogs
* popovers
* tooltips
* tabs
* inputs
* select controls
* color pickers
* switches
* checkboxes
* toasts
* command palette
* panels

Do not create dozens of one-off visually inconsistent controls.

---

# 56. ICON SYSTEM

Use one consistent icon library.

Every icon-only control should have:

* accessible label
* tooltip where appropriate

Do not use random emoji as primary UI icons.

Emoji can still be used inside document content where appropriate.

---

# 57. EMPTY / LOADING / ERROR STATES

Every major UI region needs intentional states.

For example:

Explorer:

```text
No documents yet
```

Search:

```text
No matches found
```

Editor:

```text
Loading document…
```

Storage:

```text
Unable to save locally
```

Do not leave blank white/empty regions without explanation.

---

# 58. PRODUCT FEEL

Scratchpad should feel:

* fast
* technical
* calm
* premium
* private
* responsive
* focused

It should NOT feel:

* like a generic admin dashboard
* like a giant enterprise CMS
* like a simple textarea
* overloaded with colorful cards
* dependent on cloud services

---

# 59. MOBILE RULE

Never solve mobile responsiveness by simply shrinking desktop components.

On smaller screens:

* change layout
* collapse navigation
* simplify toolbars
* use drawers/bottom sheets
* preserve editor space

Touch targets should remain usable.

---

# 60. FINAL QUALITY BAR

Before declaring the project complete, ask:

### Can a user open Scratchpad and immediately type?

### Does it remain after reload?

### Can they create many documents?

### Can they organize them?

### Can they format content extensively?

### Can they insert images/tables/code?

### Can they search and replace?

### Can they use keyboard shortcuts?

### Can they operate it without the internet after loading?

### Can they export everything?

### Can they restore everything?

### Is their data kept local?

### Does the UI feel like a polished IDE/document editor rather than a demo?

If any answer is no, the implementation is not finished.

---

# 61. DEVELOPMENT WORKFLOW

During development:

1. Implement one coherent subsystem at a time.
2. Run tests after meaningful changes.
3. Run the production build regularly.
4. Fix TypeScript/lint/build errors immediately.
5. Do not accumulate large amounts of broken code.
6. Do not modify working subsystems unnecessarily.
7. Keep architecture documented in the repository.
8. Keep migrations/versioning explicit.
9. Do not silently change product requirements.

When making major architectural decisions, document them in:

```text
ARCHITECTURE.md
```

When there are implementation decisions that future maintainers should know, document them there.

---

# 62. CHANGE MANAGEMENT

Before implementing a large feature:

* determine which architectural layer owns it
* determine which data model changes are required
* determine persistence implications
* determine export/backup implications
* determine keyboard/UI implications
* determine responsive behavior
* determine testing requirements

Do not add a feature only to the visible UI.

For example:

Adding a document property may require:

```text
UI
↓
state
↓
document model
↓
IndexedDB schema
↓
backup/export
↓
restore
↓
tests
```

Think through the whole lifecycle.

---

# 63. DOCUMENT COMPATIBILITY

Rich document serialization should be version-conscious where appropriate.

If the editor's internal JSON structure changes in the future, provide migration paths.

Do not assume that documents created today can never need migration.

---

# 64. BACKUP COMPATIBILITY

Backup files must be versioned.

For future versions:

```text
version 1
version 2
version 3
```

Build migration code when schema changes.

Never silently import an incompatible backup as if it were valid.

---

# 65. SECURITY AUDIT

Before final completion, inspect:

* pasted HTML
* imported HTML
* URLs
* image handling
* attachment handling
* backup restore
* exported HTML
* DOM injection risks
* XSS
* unsafe protocols

The application must not execute arbitrary content imported from user files.

---

# 66. PERFORMANCE AUDIT

Before final completion inspect:

* typing latency
* large document performance
* tab switching
* explorer rendering
* workspace search
* autosave frequency
* image storage
* startup time
* bundle size
* unnecessary rerenders

Optimize only where measured problems exist, but do not ignore obvious architectural performance problems.

---

# 67. FINAL REPOSITORY EXPECTATION

At completion, the project should be a clean maintainable application, not an agent-generated pile of temporary files.

Avoid:

* unused dependencies
* abandoned components
* duplicated utilities
* dead code
* temporary debug logging
* fake/mock production data
* placeholder implementations presented as real features

Clean everything before final completion.

---

# 68. REQUIRED FINAL REPORT

When the implementation reaches a meaningful milestone, provide a concise report containing:

### Implemented

What is actually complete.

### Remaining

What is genuinely unfinished.

### Architecture

Important architectural decisions.

### Tests

Which tests were run and their results.

### Build

Whether the production build succeeds.

### Known limitations

Anything intentionally deferred.

Do not claim a feature is complete unless it actually works.

---

# 69. MOST IMPORTANT INSTRUCTION

Do not optimize for:

> “Make the demo look impressive quickly.”

Optimize for:

> “Build a maintainable foundation that can become the complete Scratchpad described in SPECIFICATION.md.”

The application should progressively become feature-rich while preserving:

* fast editing
* simple UX
* local privacy
* reliable persistence
* responsive behavior
* maintainable architecture

---

# 70. START NOW

Begin with the following sequence:

1. Read `SPECIFICATION.md` completely.
2. Inspect the empty repository.
3. Establish the architecture.
4. Initialize the project.
5. Create the initial design system.
6. Create the persistence layer.
7. Create the application shell.
8. Establish the editor foundation.
9. Run the initial test/build checks.
10. Continue through the implementation phases systematically.

Do not ask for confirmation for routine engineering decisions.

Make sensible implementation decisions yourself while preserving the product requirements.

When a specification detail is ambiguous, choose the implementation that best satisfies the overall product philosophy:

> **Maximum capability, minimum friction.**

Build Scratchpad as a real product, not a prototype.
