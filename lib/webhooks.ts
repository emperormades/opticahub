import crypto from 'crypto'

function shouldRequireSignature(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_WEBHOOK_SIGNATURE === 'true'
}

export function validateWebhookSignature(params: {
  bodyText: string
  signature: string | null
  secretEnvKey: string
}): { valid: boolean; reason?: 'missing_secret' | 'invalid_signature' } {
  if (!shouldRequireSignature()) {
    return { valid: true }
  }

  const secret = process.env[params.secretEnvKey]

  if (!secret) {
    return { valid: false, reason: 'missing_secret' }
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(params.bodyText)
    .digest('hex')

  if (!params.signature || params.signature !== expectedSignature) {
    return { valid: false, reason: 'invalid_signature' }
  }

  return { valid: true }
}
