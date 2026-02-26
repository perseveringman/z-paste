# Vault UX Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix clipboard shortcuts leaking into the vault view (Enter triggers paste instead of unlock), add vault keyboard navigation, complete i18n coverage of all hardcoded strings, and autofocus the password field on the lock screen.

**Architecture:** Four independent changes: (1) guard `useKeyboard` and PanelWindow's keydown handler so they no-op when `view === 'vault'`; (2) add a vault-local `keydown` handler in VaultView for arrow-key navigation and Escape; (3) add the missing locale keys for reset-flow/security-mode strings in all three locale files; (4) add `autoFocus` to the unlock password input.

**Tech Stack:** React 18, TypeScript, i18next/react-i18next, Electron renderer process.

---

### Task 1: Guard `useKeyboard` with a `view` parameter

**Files:**
- Modify: `src/renderer/src/hooks/useKeyboard.ts`
- Modify: `src/renderer/src/components/Panel/PanelWindow.tsx:28`

**Context:**
`useKeyboard()` is called unconditionally at PanelWindow line 28. It attaches a global `keydown` listener that fires on `Enter` (paste), arrow keys (navigate list), `d` (delete), and number keys (quick-paste). When the user is on the vault view and presses Enter in a password field, this hook intercepts it and pastes from the clipboard instead. The fix is to accept a `view` string param and bail out of all key handling when `view === 'vault'`.

**Step 1: Update `useKeyboard` signature and add guard**

Open `src/renderer/src/hooks/useKeyboard.ts`. Change the function signature from:
```typescript
export function useKeyboard(): void {
```
to:
```typescript
export function useKeyboard(view: string): void {
```

Then, inside `handleKeyDown`, add this as the very first line of the callback body (before the `const target = ...` line):
```typescript
if (view === 'vault') return
```

The full updated `handleKeyDown` start should look like:
```typescript
const handleKeyDown = useCallback(
  (e: KeyboardEvent) => {
    if (view === 'vault') return

    const target = document.activeElement?.tagName
    // ... rest unchanged
  },
  [view, items, selectedIndex, setSelectedIndex, pasteItem, deleteItem, setVisible, addToQueue, addMultipleToQueue, selectedItems, clearSelection]
)
```

Note: add `view` to the dependency array.

**Step 2: Pass `view` from PanelWindow**

Open `src/renderer/src/components/Panel/PanelWindow.tsx`. Find line 28:
```typescript
useKeyboard()
```
Change to:
```typescript
useKeyboard(view)
```

**Step 3: TypeScript check**

Run:
```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | head -40
```
Expected: no new errors (pre-existing vaultStore errors are unrelated and can be ignored).

**Step 4: Commit**
```bash
git add src/renderer/src/hooks/useKeyboard.ts src/renderer/src/components/Panel/PanelWindow.tsx
git commit -m "fix: suppress clipboard keyboard shortcuts when vault view is active"
```

---

### Task 2: Guard PanelWindow's own keydown handler for vault view

**Files:**
- Modify: `src/renderer/src/components/Panel/PanelWindow.tsx:84-113`

**Context:**
PanelWindow has its own `keydown` useEffect (lines 84–113) that handles shortcuts for toggling filters, toggling preview, opening tag picker, and opening settings. The filter/preview/tag shortcuts are clipboard-only features that must be suppressed in vault view. The settings shortcut (`openSettingsShortcut`) should still work from any view.

**Step 1: Add vault guard to clipboard-only shortcuts**

In the `handleKeyDown` inside the `useEffect` at PanelWindow lines 84–113, the current order is:
1. `matchShortcut(e, openSettingsShortcut)` → toggle settings
2. `matchShortcut(e, toggleFilterShortcut)` → toggleFilters
3. `matchShortcut(e, togglePreviewShortcut)` → togglePreview
4. `matchShortcut(e, openTagShortcut)` → open tag picker

