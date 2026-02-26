import { createHmac } from 'crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32ToBuffer(input: string): Buffer {
  const normalized = input.replace(/[\s-]/g, '').toUpperCase()
  let bits = ''

  for (const ch of normalized) {
    const val = BASE32_ALPHABET.indexOf(ch)
    if (val === -1) {
      throw new Error('Invalid TOTP secret')
    }
    bits += val.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }

  return Buffer.from(bytes)
}

export function generateTotpCode(secret: string): { code: string; remainingSeconds: number } {
  const secretBytes = base32ToBuffer(secret)
  const epochSeconds = Math.floor(Date.now() / 1000)
  const step = 30
  const counter = Math.floor(epochSeconds / step)
  const remainingSeconds = step - (epochSeconds % step)

  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', secretBytes).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const code = String(binary % 1_000_000).padStart(6, '0')
  return { code, remainingSeconds }
}

