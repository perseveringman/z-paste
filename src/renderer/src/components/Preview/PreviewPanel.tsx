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
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-muted-foreground">
        <div className="rounded-[1.5rem] border border-border/60 bg-background/70 px-8 py-10 text-center shadow-sm">
          <Clipboard className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p className="text-xs">选择条目查看预览</p>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-subtle flex min-w-0 flex-1 flex-col border-l border-border/60">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {item.content_type}
          </span>
          {item.title && (
            <span className="truncate text-xs font-semibold text-primary">
              {item.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {item.use_count > 0 && (
            <span className="tabular-nums">
              {item.use_count}次使用
            </span>
          )}
          <span className="tabular-nums">
            {new Date(item.created_at).toLocaleString('zh-CN')}
          </span>
          <button
            onClick={togglePreview}
            aria-label="收起详情"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="收起详情 (⌥)"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <PreviewContent item={item} />
      </div>

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
        <pre className="whitespace-pre-wrap break-all p-5 font-mono text-xs leading-relaxed text-foreground">
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
    <div className="flex flex-wrap gap-2 border-t border-border/60 bg-background/25 px-3 py-2.5">
      {tools.map(({ label, fn }) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          className="h-7 px-3 text-[10px]"
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
    <div className="border-t border-border/60 bg-background/25">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
          >
            <Code className="w-3 h-3" />
            {expanded ? '收起解码结果' : '展开解码结果'}
          </button>
          {expanded && decoded?.valid && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-primary hover:text-primary"
              onClick={() => navigator.clipboard.writeText(decoded.decoded)}
            >
              <Copy className="w-3 h-3 mr-1" /> 复制
            </Button>
          )}
        </div>
        {expanded && decoded && (
          <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded-[1rem] border border-border/60 bg-background/75 p-3 font-mono text-xs text-foreground">
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
    <div className="flex flex-wrap gap-2 border-t border-border/60 bg-background/25 px-3 py-2.5">
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-[10px]"
        onClick={() => navigator.clipboard.writeText(content)}
      >
        <Link className="w-3 h-3 mr-1" /> 复制 URL
      </Button>
      {showDecoded && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-[10px]"
          onClick={() => navigator.clipboard.writeText(decoded)}
        >
          <Code className="w-3 h-3 mr-1" /> 复制解码
        </Button>
      )}
    </div>
  )
}
