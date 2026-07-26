import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is not set')
  }
  if (secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET must be at least 32 characters')
  }
  return createHash('sha256').update(secret).digest().subarray(0, KEY_LENGTH)
}

export function encrypt(text: string): { encrypted: string; iv: string } {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])
  
  const authTag = cipher.getAuthTag()
  
  const combined = Buffer.concat([encrypted, authTag])
  
  return {
    encrypted: combined.toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decrypt(encrypted: string, iv: string): string {
  const key = getKey()
  const ivBuffer = Buffer.from(iv, 'base64')
  const combined = Buffer.from(encrypted, 'base64')
  
  const encryptedData = combined.subarray(0, combined.length - AUTH_TAG_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  
  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ])
  
  return decrypted.toString('utf8')
}
