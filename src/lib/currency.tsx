import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { getApi } from '#/lib/api'
import {
  type AppFeatureKey,
  type AppLiveTimerState,
  getLockedFeatureToastMessage,
  parseAppFeaturesEnv,
  parseAppLiveHoursEnv,
  type ParsedAppFeatures,
} from '#/lib/features'
import { getLocale } from '#/paraglide/runtime'

export type CurrencyCode = 'UZS' | 'USD' | 'EUR' | 'RUB' | 'CNY'

const CURRENCY_STORAGE_KEY = 'mf_default_currency'

interface CurrencyContextValue {
  currency: CurrencyCode
  setCurrency: (next: CurrencyCode) => void
  cbuRate: number
  internalRate: number
  getRateForCurrency: (code: CurrencyCode) => number
  formatMoney: (amountUzs: number | null | undefined) => string
  formatDual: (amountUzs: number | null | undefined) => { primary: string; secondary: string }
  overviewData: Awaited<ReturnType<ReturnType<typeof getApi>['overview']['get']>>['data']
  refetchOverview: () => void
  features: ParsedAppFeatures
  liveTimer: AppLiveTimerState
  isFeatureEnabled: (feature: AppFeatureKey) => boolean
  isFeatureLocked: (feature: AppFeatureKey) => boolean
  notifyFeatureLocked: (feature: AppFeatureKey) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function formatUzsRaw(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} so'm`
}

export function formatUsdRaw(amountUzs: number, rate: number): string {
  const usd = amountUzs / (rate || 12820)
  return `$${usd.toLocaleString('en-US', {
    minimumFractionDigits: usd % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })}`
}

export function formatForeignCurrency(amountUzs: number, code: CurrencyCode, rate: number): string {
  if (code === 'UZS') return formatUzsRaw(amountUzs)
  if (code === 'USD') return formatUsdRaw(amountUzs, rate)
  const converted = amountUzs / (rate || 1)
  const formatted = converted.toLocaleString('ru-RU', {
    minimumFractionDigits: converted % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })
  switch (code) {
    case 'EUR':
      return `€${formatted}`
    case 'RUB':
      return `${formatted} ₽`
    case 'CNY':
      return `¥${formatted}`
    default:
      return `${formatted} ${code}`
  }
}

