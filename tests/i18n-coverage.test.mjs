import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

test('all locale bundles expose the same translation keys', () => {
  const localeFiles = [
    'src/renderer/src/locales/zh-CN.json',
    'src/renderer/src/locales/en.json',
    'src/renderer/src/locales/zh-TW.json',
  ]

  const locales = Object.fromEntries(localeFiles.map((file) => [file, readJson(file)]))
  const canonicalKeys = Object.keys(locales['src/renderer/src/locales/zh-CN.json']).sort()

  for (const [file, locale] of Object.entries(locales)) {
    assert.deepEqual(
      Object.keys(locale).sort(),
      canonicalKeys,
      `${file} should stay in sync with zh-CN.json`
    )
  }
})

test('i18n resources include the audited missing keys', () => {
  const requiredKeys = [
    'vault.detail.selectItemDesc',
    'vault.detail.collapse',
    'vault.action.view',
    'vault.setup.recoveryKeyDesc',
    'vault.setup.hintQuestion.pet',
    'vault.setup.hintQuestion.birthCity',
    'vault.setup.hintQuestion.school',
    'vault.setup.hintQuestion.movie',
    'vault.setup.hintQuestion.nickname',
    'vault.field.website.placeholder',
    'vault.field.totpSecret.placeholder',
    'preview.toolbar.upper',
    'preview.toolbar.lower',
    'preview.toolbar.title',
    'preview.toolbar.camel',
    'preview.toolbar.snake',
    'preview.toolbar.kebab',
    'preview.toolbar.trim',
    'preview.toolbar.noSpace',
    'preview.json.valid',
    'preview.image.alt',
    'widget.imageFallback',
    'panel.tagBar.scrollLeft',
    'panel.tagBar.scrollRight',
     'panel.item.useCount',
     'menu.edit',
     'menu.view',
      'settings.shortcuts.widgetQuickPastePrefix.alt',
      'settings.shortcuts.widgetQuickPastePrefix.control',
      'settings.shortcuts.widgetQuickPastePrefix.command',
      'vault.error.setupFailed',
      'vault.error.unlockFailed',
      'vault.error.recoveryUnlockFailed',
      'vault.error.biometricUnlockFailed',
      'vault.error.hintUnlockFailed',
      'vault.error.resetPasswordFailed',
      'vault.error.createLoginFailed',
      'vault.error.createNoteFailed',
      'vault.error.resetVaultFailed',
      'vault.error.alreadyInitialized',
      'vault.error.notInitialized',
      'vault.error.invalidMasterPassword',
      'vault.error.invalidRecoveryKey',
      'vault.error.biometricUnavailable',
      'vault.error.biometricInvalidKey',
      'vault.error.hintUnavailable',
      'vault.error.invalidHintAnswer',
      'vault.error.locked',
      'vault.error.itemNotFound',
      'vault.error.itemSecretNotFound',
      'vault.error.invalidTotpSecret',
      'vault.error.passwordRequiresCharacterGroup',
      'vault.error.workerExited',
      'vault.error.workerRequestFailed',
      'vault.error.workerNotConnected',
      'vault.biometric.touchIdReason',
      'vault.import.previewMore',
      'vault.import.importFailed',
      'vault.import.parseFailed',
      'vault.import.importFailedGeneric',
      'vault.import.invalidChromeCsv',
      'vault.import.invalidOnePasswordCsv',
      'vault.import.invalidBitwardenJson',
      'vault.import.bitwardenEncrypted',
      'vault.import.bitwardenMissingItems',
      'vault.import.unsupportedFormat',
      'vault.import.untitled',
      'vault.import.entryError',
    ]

  for (const file of [
    'src/renderer/src/locales/zh-CN.json',
    'src/renderer/src/locales/en.json',
    'src/renderer/src/locales/zh-TW.json',
  ]) {
    const locale = readJson(file)
    for (const key of requiredKeys) {
      assert.ok(key in locale, `${file} should define ${key}`)
    }
  }
})

