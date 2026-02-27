# Vault Auto-Lock & UX Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lock the vault when the app window hides, add configurable auto-lock settings, and add favorites/category filtering to the vault sidebar.

**Architecture:** Auto-lock is implemented in the main process: `WindowManager.hide()` calls `VaultSessionManager.lockOnHide()` which checks security mode and lock-on-blur preference. The renderer listens to `panel:hidden` to sync UI state immediately. UX features (filter tabs, favorites) are store-level state changes with sidebar UI updates.

**Tech Stack:** Electron (main/preload/renderer), TypeScript, Zustand, React, Lucide icons, existing `window.api` IPC bridge pattern.

---

### Task 1: Add `lockOnHide()` to VaultSessionManager

**Files:**
- Modify: `src/main/vault/session.ts`

**Context:** `VaultSessionManager` already has `lock()`, `setAutoLockMinutes()`, and a private `lockOnBlur` concept. We need to add persistent `lockOnBlur` preference and a public `lockOnHide()` method that respects security mode.

**Step 1: Add `lockOnBlur` field and methods**

In `src/main/vault/session.ts`, after line 25 (`private autoLockTimer`), add:

```typescript
private lockOnBlur = true  // default: lock when window hides
```

After the existing `setAutoLockMinutes` method (around line 329), add:

```typescript
setLockOnBlur(enabled: boolean): void {
  this.lockOnBlur = enabled
}

async lockOnHide(): Promise<void> {
  const meta = vaultRepository.getVaultCryptoMeta('primary')
  if (!meta) return
  const isStrict = meta.security_mode === 'strict'
  if (isStrict || this.lockOnBlur) {
    await this.lock()
  }
}
```

**Step 2: Expose `lockOnBlur` in `getSecurityState()`**

`getSecurityState()` returns `VaultSecurityState`. We need `lockOnBlur` in the return so the renderer can show the current setting.

In `getSecurityState()` (around line 301), change the return to include:

```typescript
return {
  locked: !(await this.isUnlocked()),
  hasVaultSetup: !!meta,
  autoLockMinutes: this.autoLockMinutes,
  lastUnlockMethod: this.lastUnlockMethod,
  hasBiometricUnlock: await hasBiometricDEK(),
  securityMode: (meta?.security_mode as 'strict' | 'relaxed') || 'strict',
  hintQuestion: meta?.hint_question || null,
  lockOnBlur: this.lockOnBlur
}
```

**Step 3: Update `VaultSecurityState` interface**

At line 10, add `lockOnBlur: boolean` to the interface:

```typescript
export interface VaultSecurityState {
  locked: boolean
  hasVaultSetup: boolean
  autoLockMinutes: number
  lastUnlockMethod: 'master' | 'recovery' | 'biometric' | 'hint' | null
  hasBiometricUnlock: boolean
  securityMode: 'strict' | 'relaxed'
  hintQuestion: string | null
  lockOnBlur: boolean
}
```

**Step 4: Commit**

```bash
git add src/main/vault/session.ts
git commit -m "feat(vault): add lockOnHide() and lockOnBlur setting to VaultSessionManager"
```

---

### Task 2: Call `lockOnHide()` from WindowManager

**Files:**
- Modify: `src/main/window.ts`
- Modify: `src/main/index.ts`

**Context:** `WindowManager` does not currently know about the vault session. We pass `vaultSession` into `WindowManager` after construction in `index.ts`.

**Step 1: Add vault session reference to WindowManager**

In `src/main/window.ts`, add a private field and setter after line 9 (`private blurSuppressed`):

```typescript
private vaultSession: { lockOnHide: () => Promise<void> } | null = null

setVaultSession(session: { lockOnHide: () => Promise<void> }): void {
  this.vaultSession = session
}
```

**Step 2: Call `lockOnHide()` in `hide()`**

In `hide()` (around line 102), add the vault lock call:

