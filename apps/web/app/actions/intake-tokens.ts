'use server'

import { createHmac, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const INTAKE_JWT_SECRET = process.env.INTAKE_JWT_SECRET!
const TOKEN_TTL_DAYS = 30

function hmacToken(raw: string): string {
  return createHmac('sha256', INTAKE_JWT_SECRET).update(raw).digest('hex')
}

export async function generateIntakeToken(candidateId: string): Promise<string> {
  const supabase = createAdminClient()

  // Generate random nonce — the raw token sent to the candidate
  const nonce = randomBytes(32).toString('hex')
  // Payload: candidateId|nonce
  const payload = `${candidateId}|${nonce}`
  // Store hash so even DB exposure doesn't expose valid tokens
  const tokenHash = hmacToken(payload)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS)

  const { error } = await (supabase as any).from('intake_tokens').insert({
    candidate_id: candidateId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  })

  if (error) throw new Error(`Failed to create intake token: ${error.message}`)

  // Encode payload as URL-safe base64 so we can reconstruct token_hash on validation
  return Buffer.from(payload).toString('base64url')
}

export interface ValidatedToken {
  candidateId: string
  tokenId: string
}

export async function validateIntakeToken(
  rawToken: string,
): Promise<ValidatedToken | null> {
  const supabase = createAdminClient()

  let payload: string
  try {
    payload = Buffer.from(rawToken, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const tokenHash = hmacToken(payload)

  const { data, error } = await (supabase as any)
    .from('intake_tokens')
    .select('id, candidate_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (error || !data) return null

  // Expired
  if (new Date(data.expires_at) < new Date()) return null

  // Already used
  if (data.used_at) return null

  return { candidateId: data.candidate_id, tokenId: data.id }
}

export async function markTokenUsed(tokenId: string): Promise<void> {
  const supabase = createAdminClient()
  await (supabase as any)
    .from('intake_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenId)
}