Add a guard after the settings shortcut block so filters/preview/tags are suppressed in vault:

```typescript
const handleKeyDown = (e: KeyboardEvent): void => {
  if (matchShortcut(e, openSettingsShortcut)) {
    e.preventDefault()
    setView((v) => (v === 'settings' ? 'clipboard' : 'settings'))
    return
  }
  // Clipboard-only shortcuts — suppress when vault is active
  if (view === 'vault') return
  if (matchShortcut(e, toggleFilterShortcut)) {
    e.preventDefault()
    toggleFilters()
    return
  }
  if (matchShortcut(e, togglePreviewShortcut)) {
    e.preventDefault()
    togglePreview()
    return
  }
  if (matchShortcut(e, openTagShortcut)) {
    const target = document.activeElement?.tagName
    if (target === 'INPUT' || target === 'TEXTAREA') return
    if (tagPickerItemId) return
    if (selectedItem) {
      e.preventDefault()
      setTagPickerItemId(selectedItem.id)
    }
  }
}
```

The `view` variable is already in scope (from `useState` at the top of PanelWindow). Add `view` to the `useEffect` dependency array:
```typescript
}, [selectedItem, tagPickerItemId, view, togglePreview, toggleFilters, toggleFilterShortcut, togglePreviewShortcut, openTagShortcut, openSettingsShortcut])
```

**Step 2: TypeScript check**
```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | head -40
```
Expected: no new errors.

**Step 3: Commit**
```bash
git add src/renderer/src/components/Panel/PanelWindow.tsx
git commit -m "fix: suppress filter/preview/tag shortcuts in vault view"
```

---

### Task 3: Add vault keyboard navigation (arrow keys + Escape)

**Files:**
- Modify: `src/renderer/src/components/Vault/VaultView.tsx`

**Context:**
The main vault view (when unlocked) has a list of items in the left panel. There's no keyboard navigation. 1Password lets you navigate items with arrow keys and cancel edit/delete states with Escape. We add a `keydown` effect only active when the vault is unlocked and not in setup/locked state.

This effect handles:
- `ArrowDown` → select next item in list
- `ArrowUp` → select previous item in list
- `Escape` → cancel editing → cancel delete confirm (in that priority order)

**Step 1: Find the right place to add the effect**

In `VaultView.tsx`, there are already several `useEffect` blocks near the top (lines 88–108). Add a new one after the existing effects, before the early-return guards. This effect should only attach the listener when the vault is unlocked (i.e., `!security.locked && security.hasVaultSetup && !pendingRecoveryKey`).

**Step 2: Add the keyboard navigation effect**

Add this `useEffect` after the existing effects block (after line 108, before the `const canSetup = ...` line):

```typescript
useEffect(() => {
  // Only active on the main vault view (unlocked, setup complete, no pending recovery key)
  if (security.locked || !security.hasVaultSetup || pendingRecoveryKey) return

  const handle = (e: KeyboardEvent): void => {
    const inInput =
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA'

    if (e.key === 'Escape') {
      if (editingItem) {
        e.preventDefault()
        setEditingItem(false)
        return
      }
      if (deleteConfirmId) {
        e.preventDefault()
        setDeleteConfirmId(null)
        return
      }
      return
    }

    if (inInput) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const currentIndex = items.findIndex((item) => item.id === detail?.meta.id)
      if (items.length === 0) return
      let nextIndex: number
      if (currentIndex === -1) {
        nextIndex = 0
      } else if (e.key === 'ArrowDown') {
        nextIndex = Math.min(currentIndex + 1, items.length - 1)
      } else {
        nextIndex = Math.max(currentIndex - 1, 0)
      }
      if (items[nextIndex] && items[nextIndex].id !== detail?.meta.id) {
        selectItem(items[nextIndex].id)
      }
    }
  }

  window.addEventListener('keydown', handle)
  return () => window.removeEventListener('keydown', handle)
}, [security.locked, security.hasVaultSetup, pendingRecoveryKey, items, detail, editingItem, deleteConfirmId, selectItem])
```