```typescript
hide(): void {
  if (this.mainWindow && !this.mainWindow.isDestroyed()) {
    this.mainWindow.hide()
    this.mainWindow.webContents.send('panel:hidden')
    if (this.vaultSession) {
      void this.vaultSession.lockOnHide()
    }
  }
}
```

**Step 3: Wire it up in index.ts**

In `src/main/index.ts`, after line 55 (`vaultService = new VaultService(vaultSession, worker)`), add:

```typescript
windowManager.setVaultSession(vaultSession)
```

**Step 4: Commit**

```bash
git add src/main/window.ts src/main/index.ts
git commit -m "feat(vault): lock vault on window hide via WindowManager"
```

---

### Task 3: Add IPC handlers for lock settings

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

**Context:** The renderer settings UI needs to call `vault:setLockOnBlur` and `vault:setAutoLockMinutes`. These persist only in-memory on the session (no DB needed — they reset to defaults on restart, which is the safe default).

**Step 1: Add IPC handlers in index.ts**

After the `vault:lock` handler (around line 255), add:

```typescript
ipcMain.handle('vault:setLockOnBlur', async (_, enabled: boolean) => {
  vaultSession.setLockOnBlur(enabled)
})

ipcMain.handle('vault:setAutoLockMinutes', async (_, minutes: number) => {
  vaultSession.setAutoLockMinutes(minutes)
})
```

**Step 2: Add preload bindings in `src/preload/index.ts`**

After `vaultUnlockWithHint` (line 181), add:

```typescript
vaultSetLockOnBlur: (enabled: boolean) =>
  ipcRenderer.invoke('vault:setLockOnBlur', enabled),
vaultSetAutoLockMinutes: (minutes: number) =>
  ipcRenderer.invoke('vault:setAutoLockMinutes', minutes),
```

**Step 3: Update type declarations in `src/preload/index.d.ts`**

Find the `VaultSecurityState` interface and add `lockOnBlur: boolean`.

Find the `api` interface declaration and add the two new methods:

```typescript
vaultSetLockOnBlur: (enabled: boolean) => Promise<void>
vaultSetAutoLockMinutes: (minutes: number) => Promise<void>
```

**Step 4: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat(vault): add IPC handlers for lock-on-blur and auto-lock-minutes settings"
```

---

### Task 4: Sync lock state in renderer on panel:hidden

**Files:**
- Modify: `src/renderer/src/components/Vault/VaultView.tsx`

**Context:** `window.api.onPanelHidden` already exists in preload. When the panel hides, the main process locks the vault, but the renderer still shows the unlocked state until next `refreshSecurity()`. We fix this by calling `refreshSecurity()` when `panel:hidden` fires.

**Step 1: Add useEffect in VaultView.tsx**

After the existing `useEffect(() => { refreshSecurity() }, [refreshSecurity])` (around line 17), add:

```typescript
useEffect(() => {
  const unsub = window.api.onPanelHidden(() => {
    refreshSecurity()
  })
  return unsub
}, [refreshSecurity])
```

**Step 2: Verify it compiles**

```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to vault).

**Step 3: Commit**

```bash
git add src/renderer/src/components/Vault/VaultView.tsx
git commit -m "feat(vault): sync lock state when panel hides"
```

---

### Task 5: Update vaultStore with lockOnBlur state + new settings actions

**Files:**
- Modify: `src/renderer/src/stores/vaultStore.ts`

**Context:** `VaultSecurityState` in the store needs `lockOnBlur`. We also need to add `setLockOnBlur` and `setAutoLockMinutes` actions that call the new IPC endpoints and then refresh security state.

**Step 1: Add `lockOnBlur` to `VaultSecurityState` interface**

In `src/renderer/src/stores/vaultStore.ts` around line 36, add `lockOnBlur: boolean` to `VaultSecurityState`:

