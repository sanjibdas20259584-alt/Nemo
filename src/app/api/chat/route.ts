import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { messages, model } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
  }

  // Get user settings with encrypted API key using service role
  const serviceSupabase = createServiceSupabaseClient()
  const { data: settings, error: settingsError } = await serviceSupabase
    .from('user_settings')
    .select('openrouter_key_encrypted, openrouter_key_iv, openrouter_key_salt, default_model')
    .eq('user_id', user.id)
    .single()

  if (settingsError || !settings?.openrouter_key_encrypted) {
    return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 400 })
  }

  // Decrypt API key
  let apiKey: string
  try {
    apiKey = decrypt({
      encrypted: settings.openrouter_key_encrypted,
      iv: settings.openrouter_key_iv,
      salt: settings.openrouter_key_salt,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 })
  }

  const selectedModel = model || settings.default_model || DEFAULT_MODEL

  // Call OpenRouter API
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Nemotron Chat',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages,
            stream: true,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `OpenRouter error: ${error}` })}\n\n`))
          controller.close()
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                return
              }
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          const lines = buffer.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch {
                  // Ignore
                }
              }
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        console.error('Stream error:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
