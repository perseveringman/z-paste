import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useClipboardStore } from '../../stores/clipboardStore'
import { Search, X } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export default function SearchBar(): React.JSX.Element {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const { searchQuery, search, setSearchQuery, isVisible } = useClipboardStore()

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
      setSearchQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        search(value)
      }, 300)
    },
    [search, setSearchQuery]
  )

  return (
    <div className="flex-1 relative group">
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        <Search className="w-4 h-4" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t('panel.search.placeholder')}
        className="h-9 pl-9 pr-8 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input shadow-none"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSearchQuery('')
            search('')
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
