import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../stores/vaultStore'
import { Key, FileText, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select"
import { useState } from 'react'

interface VaultSidebarProps {
  onCreate: (type: 'login' | 'secure_note') => void
}

export default function VaultSidebar({ onCreate }: VaultSidebarProps): React.JSX.Element {
  const { t } = useTranslation()
  const { items, detail, selectItem } = useVaultStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const resetVault = useVaultStore((state) => state.resetVault)

  return (
    <div className="w-[34%] border-r min-h-0 flex flex-col bg-muted/5">
      <div className="p-3 border-b">
        <Select onValueChange={(value: 'login' | 'secure_note') => onCreate(value)}>
          <SelectTrigger className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">{t('vault.newItem')}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="login">{t('vault.newLogin')}</SelectItem>
            <SelectItem value="secure_note">{t('vault.newSecureNote')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => selectItem(item.id)}
            className={`w-full text-left rounded-lg px-3 py-2.5 transition-all group ${
              detail?.meta.id === item.id
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${detail?.meta.id === item.id ? 'bg-primary/10 text-primary' : 'bg-muted group-hover:bg-background transition-colors'}`}>
                {item.type === 'login' ? <Key className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${detail?.meta.id === item.id ? '' : 'text-foreground'}`}>
                  {item.title}
                </p>
                <p className="text-[11px] opacity-70 truncate">
                  {item.type === 'login' ? item.website || t('vault.item.loginFallback') : t('vault.item.secureNote')}
                </p>
              </div>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Key className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{t('vault.empty')}</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t bg-muted/10">
        {showResetConfirm ? (
          <div className="space-y-2">
            <p className="text-[10px] text-destructive font-medium leading-tight">{t('vault.resetVault.prompt')}</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" className="h-7 text-[10px] flex-1" onClick={() => { resetVault(); setShowResetConfirm(false) }}>
                {t('vault.resetVault.delete')}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1" onClick={() => setShowResetConfirm(false)}>
                {t('vault.resetVault.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => setShowResetConfirm(true)}
          >
            {t('vault.resetVault.button')}
          </button>
        )}
      </div>
    </div>
  )
}
