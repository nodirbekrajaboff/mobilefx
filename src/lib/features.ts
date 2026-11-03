export const ALL_APP_FEATURES = [
  // Category A: Core Launchpad Modules (8)
  'repairs',
  'phones',
  'parts',
  'pos',
  'sales',
  'debts',
  'customers',
  'analytics',
  // Category B: Cross-Cutting / Add-on Sub-Features (6)
  'trade_in',
  'export',
  'dynamic_fields',
  'telegram_bot',
  'currency_rates',
  'thermal_print',
] as const

export type AppFeatureKey = (typeof ALL_APP_FEATURES)[number]

export interface AppFeatureMeta {
  key: AppFeatureKey
  category: 'module' | 'addon'
  routePrefix?: string
  titleUz: string
  titleRu: string
  titleEn: string
}

export const APP_FEATURE_META: Record<AppFeatureKey, AppFeatureMeta> = {
  repairs: {
    key: 'repairs',
    category: 'module',
    routePrefix: '/repairs',
    titleUz: 'Ustaxona (Taʼmirlash)',
    titleRu: 'Мастерская (Ремонт)',
    titleEn: 'Workshop (Repairs)',
  },
  phones: {
    key: 'phones',
    category: 'module',
    routePrefix: '/phones',
    titleUz: 'Telefonlar ombori',
    titleRu: 'Склад телефонов',
    titleEn: 'Phones Inventory',
  },
  parts: {
    key: 'parts',
    category: 'module',
    routePrefix: '/parts',
    titleUz: 'Ehtiyot qismlar ombori',
    titleRu: 'Склад запчастей',
    titleEn: 'Spare Parts Inventory',
  },
  pos: {
    key: 'pos',
    category: 'module',
    routePrefix: '/pos',
    titleUz: 'Savdo kassasi (POS)',
    titleRu: 'Касса продаж (POS)',
    titleEn: 'POS Cashier',
  },
  sales: {
    key: 'sales',
    category: 'module',
    routePrefix: '/sales',
    titleUz: 'Savdolar tarixi',
    titleRu: 'История продаж',
    titleEn: 'Sales History',
  },
  debts: {
    key: 'debts',
    category: 'module',
    routePrefix: '/debts',
    titleUz: 'Qarz daftari',
    titleRu: 'Долговая книга',
    titleEn: 'Debt Ledger',
  },
  customers: {
    key: 'customers',
    category: 'module',
    routePrefix: '/customers',
    titleUz: 'Mijozlar bazasi',
    titleRu: 'База клиентов',
    titleEn: 'Customers Database',
  },
  analytics: {
    key: 'analytics',
    category: 'module',
    routePrefix: '/analytics',
    titleUz: 'Analitika va Hisobot',
    titleRu: 'Аналитика и Отчеты',
    titleEn: 'Analytics & Reports',
  },
  trade_in: {
    key: 'trade_in',
    category: 'addon',
    titleUz: 'Trade-In (Eski telefon qabuli)',
    titleRu: 'Trade-In (Прием старого телефона)',
    titleEn: 'Trade-In (Phone Exchange)',
  },
  export: {
    key: 'export',
    category: 'addon',
    titleUz: 'Maʼlumotlarni eksport qilish (PDF/DOCX/Excel/CSV)',
    titleRu: 'Экспорт данных (PDF/DOCX/Excel/CSV)',
    titleEn: 'Data Export (PDF/DOCX/Excel/CSV)',
  },
  dynamic_fields: {
    key: 'dynamic_fields',
    category: 'addon',
    routePrefix: '/settings/tables',
    titleUz: 'Jadval ustunlari konstruktori',
    titleRu: 'Конструктор столбцов таблиц',
    titleEn: 'Table Columns Builder',
  },
  telegram_bot: {
    key: 'telegram_bot',
    category: 'addon',
    routePrefix: '/settings/telegram',
    titleUz: 'Telegram Bot va Xabarnomalar',
    titleRu: 'Telegram Бот и Уведомления',
    titleEn: 'Telegram Bot & Notifications',
  },
  currency_rates: {
    key: 'currency_rates',
    category: 'addon',
    routePrefix: '/settings/currency',
    titleUz: 'Valyuta va Kurslar',
    titleRu: 'Валюта и Курсы',
    titleEn: 'Currency & Exchange Rates',
  },
  thermal_print: {
    key: 'thermal_print',
    category: 'addon',
    titleUz: 'Termoprinter (Chek va Yorliq chop etish)',
    titleRu: 'Термопринтер (Печать чеков и этикеток)',
    titleEn: 'Thermal Printer (Receipts & Stickers)',
  },
}

const VALID_FEATURE_SET = new Set<string>(ALL_APP_FEATURES)

export interface ParsedAppFeatures {
  raw: string
  isAll: boolean
  enabled: AppFeatureKey[]
  locked: AppFeatureKey[]
}

/**
 * Parses comma-separated APP_FEATURES string (e.g. "all" or "repairs,phones,pos"). Supports "all" /
 * "*" to enable all features, and "warehouse" alias for "phones,parts".
 */
