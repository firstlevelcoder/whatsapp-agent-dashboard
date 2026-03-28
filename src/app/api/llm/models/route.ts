import { NextRequest, NextResponse } from 'next/server'
import { PROVIDERS, getOllamaModels, checkOllamaHealth } from '@/lib/llm'
import { getSetting } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const checkHealth = searchParams.get('health') === 'true'

    const providersWithStatus = await Promise.all(
      PROVIDERS.map(async (provider) => {
        if (provider.id === 'ollama') {
          const baseUrl = (await getSetting('ollama_url')) || 'http://localhost:11434'
          const healthy = checkHealth ? await checkOllamaHealth(baseUrl) : false
          const installedModels = healthy ? await getOllamaModels(baseUrl) : []
          return {
            ...provider,
            available: healthy,
            models: healthy && installedModels.length
              ? installedModels.map(m => ({ id: m, name: m, context_length: 128000, free: true, installed: true }))
              : provider.models.map(m => ({ ...m, installed: false })),
          }
        }
        if (provider.id === 'groq') {
          let apiKey = process.env.GROQ_API_KEY || ''
          if (!apiKey) try { apiKey = await getSetting('groq_api_key') } catch {}
          return { ...provider, available: Boolean(apiKey), configured: Boolean(apiKey) }
        }
        if (provider.id === 'openrouter') {
          let apiKey = process.env.OPENROUTER_API_KEY || ''
          if (!apiKey) try { apiKey = await getSetting('openrouter_api_key') } catch {}
          return { ...provider, available: Boolean(apiKey), configured: Boolean(apiKey) }
        }
        return provider
      })
    )

    return NextResponse.json(providersWithStatus)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
