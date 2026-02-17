import { useMemo } from 'react'

interface Props {
  content: string
  metadata: string | null
}

export default function ImagePreview({ content, metadata }: Props): React.JSX.Element {
  const size = useMemo(() => {
    if (!metadata) return null
    try {
      const parsed = JSON.parse(metadata)
      return { width: parsed.width, height: parsed.height }
    } catch {
      return null
    }
  }, [metadata])

  const isFilePath = content.startsWith('/') || content.startsWith('~')

  const src = useMemo(() => {
    if (isFilePath) {
      return `file://${content}`
    }
    return `data:image/png;base64,${content}`
  }, [content, isFilePath])

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <img
        src={src}
        alt="Clipboard image"
        className="max-w-full max-h-64 rounded-lg border border-black/10 dark:border-white/10 object-contain"
      />
      {size && (
        <span className="text-xs text-gray-500">
          {size.width} × {size.height}
          {isFilePath && ' (文件引用)'}
        </span>
      )}
    </div>
  )
}
