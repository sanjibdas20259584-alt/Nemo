import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, EncryptedData } from '@/lib/encryption'

const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('default_model, openrouter_key_encrypted, openrouter_key_iv, openrouter_key_salt')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    defaultModel: data?.default_model || DEFAULT_MODEL,
    hasKey: !!data?.openrouter_key_encrypted,
  })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { apiKey, defaultModel } = body

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  const encrypted: EncryptedData = encrypt(apiKey)

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      openrouter_key_encrypted: encrypted.encrypted,
      openrouter_key_iv: encrypted.iv,
      openrouter_key_salt: encrypted.salt,
      default_model: defaultModel || DEFAULT_MODEL,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
