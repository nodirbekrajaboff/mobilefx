import { IconClockHour4, IconHourglassHigh } from '@tabler/icons-react'

import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { useCurrency } from '#/lib/currency'
import { formatRemainingLiveTime } from '#/lib/features'
import { getLocale } from '#/paraglide/runtime'

export function LiveDemoTimerBadge() {
  const { liveTimer } = useCurrency()
  const locale = (getLocale() || 'uz').toLowerCase()

  if (!liveTimer.enabled) {
    return null
  }

  const remainingMs = liveTimer.remainingMs ?? 0
  const totalMs = (liveTimer.hours ?? 1) * 60 * 60 * 1000
  const percentRemaining = Math.max(
    0,
    Math.min(100, Math.round((remainingMs / Math.max(1, totalMs)) * 100)),
  )

  const isCritical = remainingMs <= 5 * 60 * 1000
  const isWarning = !isCritical && remainingMs <= 30 * 60 * 1000

  const formattedCountdown = formatRemainingLiveTime(remainingMs)

  const copy = locale.startsWith('ru')
    ? {
        badgeLabel: 'Демо время',
        popoverTitle: 'Активное время приложения',
        popoverSubtitle: `Лимит работы: ${liveTimer.hours} ч.`,
        startedAtLabel: 'Время запуска',
        expiresAtLabel: 'Время окончания',
        remainingLabel: 'Осталось времени',
      }
    : locale.startsWith('en')
      ? {
          badgeLabel: 'Live Time',
          popoverTitle: 'Application Live Session',
          popoverSubtitle: `Allocated runtime: ${liveTimer.hours}h`,
          startedAtLabel: 'Started at',
          expiresAtLabel: 'Expires at',
          remainingLabel: 'Remaining time',
        }
      : {
          badgeLabel: 'Ishlash vaqti',
          popoverTitle: 'Ilova jonli ishlash vaqti',
          popoverSubtitle: `Ajratilgan muddat: ${liveTimer.hours} soat`,
          startedAtLabel: 'Boshlangan vaqt',
          expiresAtLabel: 'Tugash vaqti',
          remainingLabel: 'Qolgan vaqt',
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="live-demo-timer"
          className={`group pointer-events-auto flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-2xs backdrop-blur-md transition sm:h-10 sm:px-3.5 ${
            isCritical
              ? 'border-rose-500/40 bg-rose-500/12 text-rose-700 hover:bg-rose-500/18 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'
              : isWarning
                ? 'border-amber-500/40 bg-amber-500/12 text-amber-800 hover:bg-amber-500/18 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 hover:border-emerald-500/45 hover:bg-emerald-500/15 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-300'
          }`}
        >
          <span className="relative flex size-2">
            <span
              className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${
                isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <span
              className={`relative inline-flex size-2 rounded-full ${
                isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </span>

          <IconClockHour4 className="size-3.5 shrink-0 opacity-85" />
          <span className="hidden text-[11px] font-medium opacity-85 md:inline">
            {copy.badgeLabel}:
          </span>
          <span className="font-mono text-xs font-bold tracking-wider tabular-nums sm:text-[13px]">
            {formattedCountdown}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
              isCritical
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : isWarning
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <IconHourglassHigh className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-foreground text-xs font-bold">{copy.popoverTitle}</div>
            <div className="text-muted-foreground mt-0.5 text-[11px]">{copy.popoverSubtitle}</div>
          </div>
        </div>

        <div className="border-border/70 bg-muted/40 mt-3.5 rounded-xl border p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{copy.remainingLabel}</span>
            <span className="text-foreground font-mono text-sm font-bold tabular-nums">
              {formattedCountdown}
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-950/10 dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>

          <div className="border-border/60 mt-3 space-y-1.5 border-t pt-2.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{copy.startedAtLabel}:</span>
              <span className="text-foreground font-mono font-medium tabular-nums">
                {formatDateTime(liveTimer.startedAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{copy.expiresAtLabel}:</span>
              <span className="text-foreground font-mono font-medium tabular-nums">
                {formatDateTime(liveTimer.expiresAt)}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
