import { useCallback } from 'react'
import { ClipboardItem, useClipboardStore } from '../../stores/clipboardStore'

interface Props {
  item: ClipboardItem
  index: number
  isSelected: boolean
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

export default function ClipboardItemRow({ item, index, isSelected }: Props): React.JSX.Element {
  const { setSelectedIndex, pasteItem, deleteItem, toggleFavorite } = useClipboardStore()

  const handleClick = useCallback(() => {
    setSelectedIndex(index)
    pasteItem(item.id)
  }, [index, item.id, setSelectedIndex, pasteItem])

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      deleteItem(item.id)
    },
    [item.id, deleteItem]
  )

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleFavorite(item.id)
    },
    [item.id, toggleFavorite]
  )

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setSelectedIndex(index)}
      className={`group flex items-center px-4 py-2.5 cursor-pointer transition-colors duration-75 ${
        isSelected ? 'bg-blue-600/30' : 'hover:bg-white/5'
      }`}
    >
      {/* Index number (1-9) */}
      {index < 9 && (
        <span className="text-xs text-gray-600 w-4 mr-2 text-center shrink-0">{index + 1}</span>
      )}
      {index >= 9 && <span className="w-4 mr-2 shrink-0" />}

      {/* Type icon */}
      <span className="mr-2 text-sm shrink-0">{TYPE_ICONS[item.content_type] || '📝'}</span>

      {/* Content preview */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 truncate">{item.preview || item.content}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{item.content_type}</span>
          <span className="text-xs text-gray-600">{formatTime(item.created_at)}</span>
        </div>
      </div>

      {/* Pinned / Favorite indicators */}
      <div className="flex items-center gap-1 ml-2 shrink-0">
        {item.is_pinned ? <span className="text-xs">📌</span> : null}

        {/* Action buttons (visible on hover) */}
        <button
          onClick={handleFavorite}
          className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
            item.is_favorite ? 'opacity-100 text-yellow-400' : 'text-gray-500'
          }`}
        >
          {item.is_favorite ? '★' : '☆'}
        </button>

        <button
          onClick={handleDelete}
          className="text-xs text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
