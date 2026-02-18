import { useEffect } from 'react'
import { useClipboardStore, LeftFilter } from '../../stores/clipboardStore'
import { useTagStore } from '../../stores/tagStore'
import { cn } from '../../lib/utils'
import { Star, Tag, Layers } from 'lucide-react'

export default function Sidebar(): React.JSX.Element {
  const { leftFilter, setLeftFilter, items } = useClipboardStore()
  const { tags, loadTags } = useTagStore()

  useEffect(() => {
    loadTags()
  }, [loadTags, items])

  const starredCount = items.filter((i) => i.is_favorite).length
  const tagCount = tags.length

  const isActive = (f: LeftFilter): boolean => {
    if (f.type !== leftFilter.type) return false
    if (f.type === 'tag' && leftFilter.type === 'tag') return f.slug === leftFilter.slug
    return true
  }

  return (
    <div className="w-44 shrink-0 border-r flex flex-col py-2 overflow-y-auto bg-muted/10">
      <NavItem
        icon={<Layers className="w-3.5 h-3.5" />}
        label="全部"
        active={isActive({ type: 'all' })}
        onClick={() => setLeftFilter({ type: 'all' })}
      />
      <NavItem
        icon={<Star className="w-3.5 h-3.5" />}
        label="已收藏"
        count={starredCount}
        active={isActive({ type: 'starred' })}
        onClick={() => setLeftFilter({ type: 'starred' })}
      />

      {tagCount > 0 && (
        <>
          <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              标签
            </span>
          </div>
          {tagCount > 15 && (
            <div className="mx-2 mb-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-600 dark:text-yellow-400 leading-snug">
              标签太多会降低效率，考虑合并类似标签？
            </div>
          )}
          {tags.map((tag) => (
            <NavItem
              key={tag.slug}
              icon={<Tag className="w-3.5 h-3.5" />}
              label={tag.name}
              count={tag.count}
              active={isActive({ type: 'tag', slug: tag.slug })}
              onClick={() => setLeftFilter({ type: 'tag', slug: tag.slug })}
            />
          ))}
        </>
      )}
    </div>
  )
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick
}: {
  icon: React.ReactNode
  label: string
  count?: number
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md mx-1 transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      style={{ width: 'calc(100% - 8px)' }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{count}</span>
      )}
    </button>
  )
}
