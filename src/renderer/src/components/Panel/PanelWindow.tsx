import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import SearchBar from './SearchBar'
import ClipboardList from './ClipboardList'
import FilterTabs from './FilterTabs'
import PreviewPanel from '../Preview/PreviewPanel'
import QuickEdit from './QuickEdit'
import TemplateList from '../Templates/TemplateList'
import SettingsPage from '../Settings/SettingsPage'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useSearch } from '../../hooks/useSearch'
import { useClipboardStore } from '../../stores/clipboardStore'

type PanelView = 'clipboard' | 'templates' | 'settings'

const panelTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 30
}

export default function PanelWindow(): React.JSX.Element {
  useKeyboard()
  const items = useSearch()
  const { selectedIndex, pasteItem, isVisible } = useClipboardStore()
  const selectedItem = items[selectedIndex] || null

  const [view, setView] = useState<PanelView>('clipboard')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    if (isVisible) {
      setAnimKey((k) => k + 1)
    }
  }, [isVisible])

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
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setView((v) => (v === 'settings' ? 'clipboard' : 'settings'))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (view === 'settings') {
    return (
      <motion.div
        key={`settings-${animKey}`}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={panelTransition}
        className="w-full h-full rounded-xl overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl flex flex-col"
      >
        <SettingsPage onClose={() => setView('clipboard')} />
      </motion.div>
    )
  }

  return (
    <motion.div
      key={`panel-${animKey}`}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={panelTransition}
      className="w-full h-full rounded-xl overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-1 px-3">
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
        {view === 'clipboard' && <SearchBar />}
        <button
          onClick={() => setView('settings')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-3 py-2.5 text-sm transition-colors"
          title="设置 (⌘,)"
        >
          ⚙
        </button>
      </div>

      {view === 'clipboard' ? (
        <>
          <FilterTabs />
          <div className="flex-1 flex min-h-0">
            <div className="w-[55%] flex flex-col min-h-0 border-r border-black/5 dark:border-white/5">
              <ClipboardList onDoubleClick={handleDoubleClick} />
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
        </>
      ) : (
        <TemplateList />
      )}
    </motion.div>
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
      className={`px-3 py-2.5 text-xs transition-colors ${
        active
          ? 'text-gray-900 dark:text-white border-b-2 border-blue-500'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  )
}
