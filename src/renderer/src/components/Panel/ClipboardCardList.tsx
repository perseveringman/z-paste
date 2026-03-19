import { useRef, useEffect, useCallback, useMemo, memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { ClipboardItem, useClipboardStore } from '../../stores/clipboardStore'
import { useSearch } from '../../hooks/useSearch'
import { useAppIcon } from '../../hooks/useAppIcon'
import CodePreview from '../Preview/CodePreview'
import JsonPreview from '../Preview/JsonPreview'
import ColorPreview from '../Preview/ColorPreview'
import ImagePreview from '../Preview/ImagePreview'
import { cn } from '../../lib/utils'
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
  Pencil,
  Trash2
} from 'lucide-react'

const CARD_WIDTH = 280
const CARD_GAP = 12

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

const TypeIcon = ({ type, className }: { type: string; className?: string }): React.JSX.Element => {
  const props = { className: className || 'w-3.5 h-3.5' }
  switch (type) {
    case 'text': return <FileText {...props} />
    case 'code': return <Code {...props} />
    case 'url': return <Link {...props} />
    case 'color': return <Palette {...props} />
    case 'image': return <ImageIcon {...props} />
    case 'json': return <FileJson {...props} />
    case 'base64': return <Lock {...props} />
    case 'file_path': return <File {...props} />
    default: return <FileText {...props} />
  }
}

function CardPreviewContent({ item }: { item: ClipboardItem }): React.JSX.Element {
  const metadata = useMemo(() => {
    if (!item.metadata) return {}
    try { return JSON.parse(item.metadata) } catch { return {} }
  }, [item.metadata])

  switch (item.content_type) {
    case 'code':
      return <CodePreview code={item.content} language={metadata.language || 'plaintext'} />
    case 'json':
      return <JsonPreview content={item.content} />
    case 'color':
      return <ColorPreview content={item.content} />
    case 'image':
      return <ImagePreview content={item.content} metadata={item.metadata} />
    default:
      return (
        <pre className="whitespace-pre-wrap break-all p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
          {item.content}
        </pre>
      )
  }
}

const ClipboardCard = memo(function ClipboardCard({
  item,
  index
}: {
  item: ClipboardItem
  index: number
}): React.JSX.Element {
  const { t } = useTranslation()
  const isSelected = useClipboardStore((s) => s.selectedIndex === index)
  const setSelectedIndex = useClipboardStore((s) => s.setSelectedIndex)
  const pasteItem = useClipboardStore((s) => s.pasteItem)
  const deleteItem = useClipboardStore((s) => s.deleteItem)
  const updateTitle = useClipboardStore((s) => s.updateTitle)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const sourceApp = useMemo(() => {
    if (!item.source_app) return null
    try { return JSON.parse(item.source_app) as { name: string; bundleId: string } } catch { return null }
  }, [item.source_app])
  const appIcon = useAppIcon(sourceApp?.bundleId)

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
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setSelectedIndex(index)}
        className={cn(
          'flex h-full shrink-0 cursor-pointer flex-col overflow-hidden rounded-[1rem] border transition-all duration-200',
          isSelected
            ? 'border-primary/60 bg-background/95 shadow-lg shadow-primary/10 scale-[1.02]'
            : 'border-border/50 bg-background/70 hover:border-border/80 hover:bg-background/85'
        )}
        style={{ width: CARD_WIDTH }}
      >
        {/* Card header */}
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground">
            <TypeIcon type={item.content_type} className="h-3 w-3" />
          </span>
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
              aria-label={t('panel.context.editTitle')}
              className="min-w-0 flex-1 border-b border-primary bg-transparent pb-0.5 text-[11px] font-semibold text-foreground outline-none"
              placeholder={t('panel.title.placeholder')}
            />
          ) : (
            <span className="truncate text-[11px] font-semibold text-foreground/90">
              {item.title || item.preview || item.content_type.toUpperCase()}
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            {item.is_pinned !== 0 && <Pin className="w-3 h-3 text-primary" />}
            {item.is_favorite !== 0 && <Star className="w-3 h-3 text-yellow-500" />}
          </div>
        </div>

        {/* Card content — the preview */}
        <div className="flex-1 overflow-auto">
          <CardPreviewContent item={item} />
        </div>

        {/* Card footer */}
        <div className="flex items-center gap-1.5 border-t border-border/40 px-3 py-1.5 text-[10px] text-muted-foreground">
          <span className="rounded-full bg-secondary/75 px-1.5 py-0.5 uppercase tracking-[0.14em] text-[9px]">
            {item.content_type}
          </span>
          <span className="text-muted-foreground/50">•</span>
          <span>{formatTime(item.created_at)}</span>
          {item.use_count > 0 && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="tabular-nums">{item.use_count}次</span>
            </>
          )}
          {sourceApp && appIcon && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <img
                src={`data:image/png;base64,${appIcon}`}
                alt={sourceApp.name}
                title={sourceApp.name}
                className="h-3.5 w-3.5 rounded-sm"
              />
            </>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[8rem] overflow-hidden rounded-[1rem] border border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-xl animate-in fade-in-80 zoom-in-95"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              startEditTitle()
              setContextMenu(null)
            }}
            className="relative flex w-full cursor-default select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-colors hover:bg-secondary hover:text-foreground"
          >
            <span className="mr-2 h-4 w-4"><Pencil className="w-4 h-4" /></span>
            {t('panel.context.editTitle')}
          </button>
          <div className="-mx-1 my-1 h-px bg-muted" />
          <button
            onClick={() => {
              deleteItem(item.id)
              setContextMenu(null)
            }}
            className="relative flex w-full cursor-default select-none items-center rounded-xl px-3 py-2 text-sm text-destructive outline-none transition-colors hover:bg-secondary hover:text-destructive"
          >
            <span className="mr-2 h-4 w-4"><Trash2 className="w-4 h-4" /></span>
            {t('panel.context.delete')}
          </button>
        </div>
      )}
    </>
  )
})

export default function ClipboardCardList(): React.JSX.Element {
  const items = useSearch()
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll selected card into view
  useEffect(() => {
    return useClipboardStore.subscribe((state, prev) => {
      if (state.selectedIndex === (prev as typeof state).selectedIndex) return
      const el = scrollRef.current
      if (!el) return
      const idx = state.selectedIndex
      const cardLeft = idx * (CARD_WIDTH + CARD_GAP)
      const cardRight = cardLeft + CARD_WIDTH
      const viewLeft = el.scrollLeft
      const viewRight = viewLeft + el.clientWidth

      if (cardLeft < viewLeft) {
        el.scrollTo({ left: cardLeft - CARD_GAP, behavior: 'smooth' })
      } else if (cardRight > viewRight) {
        el.scrollTo({ left: cardRight - el.clientWidth + CARD_GAP, behavior: 'smooth' })
      }
    })
  }, [])

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-8 text-sm text-muted-foreground">
        <div className="max-w-xs rounded-[1.25rem] border border-border/60 bg-background/70 px-6 py-8 text-center shadow-sm">
          <p className="mb-3 text-3xl">📋</p>
          <p className="text-base font-semibold text-foreground">{t('panel.empty.title')}</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">{t('panel.empty.subtitle')}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar flex flex-1 items-stretch gap-3 overflow-x-auto px-3 py-3"
    >
      {items.map((item, index) => (
        <ClipboardCard key={item.id} item={item} index={index} />
      ))}
    </div>
  )
}
