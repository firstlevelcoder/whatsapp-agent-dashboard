import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, setSetting } from '@/lib/db'
import { checkOllamaHealth, getOllamaModels } from '@/lib/llm'

// Env var takes priority over DB for sensitive keys
function resolveKey(dbValue: string | undefined, envVar: string): string {
  return process.env[envVar] || dbValue || ''
}

export async function GET() {
  try {
    let settings: Record<string, string> = {}
    try {
      settings = await getAllSettings()
    } catch {
      // Supabase might not be configured yet — return env-based defaults
    }

    // Merge env vars on top of DB values
    const merged = {
      ollama_url: settings.ollama_url || 'http://localhost:11434',
      ollama_model: settings.ollama_model || 'llama3.2',
      groq_api_key: resolveKey(settings.groq_api_key, 'GROQ_API_KEY'),
      groq_model: settings.groq_model || 'llama-3.1-8b-instant',
      openrouter_api_key: resolveKey(settings.openrouter_api_key, 'OPENROUTER_API_KEY'),
      openrouter_model: settings.openrouter_model || 'meta-llama/llama-3.1-8b-instruct:free',
      default_provider: resolveKey(settings.default_provider, 'DEFAULT_LLM_PROVIDER') || 'groq',
      vapi_api_key: resolveKey(settings.vapi_api_key, 'VAPI_API_KEY'),
      twilio_account_sid: settings.twilio_account_sid || '',
      twilio_auth_token: settings.twilio_auth_token || '',
      twilio_phone_number: settings.twilio_phone_number || '',
    }

    // Mask sensitive values before sending to browser
    const masked = { ...merged }
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
    const allowed = [
      'ollama_url', 'ollama_model', 'groq_api_key', 'groq_model',
      'openrouter_api_key', 'openrouter_model', 'default_provider',
      'vapi_api_key', 'twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number',
    ]
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key) && typeof value === 'string') {
        if (value.includes('...') || value === '***' || value === '') continue
        try { await setSetting(key, value) } catch { /* Supabase not configured */ }
      }
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, url } = await req.json()

    if (action === 'test_ollama') {
      const baseUrl = url || 'http://localhost:11434'
      const healthy = await checkOllamaHealth(baseUrl)
      const models = healthy ? await getOllamaModels(baseUrl) : []
      return NextResponse.json({ healthy, models, url: baseUrl })
    }

    if (action === 'test_groq') {
      // Check env var first, then DB
      let apiKey = process.env.GROQ_API_KEY || ''
      if (!apiKey) {
        try {
          const { getSetting } = await import('@/lib/db')
          apiKey = await getSetting('groq_api_key')
        } catch {}
      }
      if (!apiKey) return NextResponse.json({ error: 'No API key configured. Add GROQ_API_KEY in Vercel env vars.' }, { status: 400 })
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      return NextResponse.json({ healthy: response.ok, status: response.status })
    }

    if (action === 'test_openrouter') {
      let apiKey = process.env.OPENROUTER_API_KEY || ''
      if (!apiKey) {
        try {
          const { getSetting } = await import('@/lib/db')
          apiKey = await getSetting('openrouter_api_key')
        } catch {}
      }
      if (!apiKey) return NextResponse.json({ error: 'No API key configured. Add OPENROUTER_API_KEY in Vercel env vars.' }, { status: 400 })
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
