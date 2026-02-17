import { useClipboardStore } from '../../stores/clipboardStore'

const TABS = [
  { label: '全部', value: null },
  { label: '收藏', value: '__favorites__' },
  { label: '文本', value: 'text' },
  { label: '代码', value: 'code' },
  { label: 'URL', value: 'url' },
  { label: 'JSON', value: 'json' },
  { label: '颜色', value: 'color' },
  { label: '图片', value: 'image' }
]

export default function FilterTabs(): React.JSX.Element {
  const { filterType, setFilterType } = useClipboardStore()

  const handleClick = (value: string | null): void => {
    if (value === '__favorites__') {
      setFilterType(null)
      window.api.getItems({ favoritesOnly: true, limit: 50 }).then((items) => {
        useClipboardStore.setState({ items, selectedIndex: 0, filterType: '__favorites__' })
      })
    } else {
      setFilterType(value)
    }
  }

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-black/5 dark:border-white/5 overflow-x-auto">
      {TABS.map(({ label, value }) => (
        <button
          key={label}
          onClick={() => handleClick(value)}
          className={`px-2 py-0.5 text-[11px] rounded-full whitespace-nowrap transition-colors ${
            filterType === value
              ? 'bg-blue-500/20 text-blue-600 dark:bg-blue-600/30 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