```typescript
export interface VaultSecurityState {
  locked: boolean
  hasVaultSetup: boolean
  autoLockMinutes: number
  lastUnlockMethod: 'master' | 'recovery' | 'biometric' | 'hint' | null
  hasBiometricUnlock: boolean
  securityMode: 'strict' | 'relaxed'
  hintQuestion: string | null
  lockOnBlur: boolean
}
```

**Step 2: Update `defaultSecurityState`**

At line 99, add `lockOnBlur: true` to `defaultSecurityState`.

**Step 3: Add actions to `VaultState` interface and implementation**

In the `VaultState` interface (around line 46), add:

```typescript
setLockOnBlur: (enabled: boolean) => Promise<void>
setAutoLockMinutes: (minutes: number) => Promise<void>
```

In the Zustand store implementation, after the `lock` action, add:

```typescript
setLockOnBlur: async (enabled) => {
  await window.api.vaultSetLockOnBlur(enabled)
  await get().refreshSecurity()
},

setAutoLockMinutes: async (minutes) => {
  await window.api.vaultSetAutoLockMinutes(minutes)
  await get().refreshSecurity()
},
```

**Step 4: Commit**

```bash
git add src/renderer/src/stores/vaultStore.ts
git commit -m "feat(vault): add lockOnBlur and autoLockMinutes to vaultStore"
```

---

### Task 6: Add Vault Security section to SettingsPage

**Files:**
- Modify: `src/renderer/src/components/Settings/SettingsPage.tsx`

**Context:** `SettingsPage` uses a sidebar nav with sections. We add a new `'vault'` section. The `privacy` section (Lock icon) is already there — we'll add vault security as a subsection inside `privacy`, since it's the most relevant home.

**Step 1: Add vault security UI inside the privacy section**

Find the `privacy` section render in `SettingsPage.tsx` (search for `activeSection === 'privacy'`). After the existing privacy content, add a vault security block:

```tsx
{/* Vault Security */}
<div className="space-y-4">
  <h3 className="text-sm font-medium">{t('settings.vault.title')}</h3>

  {/* Lock on blur */}
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-sm">{t('settings.vault.lockOnBlur')}</p>
      <p className="text-xs text-muted-foreground">
        {security.securityMode === 'strict'
          ? t('settings.vault.lockOnBlurStrictNote')
          : t('settings.vault.lockOnBlurDesc')}
      </p>
    </div>
    <Switch
      checked={security.securityMode === 'strict' ? true : security.lockOnBlur}
      disabled={security.securityMode === 'strict'}
      onCheckedChange={(v) => setLockOnBlur(v)}
    />
  </div>

  {/* Auto-lock timeout */}
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-sm">{t('settings.vault.autoLockTimeout')}</p>
      <p className="text-xs text-muted-foreground">{t('settings.vault.autoLockTimeoutDesc')}</p>
    </div>
    <Select
      value={String(security.autoLockMinutes)}
      onValueChange={(v) => setAutoLockMinutes(Number(v))}
    >
      <SelectTrigger className="w-32 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">{t('settings.vault.timeout1')}</SelectItem>
        <SelectItem value="5">{t('settings.vault.timeout5')}</SelectItem>
        <SelectItem value="10">{t('settings.vault.timeout10')}</SelectItem>
        <SelectItem value="30">{t('settings.vault.timeout30')}</SelectItem>
        <SelectItem value="99999">{t('settings.vault.timeoutNever')}</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

**Step 2: Import useVaultStore at top of SettingsPage.tsx**

Add to imports:

```typescript
import { useVaultStore } from '../../stores/vaultStore'
```

**Step 3: Use vault store in the component**

Inside `SettingsPage`, add:

```typescript
const { security, setLockOnBlur, setAutoLockMinutes } = useVaultStore()
```

**Step 4: Add i18n keys**

Find the i18n translation files. Check where they are:

```bash
find /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste/src -name "*.json" | grep -i "en\|zh" | head -10
```

Add to the English translation file under a `settings.vault` key:

```json
"vault": {
  "title": "Vault Security",
  "lockOnBlur": "Lock when app closes",
  "lockOnBlurDesc": "Automatically lock the vault when you switch away",
  "lockOnBlurStrictNote": "Always locked in strict mode",
  "autoLockTimeout": "Auto-lock timeout",
  "autoLockTimeoutDesc": "Lock after this period of inactivity",
  "timeout1": "1 minute",
  "timeout5": "5 minutes",
  "timeout10": "10 minutes",
  "timeout30": "30 minutes",
  "timeoutNever": "Never"
}
```

Add equivalent Chinese translation keys.

**Step 5: Commit**

```bash
git add src/renderer/src/components/Settings/SettingsPage.tsx
git commit -m "feat(vault): add vault security settings UI in privacy section"
```

---

### Task 7: Add filterType and showFavoritesOnly to vaultStore

**Files:**
- Modify: `src/renderer/src/stores/vaultStore.ts`

**Context:** The sidebar needs to filter by item type and show only favorites. `filterType` is sent to the backend; `showFavoritesOnly` is frontend-only.

**Step 1: Add state fields to interface**

In `VaultState` interface, add:

```typescript
filterType: 'all' | 'login' | 'secure_note'
showFavoritesOnly: boolean
setFilterType: (type: 'all' | 'login' | 'secure_note') => Promise<void>
setShowFavoritesOnly: (v: boolean) => void
toggleFavorite: (id: string) => Promise<void>
```

**Step 2: Add initial values**

In the store `create()` call, add to the initial state:

```typescript
filterType: 'all',
showFavoritesOnly: false,
```

**Step 3: Update `loadItems` to use filterType**

In `loadItems`, change the `vaultListItems` call to pass `type`:

```typescript
const { security, query, filterType } = get()
// ...
const items = await window.api.vaultListItems({
  query: query || undefined,
  type: filterType !== 'all' ? filterType : undefined,
  limit: 100
})
```

**Step 4: Add new actions**

```typescript
setFilterType: async (type) => {
  set({ filterType: type })
  await get().loadItems()
},

