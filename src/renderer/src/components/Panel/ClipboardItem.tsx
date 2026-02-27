import { useCallback, useState, useRef, useEffect, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { ClipboardItem, useClipboardStore } from '../../stores/clipboardStore'
import { useAppIcon } from '../../hooks/useAppIcon'
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
  Trash2,
  Tag,
  Pencil
} from 'lucide-react'

interface Props {
  item: ClipboardItem
  index: number
  onDoubleClick?: (itemId: string) => void
  onOpenTagPicker?: (itemId: string) => void
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

  if (minutes < 1) return i18n.t('time.justNow')
  if (minutes < 60) return i18n.t('time.minutesAgo', { count: minutes })
  if (hours < 24) return i18n.t('time.hoursAgo', { count: hours })
  return i18n.t('time.daysAgo', { count: days })
}

function ClipboardItemRow({
  item,
  index,
  onDoubleClick,
  onOpenTagPicker
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const isSelected = useClipboardStore((s) => s.selectedIndex === index)
  const setSelectedIndex = useClipboardStore((s) => s.setSelectedIndex)
  const pasteItem = useClipboardStore((s) => s.pasteItem)
  const deleteItem = useClipboardStore((s) => s.deleteItem)
  const toggleFavorite = useClipboardStore((s) => s.toggleFavorite)
  const togglePin = useClipboardStore((s) => s.togglePin)
  const toggleSelectItem = useClipboardStore((s) => s.toggleSelectItem)
  const updateTitle = useClipboardStore((s) => s.updateTitle)
  const inQueue = useClipboardStore((s) => s.sequenceQueue.some((q) => q.id === item.id))
  const queuePos = useClipboardStore((s) => {
    if (!inQueue) return 0
    return s.sequenceQueue.findIndex((q) => q.id === item.id) + 1
  })
  const isMultiSelected = useClipboardStore((s) => s.selectedItems.has(item.id))
  const hasTag = !!item.tag_slugs
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const sourceApp = useMemo(() => {
    if (!item.source_app) return null
    try {
      return JSON.parse(item.source_app) as { name: string; bundleId: string }
    } catch {
      return null
    }
  }, [item.source_app])
  const appIcon = useAppIcon(sourceApp?.bundleId)

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Cmd+Click: toggle multi-select
      e.preventDefault()
      toggleSelectItem(item.id)
      return
    }
    setSelectedIndex(index)
    pasteItem(item.id)
  }, [index, item.id, setSelectedIndex, pasteItem, toggleSelectItem])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedIndex(index)
      setContextMenu({ x: e.clientX, y: e.clientY })
    },
    [index, setSelectedIndex]
  )

  const startEditTitle = useCallback(() => {
    setEditingTitle(item.title || '')
    setIsEditingTitle(true)
  }, [item.title])

  const saveTitle = useCallback(() => {
    const trimmed = editingTitle.trim()
    updateTitle(item.id, trimmed || null)
    setIsEditingTitle(false)
  }, [editingTitle, item.id, updateTitle])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

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
        className={`group relative flex items-center px-3 py-2 mx-2 my-1 rounded-lg cursor-pointer transition-colors duration-75 border ${
          isMultiSelected
            ? 'bg-primary/10 border-primary/40 text-foreground'
            : isSelected
              ? 'bg-accent text-accent-foreground shadow-sm border-transparent'
              : 'hover:bg-muted/50 text-foreground border-transparent'
        }`}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
        )}

        {item.content_type === 'image' ? (
          <ImageRow item={item} index={index} isSelected={isSelected} />
        ) : (
          <>
            {/* Index / Icon */}
            <div className="w-8 flex items-center justify-center shrink-0 mr-2">
              {index < 9 ? (
                <span className={`text-xs font-mono ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {index + 1}
                </span>
              ) : (
                <TypeIcon type={item.content_type} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') setIsEditingTitle(false)
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium bg-transparent border-b border-primary outline-none text-foreground w-full mb-0.5"
                  placeholder={t('panel.title.placeholder')}
                />
              ) : item.title ? (
                <p
                  className="text-xs font-medium text-primary truncate cursor-pointer mb-0.5"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    startEditTitle()
                  }}
                >
                  {item.title}
                </p>
              ) : null}
              <p className={`text-sm truncate transition-colors ${isSelected ? 'font-medium' : ''}`}>
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
                {item.use_count > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground/50">•</span>
                    <span className="text-[10px] text-muted-foreground">{item.use_count}次</span>
                  </>
                )}
                {sourceApp && (
                  <>
                    <span className="text-[10px] text-muted-foreground/50">•</span>
                    {appIcon ? (
                      <img
                        src={`data:image/png;base64,${appIcon}`}
                        alt={sourceApp.name}
                        title={sourceApp.name}
                        className="w-3.5 h-3.5 rounded-sm"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">{sourceApp.name}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Area (Right Side) */}
        <div className="relative flex items-center justify-end min-w-[64px] ml-2">
          {/* Hover Actions */}
          <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenTagPicker?.(item.id)
              }}
              className="p-1 rounded hover:bg-background/80 text-muted-foreground"
              title={t('panel.context.tag')}
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
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
            {inQueue && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {queuePos}
              </span>
            )}
            {item.is_pinned !== 0 && <Pin className="w-3 h-3 text-primary" />}
            {item.is_favorite !== 0 && <Star className="w-3 h-3 text-yellow-500" />}
            {hasTag && <Tag className="w-3 h-3 text-blue-500" />}
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
            icon={<Pencil className="w-4 h-4" />}
            label={t('panel.context.editTitle')}
            onClick={() => {
              startEditTitle()
              setContextMenu(null)
            }}
          />
          <div className="-mx-1 my-1 h-px bg-muted" />
          <ContextMenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label={t('panel.context.delete')}
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

export default memo(ClipboardItemRow)

function ImageRow({
  item,
  index,
  isSelected
}: {
  item: ClipboardItem
  index: number
  isSelected: boolean
}): React.JSX.Element {
  const src = item.content.startsWith('/')
    ? `file://${item.content}`
    : `data:image/png;base64,${item.content}`

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <div className="w-8 flex items-center justify-center shrink-0">
        {index < 9 ? (
          <span className={`text-xs font-mono ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
            ⌘{index + 1}
          </span>
        ) : (
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <img
        src={src}
        alt=""
        className="h-9 w-14 object-cover rounded border border-black/10 dark:border-white/10 shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`}>
          {item.preview || i18n.t('panel.image.fallback')}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">image</span>
          <span className="text-[10px] text-muted-foreground/50">•</span>
          <span className="text-[10px] text-muted-foreground">{formatTime(item.created_at)}</span>
        </div>
      </div>
    </div>
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
