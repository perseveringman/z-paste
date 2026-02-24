import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { ClipboardItem, useClipboardStore } from '../stores/clipboardStore'

const fuseOptions = {
  keys: ['content', 'preview'],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 1
}

export function useSearch(): ClipboardItem[] {
  const { items, searchQuery } = useClipboardStore()

  const fuse = useMemo(() => new Fuse(items, fuseOptions), [items])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    return fuse.search(searchQuery).map((result) => result.item)
  }, [fuse, items, searchQuery])

  return filteredItems
}
