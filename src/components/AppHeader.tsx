import { IconArrowLeft, IconChevronDown, IconLock, IconLogout } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useMatches, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { LiveDemoTimerBadge } from '#/components/LiveDemoTimerBadge'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import * as m from '#/paraglide/messages'

const PAGE_TITLES: Record<string, () => string> = {
  '/repairs': () => m.nav_repairs(),
  '/phones': () => m.nav_phones(),
  '/parts': () => m.nav_parts(),
  '/pos': () => m.nav_pos(),
  '/sales': () => m.nav_sales(),
  '/debts': () => m.nav_debts(),
  '/customers': () => m.nav_customers(),
  '/analytics': () => m.nav_analytics(),
  '/settings': () => m.nav_settings(),
}

interface CbuRateItem {
  ccy: 'USD' | 'EUR' | 'RUB' | 'CNY' | 'KZT' | 'GBP'
  nameUz: string
  rate: number
  diff: number
  date: string
}

const DEFAULT_CBU_RATES: CbuRateItem[] = [
  { ccy: 'USD', nameUz: 'AQSH dollari', rate: 12820, diff: 14.5, date: 'CBU.UZ' },
  { ccy: 'EUR', nameUz: 'Yevro', rate: 13890, diff: 22.1, date: 'CBU.UZ' },
  { ccy: 'RUB', nameUz: 'Rossiya rubli', rate: 136.4, diff: -0.8, date: 'CBU.UZ' },
  { ccy: 'CNY', nameUz: 'Xitoy yuani', rate: 1775.2, diff: 4.3, date: 'CBU.UZ' },
  { ccy: 'KZT', nameUz: "Qozog'iston tengesi", rate: 25.8, diff: 0.15, date: 'CBU.UZ' },
  { ccy: 'GBP', nameUz: 'Angliya funti', rate: 16420, diff: 31.0, date: 'CBU.UZ' },
]

function CountryFlag({ code }: { code: CbuRateItem['ccy'] | 'UZS' }) {
  switch (code) {
    case 'USD':
      return (
        <svg viewBox="0 0 28 20" className="h-4 w-5.5 shrink-0 rounded-[3px] shadow-2xs">
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
        <svg viewBox="0 0 28 20" className="h-4 w-5.5 shrink-0 rounded-[3px] shadow-2xs">
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
        <svg viewBox="0 0 28 20" className="h-4 w-5.5 shrink-0 rounded-[3px] ring-1 ring-black/10">
          <rect width="28" height="6.66" fill="#ffffff" />
          <rect y="6.66" width="28" height="6.66" fill="#0039A6" />
          <rect y="13.33" width="28" height="6.67" fill="#D52B1E" />
        </svg>
      )
    case 'CNY':
      return (
        <svg viewBox="0 0 28 20" className="h-4 w-5.5 shrink-0 rounded-[3px] shadow-2xs">
          <rect width="28" height="20" fill="#DE2910" />
          <circle cx="6" cy="6" r="2.6" fill="#FFDE00" />
          <circle cx="11" cy="3" r="0.9" fill="#FFDE00" />
          <circle cx="12.5" cy="5.5" r="0.9" fill="#FFDE00" />
          <circle cx="12" cy="8.5" r="0.9" fill="#FFDE00" />
          <circle cx="9.8" cy="10.5" r="0.9" fill="#FFDE00" />
        </svg>
      )
    case 'KZT':
      return (
        <svg viewBox="0 0 28 20" className="h-4 w-5.5 shrink-0 rounded-[3px] shadow-2xs">
          <rect width="28" height="20" fill="#00AFCA" />
          <circle cx="14" cy="10" r="4" fill="#FEC50C" />
        </svg>
      )
    case 'GBP':
      return (
        <svg viewBox="0 0 28 20" className="h-4 w-5.5 shrink-0 rounded-[3px] shadow-2xs">
          <rect width="28" height="20" fill="#012169" />
          <path d="M0 0L28 20M28 0L0 20" stroke="#fff" strokeWidth="3.5" />
          <path d="M0 0L28 20M28 0L0 20" stroke="#C8102E" strokeWidth="1.8" />
          <path d="M14 0V20M0 10H28" stroke="#fff" strokeWidth="5.5" />
          <path d="M14 0V20M0 10H28" stroke="#C8102E" strokeWidth="3.2" />
        </svg>
      )
    case 'UZS':
      return (
        <svg viewBox="0 0 28 20" className="h-4 w-5.5 shrink-0 rounded-[3px] ring-1 ring-black/10">
          <rect width="28" height="6.5" fill="#0099B5" />
          <rect y="6.5" width="28" height="7" fill="#ffffff" />
          <rect y="13.5" width="28" height="6.5" fill="#1EB53A" />
          <line x1="0" y1="6.5" x2="28" y2="6.5" stroke="#CE1126" strokeWidth="0.8" />
          <line x1="0" y1="13.5" x2="28" y2="13.5" stroke="#CE1126" strokeWidth="0.8" />
        </svg>
      )
  }
}

