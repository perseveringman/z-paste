import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../stores/vaultStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { 
  Copy, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Check, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

interface VaultDetailProps {
  createType?: 'login' | 'secure_note' | null
  onCancelCreate?: () => void
}

export default function VaultDetail({ createType, onCancelCreate }: VaultDetailProps): React.JSX.Element {
  const { t } = useTranslation()
  const {
    detail,
    loading,
    loadItems,
    deleteItem,
    generatePassword,
    getTotpCode,
    autoType,
    createLogin,
    createSecureNote
  } = useVaultStore()

  const [editing, setEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [totp, setTotp] = useState<{ code: string; remain: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [autoTypeNotice, setAutoTypeNotice] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Edit/Create states
  const [editTitle, setEditTitle] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTotpSecret, setEditTotpSecret] = useState('')
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    if (detail) {
      setEditing(false)
      setDeleteConfirm(false)
      setShowPassword(false)
      setTotp(null)
      setAutoTypeNotice(null)
    }
  }, [detail?.meta.id])

  useEffect(() => {
    if (createType) {
      setEditTitle('')
      setEditWebsite('')
      setEditUsername('')
      setEditPassword('')
      setEditNotes('')
      setEditTotpSecret('')
      setEditContent('')
    }
  }, [createType])

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
      setEditContent(detail.fields.content)
    }
    setEditing(true)
  }

  const handleUpdate = async (): Promise<void> => {
    if (!detail) return
    const input: any = {
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
      input.secureNoteFields = { content: editContent }
    }
    await window.api.vaultUpdateItem(input)
    setEditing(false)
    await loadItems()
  }

  const handleCreate = async (): Promise<void> => {
    if (createType === 'login') {
      await createLogin({
        title: editTitle,
        website: editWebsite || null,
        username: editUsername,
        password: editPassword,
        notes: editNotes || null,
        totpSecret: editTotpSecret || null
      })
    } else if (createType === 'secure_note') {
      await createSecureNote({
        title: editTitle,
        content: editContent
      })
    }
    onCancelCreate?.()
  }

  const handleCopy = async (text: string, field: string): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleGeneratePassword = async (): Promise<void> => {
    const generated = await generatePassword({
      length: 20,
      useUppercase: true,
      useLowercase: true,
      useNumbers: true,
      useSymbols: true
    })
    setEditPassword(generated)
  }

  const handleTotp = async (): Promise<void> => {
    if (!detail) return
    const result = await getTotpCode(detail.meta.id)
    if (result) {
      setTotp({ code: result.code, remain: result.remainingSeconds })
      await navigator.clipboard.writeText(result.code)
      setCopiedField('totp')
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const handleAutoType = async (submit: boolean): Promise<void> => {
    if (!detail) return
    const result = await autoType(detail.meta.id, submit)
    setAutoTypeNotice(result.fallbackCopied ? t('vault.autoType.fallback') : t('vault.autoType.sent'))
    setTimeout(() => setAutoTypeNotice(null), 3000)
  }

  if (!detail && !createType) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
          <ShieldCheck className="w-8 h-8 opacity-20" />
        </div>
        <h3 className="text-lg font-medium text-muted-foreground">{t('vault.detail.selectItem')}</h3>
        <p className="text-sm text-muted-foreground/60 max-w-xs mt-1">
          {t('vault.detail.selectItemDesc') || 'Select an item from the sidebar to view or edit its contents securely.'}
        </p>
      </div>
    )
  }

  const isCreatingOrEditing = editing || createType

  return (
    <div className="h-full flex flex-col bg-background">
      <AnimatePresence mode="wait">
        {isCreatingOrEditing ? (
          <motion.div 
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Edit/Create Header */}
            <div className="h-14 px-6 border-b flex items-center justify-between shrink-0">
              <h3 className="font-semibold">{createType ? t('vault.newItem') : t('vault.action.edit')}</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => editing ? setEditing(false) : onCancelCreate?.()}>{t('vault.action.cancel')}</Button>
                <Button size="sm" onClick={createType ? handleCreate : handleUpdate} disabled={loading || !editTitle.trim()}>{t('vault.action.save')}</Button>
              </div>
            </div>

            {/* Edit/Create Form */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('vault.field.title')}</label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                </div>

                {(createType === 'login' || (detail?.type === 'login' && editing)) ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t('vault.field.website')}</label>
                      <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t('vault.field.username')}</label>
                        <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t('vault.field.password')}</label>
                        <div className="flex gap-2">
                          <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                          <Button variant="outline" size="sm" onClick={handleGeneratePassword}>{t('vault.action.generate')}</Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t('vault.field.totpSecret')}</label>
                      <Input value={editTotpSecret} onChange={(e) => setEditTotpSecret(e.target.value)} placeholder="Secret key (Base32)" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t('vault.field.notes')}</label>
                      <textarea
                        className="w-full min-h-32 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder={t('vault.field.notes')}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('vault.field.content')}</label>
                    <textarea
                      className="w-full min-h-[400px] rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Detail Header */}
            <div className="px-8 py-6 border-b shrink-0 bg-muted/5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold truncate">{detail.meta.title}</h2>
                    {detail.meta.website && (
                      <a 
                        href={detail.meta.website.startsWith('http') ? detail.meta.website : `https://${detail.meta.website}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {detail.meta.website && (
                    <p className="text-sm text-muted-foreground truncate">{detail.meta.website}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={startEditing} className="h-9 px-3">
                    <Edit2 className="w-3.5 h-3.5 mr-2" />
                    {t('vault.action.edit')}
                  </Button>
                  
                  {deleteConfirm ? (
                    <div className="flex items-center gap-1 bg-destructive/10 p-1 rounded-md border border-destructive/20">
                      <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={() => deleteItem(detail.meta.id)}>
                        {t('vault.confirm.yes')}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setDeleteConfirm(false)}>
                        {t('vault.confirm.no')}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(true)} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {detail.type === 'login' && (
                <div className="flex items-center gap-3 mt-6">
                  <Button variant="default" size="sm" onClick={() => handleAutoType(true)} className="h-9 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                    {t('vault.action.autoType')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAutoType(false)} className="h-9">
                    {t('vault.action.autoTypeNoEnter') || 'Auto-type Only'}
                  </Button>
                  {autoTypeNotice && (
                    <span className="text-xs font-medium text-primary animate-in fade-in slide-in-from-left-2">
                      {autoTypeNotice}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-2xl mx-auto space-y-8">
                {detail.type === 'login' && (
                  <div className="grid grid-cols-1 gap-6">
                    {/* Credential Card */}
                    <div className="p-1 rounded-2xl bg-muted/30 border border-muted/50 overflow-hidden">
                      <div className="bg-background rounded-[14px] overflow-hidden shadow-sm">
                        {/* Username Field */}
                        <div className="p-4 flex items-center justify-between border-b border-muted/30 group">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{t('vault.field.username')}</p>
                            <p className="font-medium text-sm truncate">{detail.fields.username}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-8 w-8 transition-opacity ${copiedField === 'username' ? 'text-green-500' : 'text-muted-foreground'}`}
                            onClick={() => handleCopy(detail.fields.username, 'username')}
                          >
                            {copiedField === 'username' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        {/* Password Field */}
                        <div className="p-4 flex items-center justify-between group">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{t('vault.field.password')}</p>
                            <p className="font-mono text-sm truncate tracking-wider">
                              {showPassword ? detail.fields.password : '••••••••••••'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 transition-opacity ${copiedField === 'password' ? 'text-green-500' : 'text-muted-foreground'}`}
                              onClick={() => handleCopy(detail.fields.password, 'password')}
                            >
                              {copiedField === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TOTP Section */}
                    {detail.fields.totpSecret && (
                      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider mb-1">{t('vault.field.totp')}</p>
                          <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-mono font-bold tracking-[0.2em] text-primary">
                              {totp?.code || '••••••'}
                            </span>
                            {totp && (
                              <div className="flex items-center gap-1.5 text-xs text-primary/60 font-medium">
                                <Clock className="w-3 h-3" />
                                {totp.remain}s
                              </div>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={handleTotp} 
                          className="h-10 px-4 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        >
                          {copiedField === 'totp' ? <Check className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                          {t('vault.action.getTotpCode')}
                        </Button>
                      </div>
                    )}

                    {/* Notes Section */}
                    {detail.fields.notes && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('vault.field.notes')}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] px-2 text-muted-foreground"
                            onClick={() => handleCopy(detail.fields.notes!, 'notes')}
                          >
                            {copiedField === 'notes' ? t('vault.action.copied') : t('vault.action.copy')}
                          </Button>
                        </div>
                        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none p-5 rounded-2xl bg-muted/20 border border-muted/30">
                          <ReactMarkdown>{detail.fields.notes}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {detail.type === 'secure_note' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('vault.item.secureNote')}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] px-2 text-muted-foreground"
                        onClick={() => handleCopy(detail.fields.content, 'note')}
                      >
                        {copiedField === 'note' ? t('vault.action.copied') : t('vault.action.copy')}
                      </Button>
                    </div>
                    <div className="prose prose-neutral dark:prose-invert max-w-none p-8 rounded-2xl bg-muted/20 border border-muted/30 min-h-[400px]">
                      <ReactMarkdown>{detail.fields.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
