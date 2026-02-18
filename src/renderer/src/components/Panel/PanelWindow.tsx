import { useState, useCallback, useEffect, useRef } from 'react'
import SearchBar from './SearchBar'
import ClipboardList from './ClipboardList'
import FilterTabs from './FilterTabs'
import Sidebar from './Sidebar'
import TagPicker from './TagPicker'
import PreviewPanel from '../Preview/PreviewPanel'
import QuickEdit from './QuickEdit'
import TemplateList from '../Templates/TemplateList'
import SettingsPage from '../Settings/SettingsPage'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useSearch } from '../../hooks/useSearch'
import { useClipboardStore } from '../../stores/clipboardStore'
import { Settings } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

type PanelView = 'clipboard' | 'templates' | 'settings'

export default function PanelWindow(): React.JSX.Element {
  useKeyboard()
  const items = useSearch()
  const { selectedIndex, pasteItem } = useClipboardStore()
  const selectedItem = items[selectedIndex] || null

  const [view, setView] = useState<PanelView>('clipboard')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [tagPickerItemId, setTagPickerItemId] = useState<string | null>(null)
  const tagPickerAnchorRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = useCallback((itemId: string) => {
    setEditingItem(itemId)
  }, [])

  const handleEditSave = useCallback(
    (content: string) => {
      navigator.clipboard.writeText(content)
      setEditingItem(null)
      if (selectedItem) {
        pasteItem(selectedItem.id)
      }
    },
    [selectedItem, pasteItem]
  )

  const openTagPicker = useCallback((itemId: string) => {
    setTagPickerItemId(itemId)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setView((v) => (v === 'settings' ? 'clipboard' : 'settings'))
        return
      }
      if (e.key === 't' || e.key === 'T') {
        const target = document.activeElement?.tagName
        if (target === 'INPUT' || target === 'TEXTAREA') return
        if (tagPickerItemId) return
        if (selectedItem) {
          e.preventDefault()
          setTagPickerItemId(selectedItem.id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem, tagPickerItemId])

  const containerClass =
    'w-full h-full rounded-xl overflow-hidden bg-background/95 backdrop-blur-xl border shadow-2xl flex flex-col'

  if (view === 'settings') {
    return (
      <div className={containerClass}>
        <SettingsPage onClose={() => setView('clipboard')} />
      </div>
    )
  }

  return (
    <div className={containerClass}>
      {/* Top bar */}
      <div className="flex items-center h-14 px-4 border-b bg-muted/30">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mr-4">
          <TabButton
            label="剪贴板"
            active={view === 'clipboard'}
            onClick={() => setView('clipboard')}
          />
          <TabButton
            label="模板"
            active={view === 'templates'}
            onClick={() => setView('templates')}
          />
        </div>
        <SearchBar />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView('settings')}
          className="ml-2 h-9 w-9 text-muted-foreground hover:text-foreground"
          title="设置 (⌘,)"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {view === 'clipboard' ? (
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <FilterTabs />
            <div className="flex-1 flex min-h-0 relative">
              <div className="w-[55%] flex flex-col min-h-0 border-r" ref={tagPickerAnchorRef}>
                <ClipboardList onDoubleClick={handleDoubleClick} onOpenTagPicker={openTagPicker} />
                {tagPickerItemId && (
                  <div className="absolute left-2 top-8 z-50">
                    <TagPicker
                      itemId={tagPickerItemId}
                      onClose={() => setTagPickerItemId(null)}
                    />
                  </div>
                )}
              </div>
              {editingItem && selectedItem ? (
                <QuickEdit
                  content={selectedItem.content}
                  onSave={handleEditSave}
                  onCancel={() => setEditingItem(null)}
                />
              ) : (
                <PreviewPanel item={selectedItem} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <TemplateList />
      )}
    </div>
  )
}

function TabButton({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs font-medium rounded-md transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
      )}
    >
      {label}
    </button>
  )
}
