'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { ApiKeyForm } from './ApiKeyForm'

const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'

interface SettingsData {
  hasKey: boolean
  defaultModel: string
}

export function SettingsModal({ isOpen, onClose, onModelChange }: { 
  isOpen: boolean
  onClose: () => void
  onModelChange: (model: string) => void
}) {
  const [settings, setSettings] = useState<SettingsData>({ hasKey: false, defaultModel: DEFAULT_MODEL })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'api' | 'model'>('api')
  const supabase = createBrowserClient()

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({ hasKey: data.hasKey, defaultModel: data.defaultModel || DEFAULT_MODEL })
      }
    } catch {
      setSettings({ hasKey: false, defaultModel: DEFAULT_MODEL })
    } finally {
      setLoading(false)
    }
  }

  const handleKeySaved = () => {
    setSettings((prev) => ({ ...prev, hasKey: true }))
    loadSettings()
  }

  const handleModelSave = async (model: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_model: model }),
      })
      if (res.ok) {
        setSettings((prev) => ({ ...prev, defaultModel: model }))
        onModelChange(model)
      }
    } catch {
      // Error handled silently
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-[hsl(var(--background))] rounded-lg border border-[hsl(var(--border))] shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[hsl(var(--muted))] transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : (
          <div className="p-4">
            <div className="flex border-b border-[hsl(var(--border))] mb-4">
              <button
                onClick={() => setActiveTab('api')}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'api'
                    ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                API Key
              </button>
              <button
                onClick={() => setActiveTab('model')}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'model'
                    ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                Model
              </button>
            </div>

            {activeTab === 'api' && (
              <ApiKeyForm hasKey={settings.hasKey} onSave={handleKeySaved} />
            )}

            {activeTab === 'model' && (
              <div className="space-y-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Select the default model for new conversations. Your API key must have access to the selected model.
                </p>
                <div className="space-y-2">
                  {[
                    'nvidia/nemotron-3-ultra-550b-a55b:free',
                    'nvidia/nemotron-3-ultra-550b-a55b',
                    'openai/gpt-4o',
                    'anthropic/claude-3.5-sonnet',
                    'google/gemini-pro-1.5',
                  ].map((model) => (
                    <button
                      key={model}
                      onClick={() => handleModelSave(model)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        settings.defaultModel === model
                          ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))/0.1]'
                          : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                      }`}
                    >
                      <div className="font-medium">{model}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {model.includes('free') ? 'Free tier' : 'Paid'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