**Step 3: TypeScript check**
```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | head -40
```
Expected: no new errors.

**Step 4: Commit**
```bash
git add src/renderer/src/components/Vault/VaultView.tsx
git commit -m "feat: add arrow-key navigation and Escape handling in vault main view"
```

---

### Task 4: Add autofocus to vault lock screen password input

**Files:**
- Modify: `src/renderer/src/components/Vault/VaultView.tsx`

**Context:**
When the vault is locked and the panel opens, the user must click the password field before typing. 1Password focuses the password field immediately. The fix is to add `autoFocus` to the unlock password `<Input>`.

**Step 1: Find the unlock password Input**

In `VaultView.tsx`, in the `security.locked` branch (around line 310), find the Input for unlocking with master password:
```tsx
<Input
  type="password"
  value={unlockPassword}
  onChange={(e) => setUnlockPassword(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && unlockPassword && !loading && unlock(unlockPassword)}
/>
```

**Step 2: Add `autoFocus`**

Change it to:
```tsx
<Input
  type="password"
  autoFocus
  value={unlockPassword}
  onChange={(e) => setUnlockPassword(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && unlockPassword && !loading && unlock(unlockPassword)}
/>
```

**Step 3: TypeScript check**
```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | head -40
```
Expected: no new errors.

**Step 4: Commit**
```bash
git add src/renderer/src/components/Vault/VaultView.tsx
git commit -m "feat: autofocus password field when vault lock screen is shown"
```

---

### Task 5: i18n — add missing locale keys for setup security mode strings

**Files:**
- Modify: `src/renderer/src/locales/en.json`
- Modify: `src/renderer/src/locales/zh-CN.json`
- Modify: `src/renderer/src/locales/zh-TW.json`
- Modify: `src/renderer/src/components/Vault/VaultView.tsx` (setup section only)

**Context:**
The vault setup section (lines 228–271 in VaultView.tsx) contains hardcoded English strings for security mode selection: "Security Mode", "Strict", "Relaxed", "Recovery key only. If lost, data cannot be recovered.", "Allows password reset via security question or Touch ID.", "Security Question", "Answer", "Or type a custom question...", "Your answer (case-insensitive)".

**Step 1: Add keys to `en.json`**

In `src/renderer/src/locales/en.json`, add the following keys after the `vault.setup.savedContinue` line:

```json
"vault.setup.securityMode": "Security Mode",
"vault.setup.strict": "Strict",
"vault.setup.relaxed": "Relaxed",
"vault.setup.strictDesc": "Recovery key only. If lost, data cannot be recovered.",
"vault.setup.relaxedDesc": "Allows password reset via security question or Touch ID.",
"vault.setup.securityQuestion": "Security Question",
"vault.setup.customQuestionPlaceholder": "Or type a custom question...",
"vault.setup.answer": "Answer",
"vault.setup.answerPlaceholder": "Your answer (case-insensitive)"
```

**Step 2: Add keys to `zh-CN.json`**

Add after `vault.setup.savedContinue`:
```json
"vault.setup.securityMode": "安全模式",
"vault.setup.strict": "严格",
"vault.setup.relaxed": "宽松",
"vault.setup.strictDesc": "仅限恢复密钥，丢失后数据无法恢复。",
"vault.setup.relaxedDesc": "允许通过安全问题或 Touch ID 重置密码。",
"vault.setup.securityQuestion": "安全问题",
"vault.setup.customQuestionPlaceholder": "或输入自定义问题...",
"vault.setup.answer": "答案",
"vault.setup.answerPlaceholder": "你的答案（不区分大小写）"
```

**Step 3: Add keys to `zh-TW.json`**

