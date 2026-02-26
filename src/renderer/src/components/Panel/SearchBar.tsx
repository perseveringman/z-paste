import { useRef, useEffect, useCallback } from 'react'
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
  const setClipboardQuery = useClipboardStore((state) => state.setSearchQuery)
  const clipboardQuery = useClipboardStore((state) => state.searchQuery)
  const isVisible = useClipboardStore((state) => state.isVisible)

  const vaultSearch = useVaultStore((state) => state.loadItems)
  const setVaultQuery = useVaultStore((state) => state.setQuery)
  const vaultQuery = useVaultStore((state) => state.query)

  const query = view === 'vault' ? vaultQuery : clipboardQuery

  useEffect(() => {
    if (isVisible && inputRef.current) {
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
      if (view === 'vault') {
        setVaultQuery(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          vaultSearch()
        }, 300)
      } else {
        setClipboardQuery(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          clipboardSearch(value)
        }, 300)
      }
    },
    [view, clipboardSearch, setClipboardQuery, vaultSearch, setVaultQuery]
  )

  const handleClear = useCallback(() => {
    if (view === 'vault') {
      setVaultQuery('')
      vaultSearch()
    } else {
      setClipboardQuery('')
      clipboardSearch('')
    }
  }, [view, clipboardSearch, setClipboardQuery, vaultSearch, setVaultQuery])

  return (
    <div className="flex-1 relative group">
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        <Search className="w-4 h-4" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={view === 'vault' ? t('vault.search.placeholder') : t('panel.search.placeholder')}
        className="h-9 pl-9 pr-8 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input shadow-none"
      />
      {query && (
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
