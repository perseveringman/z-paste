import { useRef, useEffect } from 'react'
import { useClipboardStore } from '../../stores/clipboardStore'

export default function SearchBar(): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const { searchQuery, search, isVisible } = useClipboardStore()

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isVisible])

  return (
    <div className="flex-1 flex items-center px-4 py-2.5">
      <svg
        className="w-4 h-4 text-gray-400 mr-3 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => search(e.target.value)}
        placeholder="搜索剪贴板内容..."
        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
      />
      {searchQuery && (
        <button
          onClick={() => search('')}
          className="text-gray-500 hover:text-gray-300 text-xs ml-2"
        >
          清除
        </button>
      )}
    </div>
  )
}
