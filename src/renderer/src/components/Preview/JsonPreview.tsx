import { useMemo, useCallback } from 'react'
import { formatJSON } from '../../utils/formatters'

interface Props {
  content: string
}

export default function JsonPreview({ content }: Props): React.JSX.Element {
  const { formatted, valid, error } = useMemo(() => formatJSON(content), [content])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formatted)
  }, [formatted])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        <span className={`text-xs ${valid ? 'text-green-400' : 'text-red-400'}`}>
          {valid ? '✓ Valid JSON' : `✗ ${error}`}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          复制
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap break-all">
        {valid ? colorizeJSON(formatted) : <span className="text-gray-300">{content}</span>}
      </pre>
    </div>
  )
}

function colorizeJSON(json: string): React.JSX.Element {
  const parts = json.split(/("(?:[^"\\]|\\.)*")/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('"')) {
          // Check if it's a key (followed by :) or a string value
          const isKey = json.indexOf(part + ':', json.indexOf(part)) !== -1
          return (
            <span key={i} className={isKey ? 'text-blue-400' : 'text-green-400'}>
              {part}
            </span>
          )
        }
        // Colorize numbers, booleans, null
        const colored = part
          .replace(/\b(true|false)\b/g, '<bool>$1</bool>')
          .replace(/\b(null)\b/g, '<null>$1</null>')
          .replace(/\b(\d+\.?\d*)\b/g, '<num>$1</num>')

        if (colored === part) {
          return (
            <span key={i} className="text-gray-400">
              {part}
            </span>
          )
        }

        const segments = colored.split(/(<\w+>.*?<\/\w+>)/g)
        return (
          <span key={i}>
            {segments.map((seg, j) => {
              if (seg.startsWith('<bool>'))
                return (
                  <span key={j} className="text-yellow-400">
                    {seg.replace(/<\/?bool>/g, '')}
                  </span>
                )
              if (seg.startsWith('<null>'))
                return (
                  <span key={j} className="text-red-400">
                    {seg.replace(/<\/?null>/g, '')}
                  </span>
                )
              if (seg.startsWith('<num>'))
                return (
                  <span key={j} className="text-purple-400">
                    {seg.replace(/<\/?num>/g, '')}
                  </span>
                )
              return (
                <span key={j} className="text-gray-400">
                  {seg}
                </span>
              )
            })}
          </span>
        )
      })}
    </>
  )
}
