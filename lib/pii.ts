import { decryptFromString, encryptToString } from '@/lib/crypto'

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizeCpf(value: string): string {
  return normalizeDigits(value)
}

export function normalizeRg(value: string): string {
  return normalizeDigits(value)
}

export function encryptOptionalPii(
  value: string | null | undefined,
  normalizer?: (value: string) => string
): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = normalizer ? normalizer(trimmed) : trimmed
  if (!normalized) return null

  return encryptToString(normalized)
}

export function decryptOptionalPii(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    return decryptFromString(value)
  } catch {
    return value
  }
}

export function maskCpf(value: string | null | undefined): string | null {
  const decrypted = decryptOptionalPii(value)
  if (!decrypted) return null

  const digits = normalizeCpf(decrypted)
  if (digits.length !== 11) return '***'

  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`
}
