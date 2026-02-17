import { useCallback, useState, useRef, useEffect } from 'react'
import { ClipboardItem, useClipboardStore } from '../../stores/clipboardStore'
import {
  FileText,
  Code,
  Link,
  Palette,
  Image as ImageIcon,
  FileJson,
  Lock,
  File,
  Pin,
  Star,
  Clipboard,
  Copy,
  Trash2
} from 'lucide-react'

interface Props {
  item: ClipboardItem
  index: number
  isSelected: boolean
  onDoubleClick?: (itemId: string) => void
}

const TypeIcon = ({ type, className }: { type: string; className?: string }): React.JSX.Element => {
  const props = { className: className || 'w-4 h-4 text-muted-foreground' }
  switch (type) {
    case 'text':
      return <FileText {...props} />
    case 'code':
      return <Code {...props} />
    case 'url':
      return <Link {...props} />
    case 'color':
      return <Palette {...props} />
    case 'image':
      return <ImageIcon {...props} />
    case 'json':
      return <FileJson {...props} />
    case 'base64':
      return <Lock {...props} />
    case 'file_path':
      return <File {...props} />
    default:
      return <FileText {...props} />
  }
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

export default function ClipboardItemRow({
  item,
  index,
  isSelected,
  onDoubleClick
}: Props): React.JSX.Element {
  const { setSelectedIndex, pasteItem, deleteItem, toggleFavorite, togglePin } = useClipboardStore()
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
      <div
        onClick={handleClick}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onDoubleClick?.(item.id)
        }}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`group relative flex items-center px-3 py-2 mx-2 my-1 rounded-lg cursor-pointer transition-colors duration-75 border border-transparent ${
          isSelected
            ? 'bg-accent text-accent-foreground shadow-sm'
            : 'hover:bg-muted/50 text-foreground'
        }`}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
        )}

        {/* Index / Icon */}
        <div className="w-8 flex items-center justify-center shrink-0 mr-2">
          {index < 9 ? (
            <span
              className={`text-xs font-mono ${
                isSelected ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              ⌘{index + 1}
            </span>
          ) : (
            <TypeIcon type={item.content_type} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
          <p
            className={`text-sm truncate transition-colors ${
              isSelected ? 'font-medium' : ''
            }`}
          >
            {item.preview || item.content}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {item.content_type}
            </span>
            <span className="text-[10px] text-muted-foreground/50">•</span>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(item.created_at)}
            </span>
          </div>
        </div>

        {/* Action Area (Right Side) */}
        <div className="relative flex items-center justify-end min-w-[48px] ml-2">
          {/* Hover Actions */}
          <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit">
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePin(item.id)
              }}
              className={`p-1 rounded hover:bg-background/80 ${
                item.is_pinned ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(item.id)
              }}
              className={`p-1 rounded hover:bg-background/80 ${
                item.is_favorite ? 'text-yellow-500' : 'text-muted-foreground'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Static Status (Hidden on Hover) */}
          <div className="flex items-center gap-1 group-hover:opacity-0 transition-opacity">
            {item.is_pinned !== 0 && <Pin className="w-3 h-3 text-primary" />}
            {item.is_favorite !== 0 && <Star className="w-3 h-3 text-yellow-500" />}
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem
            icon={<Clipboard className="w-4 h-4" />}
            label="粘贴"
            onClick={() => {
              pasteItem(item.id)
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            icon={<Copy className="w-4 h-4" />}
            label="复制内容"
            onClick={() => {
              navigator.clipboard.writeText(item.content)
              setContextMenu(null)
            }}
          />
          <div className="-mx-1 my-1 h-px bg-muted" />
          <ContextMenuItem
            icon={<Star className="w-4 h-4" />}
            label={item.is_favorite ? '取消收藏' : '收藏'}
            onClick={() => {
              toggleFavorite(item.id)
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            icon={<Pin className="w-4 h-4" />}
            label={item.is_pinned ? '取消置顶' : '置顶'}
            onClick={() => {
              togglePin(item.id)
              setContextMenu(null)
            }}
          />
          <div className="-mx-1 my-1 h-px bg-muted" />
          <ContextMenuItem
            icon={<Trash2 className="w-4 h-4" />}
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
  icon,
  label,
  onClick,
  danger
}: {
  icon?: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${
        danger ? 'text-destructive focus:text-destructive' : ''
      }`}
    >
      {icon && <span className="mr-2 h-4 w-4">{icon}</span>}
      {label}
    </button>
  )
}
