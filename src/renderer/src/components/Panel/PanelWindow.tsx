import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import SearchBar from './SearchBar'
import ClipboardList from './ClipboardList'
import FilterTabs from './FilterTabs'
import TagBar from './TagBar'
import TagPicker from './TagPicker'
import PreviewPanel from '../Preview/PreviewPanel'
import QuickEdit from './QuickEdit'
import TemplateList from '../Templates/TemplateList'
import SettingsPage from '../Settings/SettingsPage'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useQueueToast } from '../../hooks/useQueueToast'
import { useSearch } from '../../hooks/useSearch'
import { useClipboardStore } from '../../stores/clipboardStore'
import { Settings, PanelRightOpen } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

type PanelView = 'clipboard' | 'templates' | 'settings'

export default function PanelWindow(): React.JSX.Element {
  const { t } = useTranslation()
  useKeyboard()
  useQueueToast()
  const items = useSearch()
  const { selectedIndex, pasteItem, previewCollapsed, togglePreview } = useClipboardStore()
  const selectedItem = items[selectedIndex] || null

  const [view, setView] = useState<PanelView>('clipboard')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [tagPickerItemId, setTagPickerItemId] = useState<string | null>(null)
  const tagPickerAnchorRef = useRef<HTMLDivElement>(null)

  // 右侧预览 debounce：hover 稳定 150ms 后才显示
  const [previewItem, setPreviewItem] = useState<(typeof selectedItem) | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    if (!selectedItem) {
      setPreviewItem(null)
      return
    }
    previewTimerRef.current = setTimeout(() => {
      setPreviewItem(selectedItem)
    }, 150)
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [selectedItem])

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
      // Option key: toggle right preview panel
      if (e.key === 'Alt') {
        e.preventDefault()
        togglePreview()
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
  }, [selectedItem, tagPickerItemId, togglePreview])

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
            label={t('panel.tabs.clipboard')}
            active={view === 'clipboard'}
            onClick={() => setView('clipboard')}
          />
          <TabButton
            label={t('panel.tabs.templates')}
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
          title={t('panel.settings.tooltip')}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {view === 'clipboard' ? (
        <div className="flex flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <TagBar />
            <FilterTabs />
            <div className="flex-1 flex min-h-0 relative">
              <div
                className={`flex flex-col min-h-0 relative ${!previewCollapsed && (previewItem || (editingItem && selectedItem)) ? 'w-[52%] border-r' : 'flex-1'}`}
                ref={tagPickerAnchorRef}
              >
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
              {!previewCollapsed && (editingItem && selectedItem ? (
                <QuickEdit
                  content={selectedItem.content}
                  onSave={handleEditSave}
                  onCancel={() => setEditingItem(null)}
                />
              ) : previewItem ? (
                <PreviewPanel item={previewItem} />
              ) : null)}
              {previewCollapsed && (previewItem || selectedItem) && (
                <button
                  onClick={togglePreview}
                  className="shrink-0 flex items-center justify-center w-8 border-l bg-muted/10 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                  title={t('panel.preview.expand')}
                >
                  <PanelRightOpen className="w-3.5 h-3.5" />
                </button>
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