function isValidCurrency(val: string | undefined | null): val is CurrencyCode {
  return val === 'UZS' || val === 'USD' || val === 'EUR' || val === 'RUB' || val === 'CNY'
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY)
      if (isValidCurrency(saved)) return saved
    }
    return 'UZS'
  })

  const overviewQuery = useQuery({
    queryKey: ['overview'],
    queryFn: async () => {
      const { data, error } = await getApi().overview.get()
      if (error) throw error
      return data
    },
    refetchInterval: 30000,
  })

  const settings = overviewQuery.data?.settings
  const cbuRates = overviewQuery.data?.cbuRates ?? []

  const features: ParsedAppFeatures = useMemo(() => {
    const serverFeatures = (overviewQuery.data as { features?: ParsedAppFeatures } | undefined)
      ?.features
    if (serverFeatures && Array.isArray(serverFeatures.enabled)) {
      return serverFeatures
    }
    const clientEnv =
      typeof import.meta !== 'undefined'
        ? (import.meta.env?.VITE_APP_FEATURES as string | undefined)
        : undefined
    return parseAppFeaturesEnv(clientEnv)
  }, [overviewQuery.data])

  const baseLiveTimer: AppLiveTimerState = useMemo(() => {
    const serverTimer = (overviewQuery.data as { liveTimer?: AppLiveTimerState } | undefined)
      ?.liveTimer
    if (serverTimer && typeof serverTimer.enabled === 'boolean') {
      return serverTimer
    }
    const clientHours =
      typeof import.meta !== 'undefined'
        ? (import.meta.env?.VITE_APP_LIVE_HOURS as string | undefined)
        : undefined
    return parseAppLiveHoursEnv(clientHours)
  }, [overviewQuery.data])

  const [nowTick, setNowTick] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!baseLiveTimer.enabled || !baseLiveTimer.expiresAt) return
    setNowTick(Date.now())
    const interval = window.setInterval(() => {
      setNowTick(Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [baseLiveTimer.enabled, baseLiveTimer.expiresAt])

  const liveTimer: AppLiveTimerState = useMemo(() => {
    if (!baseLiveTimer.enabled || !baseLiveTimer.expiresAt) {
      return baseLiveTimer
    }
    const expiresMs = Date.parse(baseLiveTimer.expiresAt)
    if (Number.isNaN(expiresMs)) {
      return baseLiveTimer
    }
    const remainingMs = Math.max(0, expiresMs - nowTick)
    return {
      ...baseLiveTimer,
      remainingMs,
      isExpired: remainingMs <= 0,
    }
  }, [baseLiveTimer, nowTick])

  const isFeatureEnabled = (feature: AppFeatureKey): boolean => {
    return features.isAll || features.enabled.includes(feature)
  }

  const isFeatureLocked = (feature: AppFeatureKey): boolean => {
    return !isFeatureEnabled(feature)
  }

  const notifyFeatureLocked = (feature: AppFeatureKey) => {
    const msg = getLockedFeatureToastMessage(feature, getLocale())
    toast.error(msg.title)
  }

  const currencyRatesEnabled = isFeatureEnabled('currency_rates')
  const effectiveCurrency: CurrencyCode = currencyRatesEnabled ? currency : 'UZS'

  const getRateForCurrency = (code: CurrencyCode): number => {
    if (code === 'UZS') return 1
    const found = cbuRates.find((r) => r.ccy === code)?.rate
    if (found && found > 0) return found
    switch (code) {
      case 'USD':
        return settings?.cbuRate ?? 12820
      case 'EUR':
        return 13890
      case 'RUB':
        return 136.4
      case 'CNY':
        return 1775.2
      default:
        return 12820
    }
  }

  const cbuRate = getRateForCurrency('USD')
  const internalRate = cbuRate

  useEffect(() => {
    if (!currencyRatesEnabled) {
      setCurrencyState('UZS')
      return
    }
    if (isValidCurrency(settings?.defaultCurrency)) {
      setCurrencyState(settings.defaultCurrency)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CURRENCY_STORAGE_KEY, settings.defaultCurrency)
      }
    }
  }, [settings?.defaultCurrency, currencyRatesEnabled])

  const rateMutation = useMutation({
    mutationFn: async (payload: { defaultCurrency?: CurrencyCode }) => {
      const { data, error } = await getApi().overview.currency.patch(payload)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['overview'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const setCurrency = (next: CurrencyCode) => {
    if (!currencyRatesEnabled) {
      notifyFeatureLocked('currency_rates')
      return
    }
    setCurrencyState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next)
    }
    void rateMutation.mutateAsync({ defaultCurrency: next })
  }

  const formatMoney = (amountUzs: number | null | undefined): string => {
    const val = Number(amountUzs ?? 0)
    if (effectiveCurrency === 'UZS') {
      return formatUzsRaw(val)
    }
    return formatForeignCurrency(val, effectiveCurrency, getRateForCurrency(effectiveCurrency))
  }

  const formatDual = (amountUzs: number | null | undefined) => {
    const val = Number(amountUzs ?? 0)
    if (effectiveCurrency !== 'UZS') {
      return {
        primary: formatForeignCurrency(
          val,
          effectiveCurrency,
          getRateForCurrency(effectiveCurrency),
        ),
        secondary: formatUzsRaw(val),
      }
    }
    return {
      primary: formatUzsRaw(val),
      secondary: formatUsdRaw(val, cbuRate),
    }
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency: effectiveCurrency,
        setCurrency,
        cbuRate,
        internalRate,
        getRateForCurrency,
        formatMoney,
        formatDual,
        overviewData: overviewQuery.data ?? null,
        refetchOverview: () => void overviewQuery.refetch(),
        features,
        liveTimer,
        isFeatureEnabled,
        isFeatureLocked,
        notifyFeatureLocked,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider')
  }
  return ctx
}
