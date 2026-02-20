import { useState, useEffect } from 'react'
import { useClipboardStore } from '../../stores/clipboardStore'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

const TABS = [
  { label: '全部', value: null },
  { label: '文本', value: 'text' },
  { label: '代码', value: 'code' },
  { label: 'URL', value: 'url' },
  { label: 'JSON', value: 'json' },
  { label: '颜色', value: 'color' },
  { label: '图片', value: 'image' }
]

interface SourceApp {
  name: string
  bundleId: string
  count: number
}

const iconCache = new Map<string, string>()

export default function FilterTabs(): React.JSX.Element {
  const { filterType, setFilterType, sourceAppFilter, setSourceAppFilter, items } = useClipboardStore()
  const [sourceApps, setSourceApps] = useState<SourceApp[]>([])
  const [appIcons, setAppIcons] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    window.api.getSourceApps().then((apps) => {
      setSourceApps(apps)
      for (const app of apps) {
        if (!app.bundleId || iconCache.has(app.bundleId)) {
          if (iconCache.has(app.bundleId)) {
            setAppIcons((prev) => new Map(prev).set(app.bundleId, iconCache.get(app.bundleId)!))
          }
          continue
        }
        window.api.getAppIcon(app.bundleId).then((icon) => {
          if (icon) {
            iconCache.set(app.bundleId, icon)
            setAppIcons((prev) => new Map(prev).set(app.bundleId, icon))
          }
        })
      }
    })
  }, [items])

  return (
    <div className="border-b bg-muted/20">
      {/* Content type row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar">
        {TABS.map(({ label, value }) => {
          const isActive = filterType === value
          return (
            <Badge
              key={label}
              variant={isActive ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap text-[11px]',
                !isActive &&
                  'bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border'
              )}
              onClick={() => setFilterType(value)}
            >
              {label}
            </Badge>
          )
        })}
      </div>

      {/* Source app row */}
      {sourceApps.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border/50 overflow-x-auto no-scrollbar">
          <Badge
            variant={sourceAppFilter === null ? 'default' : 'secondary'}
            className={cn(
              'cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap text-[11px]',
              sourceAppFilter !== null &&
                'bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border'
            )}
            onClick={() => setSourceAppFilter(null)}
          >
            全部
          </Badge>
          {sourceApps.map((app) => {
            const isActive = sourceAppFilter === app.bundleId
            const icon = appIcons.get(app.bundleId)
            return (
              <Badge
                key={app.bundleId}
                variant={isActive ? 'default' : 'secondary'}
                className={cn(
                  'cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap text-[11px] flex items-center gap-1',
                  !isActive &&
                    'bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border'
                )}
                onClick={() => setSourceAppFilter(isActive ? null : app.bundleId)}
              >
                {icon && (
                  <img
                    src={`data:image/png;base64,${icon}`}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm"
                  />
                )}
                <span className="max-w-[80px] truncate">{app.name}</span>
                <span className="text-[10px] opacity-60">{app.count}</span>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
