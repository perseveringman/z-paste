import { useEffect } from 'react'
import { useClipboardStore } from '../stores/clipboardStore'

export function useQueueToast(): void {
  const { clearQueue } = useClipboardStore()

  useEffect(() => {
    const cleanups: (() => void)[] = []

    cleanups.push(
      window.api.onQueueUpdated((data) => {
        if (data.count > 0) {
          showToast(`已加入队列 (${data.count})`)
        }
      })
    )

    cleanups.push(
      window.api.onQueuePasted((data) => {
        showToast(`已粘贴 ${data.index}/${data.total}`)
      })
    )

    cleanups.push(
      window.api.onQueueBatchPasted((data) => {
        showToast(`已批量粘贴 ${data.count} 条`)
      })
    )

    cleanups.push(
      window.api.onQueueFinished(() => {
        showToast('队列已清空')
        clearQueue()
      })
    )

    return () => cleanups.forEach((fn) => fn())
  }, [clearQueue])
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string): void {
  let el = document.getElementById('zpaste-queue-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'zpaste-queue-toast'
    el.className =
      'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-foreground/90 text-background text-sm font-medium shadow-lg z-[9999] transition-opacity duration-200'
    document.body.appendChild(el)
  }

  el.textContent = message
  el.style.opacity = '1'

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    el!.style.opacity = '0'
    setTimeout(() => el?.remove(), 200)
    toastTimer = null
  }, 2000)
}
