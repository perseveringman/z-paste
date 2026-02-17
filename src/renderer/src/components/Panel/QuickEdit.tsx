import { useState, useCallback, useRef, useEffect } from 'react'

interface Props {
  content: string
  onSave: (content: string) => void
  onCancel: () => void
}

export default function QuickEdit({ content, onSave, onCancel }: Props): React.JSX.Element {
  const [text, setText] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onSave(text)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [text, onSave, onCancel]
  )

  return (
    <div className="flex flex-col h-full border-l border-black/5 dark:border-white/5">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
        <span className="text-xs text-gray-500 dark:text-gray-400">快速编辑</span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Esc 取消
          </button>
          <button
            onClick={() => onSave(text)}
            className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
          >
            ⌘↵ 保存并粘贴
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 w-full bg-transparent p-3 text-sm text-gray-800 dark:text-gray-200 outline-none resize-none font-mono"
      />
    </div>
  )
}
