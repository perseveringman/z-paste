import { useEffect, useMemo, useState } from 'react'
import { useVaultStore } from '../../stores/vaultStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

function FieldLabel({ children }: { children: string }): React.JSX.Element {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>
}

export default function VaultView(): React.JSX.Element {
  const {
    items,
    detail,
    security,
    loading,
    error,
    recoveryKey,
    query,
    setQuery,
    refreshSecurity,
    setupMasterPassword,
    unlock,
    unlockWithRecoveryKey,
    unlockWithBiometric,
    lock,
    loadItems,
    selectItem,
    createLogin,
    createSecureNote,
    deleteItem,
    clearError,
    generatePassword,
    getTotpCode,
    autoType
  } = useVaultStore()

  const [masterPassword, setMasterPassword] = useState('')
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState('')
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlockRecoveryKey, setUnlockRecoveryKey] = useState('')

  const [createType, setCreateType] = useState<'login' | 'secure_note'>('login')
  const [title, setTitle] = useState('')
  const [website, setWebsite] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [totpCode, setTotpCode] = useState<string | null>(null)
  const [totpRemain, setTotpRemain] = useState<number | null>(null)
  const [autoTypeNotice, setAutoTypeNotice] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showDetailPassword, setShowDetailPassword] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTotpSecret, setEditTotpSecret] = useState('')
  const [editNoteContent, setEditNoteContent] = useState('')

  useEffect(() => {
    refreshSecurity()
  }, [refreshSecurity])

  useEffect(() => {
    if (!security.locked && security.hasVaultSetup) {
      loadItems()
    }
  }, [security.locked, security.hasVaultSetup, query, loadItems])

  useEffect(() => {
    setShowDetailPassword(false)
    setEditingItem(false)
    setDeleteConfirmId(null)
  }, [detail?.meta.id])

  const canSetup = masterPassword.length >= 8 && masterPassword === masterPasswordConfirm

  const selectedTitle = useMemo(() => {
    if (!detail) return ''
    return detail.meta.title
  }, [detail])

  const resetCreateForm = (): void => {
    setTitle('')
    setWebsite('')
    setUsername('')
    setPassword('')
    setNotes('')
    setTotpSecret('')
    setNoteContent('')
  }

  const copyText = async (value: string): Promise<void> => {
    await navigator.clipboard.writeText(value)
  }

  const handleCreate = async (): Promise<void> => {
    if (!title.trim()) return
    if (createType === 'login') {
      await createLogin({
        title,
        website: website || null,
        username,
        password,
        notes: notes || null,
        totpSecret: totpSecret || null
      })
    } else {
      await createSecureNote({
        title,
        content: noteContent
      })
    }
    resetCreateForm()
  }

  const handleGeneratePassword = async (): Promise<void> => {
    const generated = await generatePassword({
      length: 20,
      useUppercase: true,
      useLowercase: true,
      useNumbers: true,
      useSymbols: true
    })
    setPassword(generated)
  }

  const startEditing = (): void => {
    if (!detail) return
    setEditTitle(detail.meta.title)
    setEditWebsite(detail.meta.website || '')
    if (detail.type === 'login') {
      setEditUsername(detail.fields.username)
      setEditPassword(detail.fields.password)
      setEditNotes(detail.fields.notes || '')
      setEditTotpSecret(detail.fields.totpSecret || '')
    } else {
      setEditNoteContent(detail.fields.content)
    }
    setEditingItem(true)
  }

  const handleUpdate = async (): Promise<void> => {
    if (!detail) return
    const input: Record<string, unknown> = {
      id: detail.meta.id,
      title: editTitle
    }
    if (detail.type === 'login') {
      input.website = editWebsite || null
      input.loginFields = {
        username: editUsername,
        password: editPassword,
        notes: editNotes || null,
        totpSecret: editTotpSecret || null
      }
    } else {
      input.secureNoteFields = { content: editNoteContent }
    }
    await window.api.vaultUpdateItem(input as Parameters<typeof window.api.vaultUpdateItem>[0])
    setEditingItem(false)
    await loadItems()
  }

  if (!security.hasVaultSetup) {
    return (
      <div className="h-full p-6 overflow-auto">
        <h2 className="text-lg font-semibold mb-2">Vault Setup</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Set a master password. Save your recovery key in a safe place.
        </p>
        <div className="space-y-3 max-w-md">
          <div className="space-y-1">
            <FieldLabel>Master Password</FieldLabel>
            <Input type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <FieldLabel>Confirm Password</FieldLabel>
            <Input
              type="password"
              value={masterPasswordConfirm}
              onChange={(e) => setMasterPasswordConfirm(e.target.value)}
            />
          </div>
          <Button disabled={!canSetup || loading} onClick={() => setupMasterPassword(masterPassword)}>
            {loading ? 'Setting up...' : 'Set Master Password'}
          </Button>
          {error && (
            <p className="text-sm text-destructive cursor-pointer" onClick={clearError}>
              {error}
            </p>
          )}
          {recoveryKey && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Recovery Key — save this in a safe place!</p>
              <p className="font-mono text-sm break-all">{recoveryKey}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => copyText(recoveryKey)}>
                Copy Recovery Key
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (security.locked) {
    return (
      <div className="h-full p-6 overflow-auto">
        <h2 className="text-lg font-semibold mb-2">Vault Locked</h2>
        <p className="text-sm text-muted-foreground mb-4">Unlock with master password or recovery key.</p>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-2">
            <FieldLabel>Master Password</FieldLabel>
            <Input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} />
            <Button onClick={() => unlock(unlockPassword)} disabled={!unlockPassword || loading}>
              Unlock
            </Button>
          </div>
          <div className="space-y-2">
            <FieldLabel>Recovery Key</FieldLabel>
            <Input value={unlockRecoveryKey} onChange={(e) => setUnlockRecoveryKey(e.target.value)} />
            <Button onClick={() => unlockWithRecoveryKey(unlockRecoveryKey)} disabled={!unlockRecoveryKey || loading}>
              Unlock by Recovery Key
            </Button>
          </div>
        </div>
        {security.hasBiometricUnlock && (
          <div className="mt-4">
            <Button variant="outline" onClick={() => unlockWithBiometric()} disabled={loading}>
              Unlock with Touch ID / Keychain
            </Button>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive mt-3 cursor-pointer" onClick={clearError}>
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex">
      <div className="w-[34%] border-r min-h-0 flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search vault..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="outline" onClick={() => lock()}>
              Lock
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => selectItem(item.id)}
              className={`w-full text-left rounded-md px-3 py-2 border transition-colors ${
                detail?.meta.id === item.id
                  ? 'bg-accent text-accent-foreground border-transparent'
                  : 'hover:bg-muted/40 border-transparent'
              }`}
            >
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.type === 'login' ? item.website || 'Login' : 'Secure Note'}</p>
            </button>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground p-2">No vault items</p>}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={createType === 'login' ? 'default' : 'outline'}
              onClick={() => setCreateType('login')}
            >
              New Login
            </Button>
            <Button
              size="sm"
              variant={createType === 'secure_note' ? 'default' : 'outline'}
              onClick={() => setCreateType('secure_note')}
            >
              New Secure Note
            </Button>
          </div>
          <div className="space-y-2">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            {createType === 'login' ? (
              <>
                <Input placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <div className="flex gap-2">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                  <Button variant="outline" onClick={handleGeneratePassword}>
                    Generate
                  </Button>
                </div>
                <Input placeholder="TOTP Secret (base32, optional)" value={totpSecret} onChange={(e) => setTotpSecret(e.target.value)} />
                <textarea
                  className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            ) : (
              <textarea
                className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Secure note content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            )}
          </div>
          <Button onClick={handleCreate} disabled={loading || !title.trim()}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="rounded-md border p-3">
          {!detail ? (
            <p className="text-sm text-muted-foreground">Select an item to view details</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{selectedTitle}</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    Edit
                  </Button>
                  {deleteConfirmId === detail.meta.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-destructive">Confirm?</span>
                      <Button variant="destructive" size="sm" onClick={() => { deleteItem(detail.meta.id); setDeleteConfirmId(null) }}>
                        Yes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmId(detail.meta.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              {editingItem && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/20">
                  <Input placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  {detail.type === 'login' ? (
                    <>
                      <Input placeholder="Website" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
                      <Input placeholder="Username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                      <Input type="password" placeholder="Password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                      <Input placeholder="TOTP Secret" value={editTotpSecret} onChange={(e) => setEditTotpSecret(e.target.value)} />
                      <textarea
                        className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Notes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </>
                  ) : (
                    <textarea
                      className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Content"
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={loading}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingItem(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {detail.type === 'login' ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const result = await autoType(detail.meta.id, false)
                        setAutoTypeNotice(
                          result.fallbackCopied
                            ? 'Auto-Type failed, password copied as fallback.'
                            : 'Auto-Type sent.'
                        )
                      }}
                    >
                      Auto Type
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const result = await autoType(detail.meta.id, true)
                        setAutoTypeNotice(
                          result.fallbackCopied
                            ? 'Auto-Type failed, password copied as fallback.'
                            : 'Auto-Type sent.'
                        )
                      }}
                    >
                      Auto Type + Enter
                    </Button>
                    {autoTypeNotice && <span className="text-xs text-muted-foreground">{autoTypeNotice}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-muted-foreground">Username</span>
                    <span className="font-mono">{detail.fields.username}</span>
                    <Button size="sm" variant="outline" onClick={() => copyText(detail.fields.username)}>Copy</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-muted-foreground">Password</span>
                    <span className="font-mono">{showDetailPassword ? detail.fields.password : '••••••••'}</span>
                    <Button size="sm" variant="ghost" onClick={() => setShowDetailPassword(!showDetailPassword)}>
                      {showDetailPassword ? 'Hide' : 'Show'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyText(detail.fields.password)}>Copy</Button>
                  </div>
                  {detail.fields.totpSecret && (
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-muted-foreground">TOTP</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const result = await getTotpCode(detail.meta.id)
                          setTotpCode(result?.code || null)
                          setTotpRemain(result?.remainingSeconds || null)
                          if (result?.code) {
                            await copyText(result.code)
                          }
                        }}
                      >
                        Get & Copy Code
                      </Button>
                      {totpCode && (
                        <span className="font-mono">{totpCode} ({totpRemain}s)</span>
                      )}
                    </div>
                  )}
                  {detail.fields.notes && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Notes</p>
                      <p className="whitespace-pre-wrap">{detail.fields.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Button size="sm" variant="outline" onClick={() => copyText(detail.fields.content)}>Copy Note</Button>
                  <p className="text-sm whitespace-pre-wrap">{detail.fields.content}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
