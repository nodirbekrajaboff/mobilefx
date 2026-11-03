import { createHmac, randomUUID } from 'node:crypto'

import { and, asc, desc, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

import { botWebhookPlugin } from '#/bot'
import { sendStoreTelegramNotification } from '#/bot/notifications'
import { db } from '#/db'
import {
  customersRepo,
  debtPaymentsRepo,
  debtsRepo,
  ensureDataTableId,
  ensureUniqueLatinKey,
  getDefaultLanguageId,
  partBatchesRepo,
  partCategoriesRepo,
  partsRepo,
  phonesRepo,
  repairsRepo,
} from '#/db/eav'
import {
  dataTableFields,
  dataTableFieldTranslations,
  dataTableRecords,
  dataTableRecordValues,
  dataTables,
  dataTableTranslations,
  languages,
  loginSessionDevices,
  posSales,
  session,
  storeSettings,
  suppliers,
  user,
} from '#/db/schema'
import { DEFAULT_SYSTEM_TABLE_FIELDS, ensureSeeded, type ManagedTableKey } from '#/db/seed'
import type { AppFeatureKey } from '#/lib/features'
import {
  buildAppExpiredPayload,
  buildFeatureLockedPayload,
  getServerAppFeatures,
  getServerLiveTimer,
  isServerFeatureEnabled,
} from '#/lib/features.server'
import {
  checkRateLimit,
  DEFAULT_SECURITY_HEADERS,
  isHttpsRequest,
  timingSafeEqualStrings,
} from '#/lib/security.server'

function resolveLockedFeatureForApiRequest(pathname: string, method: string): AppFeatureKey | null {
  const clean = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
  const upperMethod = method.toUpperCase()

  if (clean === '/api/repairs' || clean.startsWith('/api/repairs/')) {
    return isServerFeatureEnabled('repairs') ? null : 'repairs'
  }
  if (clean === '/api/phones' || clean.startsWith('/api/phones/')) {
    return isServerFeatureEnabled('phones') ? null : 'phones'
  }
  if (clean === '/api/parts' || clean.startsWith('/api/parts/')) {
    return isServerFeatureEnabled('parts') ? null : 'parts'
  }
  if (
    clean === '/api/pos/checkout' ||
    clean === '/api/pos/phone-sale' ||
    clean === '/api/pos/part-sale'
  ) {
    return isServerFeatureEnabled('pos') ? null : 'pos'
  }
  if (clean === '/api/pos') {
    if (isServerFeatureEnabled('pos') || isServerFeatureEnabled('sales')) {
      return null
    }
    return 'pos'
  }
  if (clean === '/api/debts' || clean.startsWith('/api/debts/')) {
    return isServerFeatureEnabled('debts') ? null : 'debts'
  }
  if (clean === '/api/customers' || clean.startsWith('/api/customers/')) {
    return isServerFeatureEnabled('customers') ? null : 'customers'
  }
  if (clean === '/api/analytics' && upperMethod === 'GET') {
    return isServerFeatureEnabled('analytics') ? null : 'analytics'
  }
  if (clean === '/api/analytics/telegram-notify') {
    return isServerFeatureEnabled('telegram_bot') ? null : 'telegram_bot'
  }
  if (clean === '/api/bot' || clean.startsWith('/api/bot/')) {
    return isServerFeatureEnabled('telegram_bot') ? null : 'telegram_bot'
  }
  if (clean === '/api/overview/currency') {
    return isServerFeatureEnabled('currency_rates') ? null : 'currency_rates'
  }
  if (
    (clean === '/api/table-fields' || clean.startsWith('/api/table-fields/')) &&
    upperMethod !== 'GET'
  ) {
    return isServerFeatureEnabled('dynamic_fields') ? null : 'dynamic_fields'
  }

  return null
}

function computeWaitingDays(readyAt: Date | null, createdAt: Date): number {
  const ref = readyAt ? new Date(readyAt).getTime() : new Date(createdAt).getTime()
  const diff = Date.now() - ref
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

export interface CbuCurrencyRate {
  ccy: 'USD' | 'EUR' | 'RUB' | 'CNY' | 'KZT' | 'GBP'
  nameUz: string
  rate: number
  diff: number
  date: string
}

const FALLBACK_CBU_RATES: CbuCurrencyRate[] = [
  { ccy: 'USD', nameUz: 'AQSH dollari', rate: 12820, diff: 14.5, date: 'CBU.UZ' },
  { ccy: 'EUR', nameUz: 'Yevro', rate: 13890, diff: 22.1, date: 'CBU.UZ' },
  { ccy: 'RUB', nameUz: 'Rossiya rubli', rate: 136.4, diff: -0.8, date: 'CBU.UZ' },
  { ccy: 'CNY', nameUz: 'Xitoy yuani', rate: 1775.2, diff: 4.3, date: 'CBU.UZ' },
  { ccy: 'KZT', nameUz: "Qozog'iston tengesi", rate: 25.8, diff: 0.15, date: 'CBU.UZ' },
  { ccy: 'GBP', nameUz: 'Angliya funti', rate: 16420, diff: 31.0, date: 'CBU.UZ' },
]

let cachedCbuRates: CbuCurrencyRate[] | null = null
let cachedCbuFetchedAt = 0

async function getCbuExchangeRates(): Promise<CbuCurrencyRate[]> {
  const now = Date.now()
  if (cachedCbuRates && now - cachedCbuFetchedAt < 15 * 60 * 1000) {
    return cachedCbuRates
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1800)
    const res = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/', {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return cachedCbuRates ?? FALLBACK_CBU_RATES

    const raw = (await res.json()) as Array<{
      Ccy?: string
      CcyNm_UZ?: string
      Rate?: string
      Diff?: string
      Date?: string
    }>

    const wanted: Array<CbuCurrencyRate['ccy']> = ['USD', 'EUR', 'RUB', 'CNY', 'KZT', 'GBP']
    const parsed: CbuCurrencyRate[] = wanted.map((code) => {
      const found = raw.find((item) => item.Ccy === code)
      const fallback = FALLBACK_CBU_RATES.find((f) => f.ccy === code)!
      if (!found) return fallback
      return {
        ccy: code,
        nameUz: found.CcyNm_UZ || fallback.nameUz,
        rate: Number(found.Rate) || fallback.rate,
        diff: Number(found.Diff) || 0,
        date: found.Date || fallback.date,
      }
    })

    cachedCbuRates = parsed
    cachedCbuFetchedAt = now
    return parsed
  } catch {
    return cachedCbuRates ?? FALLBACK_CBU_RATES
  }
}

function getEnvAdminCredentials() {
  const login = (process.env.ADMIN_LOGIN || 'admin@mobilefix.uz').trim()
  const password = (process.env.ADMIN_PASSWORD || 'password123').trim()
  const secret = (process.env.BETTER_AUTH_SECRET || 'mobile-fix-secret-key').trim()
  return { login, password, secret }
}

function createEnvAuthToken(suffix?: string): string {
  const { login, password, secret } = getEnvAdminCredentials()
  const payload = suffix ? `${login}:${password}:${suffix}` : `${login}:${password}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return suffix ? `${sig}.${suffix}` : sig
}

function isValidEnvAuthToken(token: string | null): boolean {
  if (!token || token.length > 512) return false
  const dotIdx = token.indexOf('.')
  if (dotIdx === -1) {
    const expectedBase = createEnvAuthToken()
    return timingSafeEqualStrings(token, expectedBase)
  }

  const sigPart = token.slice(0, dotIdx)
  const suffixPart = token.slice(dotIdx + 1)
  if (!sigPart || !suffixPart) return false

  // Verify suffix-bound HMAC signature in constant time
  const expectedBound = createEnvAuthToken(suffixPart)
  if (timingSafeEqualStrings(token, expectedBound)) {
    return true
  }

  // Backward-compatible constant-time check for pre-existing session tokens
  const expectedBase = createEnvAuthToken()
  return timingSafeEqualStrings(sigPart, expectedBase)
}

function extractClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-client-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

function parseUserAgentDetails(ua: string) {
  const raw = ua || ''
  let browser = 'Unknown Browser'
  if (/Edg\//i.test(raw)) browser = 'Microsoft Edge'
  else if (/OPR\/|Opera/i.test(raw)) browser = 'Opera'
  else if (/Chrome\//i.test(raw) && !/Chromium/i.test(raw)) browser = 'Google Chrome'
  else if (/Firefox\//i.test(raw)) browser = 'Mozilla Firefox'
  else if (/Safari\//i.test(raw) && !/Chrome\//i.test(raw)) browser = 'Apple Safari'

  let os = 'Unknown OS'
  if (/Windows NT 10|Windows NT 11/i.test(raw)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(raw)) {
    os = /iPhone|iPad|iPod/i.test(raw) ? 'iOS' : 'macOS'
  } else if (/Android/i.test(raw)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(raw)) os = 'iOS'
  else if (/Linux/i.test(raw)) os = 'Linux'

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (/iPad|Tablet/i.test(raw)) deviceType = 'tablet'
  else if (/Mobile|iPhone|Android/i.test(raw)) deviceType = 'mobile'

  let deviceName = `${os} — ${browser}`
  if (/Macintosh/i.test(raw)) deviceName = `Apple Mac (${browser})`
  else if (/iPhone/i.test(raw)) deviceName = `Apple iPhone (${browser})`
  else if (/iPad/i.test(raw)) deviceName = `Apple iPad (${browser})`
  else if (/Windows/i.test(raw)) deviceName = `Windows PC (${browser})`
  else if (/Android/i.test(raw)) deviceName = `Android Device (${browser})`

  return {
    browser,
    os,
    deviceType,
    deviceName,
  }
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

export const app = new Elysia({ prefix: '/api' })
  .onBeforeHandle(async ({ request, set, status }) => {
    for (const [headerName, headerValue] of Object.entries(DEFAULT_SECURITY_HEADERS)) {
      set.headers[headerName] = headerValue
    }

    const url = new URL(request.url)
    const cleanPath =
      url.pathname.endsWith('/') && url.pathname !== '/' ? url.pathname.slice(0, -1) : url.pathname

    // Rate limiting (exempt /api/health so container orchestrators are never throttled)
    if (cleanPath !== '/api/health') {
      const clientIp = extractClientIp(request)
      const isLoginAttempt =
        cleanPath === '/api/auth-guard/login' && request.method.toUpperCase() === 'POST'

      const rl = isLoginAttempt
        ? checkRateLimit(`login:${clientIp}`, 10, 60_000)
        : checkRateLimit(`api:${clientIp}`, 300, 60_000)

      set.headers['X-RateLimit-Limit'] = String(rl.limit)
      set.headers['X-RateLimit-Remaining'] = String(rl.remaining)
      set.headers['X-RateLimit-Reset'] = String(Math.ceil(rl.resetAtMs / 1000))

      if (!rl.allowed) {
        set.headers['Retry-After'] = String(rl.retryAfterSeconds)
        return status(429, {
          ok: false,
          rateLimited: true,
          error: isLoginAttempt
            ? "Juda ko'p urinish! Iltimos, 1 daqiqadan so'ng qayta urinib ko'ring."
            : "So'rovlar soni me'yordan oshdi (Rate Limit). Iltimos, biroz kuting.",
          message: "So'rovlar soni me'yordan oshdi (Rate Limit).",
        })
      }
    }

    await ensureSeeded()

    const liveTimer = getServerLiveTimer()
    const isTimerExemptEndpoint =
      cleanPath === '/api' ||
      cleanPath === '/api/health' ||
      cleanPath === '/api/features' ||
      cleanPath === '/api/overview' ||
      cleanPath === '/api/auth-guard/me' ||
      cleanPath === '/api/auth-guard/logout'

    if (liveTimer.enabled && liveTimer.isExpired && !isTimerExemptEndpoint) {
      return status(403, buildAppExpiredPayload(liveTimer))
    }

    const lockedFeature = resolveLockedFeatureForApiRequest(url.pathname, request.method)
    if (lockedFeature) {
      return status(403, buildFeatureLockedPayload(lockedFeature))
    }
  })
  .get('/features', () => ({
    ...getServerAppFeatures(),
    liveTimer: getServerLiveTimer(),
  }))
  .get('/', () => ({
    name: 'mobile-fix-erp-api',
    status: 'ok',
    message: 'Mobile Fix Elysia server is running',
  }))
  .get('/health', () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }))
  // ==========================================================================
  // .ENV AUTH GUARD (ADMIN_LOGIN & ADMIN_PASSWORD orqali himoya + DB Session Devices)
  // ==========================================================================
  .get('/auth-guard/me', async ({ request }) => {
    const cookieHeader = request.headers.get('cookie')
    const token = parseCookieValue(cookieHeader, 'mf_auth_token')
    const { login } = getEnvAdminCredentials()
    const liveTimer = getServerLiveTimer()

    if (token && isValidEnvAuthToken(token)) {
      const [dbDevice] = await db
        .select()
        .from(loginSessionDevices)
        .where(
          and(
            eq(loginSessionDevices.sessionToken, token),
            eq(loginSessionDevices.isDeleted, false),
          ),
        )
        .limit(1)

      if (dbDevice && !dbDevice.isActive) {
        return {
          authenticated: false,
          user: null,
          features: getServerAppFeatures(),
          liveTimer,
        }
      }

      if (dbDevice) {
        await db
          .update(loginSessionDevices)
          .set({ lastActiveAt: new Date() })
          .where(eq(loginSessionDevices.id, dbDevice.id))
      }

      const sanitizedSessionDevice = dbDevice
        ? {
            ...dbDevice,
            sessionToken: '[REDACTED]',
          }
        : null

      return {
        authenticated: true,
        user: {
          name: 'Sardor Usta',
          email: login,
        },
        sessionDevice: sanitizedSessionDevice,
        features: getServerAppFeatures(),
        liveTimer,
      }
    }
    return {
      authenticated: false,
      user: null,
      features: getServerAppFeatures(),
      liveTimer,
    }
  })
  .get('/auth-guard/sessions', async ({ request }) => {
    const cookieHeader = request.headers.get('cookie')
    const currentToken = parseCookieValue(cookieHeader, 'mf_auth_token')
    const devices = await db
      .select()
      .from(loginSessionDevices)
      .where(eq(loginSessionDevices.isDeleted, false))
      .orderBy(desc(loginSessionDevices.lastActiveAt))
      .limit(50)

    return {
      devices: devices.map((d) => ({
        ...d,
        sessionToken: '[REDACTED]',
        isCurrent: Boolean(currentToken && timingSafeEqualStrings(d.sessionToken, currentToken)),
      })),
    }
  })
  .post(
    '/auth-guard/login',
    async ({ body, request, set }) => {
      const { login: expectedLogin, password: expectedPassword } = getEnvAdminCredentials()

      const inputLogin = body.login.trim().toLowerCase()
      const normalizedExpectedLogin = expectedLogin.toLowerCase()
      const inputPassword = body.password.trim()

      const isLoginMatch = timingSafeEqualStrings(inputLogin, normalizedExpectedLogin)
      const isPasswordMatch =
        timingSafeEqualStrings(body.password, expectedPassword) ||
        timingSafeEqualStrings(inputPassword, expectedPassword)

      if (!isLoginMatch || !isPasswordMatch) {
        return {
          ok: false,
          error: "Login yoki parol noto'g'ri!",
          user: null,
        }
      }

      const sessionSuffix = randomUUID()
      const token = createEnvAuthToken(sessionSuffix)
      const ipAddress = extractClientIp(request)
      const userAgent = request.headers.get('user-agent') || ''
      const parsedUa = parseUserAgentDetails(userAgent)
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const [adminUser] = await db.select().from(user).where(eq(user.email, expectedLogin)).limit(1)

      const platform = body.deviceInfo?.platform || parsedUa.os
      const screenResolution = body.deviceInfo?.screenResolution || ''
      const timezone = body.deviceInfo?.timezone || ''
      const language =
        body.deviceInfo?.language || request.headers.get('accept-language')?.split(',')[0] || ''

      await db.insert(loginSessionDevices).values({
        sessionToken: token,
        userId: adminUser?.id ?? null,
        userLogin: expectedLogin,
        ipAddress,
        userAgent,
        deviceName: parsedUa.deviceName,
        deviceType: parsedUa.deviceType,
        browser: parsedUa.browser,
        os: parsedUa.os,
        platform,
        screenResolution,
        timezone,
        language,
        isActive: true,
        createdAt: now,
        lastActiveAt: now,
        expiresAt,
      })

      if (adminUser) {
        await db.insert(session).values({
          id: sessionSuffix,
          token,
          userId: adminUser.id,
          ipAddress,
          userAgent,
          deviceName: parsedUa.deviceName,
          deviceType: parsedUa.deviceType,
          browser: parsedUa.browser,
          os: parsedUa.os,
          platform,
          screenResolution,
          timezone,
          language,
          createdAt: now,
          updatedAt: now,
          lastActiveAt: now,
          expiresAt,
        })
      }

      const secureFlag = isHttpsRequest(request) ? '; Secure' : ''
      set.headers['Set-Cookie'] =
        `mf_auth_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`

      return {
        ok: true,
        error: null,
        user: {
          name: 'Sardor Usta',
          email: expectedLogin,
        },
      }
    },
    {
      body: t.Object({
        login: t.String(),
        password: t.String(),
        deviceInfo: t.Optional(
          t.Object({
            platform: t.Optional(t.String()),
            screenResolution: t.Optional(t.String()),
            timezone: t.Optional(t.String()),
            language: t.Optional(t.String()),
          }),
        ),
      }),
    },
  )
  .post('/auth-guard/logout', async ({ request, set }) => {
    const cookieHeader = request.headers.get('cookie')
    const token = parseCookieValue(cookieHeader, 'mf_auth_token')
    if (token) {
      const now = new Date()
      await db
        .update(loginSessionDevices)
        .set({
          isActive: false,
          loggedOutAt: now,
        })
        .where(eq(loginSessionDevices.sessionToken, token))

      await db
        .update(session)
        .set({
          isDeleted: true,
          updatedAt: now,
        })
        .where(eq(session.token, token))
    }

    const secureFlag = isHttpsRequest(request) ? '; Secure' : ''
    set.headers['Set-Cookie'] =
      `mf_auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
    return { ok: true }
  })
  // ==========================================================================
  // GLOBAL OVERVIEW (Header: Valyuta kursi, Bildirishnomalar & Launchpad 6 Cards)
  // ==========================================================================
  .get('/overview', async () => {
    const [settings] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.isDeleted, false))
      .limit(1)
    const allRepairs = await repairsRepo.list()
    const allPhones = await phonesRepo.list()
    const allParts = await partsRepo.list()
    const allDebts = await debtsRepo.list()
    const allSales = await db.select().from(posSales).where(eq(posSales.isDeleted, false))

    const inProgressRepairs = allRepairs.filter((r) => r.status === 'in_progress')
    const readyRepairs = allRepairs.filter((r) => r.status === 'ready')

    const overdueRepairs = readyRepairs
      .map((r) => ({
        id: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        phoneModel: r.phoneModel,
        waitingDays: computeWaitingDays(r.readyAt, r.createdAt),
        tier:
          computeWaitingDays(r.readyAt, r.createdAt) >= 30
            ? 30
            : computeWaitingDays(r.readyAt, r.createdAt) >= 20
              ? 20
              : computeWaitingDays(r.readyAt, r.createdAt) >= 10
                ? 10
                : 0,
        remainingAmount: Math.max(0, r.agreedPrice - r.advancePayment),
      }))
      .filter((r) => r.waitingDays >= 10)
      .sort((a, b) => b.waitingDays - a.waitingDays)

    const inStockPhones = allPhones.filter((p) => p.status === 'in_stock')
    const phonesInvestedCapital = inStockPhones.reduce((acc, p) => acc + p.costPrice, 0)

    const totalPartsQuantity = allParts.reduce((acc, p) => acc + p.quantity, 0)
    const partsInvestedCapital = allParts.reduce((acc, p) => acc + p.quantity * p.costPrice, 0)

    const openDebts = allDebts.filter((d) => d.status === 'open')
    const customerDebtTotal = openDebts
      .filter((d) => d.debtType === 'customer')
      .reduce((acc, d) => acc + d.remainingAmount, 0)
    const supplierDebtTotal = openDebts
      .filter((d) => d.debtType === 'supplier')
      .reduce((acc, d) => acc + d.remainingAmount, 0)

    const now = Date.now()
    const dueDebts = openDebts
      .filter((d) => d.dueDate && new Date(d.dueDate).getTime() <= now)
      .map((d) => ({
        id: d.id,
        debtType: d.debtType,
        counterpartyName: d.counterpartyName,
        counterpartyPhone: d.counterpartyPhone,
        remainingAmount: d.remainingAmount,
        description: d.description,
        dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
      }))

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todaySales = allSales.filter(
      (s) => new Date(s.createdAt).getTime() >= startOfToday.getTime(),
    )
    const todaySalesRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0)

    const totalPosProfit = allSales.reduce((acc, s) => acc + s.profitAmount, 0)
    const deliveredRepairs = allRepairs.filter((r) => r.status === 'delivered')
    const totalRepairProfit = deliveredRepairs.reduce(
      (acc, r) => acc + (r.agreedPrice - r.partCostSnapshot),
      0,
    )

    const cbuRates = await getCbuExchangeRates()
    const features = getServerAppFeatures()
    const liveTimer = getServerLiveTimer()
    const currencyRatesEnabled = isServerFeatureEnabled('currency_rates')
    const baseSettings = settings ?? {
      id: 1,
      storeName: 'Mobile Fix',
      storePhone: '+998 90 123 45 67',
      storeAddress: 'Toshkent sh., Malika savdo majmuasi',
      cbuRate: 12800,
      internalRate: 12820,
      defaultCurrency: 'UZS',
      telegramChatId: '',
      dailyReportTime: '21:00',
      printerPaperWidth: '58mm',
    }

    return {
      features,
      liveTimer,
      settings: {
        ...baseSettings,
        defaultCurrency: currencyRatesEnabled ? baseSettings.defaultCurrency : 'UZS',
      },
      cbuRates,
      badges: {
        repairs: {
          inProgressCount: inProgressRepairs.length,
          readyCount: readyRepairs.length,
          overdueCount: overdueRepairs.length,
        },
        phones: {
          inStockCount: inStockPhones.length,
          investedCapital: phonesInvestedCapital,
        },
        parts: {
          totalQuantity: totalPartsQuantity,
          investedCapital: partsInvestedCapital,
        },
        pos: {
          todaySalesCount: todaySales.length,
          todaySalesRevenue,
        },
        debts: {
          customerDebtTotal,
          supplierDebtTotal,
          dueDebtsCount: dueDebts.length,
        },
        analytics: {
          totalNetProfit: totalPosProfit + totalRepairProfit,
        },
      },
      notifications: {
        totalCount: overdueRepairs.length + dueDebts.length,
        overdueRepairs,
        dueDebts,
      },
    }
  })
  .patch(
    '/overview/currency',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(storeSettings).limit(1)
        if (!existing) {
          const [created] = await tx
            .insert(storeSettings)
            .values({
              cbuRate: body.cbuRate ?? 12800,
              internalRate: body.internalRate ?? 12820,
              defaultCurrency: body.defaultCurrency ?? 'UZS',
            })
            .returning()
          return created
        }

        const [updated] = await tx
          .update(storeSettings)
          .set({
            cbuRate: body.cbuRate ?? existing.cbuRate,
            internalRate: body.internalRate ?? existing.internalRate,
            defaultCurrency: body.defaultCurrency ?? existing.defaultCurrency,
            updatedAt: new Date(),
          })
          .where(eq(storeSettings.id, existing.id))
          .returning()

        return updated
      })
    },
    {
      body: t.Object({
        cbuRate: t.Optional(t.Number()),
        internalRate: t.Optional(t.Number()),
        defaultCurrency: t.Optional(
          t.Union([
            t.Literal('UZS'),
            t.Literal('USD'),
            t.Literal('EUR'),
            t.Literal('RUB'),
            t.Literal('CNY'),
          ]),
        ),
      }),
    },
  )

  // ==========================================================================
  // 1-BO'LIM: 🛠️ USTAXONA (/api/repairs) — Split-View
  // ==========================================================================
  .get('/repairs', async () => {
    const allRepairs = await repairsRepo.list(db, 'desc')
    const allParts = await partsRepo.list(db, 'asc')
    const availableParts = [...allParts].sort((a, b) => a.name.localeCompare(b.name))

    const enriched = allRepairs.map((r) => {
      const waitingDays = r.status === 'ready' ? computeWaitingDays(r.readyAt, r.createdAt) : 0
      const overdueTier =
        waitingDays >= 30 ? 30 : waitingDays >= 20 ? 20 : waitingDays >= 10 ? 10 : 0

      return {
        ...r,
        waitingDays,
        overdueTier,
        isOverdue10Plus: r.status === 'ready' && waitingDays >= 10,
        remainingToPay: Math.max(0, r.agreedPrice - r.advancePayment - r.finalPaidAmount),
      }
    })

    return {
      repairs: enriched,
      availableParts,
    }
  })
  .post(
    '/repairs',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        let partNameSnapshot = 'Ehtiyot qismsiz / Faqat xizmat'
        if (body.partId) {
          const selectedPart = await partsRepo.getById(body.partId, tx)
          if (selectedPart) {
            partNameSnapshot = selectedPart.name
          }
        }

        const created = await repairsRepo.insert(
          {
            customerType: body.customerType,
            customerName: body.customerName.trim(),
            customerPhone: body.customerPhone.trim(),
            phoneModel: body.phoneModel.trim(),
            imei: body.imei?.trim() || '',
            issueDescription: body.issueDescription.trim(),
            promisedAt: body.promisedAt ? new Date(body.promisedAt) : null,
            lockType: body.lockType,
            lockCode: body.lockCode?.trim() || '',
            partId: body.partId ?? null,
            partNameSnapshot,
            partCostSnapshot: 0,
            partDeducted: false,
            agreedPrice: Math.round(body.agreedPrice),
            advancePayment: Math.round(body.advancePayment || 0),
            status: 'in_progress',
            customFields: body.customFields ?? {},
          },
          tx,
        )

        return created
      })
    },
    {
      body: t.Object({
        customerType: t.Union([t.Literal('regular'), t.Literal('partner')]),
        customerName: t.String({ minLength: 1 }),
        customerPhone: t.String({ minLength: 1 }),
        phoneModel: t.String({ minLength: 1 }),
        imei: t.Optional(t.String()),
        issueDescription: t.String({ minLength: 1 }),
        promisedAt: t.Optional(t.Nullable(t.String())),
        lockType: t.Union([t.Literal('text'), t.Literal('pattern')]),
        lockCode: t.Optional(t.String()),
        partId: t.Optional(t.Nullable(t.Number())),
        agreedPrice: t.Number(),
        advancePayment: t.Optional(t.Number()),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .put(
    '/repairs/:id',
    async ({ params, body, status }) => {
      const repairId = Number(params.id)
      return await db.transaction(async (tx) => {
        const existing = await repairsRepo.getById(repairId, tx)

        if (!existing) {
          return status(404, { message: 'Buyurtma topilmadi' })
        }

        let partNameSnapshot = 'Ehtiyot qismsiz / Faqat xizmat'
        if (body.partId) {
          const selectedPart = await partsRepo.getById(body.partId, tx)
          if (selectedPart) {
            partNameSnapshot = selectedPart.name
          }
        }

        const updated = await repairsRepo.update(
          repairId,
          {
            customerType: body.customerType,
            customerName: body.customerName.trim(),
            customerPhone: body.customerPhone.trim(),
            phoneModel: body.phoneModel.trim(),
            imei: body.imei?.trim() || '',
            issueDescription: body.issueDescription.trim(),
            promisedAt: body.promisedAt ? new Date(body.promisedAt) : null,
            lockType: body.lockType,
            lockCode: body.lockCode?.trim() || '',
            partId: body.partId ?? null,
            partNameSnapshot,
            agreedPrice: Math.round(body.agreedPrice),
            advancePayment: Math.round(body.advancePayment || 0),
            customFields: body.customFields
              ? { ...(existing.customFields || {}), ...body.customFields }
              : existing.customFields,
          },
          tx,
        )

        return updated!
      })
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        customerType: t.Union([t.Literal('regular'), t.Literal('partner')]),
        customerName: t.String({ minLength: 1 }),
        customerPhone: t.String({ minLength: 1 }),
        phoneModel: t.String({ minLength: 1 }),
        imei: t.Optional(t.String()),
        issueDescription: t.String({ minLength: 1 }),
        promisedAt: t.Optional(t.Nullable(t.String())),
        lockType: t.Union([t.Literal('text'), t.Literal('pattern')]),
        lockCode: t.Optional(t.String()),
        partId: t.Optional(t.Nullable(t.Number())),
        agreedPrice: t.Number(),
        advancePayment: t.Optional(t.Number()),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .post(
    '/repairs/:id/ready',
    async ({ params, status }) => {
      const repairId = Number(params.id)
      return await db.transaction(async (tx) => {
        const existing = await repairsRepo.getById(repairId, tx)

        if (!existing) {
          return status(404, { message: 'Buyurtma topilmadi' })
        }

        let partDeducted = existing.partDeducted
        let partCostSnapshot = existing.partCostSnapshot
        let partNameSnapshot = existing.partNameSnapshot

        if (existing.partId && !existing.partDeducted) {
          const partRow = await partsRepo.getById(existing.partId, tx)

          if (partRow) {
            await partsRepo.update(
              partRow.id,
              {
                quantity: Math.max(0, partRow.quantity - 1),
              },
              tx,
            )

            partDeducted = true
            partCostSnapshot = partRow.costPrice
            partNameSnapshot = partRow.name
          }
        }

        const updated = await repairsRepo.update(
          repairId,
          {
            status: 'ready',
            readyAt: existing.readyAt ?? new Date(),
            partDeducted,
            partCostSnapshot,
            partNameSnapshot,
          },
          tx,
        )

        return updated!
      })
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .post(
    '/repairs/:id/deliver',
    async ({ params, body, status }) => {
      const repairId = Number(params.id)
      return await db.transaction(async (tx) => {
        const existing = await repairsRepo.getById(repairId, tx)

        if (!existing) {
          return status(404, { message: 'Buyurtma topilmadi' })
        }

        let partDeducted = existing.partDeducted
        let partCostSnapshot = existing.partCostSnapshot
        let partNameSnapshot = existing.partNameSnapshot

        if (existing.partId && !existing.partDeducted) {
          const partRow = await partsRepo.getById(existing.partId, tx)

          if (partRow) {
            await partsRepo.update(
              partRow.id,
              {
                quantity: Math.max(0, partRow.quantity - 1),
              },
              tx,
            )

            partDeducted = true
            partCostSnapshot = partRow.costPrice
            partNameSnapshot = partRow.name
          }
        }

        const remainingTotal = Math.max(0, existing.agreedPrice - existing.advancePayment)
        const paidNow = Math.round(body.paidNow ?? remainingTotal)
        const unpaidDebt = Math.max(0, remainingTotal - paidNow)

        const updated = await repairsRepo.update(
          repairId,
          {
            status: 'delivered',
            readyAt: existing.readyAt ?? new Date(),
            deliveredAt: new Date(),
            finalPaidAmount: paidNow,
            partDeducted,
            partCostSnapshot,
            partNameSnapshot,
          },
          tx,
        )

        let createdDebt = null
        if (body.writeToDebt && unpaidDebt > 0) {
          createdDebt = await debtsRepo.insert(
            {
              debtType: 'customer',
              sourceType: 'repair',
              sourceId: existing.id,
              categoryTag: 'repair',
              counterpartyName: existing.customerName,
              counterpartyPhone: existing.customerPhone,
              description: `Ta'mirlash #${existing.id}: ${existing.phoneModel} (${existing.issueDescription})`,
              totalAmount: existing.agreedPrice,
              paidAmount: existing.advancePayment + paidNow,
              remainingAmount: unpaidDebt,
              dueDate: body.dueDate
                ? new Date(body.dueDate)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              status: 'open',
            },
            tx,
          )
        }

        return {
          repair: updated!,
          createdDebt,
        }
      })
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        paidNow: t.Number(),
        writeToDebt: t.Boolean(),
        dueDate: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .put(
    '/repairs/:id',
    async ({ params, body, status }) => {
      const repairId = Number(params.id)
      return await db.transaction(async (tx) => {
        const existing = await repairsRepo.getById(repairId, tx)
        if (!existing) return status(404, { message: 'Buyurtma topilmadi' })

        const updated = await repairsRepo.update(
          repairId,
          {
            customerName: body.customerName?.trim() ?? existing.customerName,
            customerPhone: body.customerPhone?.trim() ?? existing.customerPhone,
            phoneModel: body.phoneModel?.trim() ?? existing.phoneModel,
            issueDescription: body.issueDescription?.trim() ?? existing.issueDescription,
            agreedPrice:
              body.agreedPrice !== undefined ? Math.round(body.agreedPrice) : existing.agreedPrice,
            advancePayment:
              body.advancePayment !== undefined
                ? Math.round(body.advancePayment)
                : existing.advancePayment,
            customFields: body.customFields
              ? { ...(existing.customFields || {}), ...body.customFields }
              : existing.customFields,
          },
          tx,
        )

        return updated!
      })
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        customerName: t.Optional(t.String()),
        customerPhone: t.Optional(t.String()),
        phoneModel: t.Optional(t.String()),
        issueDescription: t.Optional(t.String()),
        agreedPrice: t.Optional(t.Number()),
        advancePayment: t.Optional(t.Number()),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .delete(
    '/repairs/:id',
    async ({ params }) => {
      const repairId = Number(params.id)
      await repairsRepo.delete(repairId, db)
      return { ok: true, id: repairId }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // ==========================================================================
  // 2-BO'LIM: 📱 TELEFONLAR OMBORI (/api/phones) — Alohida Kapital Hisobi
  // ==========================================================================
  .get('/phones', async () => {
    const allPhones = await phonesRepo.list(db, 'desc')
    const allDebts = await debtsRepo.list(db, 'desc')
    const phoneSupplierDebts = allDebts.filter((d) => d.categoryTag === 'phone')

    const inStock = allPhones.filter((p) => p.status === 'in_stock')
    const newCount = inStock.filter((p) => p.condition === 'new').length
    const usedCount = inStock.filter((p) => p.condition === 'used').length

    const investedCapital = inStock.reduce((acc, p) => acc + p.costPrice, 0)
    const expectedSaleValue = inStock.reduce((acc, p) => acc + p.salePrice, 0)
    const expectedProfit = expectedSaleValue - investedCapital

    const supplierDebtTotal = phoneSupplierDebts
      .filter((d) => d.debtType === 'supplier' && d.status === 'open')
      .reduce((acc, d) => acc + d.remainingAmount, 0)

    const phoneSuppliers = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.isDeleted, false))
      .orderBy(suppliers.name)

    return {
      summary: {
        totalInStock: inStock.length,
        newCount,
        usedCount,
        investedCapital,
        expectedSaleValue,
        expectedProfit,
        supplierDebtTotal,
      },
      phones: allPhones,
      suppliers: phoneSuppliers,
    }
  })
  .post(
    '/phones',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const purchasePrice = Math.round(body.purchasePrice)
        const extraExpenses = Math.round(body.extraExpenses || 0)
        const costPrice = purchasePrice + extraExpenses
        const salePrice = Math.round(body.salePrice)
        const paidAmount = Math.round(body.paidAmount ?? purchasePrice)
        const debtDiff = Math.max(0, purchasePrice - paidAmount)

        let supplierId: number | null = null
        const sourceName = body.sourceName.trim()

        if (debtDiff > 0) {
          const existingSup = await tx
            .select()
            .from(suppliers)
            .where(and(eq(suppliers.name, sourceName), eq(suppliers.isDeleted, false)))
            .limit(1)

          if (existingSup[0]) {
            supplierId = existingSup[0].id
          } else {
            const [createdSup] = await tx
              .insert(suppliers)
              .values({
                name: sourceName,
                phone: body.supplierPhone?.trim() || '',
                type: 'phone',
              })
              .returning()
            supplierId = createdSup?.id ?? null
          }
        }

        const createdPhone = await phonesRepo.insert(
          {
            model: body.model.trim(),
            color: body.color.trim() || 'Qora',
            imei: body.imei?.trim() || '',
            condition: body.condition,
            batteryHealth: body.batteryHealth ?? (body.condition === 'new' ? 100 : 88),
            boxAndCharger: body.boxAndCharger.trim(),
            sourceName,
            supplierId,
            purchasePrice,
            extraExpenses,
            costPrice,
            salePrice,
            status: 'in_stock',
            isTradeIn: false,
            customFields: body.customFields ?? {},
          },
          tx,
        )

        let createdDebt = null
        if (debtDiff > 0) {
          createdDebt = await debtsRepo.insert(
            {
              debtType: 'supplier',
              sourceType: 'phone_intake',
              sourceId: createdPhone.id,
              categoryTag: 'phone',
              counterpartyName: sourceName,
              counterpartyPhone: body.supplierPhone?.trim() || '',
              supplierId,
              description: `${body.model.trim()} (${body.imei || 'IMEI-siz'}) kirimidan qolgan qarz`,
              totalAmount: purchasePrice,
              paidAmount,
              remainingAmount: debtDiff,
              dueDate: body.dueDate
                ? new Date(body.dueDate)
                : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
              status: 'open',
            },
            tx,
          )
        }

        return {
          phone: createdPhone,
          createdDebt,
        }
      })
    },
    {
      body: t.Object({
        model: t.String({ minLength: 1 }),
        color: t.String(),
        imei: t.Optional(t.String()),
        condition: t.Union([t.Literal('new'), t.Literal('used')]),
        batteryHealth: t.Optional(t.Number()),
        boxAndCharger: t.String(),
        sourceName: t.String({ minLength: 1 }),
        supplierPhone: t.Optional(t.String()),
        purchasePrice: t.Number(),
        extraExpenses: t.Optional(t.Number()),
        salePrice: t.Number(),
        paidAmount: t.Optional(t.Number()),
        dueDate: t.Optional(t.Nullable(t.String())),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .put(
    '/phones/:id',
    async ({ params, body, status }) => {
      const phoneId = Number(params.id)
      return await db.transaction(async (tx) => {
        const existing = await phonesRepo.getById(phoneId, tx)

        if (!existing) {
          return status(404, { message: 'Telefon topilmadi' })
        }

        const purchasePrice = Math.round(body.purchasePrice ?? existing.purchasePrice)
        const extraExpenses = Math.round(body.extraExpenses ?? existing.extraExpenses)
        const costPrice = purchasePrice + extraExpenses
        const salePrice = Math.round(body.salePrice ?? existing.salePrice)

        const updated = await phonesRepo.update(
          phoneId,
          {
            model: body.model?.trim() ?? existing.model,
            color: body.color?.trim() ?? existing.color,
            imei: body.imei?.trim() ?? existing.imei,
            condition: body.condition ?? existing.condition,
            batteryHealth: body.batteryHealth ?? existing.batteryHealth,
            boxAndCharger: body.boxAndCharger ?? existing.boxAndCharger,
            sourceName: body.sourceName?.trim() ?? existing.sourceName,
            purchasePrice,
            extraExpenses,
            costPrice,
            salePrice,
            customFields: body.customFields
              ? { ...(existing.customFields || {}), ...body.customFields }
              : existing.customFields,
          },
          tx,
        )

        return updated!
      })
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        model: t.Optional(t.String()),
        color: t.Optional(t.String()),
        imei: t.Optional(t.String()),
        condition: t.Optional(t.Union([t.Literal('new'), t.Literal('used')])),
        batteryHealth: t.Optional(t.Number()),
        boxAndCharger: t.Optional(t.String()),
        sourceName: t.Optional(t.String()),
        purchasePrice: t.Optional(t.Number()),
        extraExpenses: t.Optional(t.Number()),
        salePrice: t.Optional(t.Number()),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .delete(
    '/phones/:id',
    async ({ params }) => {
      const phoneId = Number(params.id)
      await phonesRepo.delete(phoneId, db)
      return { ok: true, id: phoneId }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // ==========================================================================
  // 3-BO'LIM: 🔋 EHTIYOT QISMLAR OMBORI (/api/parts) — Kategoriyalar & Excel Kirim
  // ==========================================================================
  .get('/parts', async () => {
    const rawCategories = await partCategoriesRepo.list(db, 'asc')
    const categories = [...rawCategories].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    const allParts = await partsRepo.list(db, 'desc')
    const allSuppliers = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.isDeleted, false))
      .orderBy(suppliers.name)
    const allDebts = await debtsRepo.list(db, 'desc')
    const partDebts = allDebts.filter((d) => d.categoryTag === 'part')

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

    const enrichedParts = allParts.map((p) => ({
      ...p,
      categoryName: categoryMap.get(p.categoryId) || 'Boshqa',
      totalCostValue: p.quantity * p.costPrice,
      totalSaleValue: p.quantity * p.salePrice,
    }))

    const totalPartsQuantity = enrichedParts.reduce((acc, p) => acc + p.quantity, 0)
    const totalInvestedCost = enrichedParts.reduce((acc, p) => acc + p.totalCostValue, 0)
    const totalSaleSum = enrichedParts.reduce((acc, p) => acc + p.totalSaleValue, 0)
    const supplierDebtTotal = partDebts
      .filter((d) => d.debtType === 'supplier' && d.status === 'open')
      .reduce((acc, d) => acc + d.remainingAmount, 0)

    return {
      summary: {
        totalPartsQuantity,
        totalInvestedCost,
        totalSaleSum,
        supplierDebtTotal,
      },
      categories,
      parts: enrichedParts,
      suppliers: allSuppliers,
    }
  })
  .post(
    '/parts/categories',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const name = body.name.trim()
        const allCats = await partCategoriesRepo.list(tx, 'asc')
        const existing = allCats.find((c) => c.name.toLowerCase() === name.toLowerCase())
        if (existing) return existing

        return await partCategoriesRepo.insert(
          {
            name,
            sortOrder: 99,
          },
          tx,
        )
      })
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
    },
  )
  .post(
    '/parts/batch-intake',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const supplierName = body.supplierName.trim()
        let supplierId: number | null = null

        const existingSup = await tx
          .select()
          .from(suppliers)
          .where(and(eq(suppliers.name, supplierName), eq(suppliers.isDeleted, false)))
          .limit(1)

        if (existingSup[0]) {
          supplierId = existingSup[0].id
        } else {
          const [createdSup] = await tx
            .insert(suppliers)
            .values({
              name: supplierName,
              phone: body.supplierPhone?.trim() || '',
              type: 'part',
            })
            .returning()
          supplierId = createdSup?.id ?? null
        }

        let totalBatchCost = 0
        const processedParts = []
        const allExistingParts = await partsRepo.list(tx, 'asc')

        for (const row of body.items) {
          const qty = Math.max(1, Math.round(row.quantity))
          const costPrice = Math.round(row.costPrice)
          const salePrice = Math.round(row.salePrice)
          totalBatchCost += qty * costPrice

          const existingPart = allExistingParts.find(
            (p) =>
              p.name.toLowerCase() === row.name.trim().toLowerCase() &&
              p.categoryId === row.categoryId,
          )

          if (existingPart) {
            const updated = await partsRepo.update(
              existingPart.id,
              {
                quantity: existingPart.quantity + qty,
                costPrice,
                salePrice,
                customFields: row.customFields
                  ? { ...(existingPart.customFields || {}), ...row.customFields }
                  : existingPart.customFields,
              },
              tx,
            )
            processedParts.push(updated!)
          } else {
            const inserted = await partsRepo.insert(
              {
                name: row.name.trim(),
                categoryId: row.categoryId,
                quantity: qty,
                costPrice,
                salePrice,
                customFields: row.customFields ?? {},
              },
              tx,
            )
            processedParts.push(inserted)
          }
        }

        const paidAmount = Math.round(body.paidAmount)
        const debtAmount = Math.max(0, totalBatchCost - paidAmount)

        const batch = await partBatchesRepo.insert(
          {
            supplierId,
            supplierName,
            totalCost: totalBatchCost,
            paidAmount,
            debtAmount,
            itemsCount: body.items.length,
          },
          tx,
        )

        let createdDebt = null
        if (debtAmount > 0) {
          const itemNames = body.items
            .slice(0, 3)
            .map((i) => `${i.name} (${i.quantity} dona)`)
            .join(', ')
          createdDebt = await debtsRepo.insert(
            {
              debtType: 'supplier',
              sourceType: 'part_intake',
              sourceId: batch.id,
              categoryTag: 'part',
              counterpartyName: supplierName,
              counterpartyPhone: body.supplierPhone?.trim() || '',
              supplierId,
              description: `Ehtiyot qismlar partiyasi (${body.items.length} xil): ${itemNames}`,
              totalAmount: totalBatchCost,
              paidAmount,
              remainingAmount: debtAmount,
              dueDate: body.dueDate
                ? new Date(body.dueDate)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              status: 'open',
            },
            tx,
          )
        }

        return {
          batch,
          parts: processedParts,
          createdDebt,
        }
      })
    },
    {
      body: t.Object({
        supplierName: t.String({ minLength: 1 }),
        supplierPhone: t.Optional(t.String()),
        paidAmount: t.Number(),
        dueDate: t.Optional(t.Nullable(t.String())),
        items: t.Array(
          t.Object({
            name: t.String({ minLength: 1 }),
            categoryId: t.Number(),
            quantity: t.Number(),
            costPrice: t.Number(),
            salePrice: t.Number(),
            customFields: t.Optional(t.Record(t.String(), t.Any())),
          }),
          { minItems: 1 },
        ),
      }),
    },
  )
  .put(
    '/parts/:id',
    async ({ params, body, status }) => {
      const partId = Number(params.id)
      return await db.transaction(async (tx) => {
        const existing = await partsRepo.getById(partId, tx)

        if (!existing) return status(404, { message: 'Ehtiyot qism topilmadi' })

        const updated = await partsRepo.update(
          partId,
          {
            name: body.name?.trim() ?? existing.name,
            categoryId: body.categoryId ?? existing.categoryId,
            quantity:
              body.quantity !== undefined
                ? Math.max(0, Math.round(body.quantity))
                : existing.quantity,
            costPrice:
              body.costPrice !== undefined ? Math.round(body.costPrice) : existing.costPrice,
            salePrice:
              body.salePrice !== undefined ? Math.round(body.salePrice) : existing.salePrice,
            customFields: body.customFields
              ? { ...(existing.customFields || {}), ...body.customFields }
              : existing.customFields,
          },
          tx,
        )

        return updated!
      })
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        categoryId: t.Optional(t.Number()),
        quantity: t.Optional(t.Number()),
        costPrice: t.Optional(t.Number()),
        salePrice: t.Optional(t.Number()),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .delete(
    '/parts/:id',
    async ({ params }) => {
      const partId = Number(params.id)
      await partsRepo.delete(partId, db)
      return { ok: true, id: partId }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // ==========================================================================
  // 4-BO'LIM: 🛒 SAVDO KASSASI (/api/pos) — Telefon Sotish, Trade-In va Zapchast Chiqimi
  // ==========================================================================
  .get('/pos', async () => {
    const posEnabled = isServerFeatureEnabled('pos')
    const salesEnabled = isServerFeatureEnabled('sales')

    const allPhones = posEnabled ? await phonesRepo.findAll(db) : []
    const availablePhones = allPhones.filter((p) => p.status === 'in_stock')

    const allParts = posEnabled ? await partsRepo.findAll(db) : []
    const availableParts = allParts
      .filter((p) => p.quantity > 0)
      .sort((a, b) => a.name.localeCompare(b.name))

    const recentSales =
      salesEnabled || posEnabled
        ? await db
            .select()
            .from(posSales)
            .where(eq(posSales.isDeleted, false))
            .orderBy(desc(posSales.id))
        : []

    const allCustomers = posEnabled ? await customersRepo.findAll(db) : []

    return {
      availablePhones,
      availableParts,
      recentSales,
      customers: allCustomers,
    }
  })
  .post(
    '/pos/checkout',
    async ({ body, status }) => {
      if (body.tradeIn && body.tradeIn.model.trim() && !isServerFeatureEnabled('trade_in')) {
        return status(403, buildFeatureLockedPayload('trade_in'))
      }
      return await db.transaction(async (tx) => {
        if (!body.items || body.items.length === 0) {
          return status(400, { message: 'Savat bo`sh! Kamida bitta tovar tanlang.' })
        }

        const customerName = body.customerName?.trim() || 'Chakana mijoz'
        const customerPhone = body.customerPhone?.trim() || ''

        let tradeInPhone = null
        let tradeInAcceptedPrice = 0

        if (body.tradeIn && body.tradeIn.model.trim()) {
          tradeInAcceptedPrice = Math.round(body.tradeIn.acceptedPrice)
          const tradeInResalePrice = Math.round(body.tradeIn.resalePrice)

          const insertedTradeIn = await phonesRepo.insert(
            {
              model: body.tradeIn.model.trim(),
              color: body.tradeIn.color?.trim() || 'Qora',
              imei: body.tradeIn.imei?.trim() || '',
              condition: 'used',
              batteryHealth: body.tradeIn.batteryHealth ?? 85,
              boxAndCharger: body.tradeIn.boxAndCharger || 'Faqat telefon (Trade-In)',
              sourceName: `${customerName} (Trade-In)`,
              purchasePrice: tradeInAcceptedPrice,
              extraExpenses: 0,
              costPrice: tradeInAcceptedPrice,
              salePrice: tradeInResalePrice,
              status: 'in_stock',
              isTradeIn: true,
            },
            tx,
          )

          tradeInPhone = insertedTradeIn
        }

        interface ProcessedCartLine {
          saleType: 'phone' | 'part'
          phoneId: number | null
          partId: number | null
          itemTitle: string
          quantity: number
          totalAmount: number
          costAmount: number
          profitAmount: number
        }

        const processedLines: ProcessedCartLine[] = []
        let cartTotalAmount = 0

        for (const item of body.items) {
          if (item.type === 'phone') {
            if (!item.phoneId) {
              return status(400, { message: 'Telefon ID ko`rsatilmadi' })
            }
            const phoneRow = await phonesRepo.findById(item.phoneId, tx)

            if (!phoneRow || phoneRow.status !== 'in_stock') {
              return status(400, {
                message: `${item.title || 'Telefon'} omborda mavjud emas yoki sotilgan`,
              })
            }

            const salePrice = Math.round(item.unitSalePrice)
            const profitAmount = salePrice - phoneRow.costPrice
            cartTotalAmount += salePrice

            await phonesRepo.update(
              phoneRow.id,
              {
                status: 'sold',
                soldPrice: salePrice,
                soldAt: new Date(),
              },
              tx,
            )

            processedLines.push({
              saleType: 'phone',
              phoneId: phoneRow.id,
              partId: null,
              itemTitle: `${phoneRow.model} (${phoneRow.color})`,
              quantity: 1,
              totalAmount: salePrice,
              costAmount: phoneRow.costPrice,
              profitAmount,
            })
          } else {
            if (!item.partId) {
              return status(400, { message: 'Ehtiyot qism ID ko`rsatilmadi' })
            }
            const partRow = await partsRepo.findById(item.partId, tx)

            const qty = Math.max(1, Math.round(item.quantity || 1))
            if (!partRow || partRow.quantity < qty) {
              return status(400, {
                message: `${partRow?.name || 'Ehtiyot qism'} omborda yetarli emas`,
              })
            }

            const unitPrice = Math.round(item.unitSalePrice)
            const lineTotal = qty * unitPrice
            const lineCost = qty * partRow.costPrice
            const lineProfit = lineTotal - lineCost
            cartTotalAmount += lineTotal

            await partsRepo.update(
              partRow.id,
              {
                quantity: partRow.quantity - qty,
                updatedAt: new Date(),
              },
              tx,
            )

            processedLines.push({
              saleType: 'part',
              phoneId: null,
              partId: partRow.id,
              itemTitle: partRow.name,
              quantity: qty,
              totalAmount: lineTotal,
              costAmount: lineCost,
              profitAmount: lineProfit,
            })
          }
        }

        const payableAmount = Math.max(0, cartTotalAmount - tradeInAcceptedPrice)
        let cashPaid = 0
        let cardPaid = 0
        let creditAmount = 0

        if (body.paymentMethod === 'cash') {
          cashPaid = payableAmount
        } else if (body.paymentMethod === 'card') {
          cardPaid = payableAmount
        } else if (body.paymentMethod === 'credit') {
          cashPaid = Math.round(body.initialPaidAmount || 0)
          creditAmount = Math.max(0, payableAmount - cashPaid)
        } else if (body.paymentMethod === 'mixed') {
          cashPaid = Math.round(body.cashPaid || 0)
          cardPaid = Math.round(body.cardPaid || 0)
          creditAmount = Math.max(0, payableAmount - cashPaid - cardPaid)
        }

        const createdSales = []
        for (let i = 0; i < processedLines.length; i++) {
          const line = processedLines[i]!
          const isFirst = i === 0
          const linePayable = isFirst
            ? Math.max(0, line.totalAmount - tradeInAcceptedPrice)
            : line.totalAmount

          const [saleRecord] = await tx
            .insert(posSales)
            .values({
              saleType: line.saleType,
              phoneId: line.phoneId,
              partId: line.partId,
              tradeInPhoneId: isFirst ? (tradeInPhone?.id ?? null) : null,
              tradeInModel: isFirst ? (tradeInPhone?.model ?? null) : null,
              tradeInImei: isFirst ? (tradeInPhone?.imei ?? null) : null,
              tradeInAcceptedPrice: isFirst ? tradeInAcceptedPrice : 0,
              itemTitle: line.itemTitle,
              quantity: line.quantity,
              customerName,
              customerPhone,
              totalAmount: line.totalAmount,
              payableAmount: linePayable,
              costAmount: line.costAmount,
              profitAmount: line.profitAmount,
              paymentMethod: body.paymentMethod,
              cashPaid: isFirst ? cashPaid : 0,
              cardPaid: isFirst ? cardPaid : 0,
              creditAmount: isFirst ? creditAmount : 0,
              warrantyMonths: line.saleType === 'phone' ? (body.warrantyMonths ?? 1) : 0,
            })
            .returning()

          createdSales.push(saleRecord!)
        }

        if (body.customerId) {
          const existingCust = await customersRepo.findById(body.customerId, tx)
          if (existingCust) {
            await customersRepo.update(
              existingCust.id,
              {
                totalSpent: existingCust.totalSpent + payableAmount,
                ordersCount: existingCust.ordersCount + 1,
                updatedAt: new Date(),
              },
              tx,
            )
          }
        } else if (customerName && customerName !== 'Chakana mijoz' && customerPhone) {
          const allCust = await customersRepo.findAll(tx)
          const byPhone = allCust.find((c) => c.phone === customerPhone)
          if (byPhone) {
            await customersRepo.update(
              byPhone.id,
              {
                totalSpent: byPhone.totalSpent + payableAmount,
                ordersCount: byPhone.ordersCount + 1,
                updatedAt: new Date(),
              },
              tx,
            )
          } else {
            await customersRepo.insert(
              {
                fullName: customerName,
                phone: customerPhone,
                segment: payableAmount >= 15000000 ? 'vip' : 'regular',
                totalSpent: payableAmount,
                ordersCount: 1,
              },
              tx,
            )
          }
        }

        let createdDebt = null
        if (creditAmount > 0 && createdSales[0]) {
          const summaryTitles = processedLines
            .map((l) => (l.quantity > 1 ? `${l.itemTitle} (${l.quantity} dona)` : l.itemTitle))
            .join(', ')
          const hasPhone = processedLines.some((l) => l.saleType === 'phone')

          createdDebt = await debtsRepo.insert(
            {
              debtType: 'customer',
              sourceType: hasPhone ? 'phone_sale' : 'part_sale',
              sourceId: createdSales[0].id,
              categoryTag: hasPhone ? 'phone' : 'part',
              counterpartyName: customerName,
              counterpartyPhone: customerPhone,
              description: `Kassa savdosi (${processedLines.length} ta tovar): ${summaryTitles}`,
              totalAmount: payableAmount,
              paidAmount: cashPaid + cardPaid,
              remainingAmount: creditAmount,
              dueDate: body.dueDate
                ? new Date(body.dueDate)
                : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              status: 'open',
            },
            tx,
          )
        }

        return {
          sales: createdSales,
          sale: createdSales[0]!,
          cartTotalAmount,
          payableAmount,
          tradeInPhone,
          createdDebt,
        }
      })
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            type: t.Union([t.Literal('phone'), t.Literal('part')]),
            phoneId: t.Optional(t.Nullable(t.Number())),
            partId: t.Optional(t.Nullable(t.Number())),
            title: t.Optional(t.String()),
            quantity: t.Number({ minimum: 1 }),
            unitSalePrice: t.Number(),
          }),
          { minItems: 1 },
        ),
        customerId: t.Optional(t.Nullable(t.Number())),
        customerName: t.Optional(t.String()),
        customerPhone: t.Optional(t.String()),
        paymentMethod: t.Union([
          t.Literal('cash'),
          t.Literal('card'),
          t.Literal('mixed'),
          t.Literal('credit'),
        ]),
        cashPaid: t.Optional(t.Number()),
        cardPaid: t.Optional(t.Number()),
        initialPaidAmount: t.Optional(t.Number()),
        dueDate: t.Optional(t.Nullable(t.String())),
        warrantyMonths: t.Optional(t.Number()),
        tradeIn: t.Optional(
          t.Nullable(
            t.Object({
              model: t.String(),
              imei: t.Optional(t.String()),
              color: t.Optional(t.String()),
              batteryHealth: t.Optional(t.Number()),
              boxAndCharger: t.Optional(t.String()),
              acceptedPrice: t.Number(),
              resalePrice: t.Number(),
            }),
          ),
        ),
      }),
    },
  )
  .post(
    '/pos/phone-sale',
    async ({ body, status }) => {
      if (body.tradeIn && body.tradeIn.model.trim() && !isServerFeatureEnabled('trade_in')) {
        return status(403, buildFeatureLockedPayload('trade_in'))
      }
      return await db.transaction(async (tx) => {
        const phoneRow = await phonesRepo.findById(body.phoneId, tx)

        if (!phoneRow || phoneRow.status !== 'in_stock') {
          return status(400, { message: 'Bu telefon omborda mavjud emas yoki allaqachon sotilgan' })
        }

        const salePrice = Math.round(body.salePrice)
        const profitAmount = salePrice - phoneRow.costPrice

        // 1. Sotilgan telefonni status = 'sold' qilish
        const soldPhone = await phonesRepo.update(
          phoneRow.id,
          {
            status: 'sold',
            soldPrice: salePrice,
            soldAt: new Date(),
          },
          tx,
        )

        // 2. Agar Trade-In belgilangan bo'lsa, eski telefonni avtomatik Telefonlar omboriga kirim qilish
        let tradeInPhone = null
        let tradeInAcceptedPrice = 0

        if (body.tradeIn && body.tradeIn.model.trim()) {
          tradeInAcceptedPrice = Math.round(body.tradeIn.acceptedPrice)
          const tradeInResalePrice = Math.round(body.tradeIn.resalePrice)

          tradeInPhone = await phonesRepo.insert(
            {
              model: body.tradeIn.model.trim(),
              color: body.tradeIn.color?.trim() || 'Qora',
              imei: body.tradeIn.imei?.trim() || '',
              condition: 'used',
              batteryHealth: body.tradeIn.batteryHealth ?? 85,
              boxAndCharger: body.tradeIn.boxAndCharger || 'Faqat telefon (Trade-In)',
              sourceName: `${body.customerName?.trim() || 'Mijoz'} (Trade-In)`,
              purchasePrice: tradeInAcceptedPrice,
              extraExpenses: 0,
              costPrice: tradeInAcceptedPrice,
              salePrice: tradeInResalePrice,
              status: 'in_stock',
              isTradeIn: true,
            },
            tx,
          )
        }

        // 3. Farq summasi: Yangi telefon narxi - Eski telefon narxi
        const payableAmount = Math.max(0, salePrice - tradeInAcceptedPrice)

        let cashPaid = 0
        let cardPaid = 0
        let creditAmount = 0

        if (body.paymentMethod === 'cash') {
          cashPaid = payableAmount
        } else if (body.paymentMethod === 'card') {
          cardPaid = payableAmount
        } else if (body.paymentMethod === 'credit') {
          cashPaid = Math.round(body.initialPaidAmount || 0)
          creditAmount = Math.max(0, payableAmount - cashPaid)
        } else if (body.paymentMethod === 'mixed') {
          cashPaid = Math.round(body.cashPaid || 0)
          cardPaid = Math.round(body.cardPaid || 0)
          creditAmount = Math.max(0, payableAmount - cashPaid - cardPaid)
        }

        const [saleRecord] = await tx
          .insert(posSales)
          .values({
            saleType: 'phone',
            phoneId: phoneRow.id,
            tradeInPhoneId: tradeInPhone?.id ?? null,
            tradeInModel: tradeInPhone?.model ?? null,
            tradeInImei: tradeInPhone?.imei ?? null,
            tradeInAcceptedPrice,
            itemTitle: `${phoneRow.model} (${phoneRow.color})`,
            quantity: 1,
            customerName: body.customerName?.trim() || 'Chakana mijoz',
            customerPhone: body.customerPhone?.trim() || '',
            totalAmount: salePrice,
            payableAmount,
            costAmount: phoneRow.costPrice,
            profitAmount,
            paymentMethod: body.paymentMethod,
            cashPaid,
            cardPaid,
            creditAmount,
            warrantyMonths: body.warrantyMonths ?? 1,
          })
          .returning()

        // 4. Agar Nasiya (Qarz) qolgan bo'lsa, avtomatik Qarz daftariga yozish
        let createdDebt = null
        if (creditAmount > 0) {
          createdDebt = await debtsRepo.insert(
            {
              debtType: 'customer',
              sourceType: 'phone_sale',
              sourceId: saleRecord!.id,
              categoryTag: 'phone',
              counterpartyName: body.customerName?.trim() || 'Nasiya mijoz',
              counterpartyPhone: body.customerPhone?.trim() || '',
              description: `${phoneRow.model} (${phoneRow.imei || 'IMEI-siz'}) savdosidan nasiya`,
              totalAmount: payableAmount,
              paidAmount: cashPaid + cardPaid,
              remainingAmount: creditAmount,
              dueDate: body.dueDate
                ? new Date(body.dueDate)
                : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              status: 'open',
            },
            tx,
          )
        }

        return {
          sale: saleRecord!,
          soldPhone: soldPhone!,
          tradeInPhone,
          createdDebt,
        }
      })
    },
    {
      body: t.Object({
        phoneId: t.Number(),
        salePrice: t.Number(),
        customerName: t.Optional(t.String()),
        customerPhone: t.Optional(t.String()),
        paymentMethod: t.Union([
          t.Literal('cash'),
          t.Literal('card'),
          t.Literal('mixed'),
          t.Literal('credit'),
        ]),
        cashPaid: t.Optional(t.Number()),
        cardPaid: t.Optional(t.Number()),
        initialPaidAmount: t.Optional(t.Number()),
        dueDate: t.Optional(t.Nullable(t.String())),
        warrantyMonths: t.Optional(t.Number()),
        tradeIn: t.Optional(
          t.Nullable(
            t.Object({
              model: t.String(),
              imei: t.Optional(t.String()),
              color: t.Optional(t.String()),
              batteryHealth: t.Optional(t.Number()),
              boxAndCharger: t.Optional(t.String()),
              acceptedPrice: t.Number(),
              resalePrice: t.Number(),
            }),
          ),
        ),
      }),
    },
  )
  .post(
    '/pos/part-sale',
    async ({ body, status }) => {
      return await db.transaction(async (tx) => {
        const partRow = await partsRepo.findById(body.partId, tx)

        if (!partRow || partRow.quantity < body.quantity) {
          return status(400, { message: 'Omborda yetarli ehtiyot qism qoldig`i yo`q' })
        }

        const qty = Math.max(1, Math.round(body.quantity))
        const unitSalePrice = Math.round(body.unitSalePrice)
        const totalAmount = qty * unitSalePrice
        const costAmount = qty * partRow.costPrice
        const profitAmount = totalAmount - costAmount

        await partsRepo.update(
          partRow.id,
          {
            quantity: partRow.quantity - qty,
            updatedAt: new Date(),
          },
          tx,
        )

        const isCredit = body.paymentMethod === 'credit'
        const paidNow = isCredit ? Math.round(body.paidAmount ?? 0) : totalAmount
        const creditAmount = Math.max(0, totalAmount - paidNow)

        const [saleRecord] = await tx
          .insert(posSales)
          .values({
            saleType: 'part',
            partId: partRow.id,
            itemTitle: partRow.name,
            quantity: qty,
            customerName: body.customerName?.trim() || 'Usta / Xaridor',
            customerPhone: body.customerPhone?.trim() || '',
            totalAmount,
            payableAmount: totalAmount,
            costAmount,
            profitAmount,
            paymentMethod: body.paymentMethod,
            cashPaid: body.paymentMethod === 'card' ? 0 : paidNow,
            cardPaid: body.paymentMethod === 'card' ? paidNow : 0,
            creditAmount,
            warrantyMonths: 0,
          })
          .returning()

        let createdDebt = null
        if (creditAmount > 0) {
          createdDebt = await debtsRepo.insert(
            {
              debtType: 'customer',
              sourceType: 'part_sale',
              sourceId: saleRecord!.id,
              categoryTag: 'part',
              counterpartyName: body.customerName?.trim() || 'Usta (Nasiya)',
              counterpartyPhone: body.customerPhone?.trim() || '',
              description: `${partRow.name} (${qty} dona) ehtiyot qism sotuvi`,
              totalAmount,
              paidAmount: paidNow,
              remainingAmount: creditAmount,
              dueDate: body.dueDate
                ? new Date(body.dueDate)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              status: 'open',
            },
            tx,
          )
        }

        return {
          sale: saleRecord!,
          createdDebt,
        }
      })
    },
    {
      body: t.Object({
        partId: t.Number(),
        quantity: t.Number({ minimum: 1 }),
        unitSalePrice: t.Number(),
        customerName: t.Optional(t.String()),
        customerPhone: t.Optional(t.String()),
        paymentMethod: t.Union([t.Literal('cash'), t.Literal('card'), t.Literal('credit')]),
        paidAmount: t.Optional(t.Number()),
        dueDate: t.Optional(t.Nullable(t.String())),
      }),
    },
  )

  // ==========================================================================
  // 5-BO'LIM: 📒 QARZ DAFTARI (/api/debts) — Mijozlar va Ta'minotchilar qarzi
  // ==========================================================================
  .get('/debts', async () => {
    const allDebts = await debtsRepo.findAll(db)
    const payments = await debtPaymentsRepo.findAll(db)

    const now = Date.now()
    const enriched = allDebts.map((d) => ({
      ...d,
      isOverdue: d.status === 'open' && d.dueDate ? new Date(d.dueDate).getTime() <= now : false,
      payments: payments.filter((p) => p.debtId === d.id),
    }))

    const customerDebts = enriched.filter((d) => d.debtType === 'customer')
    const supplierDebts = enriched.filter((d) => d.debtType === 'supplier')

    const customerOpenTotal = customerDebts
      .filter((d) => d.status === 'open')
      .reduce((acc, d) => acc + d.remainingAmount, 0)
    const supplierOpenTotal = supplierDebts
      .filter((d) => d.status === 'open')
      .reduce((acc, d) => acc + d.remainingAmount, 0)

    return {
      summary: {
        customerOpenTotal,
        customerOpenCount: customerDebts.filter((d) => d.status === 'open').length,
        supplierOpenTotal,
        supplierOpenCount: supplierDebts.filter((d) => d.status === 'open').length,
      },
      customerDebts,
      supplierDebts,
    }
  })
  .post(
    '/debts/:id/pay',
    async ({ params, body, status }) => {
      const debtId = Number(params.id)
      return await db.transaction(async (tx) => {
        const existing = await debtsRepo.findById(debtId, tx)

        if (!existing) {
          return status(404, { message: 'Qarz yozuvi topilmadi' })
        }

        const payAmount = Math.min(existing.remainingAmount, Math.max(1, Math.round(body.amount)))
        const newPaid = existing.paidAmount + payAmount
        const newRemaining = Math.max(0, existing.totalAmount - newPaid)
        const newStatus = newRemaining === 0 ? 'paid' : 'open'

        const updatedDebt = await debtsRepo.update(
          debtId,
          {
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            updatedAt: new Date(),
          },
          tx,
        )

        const paymentRecord = await debtPaymentsRepo.insert(
          {
            debtId,
            amount: payAmount,
            paymentMethod: body.paymentMethod ?? 'cash',
            note: body.note?.trim() || 'Qarz to`lovi',
          },
          tx,
        )

        return {
          debt: updatedDebt!,
          payment: paymentRecord,
        }
      })
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        amount: t.Number({ minimum: 1 }),
        paymentMethod: t.Optional(t.Union([t.Literal('cash'), t.Literal('card')])),
        note: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/debts',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const totalAmount = Math.round(body.totalAmount)
        const paidAmount = Math.round(body.paidAmount || 0)
        const remainingAmount = Math.max(0, totalAmount - paidAmount)

        const created = await debtsRepo.insert(
          {
            debtType: body.debtType,
            sourceType:
              body.categoryTag === 'phone'
                ? 'phone_sale'
                : body.categoryTag === 'part'
                  ? 'part_sale'
                  : 'repair',
            categoryTag: body.categoryTag,
            counterpartyName: body.counterpartyName.trim(),
            counterpartyPhone: body.counterpartyPhone?.trim() || '',
            description: body.description.trim(),
            totalAmount,
            paidAmount,
            remainingAmount,
            dueDate: body.dueDate
              ? new Date(body.dueDate)
              : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            status: remainingAmount === 0 ? 'paid' : 'open',
            customFields: body.customFields ?? {},
          },
          tx,
        )

        return created
      })
    },
    {
      body: t.Object({
        debtType: t.Union([t.Literal('customer'), t.Literal('supplier')]),
        categoryTag: t.Union([t.Literal('phone'), t.Literal('part'), t.Literal('repair')]),
        counterpartyName: t.String({ minLength: 1 }),
        counterpartyPhone: t.Optional(t.String()),
        description: t.String({ minLength: 1 }),
        totalAmount: t.Number({ minimum: 1 }),
        paidAmount: t.Optional(t.Number()),
        dueDate: t.Optional(t.Nullable(t.String())),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .delete(
    '/debts/:id',
    async ({ params }) => {
      const debtId = Number(params.id)
      await debtsRepo.delete(debtId, db)
      return { ok: true, id: debtId }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // ==========================================================================
  // 5.5-BO'LIM: 👥 MIJOZLAR BAZASI (/api/customers)
  // ==========================================================================
  .get('/customers', async () => {
    const allCustomers = await customersRepo.findAll(db)
    const allDebts = await debtsRepo.findAll(db)
    const openCustomerDebts = allDebts.filter(
      (d) => d.debtType === 'customer' && d.status === 'open',
    )

    const enriched = allCustomers.map((c) => {
      const matchingDebts = openCustomerDebts.filter(
        (d) =>
          (c.phone && d.counterpartyPhone === c.phone) ||
          d.counterpartyName.toLowerCase() === c.fullName.toLowerCase(),
      )
      const openDebtAmount = matchingDebts.reduce((acc, d) => acc + d.remainingAmount, 0)
      return {
        ...c,
        openDebtAmount,
      }
    })

    const totalCustomers = enriched.length
    const vipCount = enriched.filter((c) => c.segment === 'vip').length
    const wholesaleCount = enriched.filter((c) => c.segment === 'wholesale').length
    const totalTurnover = enriched.reduce((acc, c) => acc + c.totalSpent, 0)
    const totalOpenDebt = enriched.reduce((acc, c) => acc + c.openDebtAmount, 0)

    return {
      summary: {
        totalCustomers,
        vipCount,
        wholesaleCount,
        totalTurnover,
        totalOpenDebt,
      },
      customers: enriched,
    }
  })
  .post(
    '/customers',
    async ({ body }) => {
      const created = await customersRepo.insert(
        {
          fullName: body.fullName.trim(),
          phone: body.phone.trim(),
          address: body.address?.trim() || '',
          segment: body.segment || 'regular',
          notes: body.notes?.trim() || '',
          totalSpent: Math.max(0, Math.round(body.totalSpent || 0)),
          ordersCount: Math.max(0, Math.round(body.ordersCount || 0)),
          customFields: body.customFields ?? {},
        },
        db,
      )

      return created
    },
    {
      body: t.Object({
        fullName: t.String({ minLength: 1 }),
        phone: t.String({ minLength: 1 }),
        address: t.Optional(t.String()),
        segment: t.Optional(
          t.Union([t.Literal('regular'), t.Literal('vip'), t.Literal('wholesale')]),
        ),
        notes: t.Optional(t.String()),
        totalSpent: t.Optional(t.Number()),
        ordersCount: t.Optional(t.Number()),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .put(
    '/customers/:id',
    async ({ params, body, status }) => {
      const id = Number(params.id)
      const existing = await customersRepo.findById(id, db)
      if (!existing) return status(404, { message: 'Mijoz topilmadi' })

      const updated = await customersRepo.update(
        id,
        {
          fullName: body.fullName?.trim() ?? existing.fullName,
          phone: body.phone?.trim() ?? existing.phone,
          address: body.address?.trim() ?? existing.address,
          segment: body.segment ?? existing.segment,
          notes: body.notes?.trim() ?? existing.notes,
          totalSpent:
            body.totalSpent !== undefined
              ? Math.max(0, Math.round(body.totalSpent))
              : existing.totalSpent,
          ordersCount:
            body.ordersCount !== undefined
              ? Math.max(0, Math.round(body.ordersCount))
              : existing.ordersCount,
          customFields: body.customFields
            ? { ...(existing.customFields || {}), ...body.customFields }
            : existing.customFields,
          updatedAt: new Date(),
        },
        db,
      )

      return updated!
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        fullName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        address: t.Optional(t.String()),
        segment: t.Optional(
          t.Union([t.Literal('regular'), t.Literal('vip'), t.Literal('wholesale')]),
        ),
        notes: t.Optional(t.String()),
        totalSpent: t.Optional(t.Number()),
        ordersCount: t.Optional(t.Number()),
        customFields: t.Optional(t.Record(t.String(), t.Any())),
      }),
    },
  )
  .delete(
    '/customers/:id',
    async ({ params }) => {
      const id = Number(params.id)
      await customersRepo.delete(id, db)
      return { ok: true, id }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // ==========================================================================
  // 6-BO'LIM: 📊 ANALITIKA VA SOZLAMALAR (/api/analytics)
  // ==========================================================================
  .get(
    '/analytics',
    async ({ query }) => {
      const [settings] = await db
        .select()
        .from(storeSettings)
        .where(eq(storeSettings.isDeleted, false))
        .limit(1)
      const allPhones = await phonesRepo.findAll(db)
      const rawRepairs = await repairsRepo.findAll(db)
      const allParts = await partsRepo.findAll(db)
      const rawSales = await db
        .select()
        .from(posSales)
        .where(eq(posSales.isDeleted, false))
        .orderBy(desc(posSales.createdAt))

      const startMs = query.startDate ? new Date(`${query.startDate}T00:00:00`).getTime() : null
      const endMs = query.endDate ? new Date(`${query.endDate}T23:59:59.999`).getTime() : null

      const inDateRange = (dateVal: Date | string | null | undefined) => {
        if (!startMs && !endMs) return true
        if (!dateVal) return false
        const t = new Date(dateVal).getTime()
        if (Number.isNaN(t)) return false
        if (startMs && t < startMs) return false
        if (endMs && t > endMs) return false
        return true
      }

      const allRepairs = rawRepairs.filter((r) => inDateRange(r.createdAt))
      const allSales = rawSales.filter((s) => inDateRange(s.createdAt))

      // 1. Telefon savdosi hisoboti (Alohida kapital va foyda)
      const inStockPhones = allPhones.filter(
        (p) => p.status === 'in_stock' && inDateRange(p.createdAt),
      )
      const phoneSales = allSales.filter((s) => s.saleType === 'phone')
      const phonesInvestedCapital = inStockPhones.reduce((acc, p) => acc + p.costPrice, 0)
      const phonesSoldCount = phoneSales.length
      const phonesRevenue = phoneSales.reduce((acc, s) => acc + s.totalAmount, 0)
      const phonesNetProfit = phoneSales.reduce((acc, s) => acc + s.profitAmount, 0)

      // 2. Ustaxona va Zapchast hisoboti (Alohida hisobot)
      const totalRepairsReceived = allRepairs.length
      const deliveredRepairs = allRepairs.filter((r) => r.status === 'delivered')
      const readyRepairs = allRepairs.filter((r) => r.status === 'ready')
      const usedPartsCostInRepairs = allRepairs
        .filter((r) => r.partDeducted)
        .reduce((acc, r) => acc + r.partCostSnapshot, 0)
      const repairsRevenue = deliveredRepairs.reduce((acc, r) => acc + r.agreedPrice, 0)
      const repairsNetProfit = deliveredRepairs.reduce(
        (acc, r) => acc + (r.agreedPrice - r.partCostSnapshot),
        0,
      )

      const partDirectSales = allSales.filter((s) => s.saleType === 'part')
      const partSalesRevenue = partDirectSales.reduce((acc, s) => acc + s.totalAmount, 0)
      const partSalesProfit = partDirectSales.reduce((acc, s) => acc + s.profitAmount, 0)

      const filteredParts = allParts.filter((p) => inDateRange(p.createdAt))
      const partsInventoryCost = filteredParts.reduce((acc, p) => acc + p.quantity * p.costPrice, 0)

      return {
        settings: settings!,
        phoneReport: {
          investedCapital: phonesInvestedCapital,
          inStockCount: inStockPhones.length,
          soldCount: phonesSoldCount,
          totalRevenue: phonesRevenue,
          netProfit: phonesNetProfit,
          salesHistory: phoneSales,
        },
        workshopAndPartsReport: {
          totalRepairsReceived,
          deliveredRepairsCount: deliveredRepairs.length,
          readyRepairsCount: readyRepairs.length,
          usedPartsCostInRepairs,
          repairsRevenue,
          repairsNetProfit,
          partSalesRevenue,
          partSalesProfit,
          totalWorkshopAndPartsProfit: repairsNetProfit + partSalesProfit,
          partsInventoryCost,
        },
      }
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    },
  )
  .put(
    '/analytics/settings',
    async ({ body }) => {
      const currencyEnabled = isServerFeatureEnabled('currency_rates')
      const tgEnabled = isServerFeatureEnabled('telegram_bot')
      const printEnabled = isServerFeatureEnabled('thermal_print')

      return await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(storeSettings).limit(1)
        const [updated] = await tx
          .update(storeSettings)
          .set({
            storeName: body.storeName.trim(),
            storePhone: body.storePhone.trim(),
            storeAddress: body.storeAddress.trim(),
            cbuRate: currencyEnabled ? Math.round(body.cbuRate) : existing!.cbuRate,
            internalRate: currencyEnabled ? Math.round(body.internalRate) : existing!.internalRate,
            defaultCurrency: currencyEnabled ? body.defaultCurrency : existing!.defaultCurrency,
            telegramChatId: tgEnabled ? body.telegramChatId.trim() : existing!.telegramChatId,
            dailyReportTime: tgEnabled ? body.dailyReportTime.trim() : existing!.dailyReportTime,
            printerPaperWidth: printEnabled ? body.printerPaperWidth : existing!.printerPaperWidth,
            updatedAt: new Date(),
          })
          .where(eq(storeSettings.id, existing!.id))
          .returning()

        return updated!
      })
    },
    {
      body: t.Object({
        storeName: t.String({ minLength: 1 }),
        storePhone: t.String(),
        storeAddress: t.String(),
        cbuRate: t.Number(),
        internalRate: t.Number(),
        defaultCurrency: t.Union([
          t.Literal('UZS'),
          t.Literal('USD'),
          t.Literal('EUR'),
          t.Literal('RUB'),
          t.Literal('CNY'),
        ]),
        telegramChatId: t.String(),
        dailyReportTime: t.String(),
        printerPaperWidth: t.Union([t.Literal('58mm'), t.Literal('80mm')]),
      }),
    },
  )
  .post(
    '/analytics/telegram-notify',
    async ({ body }) => {
      return await sendStoreTelegramNotification(body.type, body.chatId)
    },
    {
      body: t.Object({
        type: t.Union([
          t.Literal('overdue_repairs'),
          t.Literal('due_debts'),
          t.Literal('daily_report'),
          t.Literal('all'),
        ]),
        chatId: t.Optional(t.String()),
      }),
    },
  )
  // ==========================================================================
  // 7-BO'LIM: 🧩 JADVAL USTUNLARI VA DINAMIK MAYDONLAR (/api/table-fields)
  // ==========================================================================
  .get('/table-fields', async () => {
    const allLanguages = await db
      .select()
      .from(languages)
      .where(eq(languages.isDeleted, false))
      .orderBy(asc(languages.id))

    const langCodeById = new Map<number, string>()
    let defaultLangCode = 'uz-UZ'
    for (const l of allLanguages) {
      langCodeById.set(l.id, l.code)
      if (l.isDefault) defaultLangCode = l.code
    }

    const INTERNAL_REPO_KEYS = new Set(['part_categories', 'part_batches', 'debt_payments'])

    const dynamicEnabled = isServerFeatureEnabled('dynamic_fields')

    const allTables = (
      await db
        .select()
        .from(dataTables)
        .where(eq(dataTables.isDeleted, false))
        .orderBy(asc(dataTables.sortOrder), asc(dataTables.id))
    ).filter((dt) => !INTERNAL_REPO_KEYS.has(dt.key) && (dynamicEnabled || dt.isSystem))

    const allTableTrans = await db
      .select()
      .from(dataTableTranslations)
      .where(eq(dataTableTranslations.isDeleted, false))
    const tableKeyById = new Map<number, string>()

    const enrichedDataTables = allTables.map((dt) => {
      tableKeyById.set(dt.id, dt.key)
      const transRows = allTableTrans.filter((tr) => tr.dataTableId === dt.id)
      const translations: Record<string, { name: string; description: string }> = {}
      for (const tr of transRows) {
        const code = langCodeById.get(tr.languageId) || 'uz-UZ'
        translations[code] = {
          name: tr.name,
          description: tr.description || '',
        }
      }
      const defTrans = translations[defaultLangCode] ||
        translations['uz-UZ'] ||
        Object.values(translations)[0] || { name: dt.key, description: '' }

      return {
        id: dt.id,
        key: dt.key,
        name: defTrans.name,
        description: defTrans.description,
        isSystem: dt.isSystem,
        sortOrder: dt.sortOrder,
        translations,
        createdAt: dt.createdAt,
        updatedAt: dt.updatedAt,
      }
    })

    const allFields = (
      await db
        .select()
        .from(dataTableFields)
        .where(eq(dataTableFields.isDeleted, false))
        .orderBy(asc(dataTableFields.sortOrder), asc(dataTableFields.id))
    ).filter((f) => dynamicEnabled || f.isSystem)

    const allFieldTrans = await db
      .select()
      .from(dataTableFieldTranslations)
      .where(eq(dataTableFieldTranslations.isDeleted, false))

    const enrichedFields = allFields.map((f) => {
      let options: string[] = []
      try {
        const parsed = JSON.parse(f.optionsJson || '[]')
        if (Array.isArray(parsed)) {
          options = parsed.map((x) => String(x).trim()).filter(Boolean)
        }
      } catch {
        options = []
      }

      const transRows = allFieldTrans.filter((tr) => tr.fieldId === f.id)
      const translations: Record<string, { name: string; description: string }> = {}
      for (const tr of transRows) {
        const code = langCodeById.get(tr.languageId) || 'uz-UZ'
        translations[code] = {
          name: tr.name,
          description: tr.description || '',
        }
      }

      const defTrans = translations[defaultLangCode] ||
        translations['uz-UZ'] ||
        Object.values(translations)[0] || { name: f.key, description: '' }

      const tableKey = tableKeyById.get(f.dataTableId) || 'repairs'

      return {
        id: f.id,
        dataTableId: f.dataTableId,
        tableKey,
        key: f.key,
        fieldKey: f.key,
        label: defTrans.name,
        description: defTrans.description,
        value: f.value,
        defaultValue: f.value,
        type: f.type,
        fieldType: f.type,
        optionsJson: f.optionsJson,
        options,
        isSystem: f.isSystem,
        isVisible: f.isVisible,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
        translations,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }
    })

    const byTable: Record<string, typeof enrichedFields> = {
      repairs: [],
      phones: [],
      parts: [],
      debts: [],
      customers: [],
    }
    for (const dt of enrichedDataTables) {
      if (!byTable[dt.key]) byTable[dt.key] = []
    }
    for (const f of enrichedFields) {
      if (!byTable[f.tableKey]) byTable[f.tableKey] = []
      byTable[f.tableKey]!.push(f)
    }

    return {
      languages: allLanguages,
      dataTables: enrichedDataTables,
      fields: enrichedFields,
      byTable,
    }
  })
  .post(
    '/table-fields/data-tables',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const uzLangId = await getDefaultLanguageId(tx)
        const existingTables = await tx
          .select()
          .from(dataTables)
          .where(eq(dataTables.isDeleted, false))
          .orderBy(asc(dataTables.sortOrder))

        const existingKeys = new Set(existingTables.map((dt) => dt.key))
        const generatedKey = ensureUniqueLatinKey(body.name.trim(), existingKeys, 'table')
        const maxSort = existingTables.reduce((max, dt) => Math.max(max, dt.sortOrder), 0)

        const [createdTable] = await tx
          .insert(dataTables)
          .values({
            key: generatedKey,
            isSystem: false,
            sortOrder: maxSort + 1,
            isDeleted: false,
          })
          .returning()

        const cleanName = body.name.trim()
        const cleanDesc = (body.description ?? '').trim()

        await tx.insert(dataTableTranslations).values({
          dataTableId: createdTable!.id,
          languageId: uzLangId,
          name: cleanName,
          description: cleanDesc,
          isDeleted: false,
        })

        // Yangi jadval uchun boshlang'ich "№" (sys_index) tizim ustunini ham qo'shamiz
        const [sysIndexField] = await tx
          .insert(dataTableFields)
          .values({
            dataTableId: createdTable!.id,
            key: 'sys_index',
            value: '',
            type: 'system',
            optionsJson: '[]',
            isSystem: true,
            isVisible: true,
            isRequired: false,
            sortOrder: 1,
            isDeleted: false,
          })
          .returning()

        await tx.insert(dataTableFieldTranslations).values({
          fieldId: sysIndexField!.id,
          languageId: uzLangId,
          name: '№',
          description: null,
          isDeleted: false,
        })

        return {
          ...createdTable!,
          name: cleanName,
          description: cleanDesc,
          translations: {
            'uz-UZ': { name: cleanName, description: cleanDesc },
          },
        }
      })
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    '/table-fields/data-tables/:id',
    async ({ params, status }) => {
      const id = Number(params.id)
      return await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(dataTables)
          .where(and(eq(dataTables.id, id), eq(dataTables.isDeleted, false)))
          .limit(1)

        if (!existing) {
          return status(404, { message: 'Jadval topilmadi' })
        }
        if (existing.isSystem) {
          return status(400, { message: 'Tizim jadvalini o`chirib bo`lmaydi' })
        }

        const now = new Date()
        await tx
          .update(dataTables)
          .set({ isDeleted: true, updatedAt: now })
          .where(eq(dataTables.id, id))

        await tx
          .update(dataTableTranslations)
          .set({ isDeleted: true, updatedAt: now })
          .where(eq(dataTableTranslations.dataTableId, id))

        await tx
          .update(dataTableFields)
          .set({ isDeleted: true, updatedAt: now })
          .where(eq(dataTableFields.dataTableId, id))

        await tx
          .update(dataTableRecords)
          .set({ isDeleted: true, updatedAt: now })
          .where(eq(dataTableRecords.dataTableId, id))

        return { ok: true, deletedId: id, key: existing.key }
      })
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .post(
    '/table-fields',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const uzLangId = await getDefaultLanguageId(tx)
        const dataTableId = await ensureDataTableId(body.tableKey, tx)

        const existingForTable = await tx
          .select()
          .from(dataTableFields)
          .where(
            and(eq(dataTableFields.dataTableId, dataTableId), eq(dataTableFields.isDeleted, false)),
          )
          .orderBy(asc(dataTableFields.sortOrder))

        const maxSort = existingForTable.reduce((max, item) => Math.max(max, item.sortOrder), 0)

        const existingKeys = new Set(existingForTable.map((f) => f.key))
        const fieldKey = ensureUniqueLatinKey(body.label.trim(), existingKeys, 'field')
        const cleanOptions = (body.options ?? []).map((o) => o.trim()).filter(Boolean)
        const defaultVal = (body.defaultValue ?? '').trim()
        const cleanLabel = body.label.trim()

        const [created] = await tx
          .insert(dataTableFields)
          .values({
            dataTableId,
            key: fieldKey,
            value: defaultVal,
            type: body.fieldType,
            optionsJson: JSON.stringify(cleanOptions),
            isSystem: false,
            isVisible: body.isVisible ?? true,
            isRequired: body.isRequired ?? false,
            sortOrder: maxSort + 1,
            isDeleted: false,
          })
          .returning()

        await tx.insert(dataTableFieldTranslations).values({
          fieldId: created!.id,
          languageId: uzLangId,
          name: cleanLabel,
          description: null,
          isDeleted: false,
        })

        return {
          ...created!,
          tableKey: body.tableKey,
          fieldKey: created!.key,
          label: cleanLabel,
          fieldType: created!.type,
          defaultValue: created!.value,
          options: cleanOptions,
          translations: {
            'uz-UZ': { name: cleanLabel, description: '' },
          },
        }
      })
    },
    {
      body: t.Object({
        tableKey: t.String({ minLength: 1 }),
        label: t.String({ minLength: 1 }),
        fieldType: t.Union([
          t.Literal('text'),
          t.Literal('number'),
          t.Literal('money'),
          t.Literal('date'),
          t.Literal('select'),
          t.Literal('boolean'),
        ]),
        options: t.Optional(t.Array(t.String())),
        defaultValue: t.Optional(t.String()),
        isVisible: t.Optional(t.Boolean()),
        isRequired: t.Optional(t.Boolean()),
      }),
    },
  )
  .put(
    '/table-fields/:id',
    async ({ params, body, status }) => {
      const id = Number(params.id)
      return await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(dataTableFields)
          .where(and(eq(dataTableFields.id, id), eq(dataTableFields.isDeleted, false)))
          .limit(1)

        if (!existing) {
          return status(404, { message: 'Maydon topilmadi' })
        }

        const uzLangId = await getDefaultLanguageId(tx)
        const nextOptionsJson =
          body.options !== undefined
            ? JSON.stringify(body.options.map((o) => o.trim()).filter(Boolean))
            : existing.optionsJson

        const [updated] = await tx
          .update(dataTableFields)
          .set({
            type: body.fieldType ? body.fieldType : existing.type,
            optionsJson: nextOptionsJson,
            value: body.defaultValue !== undefined ? body.defaultValue.trim() : existing.value,
            isVisible: body.isVisible !== undefined ? body.isVisible : existing.isVisible,
            isRequired: body.isRequired !== undefined ? body.isRequired : existing.isRequired,
            sortOrder: body.sortOrder !== undefined ? body.sortOrder : existing.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(dataTableFields.id, id))
          .returning()

        let currentLabel = existing.key
        const [existingTrans] = await tx
          .select()
          .from(dataTableFieldTranslations)
          .where(
            and(
              eq(dataTableFieldTranslations.fieldId, id),
              eq(dataTableFieldTranslations.languageId, uzLangId),
              eq(dataTableFieldTranslations.isDeleted, false),
            ),
          )
          .limit(1)

        if (body.label && body.label.trim()) {
          currentLabel = body.label.trim()
          if (existingTrans) {
            await tx
              .update(dataTableFieldTranslations)
              .set({ name: currentLabel, updatedAt: new Date() })
              .where(eq(dataTableFieldTranslations.id, existingTrans.id))
          } else {
            await tx.insert(dataTableFieldTranslations).values({
              fieldId: id,
              languageId: uzLangId,
              name: currentLabel,
              description: null,
              isDeleted: false,
            })
          }
        } else if (existingTrans) {
          currentLabel = existingTrans.name
        }

        const [dtRow] = await tx
          .select()
          .from(dataTables)
          .where(eq(dataTables.id, updated!.dataTableId))
          .limit(1)

        let options: string[] = []
        try {
          options = JSON.parse(updated!.optionsJson || '[]')
        } catch {
          options = []
        }

        return {
          ...updated!,
          tableKey: dtRow?.key || 'repairs',
          fieldKey: updated!.key,
          label: currentLabel,
          fieldType: updated!.type,
          defaultValue: updated!.value,
          options,
        }
      })
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        label: t.Optional(t.String()),
        fieldType: t.Optional(
          t.Union([
            t.Literal('system'),
            t.Literal('text'),
            t.Literal('number'),
            t.Literal('money'),
            t.Literal('date'),
            t.Literal('select'),
            t.Literal('boolean'),
          ]),
        ),
        options: t.Optional(t.Array(t.String())),
        defaultValue: t.Optional(t.String()),
        isVisible: t.Optional(t.Boolean()),
        isRequired: t.Optional(t.Boolean()),
        sortOrder: t.Optional(t.Number()),
      }),
    },
  )
  .post(
    '/table-fields/reorder',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const dataTableId = await ensureDataTableId(body.tableKey, tx)
        for (let idx = 0; idx < body.orderedIds.length; idx++) {
          const fieldId = body.orderedIds[idx]!
          await tx
            .update(dataTableFields)
            .set({
              sortOrder: idx + 1,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(dataTableFields.id, fieldId),
                eq(dataTableFields.dataTableId, dataTableId),
                eq(dataTableFields.isDeleted, false),
              ),
            )
        }
        return { ok: true }
      })
    },
    {
      body: t.Object({
        tableKey: t.String({ minLength: 1 }),
        orderedIds: t.Array(t.Number()),
      }),
    },
  )
  .post(
    '/table-fields/reset',
    async ({ body }) => {
      return await db.transaction(async (tx) => {
        const uzLangId = await getDefaultLanguageId(tx)
        const dataTableId = await ensureDataTableId(body.tableKey, tx)
        const defaults = DEFAULT_SYSTEM_TABLE_FIELDS[body.tableKey as ManagedTableKey] || [
          { fieldKey: 'sys_index', label: '№', sortOrder: 1 },
        ]
        const existingForTable = await tx
          .select()
          .from(dataTableFields)
          .where(eq(dataTableFields.dataTableId, dataTableId))
          .orderBy(desc(dataTableFields.id))

        for (const def of defaults) {
          const found =
            existingForTable.find((f) => f.key === def.fieldKey && !f.isDeleted) ||
            existingForTable.find((f) => f.key === def.fieldKey)
          let targetFieldId: number
          if (found) {
            await tx
              .update(dataTableFields)
              .set({
                type: 'system',
                isSystem: true,
                isVisible: true,
                isDeleted: false,
                sortOrder: def.sortOrder,
                updatedAt: new Date(),
              })
              .where(eq(dataTableFields.id, found.id))
            targetFieldId = found.id
          } else {
            const [inserted] = await tx
              .insert(dataTableFields)
              .values({
                dataTableId,
                key: def.fieldKey,
                value: '',
                type: 'system',
                optionsJson: '[]',
                isSystem: true,
                isVisible: true,
                isRequired: false,
                isDeleted: false,
                sortOrder: def.sortOrder,
              })
              .returning()
            targetFieldId = inserted!.id
          }

          const [existingTrans] = await tx
            .select()
            .from(dataTableFieldTranslations)
            .where(
              and(
                eq(dataTableFieldTranslations.fieldId, targetFieldId),
                eq(dataTableFieldTranslations.languageId, uzLangId),
              ),
            )
            .orderBy(desc(dataTableFieldTranslations.id))
            .limit(1)

          if (existingTrans) {
            await tx
              .update(dataTableFieldTranslations)
              .set({
                name: def.label,
                isDeleted: false,
                updatedAt: new Date(),
              })
              .where(eq(dataTableFieldTranslations.id, existingTrans.id))
          } else {
            await tx.insert(dataTableFieldTranslations).values({
              fieldId: targetFieldId,
              languageId: uzLangId,
              name: def.label,
              description: null,
              isDeleted: false,
            })
          }
        }
        return { ok: true }
      })
    },
    {
      body: t.Object({
        tableKey: t.String({ minLength: 1 }),
      }),
    },
  )
  .delete(
    '/table-fields/:id',
    async ({ params, status }) => {
      const id = Number(params.id)
      return await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(dataTableFields)
          .where(and(eq(dataTableFields.id, id), eq(dataTableFields.isDeleted, false)))
          .limit(1)

        if (!existing) {
          return status(404, { message: 'Maydon topilmadi' })
        }

        const now = new Date()
        await tx
          .update(dataTableFields)
          .set({
            isDeleted: true,
            updatedAt: now,
          })
          .where(eq(dataTableFields.id, id))

        await tx
          .update(dataTableFieldTranslations)
          .set({
            isDeleted: true,
            updatedAt: now,
          })
          .where(eq(dataTableFieldTranslations.fieldId, id))

        return { ok: true, deletedId: id, fieldKey: existing.key }
      })
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .patch(
    '/table-fields/cell',
    async ({ body, status }) => {
      return await db.transaction(async (tx) => {
        const { tableKey, rowId, fieldKey, value } = body

        const [record] = await tx
          .select()
          .from(dataTableRecords)
          .where(and(eq(dataTableRecords.id, rowId), eq(dataTableRecords.isDeleted, false)))
          .limit(1)
        if (!record) return status(404, { message: 'Qator topilmadi' })

        const dataTableId = await ensureDataTableId(tableKey, tx)
        const [fieldDef] = await tx
          .select()
          .from(dataTableFields)
          .where(
            and(
              eq(dataTableFields.dataTableId, dataTableId),
              eq(dataTableFields.key, fieldKey),
              eq(dataTableFields.isDeleted, false),
            ),
          )
          .limit(1)

        const valueType: 'text' | 'number' | 'boolean' =
          typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text'
        const serialized = value === null || value === undefined ? '' : String(value)

        const [existingVal] = await tx
          .select()
          .from(dataTableRecordValues)
          .where(
            and(
              eq(dataTableRecordValues.recordId, rowId),
              eq(dataTableRecordValues.key, fieldKey),
              eq(dataTableRecordValues.isDeleted, false),
            ),
          )
          .limit(1)

        if (existingVal) {
          await tx
            .update(dataTableRecordValues)
            .set({
              fieldId: fieldDef?.id ?? existingVal.fieldId,
              value: serialized,
              type: fieldDef?.type ?? valueType,
              updatedAt: new Date(),
            })
            .where(eq(dataTableRecordValues.id, existingVal.id))
        } else {
          await tx.insert(dataTableRecordValues).values({
            recordId: rowId,
            fieldId: fieldDef?.id ?? null,
            key: fieldKey,
            value: serialized,
            type: fieldDef?.type ?? valueType,
            isDeleted: false,
          })
        }

        await tx
          .update(dataTableRecords)
          .set({ updatedAt: new Date() })
          .where(eq(dataTableRecords.id, rowId))

        return { ok: true, customFields: { [fieldKey]: value } }
      })
    },
    {
      body: t.Object({
        tableKey: t.String({ minLength: 1 }),
        rowId: t.Number(),
        fieldKey: t.String({ minLength: 1 }),
        value: t.Any(),
      }),
    },
  )
  .use(botWebhookPlugin)

export type App = typeof app
