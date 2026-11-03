import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string comparison using SHA-256 digests so neither string content nor string length
 * leaks via timing side-channels.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a, 'utf8').digest()
  const hashB = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(hashA, hashB) && a.length === b.length
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAtMs: number
  retryAfterSeconds: number
}

interface RateLimitBucket {
  count: number
  resetAtMs: number
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()
const MAX_BUCKETS = 10_000

function pruneExpiredBuckets(nowMs: number) {
  if (rateLimitBuckets.size < MAX_BUCKETS) return
  for (const [k, bucket] of rateLimitBuckets) {
    if (bucket.resetAtMs <= nowMs) {
      rateLimitBuckets.delete(k)
    }
  }
  if (rateLimitBuckets.size >= MAX_BUCKETS) {
    // Evict oldest 20% if still full under heavy spoofed-IP load
    let toRemove = Math.floor(MAX_BUCKETS * 0.2)
    for (const k of rateLimitBuckets.keys()) {
      rateLimitBuckets.delete(k)
      if (--toRemove <= 0) break
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now(),
): RateLimitResult {
  pruneExpiredBuckets(nowMs)

  const existing = rateLimitBuckets.get(key)
  if (!existing || existing.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + windowMs
    rateLimitBuckets.set(key, {
      count: 1,
      resetAtMs,
    })
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAtMs,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    }
  }

  existing.count += 1
  const allowed = existing.count <= limit
  const remaining = Math.max(0, limit - existing.count)
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000))

  return {
    allowed,
    limit,
    remaining,
    resetAtMs: existing.resetAtMs,
    retryAfterSeconds,
  }
}

export function resetRateLimitStore(): void {
  rateLimitBuckets.clear()
}

export function isHttpsRequest(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto')
  if (proto && proto.split(',')[0]?.trim().toLowerCase() === 'https') {
    return true
  }
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

export const DEFAULT_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}
