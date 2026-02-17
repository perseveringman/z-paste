import { useCallback, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ClipboardItem, useClipboardStore } from '../../stores/clipboardStore'

interface Props {
  item: ClipboardItem
  index: number
  isSelected: boolean
  onDoubleClick?: (itemId: string) => void
}

const TYPE_ICONS: Record<string, string> = {
  text: '📝',
  code: '💻',
  url: '🔗',
  color: '🎨',
  image: '🖼️',
  json: '📋',
  base64: '🔐',
  file_path: '📁'
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}

export default function ClipboardItemRow({ item, index, isSelected, onDoubleClick }: Props): React.JSX.Element {
  const { setSelectedIndex, pasteItem, deleteItem, toggleFavorite, togglePin } =
    useClipboardStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(() => {
    setSelectedIndex(index)
    pasteItem(item.id)
  }, [index, item.id, setSelectedIndex, pasteItem])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedIndex(index)
      setContextMenu({ x: e.clientX, y: e.clientY })
    },
    [index, setSelectedIndex]
  )

  useEffect(() => {
    if (!contextMenu) return
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.12, delay: Math.min(index * 0.02, 0.2) }}
        onClick={handleClick}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onDoubleClick?.(item.id)
        }}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`group flex items-center px-4 py-2.5 cursor-pointer transition-colors duration-75 ${
          isSelected ? 'bg-blue-500/20 dark:bg-blue-600/30' : 'hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        {index < 9 && (
          <span className="text-xs text-gray-600 w-4 mr-2 text-center shrink-0">
            {index + 1}
          </span>
        )}
        {index >= 9 && <span className="w-4 mr-2 shrink-0" />}

        <span className="mr-2 text-sm shrink-0">{TYPE_ICONS[item.content_type] || '📝'}</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{item.preview || item.content}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">{item.content_type}</span>
            <span className="text-xs text-gray-400 dark:text-gray-600">{formatTime(item.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2 shrink-0">
          {item.is_pinned ? <span className="text-xs">📌</span> : null}
          {item.is_favorite ? (
            <span className="text-xs text-yellow-400">★</span>
          ) : null}
        </div>
      </motion.div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-lg shadow-xl py-1 min-w-[140px] animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem
            label="粘贴"
            onClick={() => {
              pasteItem(item.id)
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            label={item.is_favorite ? '取消收藏' : '收藏'}
            onClick={() => {
              toggleFavorite(item.id)
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            label={item.is_pinned ? '取消置顶' : '置顶'}
            onClick={() => {
              togglePin(item.id)
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            label="复制"
            onClick={() => {
              navigator.clipboard.writeText(item.content)
              setContextMenu(null)
            }}
          />
          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
          <ContextMenuItem
            label="删除"
            danger
            onClick={() => {
              deleteItem(item.id)
              setContextMenu(null)
            }}
          />
        </div>
      )}
    </>
  )
}

function ContextMenuItem({
  label,
  onClick,
  danger
}: {
  label: string
  onClick: () => void
  danger?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
        danger
          ? 'text-red-500 dark:text-red-400 hover:bg-red-500/10'
          : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}
