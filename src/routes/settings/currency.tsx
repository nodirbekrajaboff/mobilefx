import { IconCheck } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'

import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import { type CurrencyCode, useCurrency } from '#/lib/currency'
import { cn } from '#/lib/utils'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/settings/currency')({
  component: SettingsCurrencyPage,
})

function CurrencyFlag({ code }: { code: CurrencyCode }) {
  switch (code) {
    case 'UZS':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-4.5 w-6.5 shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="6.5" fill="#0099B5" />
          <rect y="6.5" width="28" height="7" fill="#ffffff" />
          <rect y="13.5" width="28" height="6.5" fill="#1EB53A" />
          <line x1="0" y1="6.5" x2="28" y2="6.5" stroke="#CE1126" strokeWidth="0.8" />
          <line x1="0" y1="13.5" x2="28" y2="13.5" stroke="#CE1126" strokeWidth="0.8" />
        </svg>
      )
    case 'USD':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-4.5 w-6.5 shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="20" fill="#B22234" />
          <path d="M0 2.8h28M0 6.1h28M0 9.4h28M0 12.7h28M0 16h28" stroke="#fff" strokeWidth="1.5" />
          <rect width="12" height="11" fill="#3C3B6E" />
          <circle cx="3" cy="3" r="0.9" fill="#fff" />
          <circle cx="6" cy="3" r="0.9" fill="#fff" />
          <circle cx="9" cy="3" r="0.9" fill="#fff" />
          <circle cx="4.5" cy="5.5" r="0.9" fill="#fff" />
          <circle cx="7.5" cy="5.5" r="0.9" fill="#fff" />
          <circle cx="3" cy="8" r="0.9" fill="#fff" />
          <circle cx="6" cy="8" r="0.9" fill="#fff" />
          <circle cx="9" cy="8" r="0.9" fill="#fff" />
        </svg>
      )
    case 'EUR':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-4.5 w-6.5 shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="20" fill="#003399" />
          <circle
            cx="14"
            cy="10"
            r="5.5"
            fill="none"
            stroke="#FFCC00"
            strokeWidth="1.6"
            strokeDasharray="1.4 1.5"
          />
        </svg>
      )
    case 'RUB':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-4.5 w-6.5 shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="6.66" fill="#ffffff" />
          <rect y="6.66" width="28" height="6.66" fill="#0039A6" />
          <rect y="13.33" width="28" height="6.67" fill="#D52B1E" />
        </svg>
      )
    case 'CNY':
      return (
        <svg
          viewBox="0 0 28 20"
          className="h-4.5 w-6.5 shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10 dark:ring-white/15"
        >
          <rect width="28" height="20" fill="#DE2910" />
          <circle cx="6" cy="6" r="2.6" fill="#FFDE00" />
          <circle cx="11" cy="3" r="0.9" fill="#FFDE00" />
          <circle cx="12.5" cy="5.5" r="0.9" fill="#FFDE00" />
          <circle cx="12" cy="8.5" r="0.9" fill="#FFDE00" />
          <circle cx="9.8" cy="10.5" r="0.9" fill="#FFDE00" />
        </svg>
      )
  }
}

const CURRENCY_OPTIONS: Array<{
  code: CurrencyCode
  title: () => string
  symbol: string
}> = [
  {
    code: 'UZS',
    title: () => m.currency_uzs_title(),
    symbol: "so'm",
  },
  {
    code: 'USD',
    title: () => m.currency_usd_title(),
    symbol: '$',
  },
  {
    code: 'EUR',
    title: () => m.currency_eur_title(),
    symbol: '€',
  },
  {
    code: 'RUB',
    title: () => m.currency_rub_title(),
    symbol: '₽',
  },
  {
    code: 'CNY',
    title: () => m.currency_cny_title(),
    symbol: '¥',
  },
]

function SettingsCurrencyPage() {
  const { currency, setCurrency, formatMoney, getRateForCurrency } = useCurrency()

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-foreground text-base font-bold tracking-tight">
              {m.currency_title()}
            </h2>
            <p className="text-muted-foreground text-xs">{m.currency_desc()}</p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-950/[0.07] bg-slate-950/[0.02] px-4 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-[11px]">{m.currency_sample()}</span>
              <span className="text-foreground font-mono text-base font-extrabold tabular-nums">
                {formatMoney(12820000)}
              </span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {currency}
            </Badge>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CURRENCY_OPTIONS.map((opt) => {
            const active = currency === opt.code
            const rate = getRateForCurrency(opt.code)
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => setCurrency(opt.code)}
                className={cn(
                  'focus-visible:ring-ring/40 flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-150 outline-none focus-visible:ring-3',
                  active
                    ? 'border-primary bg-primary/[0.03] ring-primary/20 dark:bg-primary/[0.08] ring-2'
                    : 'bg-card border-slate-950/[0.08] hover:border-slate-950/[0.18] hover:bg-slate-950/[0.015] dark:border-white/[0.09] dark:hover:border-white/[0.2] dark:hover:bg-white/[0.02]',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-950/[0.06] bg-slate-950/[0.025] dark:border-white/[0.08] dark:bg-white/[0.04]">
                    <CurrencyFlag code={opt.code} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-xs font-bold">{opt.title()}</span>
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px] font-medium tabular-nums">
                      {opt.code === 'UZS'
                        ? m.currency_national_sub()
                        : `1 ${opt.code} = ${rate.toLocaleString('ru-RU')} so'm`}
                    </span>
                  </div>
                </div>

                <span
                  className={cn(
                    'flex size-5.5 shrink-0 items-center justify-center rounded-full transition-all duration-150',
                    active
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'border border-slate-300 bg-transparent dark:border-slate-700',
                  )}
                >
                  {active && <IconCheck className="size-3.5 stroke-[2.5]" />}
                </span>
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
