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
        <span className="text-sm text-foreground">{template ? t('template.edit') : t('template.create')}</span>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
          {t('common.cancel')}
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('template.namePlaceholder')}
        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('template.contentPlaceholder')}
        className="flex-1 w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none font-mono"
      />
      <button
        onClick={handleSave}
        disabled={!name.trim() || !content.trim()}
        className="w-full py-2 text-sm rounded bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground transition-colors"
      >
        {t('common.save')}
      </button>
    </div>
  )
}
