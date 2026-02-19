import { useEffect, useRef, useState, useCallback } from 'react'
import { useClipboardStore } from '../../stores/clipboardStore'
import { useTagStore } from '../../stores/tagStore'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import { Star } from 'lucide-react'

export default function TagBar(): React.JSX.Element {
  const { leftFilter, setLeftFilter, items } = useClipboardStore()
  const { tags, loadTags } = useTagStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    loadTags()
  }, [loadTags, items])

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const observer = new ResizeObserver(checkScroll)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      observer.disconnect()
    }
  }, [checkScroll, tags])

  const scroll = (direction: 'left' | 'right'): void => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'left' ? -120 : 120, behavior: 'smooth' })
  }

  const isAll = leftFilter.type === 'all'
  const isStarred = leftFilter.type === 'starred'
  const activeTag = leftFilter.type === 'tag' ? leftFilter.slug : null
  const starredCount = items.filter((i) => i.is_favorite).length

  return (
    <div className="relative flex items-center border-b bg-muted/10">
      {/* Left fade + arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 h-full px-1 flex items-center bg-gradient-to-r from-background/95 to-transparent"
        >
          <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      )}

      {/* Scrollable tag strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar"
      >
        {/* 全部 */}
        <Badge
          variant={isAll ? 'default' : 'secondary'}
          className={cn(
            'cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 text-[11px]',
            !isAll &&
              'bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border'
          )}
          onClick={() => setLeftFilter({ type: 'all' })}
        >
          全部
        </Badge>

        {/* 已收藏 */}
        <Badge
          variant={isStarred ? 'default' : 'secondary'}
          className={cn(
            'cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 text-[11px] gap-0.5',
            !isStarred &&
              'bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border'
          )}
          onClick={() => {
            if (isStarred) {
              setLeftFilter({ type: 'all' })
            } else {
              setLeftFilter({ type: 'starred' })
            }
          }}
        >
          <Star className="w-3 h-3" />
          收藏
          {starredCount > 0 && (
            <span className="ml-0.5 text-[9px] opacity-60">{starredCount}</span>
          )}
        </Badge>

        {/* 分隔线 */}
        {tags.length > 0 && (
          <div className="h-3 w-px bg-border shrink-0" />
        )}

        {/* 标签 */}
        {tags.map((tag) => {
          const isActive = activeTag === tag.slug
          return (
            <Badge
              key={tag.slug}
              variant={isActive ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 text-[11px]',
                !isActive &&
                  'bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border'
              )}
              onClick={() => {
                if (isActive) {
                  setLeftFilter({ type: 'all' })
                } else {
                  setLeftFilter({ type: 'tag', slug: tag.slug })
                }
              }}
            >
              {tag.name}
              {tag.count > 0 && (
                <span className="ml-1 text-[9px] opacity-60">{tag.count}</span>
              )}
            </Badge>
          )
        })}
      </div>

      {/* Right fade + arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 h-full px-1 flex items-center bg-gradient-to-l from-background/95 to-transparent"
        >
          <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      )}
    </div>
  )
}
