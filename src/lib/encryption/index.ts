import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is required')
  }
  if (secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET must be at least 32 characters')
  }
  return scryptSync(secret, 'salt', KEY_LENGTH)
}

export interface EncryptedData {
  encrypted: string
  iv: string
  salt: string
}

export function encrypt(text: string): EncryptedData {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const salt = randomBytes(SALT_LENGTH)
  
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
  }
}

export function decrypt(data: EncryptedData): string {
  const key = getKey()
  const iv = Buffer.from(data.iv, 'base64')
  const combined = Buffer.from(data.encrypted, 'base64')
  
  const encrypted = combined.subarray(0, combined.length - AUTH_TAG_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])
  
  return decrypted.toString('utf8')
}