export function AppHeader() {
  const location = useLocation()
  const matches = useMatches()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { overviewData, isFeatureLocked, notifyFeatureLocked } = useCurrency()
  const isCurrencyLocked = isFeatureLocked('currency_rates')

  const authQuery = useQuery({
    queryKey: ['auth-guard'],
    queryFn: async () => {
      const { data, error } = await getApi()['auth-guard'].me.get()
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })

  const [rateOpen, setRateOpen] = useState(false)
  const [liveCbuRates, setLiveCbuRates] = useState<CbuRateItem[] | null>(null)
  const [tickerIndex, setTickerIndex] = useState(0)

  const activePathname = matches[matches.length - 1]?.pathname ?? location.pathname
  const isHome = activePathname === '/'
  const isLogin = activePathname === '/login'

  const serverCbuRates = (overviewData as { cbuRates?: CbuRateItem[] } | undefined)?.cbuRates
  const cbuRates = liveCbuRates ?? serverCbuRates ?? DEFAULT_CBU_RATES

  useEffect(() => {
    let active = true
    fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/')
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          raw: Array<{
            Ccy?: string
            CcyNm_UZ?: string
            Rate?: string
            Diff?: string
            Date?: string
          }> | null,
        ) => {
          if (!active || !Array.isArray(raw)) return
          const wanted: Array<CbuRateItem['ccy']> = ['USD', 'EUR', 'RUB', 'CNY', 'KZT', 'GBP']
          const mapped: CbuRateItem[] = wanted.map((code) => {
            const found = raw.find((item) => item.Ccy === code)
            const fallback = DEFAULT_CBU_RATES.find((d) => d.ccy === code)!
            if (!found) return fallback
            return {
              ccy: code,
              nameUz: found.CcyNm_UZ || fallback.nameUz,
              rate: Number(found.Rate) || fallback.rate,
              diff: Number(found.Diff) || 0,
              date: found.Date || fallback.date,
            }
          })
          setLiveCbuRates(mapped)
        },
      )
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (cbuRates.length <= 1) return
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % cbuRates.length)
    }, 3200)
    return () => clearInterval(timer)
  }, [cbuRates.length])

  if (isHome || isLogin) return null

  const currentTitle = activePathname.startsWith('/settings')
    ? m.nav_settings()
    : PAGE_TITLES[activePathname]?.() || 'Mobile Fix'
  const currentCbu = cbuRates[tickerIndex % cbuRates.length] ?? cbuRates[0]

  const userName = authQuery.data?.user?.name || 'Sardor Usta'
  const userEmail = authQuery.data?.user?.email || 'admin@mobilefix.uz'
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header
      data-slot="app-header"
      className="border-border/80 bg-card/95 text-card-foreground sticky top-0 z-30 border-b shadow-2xs backdrop-blur-md"
    >
      <style>{`
        @keyframes cbuSlideTopToBottom {
          0% {
            opacity: 0.25;
            transform: translateY(-75%);
          }
          100% {
            opacity: 1;
            transform: translateY(0%);
          }
        }
        .cbu-ticker-item {
          animation: cbuSlideTopToBottom 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        {/* Chap tomonda: <- Orqaga tugmasi va sahifa nomi */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            asChild
            className="text-foreground shrink-0 bg-slate-950/[0.05] px-2.5 hover:bg-slate-950/[0.08] sm:px-3.5 dark:bg-white/[0.07] dark:text-zinc-100 dark:hover:bg-white/[0.11]"
          >
            <Link
              to="/"
              onPointerDown={() => {
                const seg = activePathname.split('/').filter(Boolean)[0] || ''
                if (seg) {
                  sessionStorage.setItem('closing-app-id', seg)
                }
                document.documentElement.dataset.vtDirection = 'app-close'
              }}
              onClick={() => {
                const seg = activePathname.split('/').filter(Boolean)[0] || ''
                if (seg) {
                  sessionStorage.setItem('closing-app-id', seg)
                }
                document.documentElement.dataset.vtDirection = 'app-close'
              }}
              className="no-underline"
            >
              <IconArrowLeft data-icon="inline-start" />
              <span className="hidden min-[420px]:inline">{m.back()}</span>
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5 shrink-0" />
          <span className="text-foreground truncate text-sm font-bold sm:text-base">
            {currentTitle}
          </span>
        </div>

        {/* O'ng tomonda: Live Timer (agar APP_LIVE_HOURS bo'lsa), Valyutalar vidjeti va Avatar */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LiveDemoTimerBadge />
          <Popover
            open={isCurrencyLocked ? false : rateOpen}
            onOpenChange={(nextOpen) => {
              if (isCurrencyLocked) {
                notifyFeatureLocked('currency_rates')
                return
              }
              setRateOpen(nextOpen)
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  if (isCurrencyLocked) {
                    e.preventDefault()
                    notifyFeatureLocked('currency_rates')
                  }
                }}
                className={`group relative flex h-9 shrink-0 items-center justify-between gap-1.5 overflow-hidden rounded-xl border border-slate-950/[0.09] bg-white/90 px-2.5 text-xs whitespace-nowrap shadow-2xs transition hover:border-slate-950/[0.16] sm:h-10 sm:min-w-[235px] sm:gap-2.5 sm:px-3.5 dark:border-white/[0.09] dark:bg-white/[0.04] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.06] ${
                  isCurrencyLocked ? 'opacity-70' : ''
                }`}
              >
                <div
                  key={currentCbu.ccy}
                  className="cbu-ticker-item flex items-center gap-1.5 whitespace-nowrap sm:gap-2"
                >
                  <CountryFlag code={currentCbu.ccy} />
                  <span className="text-foreground font-bold whitespace-nowrap">
                    1 {currentCbu.ccy}
                  </span>
                  <span className="text-muted-foreground">=</span>
                  <span className="text-foreground font-mono font-bold whitespace-nowrap tabular-nums">
                    {currentCbu.rate.toLocaleString('ru-RU', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    so'm
                  </span>
                  <span
                    className={`hidden rounded px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap tabular-nums sm:inline-block ${
                      currentCbu.diff >= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}
                  >
                    {currentCbu.diff >= 0 ? '+' : ''}
                    {currentCbu.diff}
                  </span>
                </div>
                {isCurrencyLocked ? (
                  <IconLock className="size-3.5 shrink-0 text-amber-500" />
                ) : (
                  <IconChevronDown className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition" />
                )}
              </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 p-3.5">
              <div className="flex items-center justify-between pb-2.5">
                <div>
                  <div className="text-foreground text-xs font-bold">{m.cbu_rates_title()}</div>
                  <div className="text-muted-foreground text-[11px]">{m.cbu_rates_subtitle()}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                {cbuRates.map((item, idx) => (
                  <div
                    key={item.ccy}
                    onClick={() => {
                      setTickerIndex(idx)
                      setRateOpen(false)
                    }}
                    className="border-border/70 bg-muted/40 flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-2 text-xs transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40"
                  >
                    <div className="flex items-center gap-2">
                      <CountryFlag code={item.ccy} />
                      <div className="flex flex-col">
                        <span className="text-foreground font-bold">{item.ccy}</span>
                        <span className="text-muted-foreground text-[10px]">{item.nameUz}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-mono font-bold tabular-nums">
                        {item.rate.toLocaleString('ru-RU', {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${
                          item.diff >= 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}
                      >
                        {item.diff >= 0 ? '+' : ''}
                        {item.diff}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Kattaroq User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-slot="user-avatar"
                variant="ghost"
                size="icon-lg"
                className="rounded-full p-0"
                aria-label={m.user_profile()}
              >
                <Avatar size="default">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-foreground truncate text-xs font-semibold">{userName}</span>
                <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  await getApi()['auth-guard'].logout.post()
                  await queryClient.invalidateQueries({
                    queryKey: ['auth-guard'],
                  })
                  void navigate({ to: '/login', replace: true })
                }}
              >
                <IconLogout />
                {m.logout()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
