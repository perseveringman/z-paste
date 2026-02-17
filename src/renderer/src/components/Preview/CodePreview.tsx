import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

interface Props {
  code: string
  language: string
}

export default function CodePreview({ code, language }: Props): React.JSX.Element {
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const lang = mapLanguage(language)
    codeToHtml(code, { lang, theme: 'vitesse-dark' })
      .then((result) => {
        if (!cancelled) setHtml(result)
      })
      .catch(() => {
        if (!cancelled) setHtml('')
      })
    return () => {
      cancelled = true
    }
  }, [code, language])

  if (!html) {
    return (
      <pre className="text-xs text-gray-300 p-3 overflow-auto whitespace-pre-wrap break-all font-mono">
        {code}
      </pre>
    )
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="text-xs overflow-auto p-3 [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!text-xs"
    />
  )
}

function mapLanguage(lang: string): string {
  const map: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'javascript',
    python: 'python',
    rust: 'rust',
    go: 'go',
    java: 'java',
    html: 'html',
    css: 'css',
    sql: 'sql',
    shell: 'shellscript',
    plaintext: 'text'
  }
  return map[lang] || 'text'
}
