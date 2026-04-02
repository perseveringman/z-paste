import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore, VaultItemMeta } from '../../stores/vaultStore'
import VaultDetail from './VaultDetail'
import { Key, FileText, Star, Copy, ShieldCheck, Eye, X } from 'lucide-react'
import { Button } from '../ui/button'
import { motion, AnimatePresence } from 'framer-motion'

const CARD_WIDTH = 200
const CARD_GAP = 12

interface VaultCardCarouselProps {
  createType: 'login' | 'secure_note' | null
  onCreateTypeChange: (type: 'login' | 'secure_note' | null) => void
}

export default function VaultCardCarousel({
  createType,
  onCreateTypeChange
}: VaultCardCarouselProps): React.JSX.Element {
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  const displayItems = showFavoritesOnly ? items.filter((i) => i.favorite === 1) : items

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (modalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setModalOpen(false)
        }
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, displayItems.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && displayItems.length > 0) {
        e.preventDefault()
        selectItem(displayItems[selectedIdx]?.id)
        setModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [modalOpen, displayItems, selectedIdx, selectItem])

  // Scroll selected card into view
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const cardLeft = selectedIdx * (CARD_WIDTH + CARD_GAP)
    const cardRight = cardLeft + CARD_WIDTH
    const viewLeft = el.scrollLeft
    const viewRight = viewLeft + el.clientWidth

    if (cardLeft < viewLeft) {
      el.scrollTo({ left: cardLeft - CARD_GAP, behavior: 'smooth' })
    } else if (cardRight > viewRight) {
      el.scrollTo({ left: cardRight - el.clientWidth + CARD_GAP, behavior: 'smooth' })
    }
  }, [selectedIdx])

  const handleCardClick = useCallback(
    (item: VaultItemMeta, index: number) => {
      setSelectedIdx(index)
      selectItem(item.id)
    },
    [selectItem]
  )

  const handleCardDoubleClick = useCallback(
    (item: VaultItemMeta) => {
      selectItem(item.id)
      setModalOpen(true)
    },
    [selectItem]
  )

  // Open modal for create
  useEffect(() => {
    if (createType) {
      setModalOpen(true)
    }
  }, [createType])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-0.5 flex-1 bg-muted rounded-md p-0.5">
          {(['all', 'login', 'secure_note'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 text-[10px] px-1.5 py-1 rounded transition-all font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
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

      {/* Card carousel */}
      {displayItems.length > 0 ? (
        <div
          ref={scrollRef}
          className="no-scrollbar flex flex-1 items-stretch gap-3 overflow-x-auto px-3 py-2"
        >
          {displayItems.map((item, index) => (
            <VaultCard
              key={item.id}
              item={item}
              index={index}
              isSelected={selectedIdx === index}
              onClick={handleCardClick}
              onDoubleClick={handleCardDoubleClick}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-5 py-4 text-sm text-muted-foreground">
          <div className="max-w-xs rounded-[1.25rem] border border-border/60 bg-card px-6 py-6 text-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3 mx-auto">
              <Key className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{t('vault.empty')}</p>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {modalOpen && (detail || createType) && (
          <VaultDetailModal
            createType={createType}
            onCreateTypeChange={onCreateTypeChange}
            onClose={() => {
              setModalOpen(false)
              onCreateTypeChange(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Individual vault card for carousel
const VaultCard = memo(function VaultCard({
  item,
  index,
  isSelected,
  onClick,
  onDoubleClick
}: {
  item: VaultItemMeta
  index: number
  isSelected: boolean
  onClick: (item: VaultItemMeta, index: number) => void
  onDoubleClick: (item: VaultItemMeta) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopyUsername = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      const detail = await window.api.vaultGetItemDetail(item.id)
      if (detail && detail.type === 'login') {
        await window.api.vaultCopyToClipboard(detail.fields.username)
        setCopiedField('username')
        setTimeout(() => setCopiedField(null), 1500)
      }
    },
    [item.id]
  )

  const handleAutoType = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      await useVaultStore.getState().autoType(item.id, true)
    },
    [item.id]
  )

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={() => onClick(item, index)}
      onDoubleClick={() => onDoubleClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onDoubleClick(item)
        }
      }}
      className={`flex h-full shrink-0 cursor-pointer flex-col overflow-hidden rounded-[1rem] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
        isSelected
          ? 'border-primary/50 bg-card shadow-lg shadow-primary/8 scale-[1.02]'
          : 'border-border/50 bg-card/80 hover:border-border hover:bg-card'
      }`}
      style={{ width: CARD_WIDTH }}
      aria-label={item.title}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {item.type === 'login' ? (
            <Key className="h-3 w-3" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
        </span>
        <span className="truncate text-[11px] font-semibold text-foreground/90">{item.title}</span>
        {item.favorite === 1 && (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 ml-auto shrink-0" />
        )}
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col justify-center px-3 py-2 min-h-0">
        {item.type === 'login' && (
          <p className="text-[11px] text-muted-foreground truncate">
            {item.website || t('vault.item.loginFallback')}
          </p>
        )}
        {item.type === 'secure_note' && (
          <p className="text-[11px] text-muted-foreground italic">{t('vault.item.secureNote')}</p>
        )}
      </div>

      {/* Card footer with quick actions */}
      <div className="flex items-center gap-1 border-t border-border/40 px-2 py-1.5">
        {item.type === 'login' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={handleCopyUsername}
              aria-label={t('vault.action.copy')}
            >
              <Copy className="w-3 h-3 mr-1" />
              {copiedField === 'username' ? t('vault.action.copied') : t('vault.action.copy')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={handleAutoType}
              aria-label={t('vault.action.autoTypeEnter')}
            >
              <ShieldCheck className="w-3 h-3 mr-1" />
              {t('vault.action.autoType') || 'Auto-type'}
            </Button>
          </>
        )}
        {item.type === 'secure_note' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onDoubleClick(item)
            }}
            aria-label={t('vault.action.view') || 'View'}
          >
            <Eye className="w-3 h-3 mr-1" />
            {t('vault.action.view') || 'View'}
          </Button>
        )}
      </div>
    </div>
  )
})

// Modal overlay for detail view in bottom layout
function VaultDetailModal({
  createType,
  onCreateTypeChange,
  onClose
}: {
  createType: 'login' | 'secure_note' | null
  onCreateTypeChange: (type: 'login' | 'secure_note' | null) => void
  onClose: () => void
}): React.JSX.Element {
  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-[90%] max-w-lg max-h-[80vh] rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 rounded-full hover:bg-muted/80 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="h-full max-h-[80vh] overflow-auto">
          <VaultDetail
            createType={createType}
            onCancelCreate={() => {
              onCreateTypeChange(null)
              onClose()
            }}
            compact
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
