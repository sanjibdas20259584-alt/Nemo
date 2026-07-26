'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

export interface ApiKeyFormProps {
  hasKey: boolean
  onSave: () => void
}

export function ApiKeyForm({ hasKey, onSave }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const supabase = createBrowserClient()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openrouter_key: apiKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save API key')
      }

      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openrouter_key: apiKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update API key')
      }

      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={hasKey ? handleUpdate : handleSave} className="space-y-4">
      <div>
        <label htmlFor="api-key" className="block text-sm font-medium mb-2">
          OpenRouter API Key
        </label>
        <div className="relative">
          <input
            id="api-key"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full px-3 py-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent pr-10"
            disabled={saving}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3 animate-fade-in">
          {error}
        </div>
      )}

      <div className="text-sm text-[hsl(var(--muted-foreground))]">
        Get your API key from{' '}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[hsl(var(--accent))] hover:underline"
        >
          OpenRouter Keys
        </a>
      </div>

      <button
        type="submit"
        disabled={!apiKey.trim() || saving}
        className="w-full px-4 py-2 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-medium rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving...' : hasKey ? 'Update Key' : 'Save Key'}
      </button>

      {hasKey && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
          Your API key is encrypted and stored securely. It is never sent to the client.
        </p>
      )}
    </form>
  )
}
