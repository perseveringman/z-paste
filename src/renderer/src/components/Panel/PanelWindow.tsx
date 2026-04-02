import { useState, useCallback, useEffect, useRef } from 'react'

import { useTranslation } from 'react-i18next'
import SearchBar from './SearchBar'
import ClipboardList from './ClipboardList'
import ClipboardCardList from './ClipboardCardList'
import FilterTabs from './FilterTabs'
import TagBar from './TagBar'
import TagPicker from './TagPicker'
import PreviewPanel from '../Preview/PreviewPanel'
import QuickEdit from './QuickEdit'

import TemplateList from '../Templates/TemplateList'
import VaultView from '../Vault/VaultView'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useQueueToast } from '../../hooks/useQueueToast'
import { useSearch } from '../../hooks/useSearch'
import { useClipboardStore } from '../../stores/clipboardStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useVaultStore } from '../../stores/vaultStore'
import { matchShortcut } from '../../utils/shortcut'
import appIcon from '../../assets/icon.png'
import { Settings, PanelRightOpen, HelpCircle, ListOrdered, X, Lock, Unlock, FilePlus, Key, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export type PanelView = 'clipboard' | 'templates' | 'vault'

export default function PanelWindow(): React.JSX.Element {
  const { t } = useTranslation()
  const [view, setView] = useState<PanelView>('clipboard')
  const layoutMode = useSettingsStore((s) => s.layoutMode)
  useKeyboard(view)
  useQueueToast()
  const items = useSearch()
  const { selectedIndex, pasteItem, previewCollapsed, togglePreview, filtersCollapsed, toggleFilters, isQueueActive, sequenceQueue, clearQueue, tagBarCollapsed, toggleTagBar, typeFilterCollapsed, toggleTypeFilter, sourceAppFilterCollapsed, toggleSourceAppFilter } = useClipboardStore()
  const { toggleFilterShortcut, togglePreviewShortcut, openTagShortcut, openSettingsShortcut } = useSettingsStore()
  const { security, lock: lockVault } = useVaultStore()
  const selectedItem = items[selectedIndex] || null
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [tagPickerItemId, setTagPickerItemId] = useState<string | null>(null)
  const tagPickerAnchorRef = useRef<HTMLDivElement>(null)
  const [vaultCreateType, setVaultCreateType] = useState<'login' | 'secure_note' | null>(null)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const createMenuRef = useRef<HTMLDivElement>(null)


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
    const handleClickOutside = (e: MouseEvent): void => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false)
      }
    }
    if (showCreateMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCreateMenu])

  useEffect(() => {
    const unsub = window.api.onPanelSetView((view) => {
      setView(view)
    })
    return unsub
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (matchShortcut(e, openSettingsShortcut)) {
        e.preventDefault()
        window.api.openSettingsWindow('settings')
        return
      }
      // Clipboard-only shortcuts — suppress when vault is active
      if (view === 'vault') return
      if (matchShortcut(e, toggleFilterShortcut)) {
        e.preventDefault()
        toggleFilters()
        return
      }
      if (matchShortcut(e, togglePreviewShortcut)) {
        e.preventDefault()
        togglePreview()
        return
      }
      if (matchShortcut(e, openTagShortcut)) {
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
  }, [selectedItem, tagPickerItemId, view, togglePreview, toggleFilters, toggleFilterShortcut, togglePreviewShortcut, openTagShortcut, openSettingsShortcut])

  const containerClass =
    'surface-panel hairline flex h-full w-full flex-col overflow-hidden rounded-[1.15rem] border border-border/70'

  return (
    <div className={containerClass}>
      <div
        className="surface-subtle flex h-14 items-center gap-2.5 border-b border-border/60 px-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="shrink-0">
          <img src={appIcon} alt="Stash" className="h-7 w-7" />
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <TabButton
            label={t('panel.tabs.clipboard')}
            active={view === 'clipboard'}
            onClick={() => setView('clipboard')}
          />
          <TabButton
            label={t('panel.tabs.vault')}
            active={view === 'vault'}
            onClick={() => setView('vault')}
          />
        </div>

        <div className="min-w-0 flex-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <SearchBar view={view} />
        </div>
        <div className="ml-0.5 flex shrink-0 items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {view === 'vault' && !security.locked && (
            <div className="relative" ref={createMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateMenu((v) => !v)}
                aria-label={t('vault.newItem')}
                className="h-8 w-8 rounded-full bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                title={t('vault.newItem')}
              >
                <FilePlus className="w-4 h-4" />
              </Button>
              {showCreateMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-[1rem] border border-border bg-popover p-1 shadow-xl">
                  <button
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary/80"
                    onClick={() => { setVaultCreateType('login'); setShowCreateMenu(false) }}
                  >
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
                    {t('vault.newLogin')}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary/80"
                    onClick={() => { setVaultCreateType('secure_note'); setShowCreateMenu(false) }}
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    {t('vault.newSecureNote')}
                  </button>
                </div>
              )}
            </div>
          )}
          {view === 'vault' && !security.locked && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => lockVault()}
              aria-label={t('vault.lock')}
              className="h-8 w-8 rounded-full bg-muted text-muted-foreground hover:bg-secondary hover:text-destructive"
              title={t('vault.lock')}
            >
              <Unlock className="w-4 h-4" />
            </Button>
          )}
          {view === 'vault' && security.locked && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <Lock className="w-4 h-4" />
            </div>
          )}
          {view === 'clipboard' && layoutMode !== 'side' && (
            <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              {[
                { collapsed: tagBarCollapsed, toggle: toggleTagBar, label: '1' },
                { collapsed: typeFilterCollapsed, toggle: toggleTypeFilter, label: '2' },
                { collapsed: sourceAppFilterCollapsed, toggle: toggleSourceAppFilter, label: '3' },
              ].map(({ collapsed, toggle, label }) => (
                <button
                  key={label}
                  onClick={toggle}
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                    collapsed
                      ? 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.api.openSettingsWindow('onboarding')}
            aria-label={t('panel.help.tooltip')}
            className="h-8 w-8 rounded-full bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
            title={t('panel.help.tooltip')}
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.api.openSettingsWindow('settings')}
            aria-label={t('panel.settings.tooltip')}
            className="h-8 w-8 rounded-full bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
            title={t('panel.settings.tooltip')}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {view === 'clipboard' ? (
        layoutMode === 'bottom' ? (
          /* ── Bottom slide-out: horizontal card carousel ── */
          <div className="flex flex-1 min-h-0 flex-col">
            {!filtersCollapsed && (
              <>
                <TagBar />
                <FilterTabs />
              </>
            )}
            <div className="relative flex flex-1 min-h-0">
              <ClipboardCardList onDoubleClick={handleDoubleClick} onOpenTagPicker={openTagPicker} />
              {tagPickerItemId && (
                <div className="absolute left-3 top-3 z-50">
                  <TagPicker
                    itemId={tagPickerItemId}
                    onClose={() => setTagPickerItemId(null)}
                  />
                </div>
              )}
            </div>
          </div>
        ) : layoutMode === 'side' ? (
          /* ── Side slide-out: list + preview below ── */
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              {!filtersCollapsed && (
                <>
                  <TagBar />
                  <FilterTabs />
                </>
              )}
              <div className="flex flex-1 flex-col min-h-0 relative">
                <div
                  className="relative flex min-h-0 flex-1 flex-col"
                  ref={tagPickerAnchorRef}
                >
                  <ClipboardList onDoubleClick={handleDoubleClick} onOpenTagPicker={openTagPicker} />
                  {tagPickerItemId && (
                    <div className="absolute left-2.5 top-8 z-50">
                      <TagPicker
                        itemId={tagPickerItemId}
                        onClose={() => setTagPickerItemId(null)}
                      />
                    </div>
                  )}
                </div>
                {!previewCollapsed && (editingItem && selectedItem ? (
                  <div className="flex shrink-0 max-h-[40%] flex-col overflow-hidden border-t border-border/60">
                    <QuickEdit
                      content={selectedItem.content}
                      onSave={handleEditSave}
                      onCancel={() => setEditingItem(null)}
                    />
                  </div>
                ) : previewItem ? (
                  <div className="flex shrink-0 max-h-[40%] flex-col overflow-hidden border-t border-border/60">
                    <PreviewPanel item={previewItem} layout="bottom" />
                  </div>
                ) : null)}
                {previewCollapsed && (previewItem || selectedItem) && (
                  <button
                    onClick={togglePreview}
                    aria-label={t('panel.preview.expand')}
                    className="surface-subtle shrink-0 flex h-8 items-center justify-center border-t border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={t('panel.preview.expand')}
                  >
                    <PanelRightOpen className="w-3.5 h-3.5 rotate-90" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Center: list + preview on right ── */
          <div className="flex flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              {!filtersCollapsed && (
                <>
                  <TagBar />
                  <FilterTabs />
                </>
              )}
              <div className="flex-1 flex min-h-0 overflow-hidden relative">
                <div
                  className={cn(
                    'relative flex min-h-0 flex-col',
                    !previewCollapsed && (previewItem || (editingItem && selectedItem)) ? 'w-[56%] border-r border-border/60' : 'flex-1'
                  )}
                  ref={tagPickerAnchorRef}
                >
                  <ClipboardList onDoubleClick={handleDoubleClick} onOpenTagPicker={openTagPicker} />
                  {tagPickerItemId && (
                    <div className="absolute left-2.5 top-8 z-50">
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
                    aria-label={t('panel.preview.expand')}
                    className="surface-subtle shrink-0 flex w-8 items-center justify-center border-l border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={t('panel.preview.expand')}
                  >
                    <PanelRightOpen className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      ) : view === 'templates' ? (
        <TemplateList />
      ) : (
        <div className="flex-1 min-h-0">
          <VaultView layoutMode={layoutMode} createType={vaultCreateType} onCreateTypeChange={setVaultCreateType} />
        </div>
      )}

      {/* Queue status bar */}
      {isQueueActive && (
        <div className="flex items-center gap-2 border-t border-primary/20 bg-primary/8 px-3 py-2">
          <ListOrdered className="w-4 h-4 text-primary shrink-0" />
          <span className="flex-1 text-xs font-semibold text-primary">
            {t('panel.queue.active', { count: sequenceQueue.length })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearQueue()
              window.api.queueClear()
            }}
            className="h-7 rounded-full px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-3 h-3 mr-1" />
            {t('panel.queue.abandon')}
          </Button>
        </div>
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
        'rounded-full px-3 py-1 text-xs font-semibold transition-[background-color,color,box-shadow] duration-200',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