Add after `vault.setup.savedContinue`:
```json
"vault.setup.securityMode": "安全模式",
"vault.setup.strict": "嚴格",
"vault.setup.relaxed": "寬鬆",
"vault.setup.strictDesc": "僅限恢復金鑰，遺失後資料無法恢復。",
"vault.setup.relaxedDesc": "允許透過安全問題或 Touch ID 重設密碼。",
"vault.setup.securityQuestion": "安全問題",
"vault.setup.customQuestionPlaceholder": "或輸入自訂問題...",
"vault.setup.answer": "答案",
"vault.setup.answerPlaceholder": "你的答案（不分大小寫）"
```

**Step 4: Replace hardcoded strings in VaultView.tsx setup section**

In `VaultView.tsx`, in the setup section (the `!security.hasVaultSetup` branch), replace:

```tsx
<FieldLabel>Security Mode</FieldLabel>
```
with:
```tsx
<FieldLabel>{t('vault.setup.securityMode')}</FieldLabel>
```

```tsx
<Button size="sm" variant={securityMode === 'strict' ? 'default' : 'outline'} onClick={() => setSecurityMode('strict')}>
  Strict
</Button>
<Button size="sm" variant={securityMode === 'relaxed' ? 'default' : 'outline'} onClick={() => setSecurityMode('relaxed')}>
  Relaxed
</Button>
```
with:
```tsx
<Button size="sm" variant={securityMode === 'strict' ? 'default' : 'outline'} onClick={() => setSecurityMode('strict')}>
  {t('vault.setup.strict')}
</Button>
<Button size="sm" variant={securityMode === 'relaxed' ? 'default' : 'outline'} onClick={() => setSecurityMode('relaxed')}>
  {t('vault.setup.relaxed')}
</Button>
```

```tsx
{securityMode === 'strict'
  ? 'Recovery key only. If lost, data cannot be recovered.'
  : 'Allows password reset via security question or Touch ID.'}
```
with:
```tsx
{securityMode === 'strict'
  ? t('vault.setup.strictDesc')
  : t('vault.setup.relaxedDesc')}
```

```tsx
<FieldLabel>Security Question</FieldLabel>
```
with:
```tsx
<FieldLabel>{t('vault.setup.securityQuestion')}</FieldLabel>
```

```tsx
<Input placeholder="Or type a custom question..." value={hintQuestion} onChange={(e) => setHintQuestion(e.target.value)} />
<FieldLabel>Answer</FieldLabel>
<Input placeholder="Your answer (case-insensitive)" value={hintAnswer} onChange={(e) => setHintAnswer(e.target.value)} />
```
with:
```tsx
<Input placeholder={t('vault.setup.customQuestionPlaceholder')} value={hintQuestion} onChange={(e) => setHintQuestion(e.target.value)} />
<FieldLabel>{t('vault.setup.answer')}</FieldLabel>
<Input placeholder={t('vault.setup.answerPlaceholder')} value={hintAnswer} onChange={(e) => setHintAnswer(e.target.value)} />
```

**Step 5: TypeScript check**
```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | head -40
```

**Step 6: Commit**
```bash
git add src/renderer/src/locales/en.json src/renderer/src/locales/zh-CN.json src/renderer/src/locales/zh-TW.json src/renderer/src/components/Vault/VaultView.tsx
git commit -m "feat: i18n vault setup security mode strings"
```

---

### Task 6: i18n — add missing locale keys for reset flow and reset vault strings

**Files:**
- Modify: `src/renderer/src/locales/en.json`
- Modify: `src/renderer/src/locales/zh-CN.json`
- Modify: `src/renderer/src/locales/zh-TW.json`
- Modify: `src/renderer/src/components/Vault/VaultView.tsx` (locked + main view sections)

**Context:**
The locked screen reset flow (showResetFlow branch, lines 347–444) and the main view sidebar bottom (lines 491–509) contain hardcoded strings: "← Back", "1. Verify", "→", "2. New Password", "Your answer", "Verifying...", "Verify", "Verify with Touch ID", "New Password", "Confirm New Password", "Passwords do not match", "Resetting...", "Reset Password", "Delete all vault data?", "Delete", "Cancel", "Reset Vault…", "Forgot password?".

