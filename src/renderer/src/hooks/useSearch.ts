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

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items

    const fuse = new Fuse(items, fuseOptions)
    return fuse.search(searchQuery).map((result) => result.item)
  }, [items, searchQuery])

  return filteredItems
}
