import React, { useRef, useEffect, useCallback, useState } from 'react'
import ClipboardItemRow from './ClipboardItem'
import { useSearch } from '../../hooks/useSearch'
import { useClipboardStore } from '../../stores/clipboardStore'

interface Props {
  onDoubleClick?: (itemId: string) => void
}

const ITEM_HEIGHT = 60

export default function ClipboardList({ onDoubleClick }: Props): React.JSX.Element {
  const items = useSearch()
  const { selectedIndex } = useClipboardStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    setContainerHeight(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current || selectedIndex < 0) return
    const itemTop = selectedIndex * ITEM_HEIGHT
    const itemBottom = itemTop + ITEM_HEIGHT
    const viewTop = scrollTop
    const viewBottom = scrollTop + containerHeight

    if (itemTop < viewTop) {
      containerRef.current.scrollTop = itemTop
    } else if (itemBottom > viewBottom) {
      containerRef.current.scrollTop = itemBottom - containerHeight
    }
  }, [selectedIndex, scrollTop, containerHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        <div className="text-center">
          <p className="text-2xl mb-2">📋</p>
          <p>暂无剪贴板记录</p>
          <p className="text-xs mt-1 text-gray-600">复制内容后将自动出现在这里</p>
        </div>
      </div>
    )
  }

  const totalHeight = items.length * ITEM_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 3)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + 3
  )

  const visibleItems: React.JSX.Element[] = []
  for (let i = startIndex; i < endIndex; i++) {
    const item = items[i]
    if (!item) continue
    visibleItems.push(
      <div
        key={item.id}
        style={{
          position: 'absolute',
          top: i * ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT
        }}
      >
        <ClipboardItemRow
          item={item}
          index={i}
          isSelected={i === selectedIndex}
          onDoubleClick={onDoubleClick}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      <div style={{ position: 'relative', height: totalHeight, width: '100%' }}>
        {visibleItems}
      </div>
    </div>
  )
}
