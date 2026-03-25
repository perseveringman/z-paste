import React, { useState, useRef, useEffect } from 'react'
import { Lock, Eye, EyeOff, Key } from 'lucide-react'

interface Props {
  onUnlock: (password: string) => Promise<void>
  securityMode: 'strict' | 'relaxed'
  hintQuestion: string | null
}

export function UnlockView({ onUnlock, securityMode, hintQuestion }: Props) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return

    setError('')
    setLoading(true)
    try {
      await onUnlock(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码错误，请重试')
      setPassword('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[480px] px-8 bg-white dark:bg-slate-900">
      {/* Branding */}
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/20">
        <Key className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
        Stash
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
        输入主密码以解锁密码库
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="主密码"
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 text-center animate-shake">
            {error}
          </p>
        )}

        {securityMode === 'relaxed' && hintQuestion && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            提示：{hintQuestion}
          </p>
        )}

        <button
          type="submit"
          disabled={!password.trim() || loading}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {loading ? '解锁中…' : '解锁'}
        </button>
      </form>
    </div>
  )
}