**Step 1: Add keys to `en.json`**

Add the following after the existing vault keys:

```json
"vault.locked.forgotPassword": "Forgot password?",

"vault.reset.back": "← Back",
"vault.reset.step1": "1. Verify",
"vault.reset.stepArrow": "→",
"vault.reset.step2": "2. New Password",
"vault.reset.answerPlaceholder": "Your answer",
"vault.reset.verifying": "Verifying...",
"vault.reset.verify": "Verify",
"vault.reset.verifyWithTouchId": "Verify with Touch ID",
"vault.reset.newPassword": "New Password",
"vault.reset.confirmNewPassword": "Confirm New Password",
"vault.reset.passwordMismatch": "Passwords do not match",
"vault.reset.resetting": "Resetting...",
"vault.reset.resetPassword": "Reset Password",

"vault.resetVault.prompt": "Delete all vault data?",
"vault.resetVault.delete": "Delete",
"vault.resetVault.cancel": "Cancel",
"vault.resetVault.button": "Reset Vault…"
```

**Step 2: Add keys to `zh-CN.json`**

```json
"vault.locked.forgotPassword": "忘记密码？",

"vault.reset.back": "← 返回",
"vault.reset.step1": "1. 验证",
"vault.reset.stepArrow": "→",
"vault.reset.step2": "2. 新密码",
"vault.reset.answerPlaceholder": "你的答案",
"vault.reset.verifying": "验证中...",
"vault.reset.verify": "验证",
"vault.reset.verifyWithTouchId": "使用 Touch ID 验证",
"vault.reset.newPassword": "新密码",
"vault.reset.confirmNewPassword": "确认新密码",
"vault.reset.passwordMismatch": "两次密码不一致",
"vault.reset.resetting": "重置中...",
"vault.reset.resetPassword": "重置密码",

"vault.resetVault.prompt": "删除所有保险库数据？",
"vault.resetVault.delete": "删除",
"vault.resetVault.cancel": "取消",
"vault.resetVault.button": "重置保险库…"
```

**Step 3: Add keys to `zh-TW.json`**

```json
"vault.locked.forgotPassword": "忘記密碼？",

"vault.reset.back": "← 返回",
"vault.reset.step1": "1. 驗證",
"vault.reset.stepArrow": "→",
"vault.reset.step2": "2. 新密碼",
"vault.reset.answerPlaceholder": "你的答案",
"vault.reset.verifying": "驗證中...",
"vault.reset.verify": "驗證",
"vault.reset.verifyWithTouchId": "使用 Touch ID 驗證",
"vault.reset.newPassword": "新密碼",
"vault.reset.confirmNewPassword": "確認新密碼",
"vault.reset.passwordMismatch": "兩次密碼不一致",
"vault.reset.resetting": "重設中...",
"vault.reset.resetPassword": "重設密碼",

"vault.resetVault.prompt": "刪除所有保險庫資料？",
"vault.resetVault.delete": "刪除",
"vault.resetVault.cancel": "取消",
"vault.resetVault.button": "重設保險庫…"
```

**Step 4: Replace hardcoded strings in VaultView.tsx**

In the locked screen `showResetFlow` branch (starting around line 347):

Replace:
```tsx
<button
  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
  onClick={() => setShowResetFlow(false)}
>
  ← Back
</button>
```
with:
```tsx
<button
  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
  onClick={() => setShowResetFlow(false)}
>
  {t('vault.reset.back')}
</button>
```

