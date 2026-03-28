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
          const baseUrl = getSetting('ollama_url') || 'http://localhost:11434'
          const healthy = checkHealth ? await checkOllamaHealth(baseUrl) : null
          const installedModels = healthy ? await getOllamaModels(baseUrl) : []

          const models = healthy && installedModels.length
            ? installedModels.map(m => ({
                id: m,
                name: m,
                context_length: 128000,
                free: true,
                installed: true,
              }))
            : provider.models.map(m => ({ ...m, installed: false }))

          return {
            ...provider,
            available: healthy,
            models,
            installed_models: installedModels,
          }
        }

        if (provider.id === 'groq') {
          const apiKey = getSetting('groq_api_key')
          return {
            ...provider,
            available: Boolean(apiKey),
            configured: Boolean(apiKey),
          }
        }

        if (provider.id === 'openrouter') {
          const apiKey = getSetting('openrouter_api_key')
          return {
            ...provider,
            available: Boolean(apiKey),
            configured: Boolean(apiKey),
          }
        }

        return provider
      })
    )

    return NextResponse.json(providersWithStatus)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
