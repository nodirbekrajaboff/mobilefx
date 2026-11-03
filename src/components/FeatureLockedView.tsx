import { IconArrowLeft, IconLock } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { type AppFeatureKey, getFeatureTitle } from '#/lib/features'
import * as m from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

const LOCKED_VIEW_I18N = {
  uz: {
    badge: 'Qulflangan funksiya',
    subtitle: "Ushbu bo'lim qulflangan. Foydalanish uchun administratorga murojaat qiling.",
  },
  ru: {
    badge: 'Функция заблокирована',
    subtitle: 'Этот раздел заблокирован. Для доступа обратитесь к администратору.',
  },
  en: {
    badge: 'Feature Locked',
    subtitle: 'This module is locked. Please contact the administrator for access.',
  },
} as const

export function FeatureLockedView({ feature }: { feature: AppFeatureKey }) {
  const locale = getLocale()
  const lang = locale.startsWith('ru') ? 'ru' : locale.startsWith('en') ? 'en' : 'uz'
  const copy = LOCKED_VIEW_I18N[lang]
  const title = getFeatureTitle(feature, locale)

  return (
    <div className="flex min-h-[calc(100svh-8rem)] w-full items-center justify-center p-4">
      <Card className="bg-card relative flex w-full max-w-md flex-col items-center gap-4 overflow-hidden border-slate-200/90 p-7 text-center shadow-sm dark:border-white/[0.08]">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-600 shadow-2xs dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
          <IconLock className="size-7 stroke-[2.1]" />
        </div>

        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        >
          <IconLock className="mr-1 size-3" />
          {copy.badge}
        </Badge>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-foreground text-lg font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-xs leading-relaxed">{copy.subtitle}</p>
        </div>

        <Button asChild className="mt-1 w-full">
          <Link to="/" className="no-underline">
            <IconArrowLeft data-icon="inline-start" />
            {m.back()}
          </Link>
        </Button>
      </Card>
    </div>
  )
}
