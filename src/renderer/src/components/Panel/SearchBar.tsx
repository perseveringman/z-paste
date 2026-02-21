import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useClipboardStore } from '../../stores/clipboardStore'
import { Search, X } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export default function SearchBar(): React.JSX.Element {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const { searchQuery, search, isVisible } = useClipboardStore()

  // Don't auto-focus search — let number keys 1-9 trigger quick paste.
  // Typing any character will focus the search bar via useKeyboard redirect.
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.blur()
    }
  }, [isVisible])

  return (
    <div className="flex-1 relative group">
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        <Search className="w-4 h-4" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => search(e.target.value)}
        placeholder={t('panel.search.placeholder')}
        className="h-9 pl-9 pr-8 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input shadow-none"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => search('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
