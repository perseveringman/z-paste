# Vault UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Vault UI into a high-efficiency Master-Detail workspace with global search integration, a top-level lock mechanism, and Markdown note rendering.

**Architecture:** 
- Decouple Vault UI into `VaultSidebar`, `VaultDetail`, `VaultSetup`, and `VaultLocked` components.
- Integrate Vault search into the existing global `SearchBar` using a context-aware approach.
- Use `react-markdown` for rendering secure notes and remarks.
- Implement an in-place editing pattern for Vault items.

**Tech Stack:** React, Tailwind CSS, Lucide Icons, Zustand (vaultStore), react-markdown.

---

### Task 1: Environment Setup & Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install react-markdown**

Run: `npm install react-markdown`

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add react-markdown dependency"
```

---

### Task 2: Global Header & Search Integration

**Files:**
- Modify: `src/renderer/src/components/Panel/PanelWindow.tsx`
- Modify: `src/renderer/src/components/Panel/SearchBar.tsx`

**Step 1: Update SearchBar to be context-aware**

Modify `src/renderer/src/components/Panel/SearchBar.tsx` to check the current view and use either `clipboardStore` or `vaultStore`.

**Step 2: Add Lock Button to PanelWindow Header**

Modify `src/renderer/src/components/Panel/PanelWindow.tsx` to include a lock icon when in Vault view or if the vault is unlocked.

**Step 3: Test Integration**

- Switch to Vault view.
- Verify SearchBar placeholder changes.
- Verify typing in SearchBar updates `vaultStore.query`.
- Verify Lock icon appears and calls `vaultStore.lock()`.

**Step 4: Commit**

```bash
git add src/renderer/src/components/Panel/PanelWindow.tsx src/renderer/src/components/Panel/SearchBar.tsx
git commit -m "feat: integrate vault search and lock button into global header"
```

---

### Task 3: Componentize VaultView Structure

**Files:**
- Create: `src/renderer/src/components/Vault/VaultSidebar.tsx`
- Create: `src/renderer/src/components/Vault/VaultDetail.tsx`
- Create: `src/renderer/src/components/Vault/VaultLocked.tsx`
- Create: `src/renderer/src/components/Vault/VaultSetup.tsx`
- Modify: `src/renderer/src/components/Vault/VaultView.tsx`

**Step 1: Extract Locked State UI**

Create `VaultLocked.tsx` with a centered, blurred entrance UI as described in the PRD.

**Step 2: Extract Setup Wizard UI**

Create `VaultSetup.tsx` with a step-by-step wizard for initialization.

**Step 3: Extract Sidebar UI**

Create `VaultSidebar.tsx` with the "+ New Item" button and the simplified list items.

**Step 4: Extract Detail View UI (Skeleton)**

Create `VaultDetail.tsx` that handles the rendering of selected items.

**Step 5: Refactor VaultView.tsx**

Update `VaultView.tsx` to act as a layout orchestrator for the new components.

**Step 6: Commit**

```bash
git add src/renderer/src/components/Vault/
git commit -m "refactor: split VaultView into specialized components"
```

---

### Task 4: Implement High-Efficiency VaultDetail

**Files:**
- Modify: `src/renderer/src/components/Vault/VaultDetail.tsx`

**Step 1: Implement Action Bar**

Add the top bar with Title, URL, and high-frequency action buttons (Copy, Auto-type).

**Step 2: Implement Credential Cards**

Create structured cards for Username, Password (with toggle), and TOTP (with timer).

**Step 3: Implement Markdown Rendering**

Use `react-markdown` to render the content of secure notes and login remarks.

**Step 4: Implement In-place Editing**

Add a state to `VaultDetail` to switch between "Preview" and "Edit" modes within the same container.

**Step 5: Commit**

```bash
git add src/renderer/src/components/Vault/VaultDetail.tsx
git commit -m "feat: implement high-efficiency detail view with markdown support"
```

---

### Task 5: Polishing & Transitions

**Files:**
- Modify: `src/renderer/src/components/Vault/VaultView.tsx`
- Modify: `src/renderer/src/components/Vault/VaultSidebar.tsx`

**Step 1: Add Framer Motion Transitions**

Apply subtle fade-in and slide animations for view transitions.

**Step 2: Final Layout Tweaks**

Ensure spacing and typography match the design document.

**Step 3: Commit**

```bash
git add src/renderer/src/components/Vault/
git commit -m "style: add transitions and final UX polish to Vault"
```
