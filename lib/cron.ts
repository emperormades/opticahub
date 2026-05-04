export type CronAuthResult =
  | { ok: true }
  | {
      ok: false
      status: 401 | 403 | 503
      error: string
    }

export function validateCronRequest(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const shouldRequireSecret =
    process.env.NODE_ENV === 'production' || process.env.REQUIRE_CRON_SECRET === 'true'

  if (!cronSecret) {
    if (shouldRequireSecret) {
      return {
        ok: false,
        status: 503,
        error: 'CRON_SECRET is not configured',
      }
    }

    return { ok: true }
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return {
      ok: false,
      status: shouldRequireSecret ? 401 : 403,
      error: 'Unauthorized',
    }
  }

  return { ok: true }
}
