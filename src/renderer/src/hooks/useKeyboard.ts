import { useEffect, useCallback } from 'react'
import { useClipboardStore } from '../stores/clipboardStore'

export function useKeyboard(): void {
  const { items, selectedIndex, setSelectedIndex, pasteItem, setVisible } = useClipboardStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(Math.min(selectedIndex + 1, items.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(Math.max(selectedIndex - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (items[selectedIndex]) {
            pasteItem(items[selectedIndex].id)
          }
          break
        case 'Escape':
          e.preventDefault()
          setVisible(false)
          window.electron.ipcRenderer.send('panel:close')
          break
        default:
          // Number keys 1-9 for quick select
          if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const target = document.activeElement?.tagName
            if (target === 'INPUT' || target === 'TEXTAREA') return
            const index = parseInt(e.key) - 1
            if (index < items.length) {
              e.preventDefault()
              pasteItem(items[index].id)
            }
          }
      }
    },
    [items, selectedIndex, setSelectedIndex, pasteItem, setVisible]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
