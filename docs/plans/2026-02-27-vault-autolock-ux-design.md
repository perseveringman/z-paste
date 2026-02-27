# Vault Auto-Lock & UX Enhancement Design

Date: 2026-02-27

## Background

The vault currently has no mechanism to lock when the user switches away from the app. The `VaultSessionManager` has an `autoLockTimer` based on inactivity timeout, but:
1. The window hide event (`panel:hidden`) does not trigger a lock
2. There is no UI to configure the auto-lock timeout
3. The sidebar has no category filter tabs or favorites filter

This document covers two areas: auto-lock behavior and UX enhancements (favorites + category filtering). Search is already implemented via `SearchBar.tsx`.

---

## Part 1: Auto-Lock

### Problem

When the user opens the vault, unlocks it, then switches to another app (causing the panel to hide), the vault remains unlocked indefinitely. Returning to the app shows the vault still open.

### Behavior by Security Mode

**Strict mode:**
- Window hide → immediate lock (no exceptions)
- "Lock on blur" setting is forced on and grayed out in settings UI

**Relaxed mode:**
- Window hide → lock based on "lock on blur" toggle (default: on)
- If "lock on blur" is off, falls back to `autoLockTimer` timeout only
- Timeout configurable: 1 min / 5 min / 10 min / 30 min / Never

### Implementation Layers

**Main process (`window.ts`):**
- In `hide()`, emit an IPC event to notify `VaultSessionManager` if it should lock
- `window.ts` gets a reference to `VaultSessionManager` (injected via `index.ts`)
- On hide: if strict mode OR (relaxed mode AND lockOnBlur=true) → call `session.lock()`

**Main process (`session.ts`):**
- `setAutoLockMinutes(minutes)` already exists
- Add `setLockOnBlur(enabled: boolean)` method
- Add `shouldLockOnHide(): boolean` — returns true if strict OR (relaxed AND lockOnBlur)

**IPC (`index.ts`):**
- New handler: `vault:set-lock-on-blur` — persists to settings
- New handler: `vault:set-auto-lock-minutes` — updates session + persists
- `getSecurityState()` response already includes `autoLockMinutes`, no change needed

**Renderer (`VaultView.tsx`):**
- Listen to `panel:hidden` IPC event (already sent by `window.ts`)
- On receive: call `refreshSecurity()` to sync lock state to UI immediately
- This ensures the lock screen appears without delay when vault tab is re-opened

**Settings UI:**
- New "Vault Security" section in `SettingsPage`
- Auto-lock timeout: dropdown (1 / 5 / 10 / 30 / Never), only shown in relaxed mode or always
- Lock on blur toggle: checkbox, disabled+forced-on in strict mode with tooltip explaining why

---

## Part 2: UX Enhancements

### 2a. Category Filter + Favorites (VaultSidebar)

**Current state:** Sidebar shows flat list of all items. No filtering by type or favorites.

**Design:**
- Add a compact filter bar below the sidebar header area, above the item list
- Filter bar contains:
  - Three tab buttons: All / Login / Note (maps to `filterType: 'all' | 'login' | 'secure_note'`)
  - A star icon button for favorites-only toggle (`showFavoritesOnly: boolean`)
- `filterType` stored in `vaultStore` state
- `loadItems()` reads `filterType` and passes `type` param to `vaultRepository.listVaultItems`
- `showFavoritesOnly` is front-end only: filters the `items` array in `VaultSidebar` render

**Store changes:**
- Add `filterType: 'all' | 'login' | 'secure_note'` to `VaultState`
- Add `setFilterType(type)` action that sets state then calls `loadItems()`
- Add `showFavoritesOnly: boolean` to `VaultState`
- Add `setShowFavoritesOnly(v: boolean)` action
- `loadItems()` passes `filterType !== 'all' ? filterType : undefined` as `type` to backend

### 2b. Favorite Toggle (VaultDetail)

**Current state:** `favorite` field exists in DB and meta, but no UI to toggle it.

**Design:**
- Add a `Star` icon button in the detail header area (next to title, before edit button)
- Filled star = `favorite === 1`, outline star = `favorite === 0`
- On click: call `toggleFavorite(id)`

**Store changes:**
- Add `toggleFavorite(id: string)` action
- Calls `window.api.vaultUpdateItem({ id, favorite: !detail.meta.favorite })`
- After success: calls `loadItems()` to refresh sidebar + `selectItem(id)` to refresh detail

---

## Files Affected

| File | Change |
|------|--------|
| `src/main/vault/session.ts` | Add `setLockOnBlur()`, `shouldLockOnHide()` |
| `src/main/window.ts` | Call `session.lock()` in `hide()` when appropriate |
| `src/main/index.ts` | Wire window→session, add IPC handlers for lock settings |
| `src/renderer/src/components/Vault/VaultView.tsx` | Listen to `panel:hidden`, call `refreshSecurity()` |
| `src/renderer/src/stores/vaultStore.ts` | Add `filterType`, `showFavoritesOnly`, `toggleFavorite`, update `loadItems` |
| `src/renderer/src/components/Vault/VaultSidebar.tsx` | Add filter bar (type tabs + favorites toggle) |
| `src/renderer/src/components/Vault/VaultDetail.tsx` | Add star favorite toggle button |
| `src/renderer/src/components/Settings/SettingsPage.tsx` | Add vault security settings section |

---

## Out of Scope

- Memory zeroing / secure memory for DEK
- Rate limiting on unlock attempts
- Key rotation
- Backup / restore
- Multi-vault support
