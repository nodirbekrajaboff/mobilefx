import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import dotenv from 'dotenv'

import {
  type AppFeatureKey,
  type AppLiveTimerState,
  getFeatureTitle,
  parseAppFeaturesEnv,
  parseAppLiveHoursEnv,
  type ParsedAppFeatures,
} from './features'

const SERVER_BOOT_TIME_MS = Date.now()
const LIVE_TIMER_CACHE_FILE = resolve(tmpdir(), 'mobile-fix-live-timer.json')

let inMemoryTimerRef: {
  hoursRaw: string
  startedAtMs: number
} | null = null

function readEnvFileVar(key: string): string | undefined {
  const root = process.cwd()
  // Check .env.local first, then .env (matching Vite/Bun priority)
  const candidates = ['.env.local', '.env']
  for (const filename of candidates) {
    const fullPath = resolve(root, filename)
    if (!existsSync(fullPath)) continue
    try {
      const content = readFileSync(fullPath, 'utf8')
      const parsed = dotenv.parse(content)
      if (parsed[key] !== undefined) {
        return parsed[key]
      }
    } catch {
      // ignore read errors
    }
  }
  return undefined
}

function getEnvVarValue(...keys: string[]): string | undefined {
  // In test mode or when explicitly overridden in memory, check process.env first if non-empty
  if (process.env.NODE_ENV === 'test') {
    for (const key of keys) {
      const fromProcess = process.env[key]
      if (fromProcess !== undefined && fromProcess !== '') {
        return fromProcess
      }
    }
  }

  for (const key of keys) {
    const fromDisk = readEnvFileVar(key)
    if (fromDisk !== undefined && fromDisk.trim() !== '') {
      return fromDisk
    }
  }

  for (const key of keys) {
    const fromProcess = process.env[key]
    if (fromProcess !== undefined && fromProcess.trim() !== '') {
      return fromProcess
    }
  }

  return undefined
}

export function getServerAppFeatures(): ParsedAppFeatures {
  const raw = getEnvVarValue('APP_FEATURES', 'VITE_APP_FEATURES')
  return parseAppFeaturesEnv(raw)
}

export function isServerFeatureEnabled(feature: AppFeatureKey): boolean {
  const parsed = getServerAppFeatures()
  return parsed.isAll || parsed.enabled.includes(feature)
}

export function buildFeatureLockedPayload(feature: AppFeatureKey) {
  const title = getFeatureTitle(feature, 'uz')
  return {
    ok: false,
    locked: true,
    feature,
    message: `🔒 «${title}» funksiyasi qulflangan`,
  }
}

function resolvePersistedStartTimeMs(hoursRaw: string): number {
  const normalized = hoursRaw.trim()
  if (inMemoryTimerRef && inMemoryTimerRef.hoursRaw === normalized) {
    return inMemoryTimerRef.startedAtMs
  }

  try {
    if (existsSync(LIVE_TIMER_CACHE_FILE)) {
      const parsed = JSON.parse(readFileSync(LIVE_TIMER_CACHE_FILE, 'utf8')) as {
        hoursRaw?: string
        startedAtMs?: number
      }
      if (
        parsed.hoursRaw === normalized &&
        typeof parsed.startedAtMs === 'number' &&
        Number.isFinite(parsed.startedAtMs)
      ) {
        inMemoryTimerRef = {
          hoursRaw: normalized,
          startedAtMs: parsed.startedAtMs,
        }
        return parsed.startedAtMs
      }
    }
  } catch {
    // fallback to server boot time
  }

  const startedAtMs = Date.now() || SERVER_BOOT_TIME_MS
  inMemoryTimerRef = {
    hoursRaw: normalized,
    startedAtMs,
  }
  try {
    writeFileSync(LIVE_TIMER_CACHE_FILE, JSON.stringify(inMemoryTimerRef), 'utf8')
  } catch {
    // ignore write errors in read-only filesystems
  }
  return startedAtMs
}

export function getServerLiveTimer(nowMs: number = Date.now()): AppLiveTimerState {
  const rawHours = getEnvVarValue('APP_LIVE_HOURS', 'VITE_APP_LIVE_HOURS', 'DEMO_LIVE_HOURS')
  const rawStartTime = getEnvVarValue('APP_LIVE_START_TIME', 'VITE_APP_LIVE_START_TIME')

  const defaultStartMs =
    rawHours && String(rawHours).trim()
      ? resolvePersistedStartTimeMs(String(rawHours))
      : SERVER_BOOT_TIME_MS

  return parseAppLiveHoursEnv(rawHours, rawStartTime, defaultStartMs, nowMs)
}

export function isServerLiveTimerExpired(nowMs: number = Date.now()): boolean {
  const timer = getServerLiveTimer(nowMs)
  return timer.enabled && timer.isExpired
}

export function buildAppExpiredPayload(timer: AppLiveTimerState) {
  return {
    ok: false,
    expired: true,
    liveTimer: timer,
    message: `⏳ Ilovaning ishlash vaqti (${timer.hours ?? 0} soat) yakunlandi. Administratorga murojaat qiling.`,
  }
}
