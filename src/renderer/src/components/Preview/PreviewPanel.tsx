import { useMemo, useState } from 'react'
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
import { Clipboard, Copy, Link, Code, PanelRightClose } from 'lucide-react'
import { Button } from '../ui/button'
import { useClipboardStore } from '../../stores/clipboardStore'

interface Props {
  item: ClipboardItem | null
}

export default function PreviewPanel({ item }: Props): React.JSX.Element {
  const { togglePreview } = useClipboardStore()

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <Clipboard className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-xs">选择条目查看预览</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 border-l bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded shrink-0">
            {item.content_type}
          </span>
          {item.title && (
            <span className="text-xs font-medium text-primary truncate">
              {item.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {new Date(item.created_at).toLocaleString('zh-CN')}
          </span>
          <button
            onClick={togglePreview}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="收起详情 (⌥)"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
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
        <pre className="p-4 text-xs text-foreground whitespace-pre-wrap break-all font-mono leading-relaxed">
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
    { label: 'NoSpace', fn: () => removeAllWhitespace(content) }
  ]

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t bg-muted/20 backdrop-blur-sm">
      {tools.map(({ label, fn }) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => navigator.clipboard.writeText(fn())}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

function Base64Toolbar({ content }: { content: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  const decoded = useMemo(() => {
    if (!expanded) return null
    return decodeBase64(content)
  }, [expanded, content])

  return (
    <div className="border-t bg-muted/20 backdrop-blur-sm">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Code className="w-3 h-3" />
            {expanded ? '收起解码结果' : '展开解码结果'}
          </button>
          {expanded && decoded?.valid && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-primary hover:text-primary"
              onClick={() => navigator.clipboard.writeText(decoded.decoded)}
            >
              <Copy className="w-3 h-3 mr-1" /> 复制
            </Button>
          )}
        </div>
        {expanded && decoded && (
          <pre className="mt-2 text-xs text-foreground bg-muted/50 border rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono">
            {decoded.valid ? decoded.decoded : '无效的 Base64 内容'}
          </pre>
        )}
      </div>
    </div>
  )
}

function UrlToolbar({ content }: { content: string }): React.JSX.Element {
  const decoded = decodeURL(content)
  const showDecoded = decoded !== content

  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 border-t bg-muted/20 backdrop-blur-sm">
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[10px]"
        onClick={() => navigator.clipboard.writeText(content)}
      >
        <Link className="w-3 h-3 mr-1" /> 复制 URL
      </Button>
      {showDecoded && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => navigator.clipboard.writeText(decoded)}
        >
          <Code className="w-3 h-3 mr-1" /> 复制解码
        </Button>
      )}
    </div>
  )
}
