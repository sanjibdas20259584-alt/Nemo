'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function ChatInterface({ model }: { model: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streaming, scrollToBottom])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || streaming) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setStreaming(true)
    setError('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model,
          stream: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Chat request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantMessage = ''
      
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              setStreaming(false)
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantMessage += parsed.content
                setMessages((prev) => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage }
                  return newMessages
                })
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full px-4">
      <div className="flex-1 overflow-y-auto space-y-6 py-6 pr-2">
        {messages.length === 0 && (
          <div className="text-center text-[hsl(var(--muted-foreground))] py-12">
            <p className="text-lg font-medium mb-2">Welcome to Nemotron Chat</p>
            <p className="text-sm">
              Start a conversation with NVIDIA Nemotron 3 Ultra
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                message.role === 'user'
                  ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
              }`}
            >
              {message.role === 'user' ? 'U' : 'N'}
            </div>
            <div
              className={`max-w-[80%] prose prose-sm dark:prose-invert ${
                message.role === 'user' ? 'text-right' : ''
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-sm font-medium text-[hsl(var(--muted-foreground))]">
              N
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-[80%]">
              <p className="whitespace-pre-wrap">
                <span className="inline-block w-4 h-4 bg-current opacity-50 rounded animate-pulse" aria-hidden="true"></span>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3 animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-[hsl(var(--border))] p-4 bg-[hsl(var(--background))]">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'Waiting for response...' : 'Message Nemotron...'}
            disabled={streaming}
            rows={1}
            className="flex-1 min-h-[44px] max-h-32 px-4 py-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent resize-none transition-colors"
            style={{ overflowY: 'hidden' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 px-6 py-3 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 text-center">
          Model: {model} • Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  )
}
