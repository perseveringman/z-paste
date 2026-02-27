import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useClipboardStore } from '../../stores/clipboardStore'
import { useVaultStore } from '../../stores/vaultStore'
import { Search, X } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

interface SearchBarProps {
  view: 'clipboard' | 'vault' | 'templates' | 'settings' | 'onboarding'
}

export default function SearchBar({ view }: SearchBarProps): React.JSX.Element {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const clipboardSearch = useClipboardStore((state) => state.search)
  const clipboardQuery = useClipboardStore((state) => state.searchQuery)
  const isVisible = useClipboardStore((state) => state.isVisible)

  const vaultSearch = useVaultStore((state) => state.loadItems)
  const setVaultQuery = useVaultStore((state) => state.setQuery)
  const vaultQuery = useVaultStore((state) => state.query)

  // Local state drives the input display immediately; debounce triggers actual search
  const [localQuery, setLocalQuery] = useState(view === 'vault' ? vaultQuery : clipboardQuery)

  // Sync local state when panel becomes visible (store resets searchQuery to '')
  useEffect(() => {
    if (isVisible) {
      setLocalQuery('')
    }
  }, [isVisible])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (value: string) => {
      setLocalQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (view === 'vault') {
        setVaultQuery(value)
        debounceRef.current = setTimeout(() => {
          vaultSearch()
        }, 300)
      } else {
        debounceRef.current = setTimeout(() => {
          clipboardSearch(value)
        }, 300)
      }
    },
    [view, clipboardSearch, vaultSearch, setVaultQuery]
  )

  const handleClear = useCallback(() => {
    setLocalQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (view === 'vault') {
      setVaultQuery('')
      vaultSearch()
    } else {
      clipboardSearch('')
    }
  }, [view, clipboardSearch, vaultSearch, setVaultQuery])

  return (
    <div className="flex-1 relative group">
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        <Search className="w-4 h-4" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={localQuery}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={view === 'vault' ? t('vault.search.placeholder') : t('panel.search.placeholder')}
        className="h-9 pl-9 pr-8 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input shadow-none"
      />
      {localQuery && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
