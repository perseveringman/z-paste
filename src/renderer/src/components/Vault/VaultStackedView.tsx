import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore, VaultItemMeta } from '../../stores/vaultStore'
import VaultDetail from './VaultDetail'
import { Key, FileText, Star, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface VaultStackedViewProps {
  createType: 'login' | 'secure_note' | null
  onCreateTypeChange: (type: 'login' | 'secure_note' | null) => void
}

export default function VaultStackedView({
  createType,
  onCreateTypeChange
}: VaultStackedViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const {
    items,
    detail,
    selectItem,
    filterType,
    setFilterType,
    showFavoritesOnly,
    setShowFavoritesOnly
  } = useVaultStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const resetVault = useVaultStore((state) => state.resetVault)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const displayItems = showFavoritesOnly ? items.filter((i) => i.favorite === 1) : items

  // Open drawer when detail is loaded or creating
  useEffect(() => {
    if (detail || createType) {
      setDrawerOpen(true)
    }
  }, [detail?.meta.id, createType])

  const handleSelectItem = useCallback(
    (id: string) => {
      if (detail?.meta.id === id && drawerOpen) {
        // Toggle drawer off if tapping same item
        setDrawerOpen(false)
      } else {
        selectItem(id)
      }
    },
    [detail?.meta.id, drawerOpen, selectItem]
  )

  // Close drawer on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && drawerOpen) {
        e.preventDefault()
        setDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [drawerOpen])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-0.5 flex-1 bg-muted rounded-md p-0.5">
          {(['all', 'login', 'secure_note'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 text-[10px] px-1.5 py-1 rounded-md transition-all font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                filterType === type
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={filterType === type}
            >
              {type === 'all'
                ? t('vault.filter.all')
                : type === 'login'
                  ? t('vault.filter.login')
                  : t('vault.filter.note')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            showFavoritesOnly
              ? 'text-yellow-500 bg-yellow-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          title={t('vault.filter.favoritesOnly')}
          aria-label={t('vault.filter.favoritesOnly')}
          aria-pressed={showFavoritesOnly}
        >
          <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-yellow-500' : ''}`} />
        </button>
      </div>

      {/* Scrollable list — takes remaining space above drawer */}
      <div className="flex-1 overflow-auto p-2 space-y-1 min-h-0">
        {displayItems.map((item) => (
          <VaultListItem
            key={item.id}
            item={item}
            isSelected={detail?.meta.id === item.id}
            onSelect={handleSelectItem}
          />
        ))}
        {displayItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Key className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{t('vault.empty')}</p>
          </div>
        )}
      </div>

      {/* Bottom drawer for detail */}
      <AnimatePresence>
        {drawerOpen && (detail || createType) && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '45%' }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="shrink-0 border-t border-border/60 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Drawer handle */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center py-1 shrink-0 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t('vault.detail.collapse')}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {/* Detail content */}
              <div className="flex-1 min-h-0 overflow-auto">
                <VaultDetail
                  createType={createType}
                  onCancelCreate={() => onCreateTypeChange(null)}
                  compact
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset vault link */}
      {!drawerOpen && (
        <div className="p-2 border-t border-border bg-muted/10 shrink-0">
          {showResetConfirm ? (
            <div className="space-y-2">
              <p className="text-[10px] text-destructive font-medium leading-tight">
                {t('vault.resetVault.prompt')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-[10px] flex-1"
                  onClick={() => {
                    resetVault()
                    setShowResetConfirm(false)
                  }}
                >
                  {t('vault.resetVault.delete')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] flex-1"
                  onClick={() => setShowResetConfirm(false)}
                >
                  {t('vault.resetVault.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              onClick={() => setShowResetConfirm(true)}
            >
              {t('vault.resetVault.button')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// List item used in stacked view — full width
function VaultListItem({
  item,
  isSelected,
  onSelect
}: {
  item: VaultItemMeta
  isSelected: boolean
  onSelect: (id: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`w-full text-left rounded-lg px-3 py-2.5 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
        isSelected
          ? 'bg-muted text-foreground shadow-sm'
          : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
      }`}
      aria-current={isSelected ? 'true' : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 rounded-md ${
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'bg-muted group-hover:bg-muted/80 transition-colors'
          }`}
        >
          {item.type === 'login' ? (
            <Key className="w-3.5 h-3.5" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium truncate ${isSelected ? '' : 'text-foreground'}`}
          >
            {item.title}
          </p>
          <p className="text-[11px] opacity-70 truncate">
            {item.type === 'login'
              ? item.website || t('vault.item.loginFallback')
              : t('vault.item.secureNote')}
          </p>
        </div>
        {item.favorite === 1 && (
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
        )}
      </div>
    </button>
  )
}
