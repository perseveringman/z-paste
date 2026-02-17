import { useState, useEffect, useCallback } from 'react'
import TemplateEditor from './TemplateEditor'

interface Template {
  id: string
  name: string
  content: string
  category_id: string | null
  sort_order: number
  created_at: number
  updated_at: number
}

export default function TemplateList(): React.JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([])
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)

  const loadTemplates = useCallback(async () => {
    const items = await window.api.getTemplates()
    setTemplates(items)
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handlePaste = useCallback((template: Template) => {
    navigator.clipboard.writeText(template.content)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      await window.api.deleteTemplate(id)
      loadTemplates()
    },
    [loadTemplates]
  )

  if (editing || creating) {
    return (
      <TemplateEditor
        template={editing}
        onSave={() => {
          setEditing(null)
          setCreating(false)
          loadTemplates()
        }}
        onCancel={() => {
          setEditing(null)
          setCreating(false)
        }}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs text-gray-400">模板片段</span>
        <button
          onClick={() => setCreating(true)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          + 新建
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {templates.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            暂无模板，点击上方"+ 新建"创建
          </div>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              onClick={() => handlePaste(t)}
              className="group flex items-center px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className="mr-2 text-sm">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{t.name}</p>
                <p className="text-xs text-gray-500 truncate">{t.content}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(t)
                  }}
                  className="text-xs text-gray-400 hover:text-white px-1"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(t.id)
                  }}
                  className="text-xs text-gray-400 hover:text-red-400 px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
