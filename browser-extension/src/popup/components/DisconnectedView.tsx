import React from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

interface Props {
  onRetry: () => void
  loading: boolean
}

export function DisconnectedView({ onRetry, loading }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[480px] px-8 bg-white dark:bg-slate-900">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
        <WifiOff className="w-8 h-8 text-red-400 dark:text-red-500" />
      </div>

      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
        无法连接到 Stash 桌面端
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
        请确保 Stash 应用正在运行
      </p>

      <button
        onClick={onRetry}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        重新连接
      </button>
    </div>
  )
}