export function parseAppFeaturesEnv(rawValue: string | undefined | null): ParsedAppFeatures {
  if (rawValue === undefined || rawValue === null) {
    return {
      raw: 'all',
      isAll: true,
      enabled: [...ALL_APP_FEATURES],
      locked: [],
    }
  }

  const trimmed = rawValue.trim()
  if (!trimmed || trimmed.toLowerCase() === 'none') {
    return {
      raw: trimmed || 'none',
      isAll: false,
      enabled: [],
      locked: [...ALL_APP_FEATURES],
    }
  }

  const tokens = trimmed
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (tokens.includes('all') || tokens.includes('*')) {
    return {
      raw: 'all',
      isAll: true,
      enabled: [...ALL_APP_FEATURES],
      locked: [],
    }
  }

  const enabledSet = new Set<AppFeatureKey>()
  for (const token of tokens) {
    if (token === 'warehouse') {
      enabledSet.add('phones')
      enabledSet.add('parts')
      continue
    }
    if (VALID_FEATURE_SET.has(token)) {
      enabledSet.add(token as AppFeatureKey)
    }
  }

  const enabled = ALL_APP_FEATURES.filter((key) => enabledSet.has(key))
  const locked = ALL_APP_FEATURES.filter((key) => !enabledSet.has(key))

  return {
    raw: trimmed,
    isAll: enabled.length === ALL_APP_FEATURES.length,
    enabled,
    locked,
  }
}

export function getFeatureForPathname(pathname: string): AppFeatureKey | null {
  const clean = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname

  if (clean === '/repairs' || clean.startsWith('/repairs/')) return 'repairs'
  if (clean === '/phones' || clean.startsWith('/phones/')) return 'phones'
  if (clean === '/parts' || clean.startsWith('/parts/')) return 'parts'
  if (clean === '/pos' || clean.startsWith('/pos/')) return 'pos'
  if (clean === '/sales' || clean.startsWith('/sales/')) return 'sales'
  if (clean === '/debts' || clean.startsWith('/debts/')) return 'debts'
  if (clean === '/customers' || clean.startsWith('/customers/')) return 'customers'
  if (clean === '/analytics' || clean.startsWith('/analytics/')) return 'analytics'
  if (clean === '/settings/currency') return 'currency_rates'
  if (clean === '/settings/tables') return 'dynamic_fields'
  if (clean === '/settings/telegram') return 'telegram_bot'

  return null
}

export function getFeatureTitle(feature: AppFeatureKey, locale?: string): string {
  const meta = APP_FEATURE_META[feature]
  const lang = (locale || 'uz').toLowerCase()
  if (lang.startsWith('ru')) return meta.titleRu
  if (lang.startsWith('en')) return meta.titleEn
  return meta.titleUz
}

export function getLockedFeatureToastMessage(
  feature: AppFeatureKey,
  locale?: string,
): { title: string; description: string } {
  const name = getFeatureTitle(feature, locale)
  const lang = (locale || 'uz').toLowerCase()
  if (lang.startsWith('ru')) {
    return {
      title: `🔒 Функция «${name}» заблокирована`,
      description: 'Эта возможность отключена в конфигурации окружения (.env APP_FEATURES).',
    }
  }
  if (lang.startsWith('en')) {
    return {
      title: `🔒 "${name}" is locked`,
      description: 'This feature is disabled in the environment configuration (.env APP_FEATURES).',
    }
  }
  return {
    title: `🔒 «${name}» funksiyasi qulflangan`,
    description: "Ushbu imkoniyat tizim sozlamalarida (.env APP_FEATURES) o'chirilgan.",
  }
}

// ============================================================================
// APP LIVE DEMO TIMER (APP_LIVE_HOURS in .env)
// ============================================================================

export interface AppLiveTimerState {
  enabled: boolean
  hours: number | null
  startedAt: string | null
  expiresAt: string | null
  remainingMs: number | null
  isExpired: boolean
}

export function parseAppLiveHoursEnv(
  rawHours: string | number | undefined | null,
  rawStartTime?: string | number | undefined | null,
  defaultStartTimeMs: number = Date.now(),
  nowMs: number = Date.now(),
): AppLiveTimerState {
  if (rawHours === undefined || rawHours === null) {
    return {
      enabled: false,
      hours: null,
      startedAt: null,
      expiresAt: null,
      remainingMs: null,
      isExpired: false,
    }
  }

  const trimmed = String(rawHours).trim()
  if (!trimmed || trimmed.toLowerCase() === 'off' || trimmed === '0') {
    return {
      enabled: false,
      hours: null,
      startedAt: null,
      expiresAt: null,
      remainingMs: null,
      isExpired: false,
    }
  }

  const parsedHours = Number(trimmed)
  if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
    return {
      enabled: false,
      hours: null,
      startedAt: null,
      expiresAt: null,
      remainingMs: null,
      isExpired: false,
    }
  }

  let startMs = defaultStartTimeMs
  if (rawStartTime !== undefined && rawStartTime !== null) {
    const startTrimmed = String(rawStartTime).trim()
    if (startTrimmed) {
      const asNum = Number(startTrimmed)
      if (Number.isFinite(asNum) && asNum > 1_000_000_000) {
        startMs = asNum < 10_000_000_000 ? asNum * 1000 : asNum
      } else {
        const parsedDate = Date.parse(startTrimmed)
        if (!Number.isNaN(parsedDate)) {
          startMs = parsedDate
        }
      }
    }
  }

  const durationMs = Math.round(parsedHours * 60 * 60 * 1000)
  const expiresMs = startMs + durationMs
  const remainingMs = Math.max(0, expiresMs - nowMs)

  return {
    enabled: true,
    hours: parsedHours,
    startedAt: new Date(startMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
    remainingMs,
    isExpired: nowMs >= expiresMs,
  }
}

export function formatRemainingLiveTime(remainingMs: number | null): string {
  if (remainingMs === null || remainingMs <= 0) return '00:00:00'
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
