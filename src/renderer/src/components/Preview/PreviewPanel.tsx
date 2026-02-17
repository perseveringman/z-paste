import { useMemo } from 'react'
import { ClipboardItem } from '../../stores/clipboardStore'
import CodePreview from './CodePreview'
import JsonPreview from './JsonPreview'
import ColorPreview from './ColorPreview'
import ImagePreview from './ImagePreview'
import { decodeBase64, decodeURL } from '../../utils/formatters'
import {
  toUpperCase,
  toLowerCase,
  toTitleCase,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  trimWhitespace,
  removeAllWhitespace
} from '../../utils/transformers'

interface Props {
  item: ClipboardItem | null
}

export default function PreviewPanel({ item }: Props): React.JSX.Element {
  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
        选择条目查看预览
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 border-l border-black/5 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.content_type}</span>
        <span className="text-xs text-gray-400 dark:text-gray-600">
          {new Date(item.created_at).toLocaleString('zh-CN')}
        </span>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto">
        <PreviewContent item={item} />
      </div>

      {/* Toolbar */}
      {item.content_type === 'text' && <TextToolbar content={item.content} />}
      {item.content_type === 'base64' && <Base64Toolbar content={item.content} />}
      {item.content_type === 'url' && <UrlToolbar content={item.content} />}
    </div>
  )
}

function PreviewContent({ item }: { item: ClipboardItem }): React.JSX.Element {
  const metadata = useMemo(() => {
    if (!item.metadata) return {}
    try {
      return JSON.parse(item.metadata)
    } catch {
      return {}
    }
  }, [item.metadata])

  switch (item.content_type) {
    case 'code':
      return <CodePreview code={item.content} language={metadata.language || 'plaintext'} />
    case 'json':
      return <JsonPreview content={item.content} />
    case 'color':
      return <ColorPreview content={item.content} />
    case 'image':
      return <ImagePreview content={item.content} metadata={item.metadata} />
    default:
      return (
        <pre className="p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all font-mono">
          {item.content}
        </pre>
      )
  }
}

function TextToolbar({ content }: { content: string }): React.JSX.Element {
  const tools = [
    { label: 'UPPER', fn: () => toUpperCase(content) },
    { label: 'lower', fn: () => toLowerCase(content) },
    { label: 'Title', fn: () => toTitleCase(content) },
    { label: 'camel', fn: () => toCamelCase(content) },
    { label: 'snake', fn: () => toSnakeCase(content) },
    { label: 'kebab', fn: () => toKebabCase(content) },
    { label: 'Trim', fn: () => trimWhitespace(content) },
    { label: '去空格', fn: () => removeAllWhitespace(content) }
  ]

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-t border-black/5 dark:border-white/5">
      {tools.map(({ label, fn }) => (
        <button
          key={label}
          onClick={() => navigator.clipboard.writeText(fn())}
          className="px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Base64Toolbar({ content }: { content: string }): React.JSX.Element {
  const { decoded, valid } = decodeBase64(content)

  return (
    <div className="border-t border-black/5 dark:border-white/5">
      {valid && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">解码结果</span>
            <button
              onClick={() => navigator.clipboard.writeText(decoded)}
              className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              复制
            </button>
          </div>
          <pre className="text-xs text-gray-700 dark:text-gray-300 bg-black/5 dark:bg-white/5 rounded p-2 max-h-20 overflow-auto whitespace-pre-wrap break-all">
            {decoded}
          </pre>
        </div>
      )}
    </div>
  )
}

function UrlToolbar({ content }: { content: string }): React.JSX.Element {
  const decoded = decodeURL(content)
  const showDecoded = decoded !== content

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-t border-black/5 dark:border-white/5">
      <button
        onClick={() => navigator.clipboard.writeText(content)}
        className="px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
      >
        复制 URL
      </button>
      {showDecoded && (
        <button
          onClick={() => navigator.clipboard.writeText(decoded)}
          className="px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
        >
          复制解码
        </button>
      )}
    </div>
  )
}
