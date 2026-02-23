import { useCallback, useEffect, useState } from 'react'
import {
  Clipboard,
  Pin,
  X,
  FileText,
  Code,
  Link,
  Braces,
  Palette,
  Image as ImageIcon
} from 'lucide-react'

interface ClipboardItem {
  id: string
  content: string
  content_type: string
  preview: string | null
}

function ContentTypeIcon({ type }: { type: string }): React.JSX.Element {
  const className = 'w-3 h-3 text-muted-foreground/40'
  switch (type) {
    case 'code':
      return <Code className={className} />
    case 'url':
      return <Link className={className} />
    case 'json':
      return <Braces className={className} />
    case 'color':
      return <Palette className={className} />
    case 'image':
      return <ImageIcon className={className} />
    default:
      return <FileText className={className} />
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function WidgetPanel(): React.JSX.Element {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [pinned, setPinned] = useState(false)

  const loadItems = useCallback(async () => {
    const fetched = await window.electron.ipcRenderer.invoke('widget:getItems')
    setItems(fetched)
  }, [])

  useEffect(() => {
    loadItems()

    const unsubShown = window.api.onWidgetShown(() => {
      loadItems()
    })

    const unsubPinned = window.api.onWidgetPinnedChanged((value: boolean) => {
      setPinned(value)
    })

    const unsubNewItem = window.api.onNewItem(() => {
      loadItems()
    })

    // Refresh when filter changes (follow mode)
    const onFilterChanged = (): void => { loadItems() }
    window.electron.ipcRenderer.on('widget:filterChanged', onFilterChanged)

    return () => {
      unsubShown()
      unsubPinned()
      unsubNewItem()
      window.electron.ipcRenderer.removeListener('widget:filterChanged', onFilterChanged)
    }
  }, [loadItems])

  const togglePin = useCallback(() => {
    const next = !pinned
    setPinned(next)
    window.api.widgetSetPinned(next)
  }, [pinned])

  const handleClose = useCallback(() => {
    window.api.widgetSetPinned(false)
    window.electron.ipcRenderer.invoke('widget:toggle')
  }, [])

  const handlePaste = useCallback((id: string) => {
    window.electron.ipcRenderer.invoke('widget:pasteItem', id)
  }, [])

  return (
    <div className="w-full h-full bg-background border rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* Title bar - draggable */}
      <div
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="flex items-center justify-between px-3 py-2 border-b bg-muted/30"
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clipboard className="w-3.5 h-3.5" />
          <span>最近剪贴板</span>
        </div>
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-1"
        >
          <button
            onClick={togglePin}
            className={`p-1 rounded hover:bg-muted/50 ${pinned ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handlePaste(item.id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 transition-colors text-left"
          >
            <span className="text-[10px] font-mono text-muted-foreground/60 w-5 shrink-0">
              ⌥{index + 1}
            </span>
            {item.content_type === 'image' ? (
              <img
                src={item.content.startsWith('/') ? `file://${item.content}` : `data:image/png;base64,${item.content}`}
                alt=""
                className="h-8 w-12 object-cover rounded border border-border shrink-0"
                loading="lazy"
              />
            ) : null}
            <span className="text-xs truncate flex-1">
              {item.content_type === 'image'
                ? (item.preview || 'Image')
                : truncate(item.preview || item.content, 40)}
            </span>
            <ContentTypeIcon type={item.content_type} />
          </button>
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            暂无记录
          </div>
        )}
      </div>

    </div>
  )
}

export default WidgetPanel
