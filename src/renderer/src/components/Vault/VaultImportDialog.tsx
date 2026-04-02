import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Upload, FileText, Check, AlertCircle, ArrowLeft, Loader2, Globe, Key } from 'lucide-react'

type ImportFormat = 'chrome-csv' | '1password-csv' | 'bitwarden-json'
type Step = 'select-source' | 'select-file' | 'preview' | 'importing' | 'done'

interface PreviewData {
  total: number
  entries: Array<{
    name: string
    url?: string
    username?: string
    password?: string
  }>
}

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

const sources: {
  id: ImportFormat
  labelKey: string
  descKey: string
  ext: string[]
}[] = [
  { id: 'chrome-csv', labelKey: 'vault.import.chrome', descKey: 'vault.import.chromeDesc', ext: ['csv'] },
  {
    id: '1password-csv',
    labelKey: 'vault.import.onepassword',
    descKey: 'vault.import.onepasswordDesc',
    ext: ['csv']
  },
  {
    id: 'bitwarden-json',
    labelKey: 'vault.import.bitwarden',
    descKey: 'vault.import.bitwardenDesc',
    ext: ['json']
  }
]

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function VaultImportDialog({ onClose, onImported }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('select-source')
  const [format, setFormat] = useState<ImportFormat | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelectSource = useCallback(
    async (f: ImportFormat) => {
      setFormat(f)
      setError(null)
      const source = sources.find((s) => s.id === f)!
      try {
        const dialogResult = await window.api.showOpenDialog({
          title: t('vault.import.selectFile'),
          filters: [{ name: source.labelKey, extensions: source.ext }],
          properties: ['openFile']
        })
        if (dialogResult.canceled || !dialogResult.filePaths.length) return
        const selectedPath = dialogResult.filePaths[0]
        setFilePath(selectedPath)

        const previewData = await window.api.vaultImportPreview({
          filePath: selectedPath,
          format: f
        })
        setPreview(previewData)
        setStep('preview')
      } catch (e) {
        setError(t('vault.import.parseError', { error: e instanceof Error ? e.message : String(e) }))
      }
    },
    [t]
  )

  const handleImport = useCallback(async () => {
    if (!filePath || !format) return
    setStep('importing')
    setError(null)
    try {
      const importResult = await window.api.vaultImport({ filePath, format })
      setResult(importResult)
      setStep('done')
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStep('preview')
    }
  }, [filePath, format, onImported])

  const handleBack = useCallback(() => {
    setStep('select-source')
    setFormat(null)
    setFilePath(null)
    setPreview(null)
    setError(null)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border rounded-2xl shadow-xl w-[480px] max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            {step !== 'select-source' && step !== 'done' && (
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-semibold">{t('vault.import.title')}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('vault.import.close')}
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {step === 'select-source' && (
              <motion.div
                key="source"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <p className="text-sm text-muted-foreground mb-4">
                  {t('vault.import.description')}
                </p>
                <div className="space-y-2">
                  {sources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => handleSelectSource(source.id)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t(source.labelKey)}</p>
                        <p className="text-xs text-muted-foreground">{t(source.descKey)}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="mt-3 flex items-start gap-2 text-destructive text-xs">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'preview' && preview && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {t('vault.import.previewCount', { count: preview.total })}
                  </span>
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground mb-2">
                  {t('vault.import.previewSample')}
                </p>
                <div className="space-y-1.5">
                  {preview.entries.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md text-xs"
                    >
                      <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate min-w-0 flex-1">{entry.name}</span>
                      {entry.username && (
                        <span className="text-muted-foreground truncate max-w-[140px]">
                          <Key className="w-3 h-3 inline mr-1" />
                          {entry.username}
                        </span>
                      )}
                    </div>
                  ))}
                  {preview.total > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      …and {preview.total - 5} more
                    </p>
                  )}
                </div>
                {error && (
                  <div className="mt-3 flex items-start gap-2 text-destructive text-xs">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">{t('vault.import.importing')}</p>
              </motion.div>
            )}

            {step === 'done' && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col items-center py-6">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-base font-semibold mb-4">{t('vault.import.done')}</h3>
                  <div className="space-y-1 text-sm text-center">
                    <p className="text-green-600 dark:text-green-400">
                      {t('vault.import.resultImported', { count: result.imported })}
                    </p>
                    {result.skipped > 0 && (
                      <p className="text-muted-foreground">
                        {t('vault.import.resultSkipped', { count: result.skipped })}
                      </p>
                    )}
                    {result.errors.length > 0 && (
                      <p className="text-destructive">
                        {t('vault.import.resultErrors', { count: result.errors.length })}
                      </p>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-3 w-full max-h-24 overflow-y-auto text-xs text-destructive bg-destructive/5 rounded-md p-2 space-y-0.5">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="border-t px-6 py-3 flex justify-end">
            <Button size="sm" onClick={handleImport}>
              <Upload className="w-3 h-3 mr-2" />
              {t('vault.import.import')}
            </Button>
          </div>
        )}
        {step === 'done' && (
          <div className="border-t px-6 py-3 flex justify-end">
            <Button size="sm" onClick={onClose}>
              {t('vault.import.close')}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
