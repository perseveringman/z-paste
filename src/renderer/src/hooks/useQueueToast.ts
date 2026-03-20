import { useEffect } from 'react'
import { useClipboardStore } from '../stores/clipboardStore'
import { showToast } from '../utils/toast'

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
