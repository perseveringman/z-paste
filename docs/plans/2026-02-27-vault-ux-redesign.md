# Vault UX Redesign Design Document

Date: 2026-02-27
Status: Proposed
Topic: Enhancing Vault usability, aesthetics, and efficiency.

## 1. Objective
Transform the current Vault implementation from a functional but cluttered form-based view into a modern, high-efficiency "Focus Mode" experience. The redesign focuses on visual clarity, prioritized actions (Copy/Auto-type), and professional content rendering (Markdown).

## 2. Architectural Changes

### 2.1 Header & Global Integration
- **Global Search**: When the Vault view is active, the top-level `SearchBar` in `PanelWindow` will automatically target the Vault store.
- **Vault Status Component**: A new `Lock/Unlock` icon button in the top-right header (next to Settings) to provide immediate feedback on vault state and a one-click lock mechanism.

### 2.2 Navigation Pattern (Master-Detail Upgrade)
- **Sidebar (The Switcher)**: Occupies the left column (34%). Removes search/lock clutter. Features a prominent "+ New Item" button.
- **Detail View (The Workspace)**: Occupies the right column. Implements an "In-place" transition between Preview and Edit modes.

## 3. Component Breakdown

### 3.1 VaultSidebar
- **Primary Action**: A full-width `Button` at the top for creating new entries (Login or Secure Note).
- **List Items**: 
    - Left-aligned icons: `Key` for Logins, `FileText` for Notes.
    - Two-line typography: Bold title, muted secondary text (URL or type).
    - Refined hover/active states with rounded corners and soft accent backgrounds.

### 3.2 VaultDetail (Preview Mode)
- **Action Bar**: 
    - Large Title + Link (if applicable).
    - Horizontal group of primary actions: `[Copy User]`, `[Copy Pass]`, `[Auto-type]`.
    - `[...]` More Menu: Edit, Delete, Export.
- **Credential Cards**:
    - Grouped username/password fields with inline copy buttons.
    - Password field with toggle visibility (eye icon).
- **TOTP Section**: Large numeric display with a circular countdown timer for active codes.
- **Markdown Content**:
    - Secure notes and login remarks are rendered as Markdown in preview mode.
    - Supports headers, lists, code blocks, and auto-linking of URLs.

### 3.3 VaultDetail (Edit Mode)
- Seamless transition from preview to a structured form.
- Maintains the same layout structure to minimize visual jumping.
- "Save" and "Cancel" buttons at the bottom of the form.

### 3.4 Locked & Setup States
- **Locked Overlay**: Immersive, centered UI with `backdrop-blur-2xl`. Features a large password input and a prominent Touch ID / Biometric trigger button.
- **Setup Wizard**: Replaces the long form with a 3-step guided flow:
    1. Security Mode Selection.
    2. Master Password & Hint setup.
    3. Recovery Key display (enforced confirmation).

## 4. Data Flow & State Management
- **Search**: `vaultStore.query` remains the source of truth, but UI interaction moves to `PanelWindow`.
- **Lock State**: Global listener for the lock icon in the header to trigger `vaultStore.lock()`.
- **Markdown**: Integration of a lightweight Markdown renderer (e.g., `react-markdown`) for content display.

## 5. UI/UX Refinement
- **Transitions**: Subtle fade-in/out when switching between items in the list.
- **Color Palette**: Utilization of `muted` and `accent` colors from the existing theme to ensure consistency with the Clipboard view.
- **Empty State**: An illustrative placeholder when no item is selected, guiding the user to "Select an item to view details".

## 6. Implementation Phases
1. **Phase 1**: Header & Sidebar cleanup (Search migration, Lock button).
2. **Phase 2**: Detail View redesign (Action bar, Credential cards).
3. **Phase 3**: Markdown integration and Preview/Edit transition.
4. **Phase 4**: Locked state & Setup wizard overhaul.
