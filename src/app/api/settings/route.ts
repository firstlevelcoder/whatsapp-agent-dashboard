import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, setSetting } from '@/lib/db'
import { checkOllamaHealth, getOllamaModels } from '@/lib/llm'

export async function GET() {
  try {
    const settings = getAllSettings()
    // Mask sensitive keys
    const masked = { ...settings }
    if (masked.groq_api_key) masked.groq_api_key = masked.groq_api_key.substring(0, 8) + '...'
    if (masked.openrouter_api_key) masked.openrouter_api_key = masked.openrouter_api_key.substring(0, 8) + '...'
    if (masked.vapi_api_key) masked.vapi_api_key = masked.vapi_api_key.substring(0, 8) + '...'
    if (masked.twilio_auth_token) masked.twilio_auth_token = '***'
    return NextResponse.json(masked)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const allowedKeys = [
      'ollama_url', 'ollama_model',
      'groq_api_key', 'groq_model',
      'openrouter_api_key', 'openrouter_model',
      'default_provider',
      'vapi_api_key',
      'twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number',
    ]

    for (const [key, value] of Object.entries(body)) {
      if (allowedKeys.includes(key) && typeof value === 'string') {
        // Don't overwrite with masked values
        if (value.includes('...') || value === '***') continue
        setSetting(key, value)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, provider, url } = await req.json()

    if (action === 'test_ollama') {
      const baseUrl = url || 'http://localhost:11434'
      const healthy = await checkOllamaHealth(baseUrl)
      const models = healthy ? await getOllamaModels(baseUrl) : []
      return NextResponse.json({ healthy, models, url: baseUrl })
    }

    if (action === 'test_groq') {
      const { getSetting } = await import('@/lib/db')
      const apiKey = getSetting('groq_api_key')
      if (!apiKey) return NextResponse.json({ error: 'No API key configured' }, { status: 400 })

      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      return NextResponse.json({ healthy: response.ok, status: response.status })
    }

    if (action === 'test_openrouter') {
      const { getSetting } = await import('@/lib/db')
      const apiKey = getSetting('openrouter_api_key')
      if (!apiKey) return NextResponse.json({ error: 'No API key configured' }, { status: 400 })

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      return NextResponse.json({ healthy: response.ok, status: response.status })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