test('audited UI hotspots do not keep hardcoded or fallback copy', () => {
  const forbiddenSnippetsByFile = {
    'src/renderer/src/components/Vault/VaultSetup.tsx': [
      "t('vault.setup.next') || '下一步'",
      "t('vault.setup.recoveryKeyDesc') || 'This recovery key is the ONLY way to access your vault if you forget your master password. Save it in a safe place!'",
      'What was the name of your first pet?',
      'What city were you born in?',
      'What was the name of your first school?',
      'What is your favorite movie?',
      'What is your childhood nickname?',
    ],
    'src/renderer/src/components/Vault/VaultDetail.tsx': [
      "t('vault.detail.selectItemDesc') || 'Select an item from the sidebar to view or edit its contents securely.'",
      'placeholder="Secret key (Base32)"',
      "t('vault.action.autoTypeNoEnter') || 'Auto-type Only'",
    ],
    'src/renderer/src/components/Vault/VaultCardCarousel.tsx': [
      "t('vault.action.autoType') || 'Auto-type'",
      "t('vault.action.view') || 'View'",
      'aria-label="Close"',
    ],
    'src/renderer/src/components/Vault/VaultStackedView.tsx': [
      "t('vault.detail.collapse') || 'Collapse detail'",
    ],
    'src/renderer/src/components/Panel/TagBar.tsx': [
      'aria-label="Scroll tags left"',
      'aria-label="Scroll tags right"',
    ],
    'src/renderer/src/components/Panel/ClipboardItem.tsx': [
      '{item.use_count}次',
      '>image<',
    ],
    'src/renderer/src/components/Panel/ClipboardCardList.tsx': [
      '{item.use_count}次',
    ],
    'src/renderer/src/components/Widget/WidgetPanel.tsx': [
      "item.preview || 'Image'",
    ],
    'src/renderer/src/components/Preview/PreviewPanel.tsx': [
      "{ label: 'UPPER'",
      "{ label: 'lower'",
      "{ label: 'Title'",
      "{ label: 'camel'",
      "{ label: 'snake'",
      "{ label: 'kebab'",
      "{ label: 'Trim'",
      "{ label: 'NoSpace'",
    ],
    'src/renderer/src/components/Preview/JsonPreview.tsx': [
      "valid ? '✓ Valid JSON'",
    ],
    'src/renderer/src/components/Preview/ImagePreview.tsx': [
      'alt="Clipboard image"',
    ],
    'src/renderer/src/utils/formatters.ts': [
      'error: (e as Error).message',
    ],
    'src/renderer/src/components/Vault/VaultImportDialog.tsx': [
      'filters: [{ name: source.labelKey, extensions: source.ext }]',
      '…and {preview.total - 5} more',
      "setError(t('vault.import.parseError', { error: e instanceof Error ? e.message : String(e) }))",
      "setError(e instanceof Error ? e.message : String(e))",
      '<p key={i}>{err}</p>',
    ],
    'src/renderer/src/components/Settings/SettingsPage.tsx': [
      "label: '⌥ Option'",
      "label: '⌃ Control'",
      "label: '⌘ Command'",
    ],
    'src/renderer/src/stores/vaultStore.ts': [
      "'Setup failed'",
      "'Unlock failed'",
      "'Recovery unlock failed'",
      "'Biometric unlock failed'",
      "'Hint unlock failed'",
      "'Password reset failed'",
      "'Create login failed'",
      "'Create note failed'",
      "'Reset vault failed'",
    ],
    'src/main/index.ts': [
      "label: 'Edit'",
      "label: 'View'",
    ],
    'src/main/vault/session.ts': [
      "throw new Error('Vault is already initialized')",
      "throw new Error('Vault is not initialized')",
      "throw new Error('Invalid master password')",
      "throw new Error('Invalid recovery key')",
      "throw new Error('Biometric unlock is not available')",
      "throw new Error('Biometric unlock failed: stored key is invalid')",
      "throw new Error('Hint unlock is not available in strict mode')",
      "throw new Error('Invalid hint answer')",
      "throw new Error('Vault is locked')",
    ],
    'src/main/vault/service.ts': [
      "throw new Error('Vault item not found')",
      "throw new Error('Vault item secret not found')",
    ],
    'src/main/vault/totp.ts': [
      "throw new Error('Invalid TOTP secret')",
    ],
    'src/main/vault/password-generator.ts': [
      "throw new Error('At least one character group must be enabled')",
    ],
    'src/main/vault/worker-client.ts': [
      "'Vault worker process exited'",
      "'Vault worker request failed'",
      "'Vault worker is not connected'",
    ],
    'src/main/vault/worker.ts': [
      'throw new Error(`Invalid ${fieldName}`)',
      "throw new Error('Invalid kdf params')",
      "throw new Error('Unsupported vault worker action')",
    ],
    'src/main/vault/biometric.ts': [
      "'unlock Stash Vault'",
    ],
    'src/main/vault/import/chrome-csv.ts': [
      "throw new Error('Invalid Chrome CSV: missing username and password columns')",
      "|| 'Untitled'",
    ],
    'src/main/vault/import/onepassword-csv.ts': [
      "throw new Error('Invalid 1Password CSV: missing title and password columns')",
      "|| 'Untitled'",
    ],
    'src/main/vault/import/bitwarden-json.ts': [
      "throw new Error('Invalid Bitwarden JSON: failed to parse')",
      "throw new Error('Encrypted Bitwarden exports are not supported. Please export as unencrypted JSON.')",
      "throw new Error('Invalid Bitwarden JSON: missing items array')",
      "|| 'Untitled'",
    ],
    'src/main/vault/import/index.ts': [
      'Unsupported import format:',
      'Failed to import "',
    ],
  }

  for (const [file, snippets] of Object.entries(forbiddenSnippetsByFile)) {
    const source = readText(file)
    for (const snippet of snippets) {
      assert.ok(!source.includes(snippet), `${file} should not contain ${snippet}`)
    }
  }
})
