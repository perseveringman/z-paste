import React, { useState, useEffect } from 'react'
import {
  ArrowLeft, Copy, Eye, EyeOff, Key, FileText, Star, ExternalLink,
} from 'lucide-react'
import type { VaultItemMeta, VaultItemDetail, VaultLoginFields } from '../../shared/types'
import { t } from '../../shared/i18n'

interface Props {
  item: VaultItemMeta
  onBack: () => void
}

export function ItemDetailView({ item, onBack }: Props) {
  const [detail, setDetail] = useState<VaultItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [filling, setFilling] = useState(false)

  useEffect(() => {
    setLoading(true)
    chrome.runtime.sendMessage({ type: 'getItemDetail', id: item.id })
      .then((resp: VaultItemDetail) => setDetail(resp))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [item.id])

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // fallback
    }
  }

  const handleFill = async () => {
    if (!detail || detail.type !== 'login') return
    const fields = detail.fields as VaultLoginFields
    setFilling(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        await chrome.runtime.sendMessage({
          type: 'fillCredentials',
          tabId: tab.id,
          username: fields.username,
          password: fields.password,
        })
        window.close()
      }
    } catch {
      // ignore
    } finally {
      setFilling(false)
    }
  }

  const isLogin = detail?.type === 'login'
  const loginFields = isLogin ? (detail!.fields as VaultLoginFields) : null

  return (
    <div className="flex flex-col h-full min-h-[480px] bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onBack}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate flex-1">
          {item.title}
        </h2>
        {item.favorite > 0 && (
          <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !detail ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          {t('loadFailed')}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Item header */}
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLogin ? 'bg-blue-500' : 'bg-violet-500'}`}>
              {isLogin ? <Key className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {detail.meta.title}
              </p>
              {detail.meta.website && (
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {detail.meta.website}
                </p>
              )}
            </div>
          </div>

          {/* Login fields */}
          {isLogin && loginFields && (
            <>
              {/* Username */}
              <FieldRow
                label={t('username')}
                value={loginFields.username}
                copied={copiedField === 'username'}
                onCopy={() => copyToClipboard(loginFields.username, 'username')}
              />

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('password')}
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="flex-1 text-sm font-mono text-slate-800 dark:text-slate-100 truncate select-all">
                    {showPassword ? loginFields.password : '••••••••••••'}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title={showPassword ? t('hide') : t('show')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <CopyButton
                    copied={copiedField === 'password'}
                    onClick={() => copyToClipboard(loginFields.password, 'password')}
                  />
                </div>
              </div>

              {/* TOTP */}
              {loginFields.totpSecret && (
                <FieldRow
                  label={t('totpSecret')}
                  value={loginFields.totpSecret}
                  copied={copiedField === 'totp'}
                  onCopy={() => copyToClipboard(loginFields.totpSecret!, 'totp')}
                  mono
                />
              )}

              {/* Fill button */}
              <button
                onClick={handleFill}
                disabled={filling}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors mt-2"
              >
                {filling ? t('filling') : t('autoFill')}
              </button>
            </>
          )}

          {/* Notes */}
          {isLogin && loginFields?.notes && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('notes')}
              </label>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {loginFields.notes}
                </p>
              </div>
            </div>
          )}

          {/* Secure note content */}
          {!isLogin && 'content' in detail.fields && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('content')}
              </label>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {(detail.fields as { content: string }).content}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Copied toast */}
      {copiedField && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium shadow-lg animate-fade-in">
          {t('copied')}
        </div>
      )}
    </div>
  )
}

function FieldRow({
  label,
  value,
  copied,
  onCopy,
  mono,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  mono?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
        <span className={`flex-1 text-sm text-slate-800 dark:text-slate-100 truncate select-all ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        <CopyButton copied={copied} onClick={onCopy} />
      </div>
    </div>
  )
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
      title={t('copy')}
    >
      {copied ? (
        <span className="text-xs text-emerald-500 font-medium">✓</span>
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  )
}
