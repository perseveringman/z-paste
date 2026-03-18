import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownWideNarrow } from 'lucide-react'
import { useClipboardStore } from '../../stores/clipboardStore'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

interface SourceApp {
  name: string
  bundleId: string
  count: number
}

const iconCache = new Map<string, string>()

export default function FilterTabs(): React.JSX.Element {
  const { t } = useTranslation()
  const { filterType, setFilterType, sourceAppFilter, setSourceAppFilter, items, sortBy, setSortBy, leftFilter } = useClipboardStore()

  const tabs = [
    { label: t('panel.filter.all'), value: null },
    { label: t('panel.filter.text'), value: 'text' },
    { label: t('panel.filter.code'), value: 'code' },
    { label: t('panel.filter.url'), value: 'url' },
    { label: t('panel.filter.json'), value: 'json' },
    { label: t('panel.filter.color'), value: 'color' },
    { label: t('panel.filter.image'), value: 'image' }
  ]
  const [sourceApps, setSourceApps] = useState<SourceApp[]>([])
  const [appIcons, setAppIcons] = useState<Map<string, string>>(new Map())
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})

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

  // Load content type counts whenever items, leftFilter, or sourceAppFilter change
  useEffect(() => {
    window.api.getContentTypeCounts({
      leftFilter: leftFilter,
      sourceApp: sourceAppFilter || undefined
    }).then(setTypeCounts)
  }, [items, leftFilter, sourceAppFilter])

  const totalCount = Object.values(typeCounts).reduce((sum, c) => sum + c, 0)

  return (
    <div className="border-b bg-muted/20">
      {/* Content type row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar">
        {tabs.map(({ label, value }) => {
          const isActive = filterType === value
          const count = value === null ? totalCount : (typeCounts[value] || 0)
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
              {count > 0 && (
                <span className={cn(
                  'ml-1 text-[10px]',
                  isActive ? 'opacity-80' : 'opacity-50'
                )}>
                  {count}
                </span>
              )}
            </Badge>
          )
        })}
        <div className="w-px h-4 bg-border mx-1" />
        <Badge
          variant={sortBy === 'usage' ? 'default' : 'secondary'}
          className={cn(
            'cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap text-[11px] flex items-center gap-1',
            sortBy !== 'usage' &&
              'bg-transparent hover:bg-muted text-muted-foreground border border-transparent hover:border-border'
          )}
          onClick={() => setSortBy(sortBy === 'usage' ? 'recent' : 'usage')}
        >
          <ArrowDownWideNarrow className="w-3 h-3" />
          {t('panel.filter.byUsage')}
        </Badge>
      </div>

      {/* Source app row */}
      {sourceApps.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border/50 overflow-x-auto no-scrollbar">
          <button
            className={cn(
              'shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
              sourceAppFilter === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
            onClick={() => setSourceAppFilter(null)}
          >
            {t('panel.filter.all')}
          </button>
          {sourceApps.map((app) => {
            const isActive = sourceAppFilter === app.bundleId
            const icon = appIcons.get(app.bundleId)
            return (
              <button
                key={app.bundleId}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setSourceAppFilter(isActive ? null : app.bundleId)}
              >
                {icon ? (
                  <img
                    src={`data:image/png;base64,${icon}`}
                    alt={app.name}
                    title={app.name}
                    className="w-4 h-4 rounded-sm object-contain shrink-0"
                  />
                ) : (
                  <span className="max-w-[80px] truncate">{app.name}</span>
                )}
                <span className="text-[10px] opacity-70">{app.count}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
