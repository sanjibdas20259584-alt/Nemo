export interface UserSettings {
  id: string
  user_id: string
  openrouter_key_encrypted: string | null
  openrouter_key_iv: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  model?: string
  stream?: boolean
}

export interface ChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta?: { content?: string }
    message?: { role: string; content: string }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  content: string
  done: boolean
  usage?: ChatResponse['usage']
}

export interface User {
  id: string
  email: string
  created_at: string
}
