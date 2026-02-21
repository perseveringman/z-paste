import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface Template {
  id: string
  name: string
  content: string
}

interface Props {
  template: Template | null
  onSave: () => void
  onCancel: () => void
}

export default function TemplateEditor({ template, onSave, onCancel }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState(template?.name || '')
  const [content, setContent] = useState(template?.content || '')

  const handleSave = useCallback(async () => {
    if (!name.trim() || !content.trim()) return
    if (template) {
      await window.api.updateTemplate(template.id, name, content)
    } else {
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 21)
      await window.api.createTemplate(id, name, content)
    }
    onSave()
  }, [name, content, template, onSave])

  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{template ? t('template.edit') : t('template.create')}</span>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-300">
          {t('common.cancel')}
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('template.namePlaceholder')}
        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('template.contentPlaceholder')}
        className="flex-1 w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 resize-none font-mono"
      />
      <button
        onClick={handleSave}
        disabled={!name.trim() || !content.trim()}
        className="w-full py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
      >
        {t('common.save')}
      </button>
    </div>
  )
}