setShowFavoritesOnly: (v) => set({ showFavoritesOnly: v }),

toggleFavorite: async (id) => {
  const { detail, loadItems, selectItem } = get()
  const currentFavorite = detail?.meta.id === id ? detail.meta.favorite : 0
  await window.api.vaultUpdateItem({ id, favorite: !currentFavorite })
  await loadItems()
  await selectItem(id)
},
```

**Step 5: Commit**

```bash
git add src/renderer/src/stores/vaultStore.ts
git commit -m "feat(vault): add filterType, showFavoritesOnly, toggleFavorite to vaultStore"
```

---

### Task 8: Add filter bar to VaultSidebar

**Files:**
- Modify: `src/renderer/src/components/Vault/VaultSidebar.tsx`

**Context:** Add a compact filter bar at the top of the sidebar with type tabs (All / Login / Note) and a star button for favorites-only.

**Step 1: Add imports**

Add to existing imports:

```typescript
import { Key, FileText, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
```

(Key and FileText are already imported; just add Star)

**Step 2: Pull new state from store**

In the component, add:

```typescript
const { filterType, setFilterType, showFavoritesOnly, setShowFavoritesOnly } = useVaultStore()
```

**Step 3: Compute filtered display items**

Before the return, add:

```typescript
const displayItems = showFavoritesOnly ? items.filter((i) => i.favorite === 1) : items
```

**Step 4: Add filter bar JSX**

Inside the sidebar div, before the scrollable item list, add:

```tsx
{/* Filter bar */}
<div className="flex items-center gap-1 px-2 pt-2 pb-1">
  <div className="flex items-center gap-0.5 flex-1 bg-muted/50 rounded-md p-0.5">
    {(['all', 'login', 'secure_note'] as const).map((type) => (
      <button
        key={type}
        onClick={() => setFilterType(type)}
        className={`flex-1 text-[10px] px-1.5 py-1 rounded transition-all font-medium ${
          filterType === type
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {type === 'all' ? t('vault.filter.all') : type === 'login' ? t('vault.filter.login') : t('vault.filter.note')}
      </button>
    ))}
  </div>
  <button
    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
    className={`p-1.5 rounded-md transition-colors ${
      showFavoritesOnly
        ? 'text-yellow-500 bg-yellow-500/10'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`}
    title={t('vault.filter.favoritesOnly')}
  >
    <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-yellow-500' : ''}`} />
  </button>
</div>
```

**Step 5: Replace `items.map` with `displayItems.map`**

In the render, change `items.map(...)` to `displayItems.map(...)`.

Also update the empty state check: `{displayItems.length === 0 && (...)}`

**Step 6: Add i18n keys**

```json
"filter": {
  "all": "All",
  "login": "Login",
  "note": "Note",
  "favoritesOnly": "Favorites only"
}
```

Add Chinese equivalents.

**Step 7: Commit**

```bash
git add src/renderer/src/components/Vault/VaultSidebar.tsx
git commit -m "feat(vault): add type filter tabs and favorites toggle to sidebar"
```

---

### Task 9: Add favorite toggle to VaultDetail

**Files:**
- Modify: `src/renderer/src/components/Vault/VaultDetail.tsx`

**Context:** The detail view shows an item. We add a star button in the header area next to the title.

**Step 1: Import Star icon and toggleFavorite**

Add `Star` to the existing lucide-react import line.

In the component destructure, add `toggleFavorite`:

```typescript
const { ..., toggleFavorite } = useVaultStore()
```

**Step 2: Find the detail header area**

Read `VaultDetail.tsx` fully to find where the title and edit button are rendered (around the section showing `detail.meta.title`). It will be in the non-editing view mode.

**Step 3: Add the star button next to the title**

In the detail header (where `detail.meta.title` is displayed), add a star button:

```tsx
<button
  onClick={() => toggleFavorite(detail.meta.id)}
  className={`p-1 rounded transition-colors ${
    detail.meta.favorite
      ? 'text-yellow-500 hover:text-yellow-600'
      : 'text-muted-foreground hover:text-foreground'
  }`}
  title={detail.meta.favorite ? t('vault.item.unfavorite') : t('vault.item.favorite')}
>
  <Star className={`w-4 h-4 ${detail.meta.favorite ? 'fill-yellow-500' : ''}`} />
</button>
```

**Step 4: Add i18n keys**

```json
"item": {
  "favorite": "Add to favorites",
  "unfavorite": "Remove from favorites"
}
```

**Step 5: Commit**

```bash
git add src/renderer/src/components/Vault/VaultDetail.tsx
git commit -m "feat(vault): add favorite toggle button to detail view"
```

---

### Task 10: Manual smoke test

**No code changes — verification only.**

**Test auto-lock:**
1. Start the app: `npm run dev`
2. Open the vault tab and unlock it
3. Press Cmd+W or click elsewhere to hide the panel
4. Re-open the panel (global shortcut) and navigate to vault
5. Expected: vault shows the lock screen

**Test settings:**
1. Open Settings → Privacy
2. Find the Vault Security section
3. Toggle "Lock when app closes" OFF (relaxed mode only)
4. Change timeout to 1 minute
5. Hide and re-show panel — vault should NOT lock immediately
6. Wait 1 minute — vault should auto-lock

**Test filter tabs:**
1. Unlock vault with multiple login + secure_note items
2. Click "Login" tab — only logins show
3. Click "Note" tab — only notes show
4. Click star button — shows only favorited items (or empty if none)

**Test favorite toggle:**
1. Open a vault item
2. Click the star button — star fills yellow
3. Enable "Favorites only" in sidebar — item appears
4. Click star again — item disappears from favorites filter

**Commit final state:**

```bash
git add -A
git commit -m "feat(vault): complete auto-lock and UX enhancement iteration"
```
