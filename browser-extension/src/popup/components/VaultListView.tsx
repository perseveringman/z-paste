import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Lock, Star, Key, FileText } from 'lucide-react'
import type { VaultItemMeta } from '../../shared/types'
import { t } from '../../shared/i18n'

interface Props {
  onLock: () => void
  onSelectItem: (item: VaultItemMeta) => void
}

export function VaultListView({ onLock, onSelectItem }: Props) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<VaultItemMeta[]>([])
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchItems = useCallback(async (search?: string) => {
    setLoading(true)
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'listItems',
        query: search || undefined,
        limit: 50,
      })
      const list = Array.isArray(resp) ? resp : []
      // Sort: favorites first, then by last_used_at desc, then updated_at desc
      list.sort((a: VaultItemMeta, b: VaultItemMeta) => {
        if (a.favorite !== b.favorite) return b.favorite - a.favorite
        const aTime = a.last_used_at ?? a.updated_at
        const bTime = b.last_used_at ?? b.updated_at
        return bTime - aTime
      })
      setItems(list)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    searchRef.current?.focus()
  }, [fetchItems])

  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchItems(value), 200)
  }

  const getItemIcon = (item: VaultItemMeta) => {
    if (item.type === 'secure_note') {
      return <FileText className="w-4 h-4 text-white" />
    }
    return <Key className="w-4 h-4 text-white" />
  }

  const getInitialColor = (title: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    ]
    const idx = title.charCodeAt(0) % colors.length
    return colors[idx]
  }

  return (
    <div className="flex flex-col h-full min-h-[480px] bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Stash
        </h1>
        <button
          onClick={onLock}
          title={t('lock')}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('searchVault')}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
            <Search className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">
              {query ? t('noMatch') : t('vaultEmpty')}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left group"
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg ${getInitialColor(item.title)} flex items-center justify-center flex-shrink-0`}>
                  {getItemIcon(item)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {item.title}
                    </span>
                    {item.favorite > 0 && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  {item.website && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">
                      {item.website}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
