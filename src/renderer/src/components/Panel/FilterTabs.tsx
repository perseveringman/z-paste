import { useClipboardStore } from '../../stores/clipboardStore'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

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
    <div className="flex items-center gap-2 px-3 py-2 border-b overflow-x-auto no-scrollbar bg-muted/20">
      {TABS.map(({ label, value }) => {
        const isActive = filterType === value
        return (
          <Badge
            key={label}
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              "cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap",
              !isActive && "bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border"
            )}
            onClick={() => handleClick(value)}
          >
            {label}
          </Badge>
        )
      })}
    </div>
  )
}