Replace:
```tsx
<span className={resetStep === 'verify' ? 'text-foreground font-medium' : ''}>1. Verify</span>
<span>→</span>
<span className={resetStep === 'newpw' ? 'text-foreground font-medium' : ''}>2. New Password</span>
```
with:
```tsx
<span className={resetStep === 'verify' ? 'text-foreground font-medium' : ''}>{t('vault.reset.step1')}</span>
<span>{t('vault.reset.stepArrow')}</span>
<span className={resetStep === 'newpw' ? 'text-foreground font-medium' : ''}>{t('vault.reset.step2')}</span>
```

Replace (in the verify step, the hint answer input):
```tsx
<Input
  placeholder="Your answer"
  value={resetHintAnswer}
```
with:
```tsx
<Input
  placeholder={t('vault.reset.answerPlaceholder')}
  value={resetHintAnswer}
```

Replace (the verify button):
```tsx
{loading ? 'Verifying...' : 'Verify'}
```
with:
```tsx
{loading ? t('vault.reset.verifying') : t('vault.reset.verify')}
```

Replace (Touch ID verify button label):
```tsx
Verify with Touch ID
```
with:
```tsx
{t('vault.reset.verifyWithTouchId')}
```

Replace (in the new password step):
```tsx
<FieldLabel>New Password</FieldLabel>
```
with:
```tsx
<FieldLabel>{t('vault.reset.newPassword')}</FieldLabel>
```

```tsx
<FieldLabel>Confirm New Password</FieldLabel>
```
with:
```tsx
<FieldLabel>{t('vault.reset.confirmNewPassword')}</FieldLabel>
```

```tsx
<p className="text-xs text-destructive">Passwords do not match</p>
```
with:
```tsx
<p className="text-xs text-destructive">{t('vault.reset.passwordMismatch')}</p>
```

```tsx
{loading ? 'Resetting...' : 'Reset Password'}
```
with:
```tsx
{loading ? t('vault.reset.resetting') : t('vault.reset.resetPassword')}
```

In the locked screen, replace the "Forgot password?" button text:
```tsx
Forgot password?
```
with:
```tsx
{t('vault.locked.forgotPassword')}
```

In the main view sidebar bottom (the `resetVaultConfirm` section, around line 491–509):

Replace:
```tsx
<span className="text-xs text-destructive flex-1">Delete all vault data?</span>
<Button variant="destructive" size="sm" onClick={async () => { await resetVault(); setResetVaultConfirm(false) }}>
  Delete
</Button>
<Button variant="outline" size="sm" onClick={() => setResetVaultConfirm(false)}>
  Cancel
</Button>
```
with:
```tsx
<span className="text-xs text-destructive flex-1">{t('vault.resetVault.prompt')}</span>
<Button variant="destructive" size="sm" onClick={async () => { await resetVault(); setResetVaultConfirm(false) }}>
  {t('vault.resetVault.delete')}
</Button>
<Button variant="outline" size="sm" onClick={() => setResetVaultConfirm(false)}>
  {t('vault.resetVault.cancel')}
</Button>
```

Replace the Reset Vault button text:
```tsx
Reset Vault…
```
with:
```tsx
{t('vault.resetVault.button')}
```

**Step 5: TypeScript check**
```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | head -40
```

**Step 6: Commit**
```bash
git add src/renderer/src/locales/en.json src/renderer/src/locales/zh-CN.json src/renderer/src/locales/zh-TW.json src/renderer/src/components/Vault/VaultView.tsx
git commit -m "feat: i18n vault reset flow and reset vault strings"
```

---

## Verification

After all tasks are complete, do a final check for any remaining hardcoded English strings in VaultView.tsx:

```bash
grep -n '"[A-Z][a-z]' /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste/src/renderer/src/components/Vault/VaultView.tsx | grep -v '//\|t(' | head -20
```

This greps for lines containing double-quoted strings starting with a capital letter (typical English UI strings) that don't already use the `t()` function. Review any results to determine if they need i18n keys.

Run a full typecheck:
```bash
cd /Users/ryanbzhou/Developer/vibe-coding/freedom/z-paste && npx tsc --noEmit 2>&1 | grep -v vaultStore
```
