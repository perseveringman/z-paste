import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTagStore, TagWithCount } from '../../stores/tagStore'
import { cn } from '../../lib/utils'
import { Tag, Plus, Check } from 'lucide-react'

interface Props {
  itemId: string
  onClose: () => void
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export default function TagPicker({ itemId, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { tags, applyTags, loadTags } = useTagStore()
  const [query, setQuery] = useState('')
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
  const [cursorIndex, setCursorIndex] = useState(0)
  const [similar, setSimilar] = useState<TagWithCount[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.getItemTagSlugs(itemId).then((slugs: string[]) => {
      setSelectedSlugs(new Set(slugs))
    })
    inputRef.current?.focus()
  }, [itemId])

  useEffect(() => {
    if (!query.trim()) {
      setSimilar([])
      return
    }
    window.api.getSimilarTags(query).then((results: TagWithCount[]) => {
      const slug = toSlug(query)
      setSimilar(results.filter((st) => st.slug !== slug))
    })
  }, [query])

  const filteredTags = query.trim()
    ? tags.filter((tag) =>
        tag.slug.includes(toSlug(query)) || tag.name.toLowerCase().includes(query.toLowerCase())
      )
    : tags

  const querySlug = toSlug(query.trim())
  const exactMatch = tags.find((t) => t.slug === querySlug)
  const showCreate = query.trim() && !exactMatch

  const allOptions: Array<{ type: 'tag'; tag: TagWithCount } | { type: 'create' }> = [
    ...filteredTags.map((tag) => ({ type: 'tag' as const, tag })),
    ...(showCreate ? [{ type: 'create' as const }] : [])
  ]

  useEffect(() => {
    setCursorIndex(0)
  }, [query])

  const toggleTag = useCallback(
    (slug: string) => {
      setSelectedSlugs((prev) => {
        const next = new Set(prev)
        if (next.has(slug)) {
          next.delete(slug)
        } else {
          next.add(slug)
        }
        return next
      })
    },
    []
  )

  const handleCommit = useCallback(async () => {
    const slugs = Array.from(selectedSlugs)
    if (slugs.length > 0) {
      await applyTags(itemId, slugs)
    }
    onClose()
  }, [selectedSlugs, itemId, applyTags, onClose])

  const handleCreateAndApply = useCallback(async () => {
    const name = query.trim()
    if (!name) return
    const slug = toSlug(name)
    await applyTags(itemId, [name])
    await loadTags()
    setQuery('')
    setSelectedSlugs((prev) => new Set([...prev, slug]))
  }, [query, itemId, applyTags, loadTags])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursorIndex((i) => Math.min(i + 1, allOptions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursorIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const opt = allOptions[cursorIndex]
        if (!opt) {
          handleCommit()
          return
        }
        if (opt.type === 'create') {
          handleCreateAndApply()
        } else {
          toggleTag(opt.tag.slug)
        }
        return
      }
    },
    [allOptions, cursorIndex, handleCommit, handleCreateAndApply, toggleTag, onClose]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCommit()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleCommit])

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-60 rounded-lg border bg-popover shadow-xl overflow-hidden flex flex-col"
      style={{ maxHeight: 320 }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('tagPicker.placeholder')}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="overflow-y-auto flex-1">
        {similar.length > 0 && query.trim() && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('tagPicker.similar')}</p>
            {similar.map((st) => (
              <button
                key={st.slug}
                onClick={() => toggleTag(st.slug)}
                className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-muted/60 text-muted-foreground"
              >
                <span>{t('tagPicker.use', { name: st.name })}</span>
                {selectedSlugs.has(st.slug) && <Check className="w-3 h-3 ml-auto text-primary" />}
              </button>
            ))}
            <div className="border-t my-1" />
          </div>
        )}

        {filteredTags.map((tag) => {
          const isSelected = selectedSlugs.has(tag.slug)
          const isCursor = allOptions[cursorIndex]?.type === 'tag' && allOptions[cursorIndex].tag.slug === tag.slug
          return (
            <button
              key={tag.slug}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) {
                  toggleTag(tag.slug)
                } else {
                  toggleTag(tag.slug)
                }
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                isCursor ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
                isSelected && 'font-medium'
              )}
            >
              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left truncate">{tag.name}</span>
              {tag.count > 0 && (
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">{tag.count}</span>
              )}
              {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-1" />}
            </button>
          )
        })}

        {showCreate && (
          <button
            onClick={handleCreateAndApply}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors border-t',
              allOptions[cursorIndex]?.type === 'create'
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted/50 text-muted-foreground'
            )}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>{t('tagPicker.create', { name: query.trim() })}</span>
          </button>
        )}

        {filteredTags.length === 0 && !showCreate && (
          <p className="px-3 py-4 text-xs text-center text-muted-foreground">{t('tagPicker.empty')}</p>
        )}
      </div>

      {selectedSlugs.size > 0 && (
        <div className="px-3 py-2 border-t bg-muted/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('tagPicker.selected', { count: selectedSlugs.size })}</span>
          <button
            onClick={handleCommit}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('tagPicker.confirm')}
          </button>
        </div>
      )}
    </div>
  )
}
