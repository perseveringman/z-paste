import ClipboardItemRow from './ClipboardItem'
import { useSearch } from '../../hooks/useSearch'
import { useClipboardStore } from '../../stores/clipboardStore'

export default function ClipboardList(): React.JSX.Element {
  const items = useSearch()
  const { selectedIndex } = useClipboardStore()

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        <div className="text-center">
          <p className="text-2xl mb-2">📋</p>
          <p>暂无剪贴板记录</p>
          <p className="text-xs mt-1 text-gray-600">复制内容后将自动出现在这里</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((item, index) => (
        <ClipboardItemRow
          key={item.id}
          item={item}
          index={index}
          isSelected={index === selectedIndex}
        />
      ))}
    </div>
  )
}
