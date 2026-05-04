type Bucket = {
  count: number
  resetAt: number
}

const globalStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, Bucket>
}

const store = globalStore.__rateLimitStore ?? new Map<string, Bucket>()

if (!globalStore.__rateLimitStore) {
  globalStore.__rateLimitStore = store
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterMs: windowMs,
    }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(existing.resetAt - now, 0),
    }
  }

  existing.count += 1
  store.set(key, existing)

  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterMs: Math.max(existing.resetAt - now, 0),
  }
}
