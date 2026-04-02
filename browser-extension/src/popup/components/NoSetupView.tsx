import React from 'react'
import { Shield } from 'lucide-react'
import { t } from '../../shared/i18n'

export function NoSetupView() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[480px] px-8 bg-white dark:bg-slate-900">
      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-6">
        <Shield className="w-8 h-8 text-amber-500 dark:text-amber-400" />
      </div>

      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
        {t('noSetupTitle')}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
        {t('noSetupDesc')}
      </p>
    </div>
  )
}
