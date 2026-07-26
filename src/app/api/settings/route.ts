import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/encryption'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('openrouter_key_encrypted, openrouter_key_iv, openrouter_key_salt')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let apiKey = ''
  if (data?.openrouter_key_encrypted) {
    try {
      apiKey = decrypt({
        encrypted: data.openrouter_key_encrypted,
        iv: data.openrouter_key_iv!,
        salt: data.openrouter_key_salt!,
      })
    } catch {
      apiKey = ''
    }
  }

  return NextResponse.json({ hasKey: !!apiKey, apiKey })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { apiKey } = await request.json()

  if (!apiKey || !apiKey.startsWith('sk-or-')) {
    return NextResponse.json({ error: 'Invalid OpenRouter API key format' }, { status: 400 })
  }

  const encrypted = encrypt(apiKey)

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      openrouter_key_encrypted: encrypted.encrypted,
      openrouter_key_iv: encrypted.iv,
      openrouter_key_salt: encrypted.salt,
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
