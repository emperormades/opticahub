/**
 * AES-256-GCM encryption for sensitive data (clinical records, etc.)
 * Compliant with LGPD requirements for sensitive personal data.
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const FALLBACK_KEY = 'rupta-aes256-key-must-be-32chars'

function resolveEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY

  if (!rawKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production')
    }

    return Buffer.from(FALLBACK_KEY, 'utf8')
  }

  if (rawKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long')
  }

  return Buffer.from(rawKey, 'utf8')
}

const KEY = resolveEncryptionKey()

export interface EncryptedData {
  iv: string
  tag: string
  data: string
}

export function encrypt(plainText: string): EncryptedData {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted,
  }
}

export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(encryptedData.iv, 'hex'))

  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))

  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function encryptToString(plainText: string): string {
  return JSON.stringify(encrypt(plainText))
}

export function decryptFromString(encryptedString: string): string {
  return decrypt(JSON.parse(encryptedString) as EncryptedData)
}
