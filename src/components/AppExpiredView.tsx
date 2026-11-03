import { IconClockOff, IconRefresh } from '@tabler/icons-react'

import { Button } from '#/components/ui/button'
import { useCurrency } from '#/lib/currency'
import { getLocale } from '#/paraglide/runtime'

export function AppExpiredView() {
  const { liveTimer, refetchOverview } = useCurrency()
  const locale = (getLocale() || 'uz').toLowerCase()

  const hours = liveTimer.hours ?? 0

  const copy = locale.startsWith('ru')
    ? {
        badge: 'Время сессии истекло',
        title: 'Срок демонстрационного доступа завершён',
        description: `Выделенное время работы приложения (${hours} ч.) истекло. Доступ к интерфейсу и серверным API временно приостановлен.`,
        startedLabel: 'Время запуска',
        expiredLabel: 'Время окончания',
        hint: 'Для продления времени доступа обратитесь к администратору.',
        retry: 'Проверить статус',
      }
    : locale.startsWith('en')
      ? {
          badge: 'Live Time Expired',
          title: 'Application Live Session Has Ended',
          description: `The allocated live runtime (${hours} hours) has expired. Both the user interface and backend API are now locked.`,
          startedLabel: 'Started at',
          expiredLabel: 'Expired at',
          hint: 'Please contact the administrator to extend your demo session.',
          retry: 'Check Status Again',
        }
      : {
          badge: 'Ishlash vaqti tugadi',
          title: 'Ilovaning jonli ishlash vaqti yakunlandi',
          description: `Ushbu taqdimot/demo uchun ajratilgan ${hours} soatlik ishlash muddati o'z nihoyasiga yetdi. Tizim va barcha server API so'rovlari vaqtincha to'xtatildi.`,
          startedLabel: 'Boshlangan vaqt',
          expiredLabel: 'Tugagan vaqt',
          hint: 'Ishlash vaqtini uzaytirish uchun administratorga murojaat qiling.',
          retry: 'Holatni qayta tekshirish',
        }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div
      data-slot="app-expired-view"
      className="bg-background/95 fixed inset-0 z-50 flex min-h-screen w-full items-center justify-center px-4 py-10 backdrop-blur-xl"
    >
      <div className="bg-card relative w-full max-w-lg overflow-hidden rounded-3xl border border-rose-500/25 p-8 text-center shadow-2xl">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(244,63,94,0.85) 0%, rgba(245,158,11,0.4) 60%, transparent 100%)',
          }}
        />

        <div className="relative mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/12 text-rose-600 shadow-inner dark:text-rose-400">
          <IconClockOff className="size-8 stroke-[1.9]" />
        </div>

        <div className="relative mb-2 inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
          <span>⏳ {copy.badge}</span>
        </div>

        <h1 className="text-foreground relative mt-2 text-xl font-bold tracking-tight sm:text-2xl">
          {copy.title}
        </h1>

        <p className="text-muted-foreground relative mt-2.5 text-sm leading-relaxed">
          {copy.description}
        </p>

        <div className="border-border/70 bg-muted/40 relative mt-6 space-y-2 rounded-2xl border p-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{copy.startedLabel}:</span>
            <span className="text-foreground font-mono font-semibold tabular-nums">
              {formatDateTime(liveTimer.startedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{copy.expiredLabel}:</span>
            <span className="font-mono font-semibold text-rose-600 tabular-nums dark:text-rose-400">
              {formatDateTime(liveTimer.expiresAt)}
            </span>
          </div>
        </div>

        <div className="border-border/60 bg-muted/30 text-muted-foreground relative mt-4 rounded-xl border px-3.5 py-2.5 text-xs">
          {copy.hint}
        </div>

        <div className="relative mt-6 flex items-center justify-center">
          <Button
            variant="outline"
            onClick={() => {
              refetchOverview()
            }}
            className="rounded-xl"
          >
            <IconRefresh className="size-4" />
            {copy.retry}
          </Button>
        </div>
      </div>
    </div>
  )
}
