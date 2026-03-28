import { getSetting } from './db'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  model: string
  provider: string
  tokens_used?: number
}

export interface LLMProvider {
  id: string
  name: string
  models: LLMModel[]
  requires_api_key: boolean
  base_url: string
  free: boolean
  notes: string
}

export interface LLMModel {
  id: string
  name: string
  context_length: number
  free: boolean
}

export const PROVIDERS: LLMProvider[] = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    requires_api_key: false,
    base_url: 'http://localhost:11434',
    free: true,
    notes: 'Completamente gratis. Requiere instalar Ollama localmente.',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2 (Meta)', context_length: 128000, free: true },
      { id: 'llama3.1', name: 'Llama 3.1 8B (Meta)', context_length: 128000, free: true },
      { id: 'mistral', name: 'Mistral 7B', context_length: 32768, free: true },
      { id: 'mixtral', name: 'Mixtral 8x7B', context_length: 32768, free: true },
      { id: 'qwen2.5', name: 'Qwen 2.5 7B (Alibaba)', context_length: 128000, free: true },
      { id: 'phi3', name: 'Phi-3 (Microsoft)', context_length: 128000, free: true },
      { id: 'gemma2', name: 'Gemma 2 (Google)', context_length: 8192, free: true },
      { id: 'deepseek-r1', name: 'DeepSeek R1', context_length: 32768, free: true },
    ],
  },
  {
    id: 'groq',
    name: 'Groq (Free Tier)',
    requires_api_key: true,
    base_url: 'https://api.groq.com/openai/v1',
    free: true,
    notes: 'Gratis con límites. 14,400 req/día. Registrarse en console.groq.com',
    models: [
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', context_length: 128000, free: true },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', context_length: 128000, free: true },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', context_length: 32768, free: true },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT (Google)', context_length: 8192, free: true },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Free Models)',
    requires_api_key: true,
    base_url: 'https://openrouter.ai/api/v1',
    free: true,
    notes: 'Gratis para modelos marcados :free. Registrarse en openrouter.ai',
    models: [
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Meta)', context_length: 128000, free: true },
      { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Google)', context_length: 8192, free: true },
      { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Microsoft)', context_length: 128000, free: true },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', context_length: 164000, free: true },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', context_length: 32768, free: true },
    ],
  },
]

export async function chat(
  messages: ChatMessage[],
  provider?: string,
  model?: string
): Promise<LLMResponse> {
  const selectedProvider = provider || (await getSetting('default_provider')) || 'ollama'

  switch (selectedProvider) {
    case 'ollama':
      return chatOllama(messages, model)
    case 'groq':
      return chatGroq(messages, model)
    case 'openrouter':
      return chatOpenRouter(messages, model)
    default:
      return chatOllama(messages, model)
  }
}

async function chatOllama(messages: ChatMessage[], model?: string): Promise<LLMResponse> {
  const baseUrl = (await getSetting('ollama_url')) || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const selectedModel = model || (await getSetting('ollama_model')) || 'llama3.2'

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      stream: false,
      options: { temperature: 0.7, num_predict: 1024 },
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return {
    content: data.message?.content || '',
    model: selectedModel,
    provider: 'ollama',
    tokens_used: data.eval_count,
  }
}

async function chatGroq(messages: ChatMessage[], model?: string): Promise<LLMResponse> {
  const apiKey = (await getSetting('groq_api_key')) || process.env.GROQ_API_KEY || ''
  const selectedModel = model || (await getSetting('groq_model')) || 'llama-3.1-8b-instant'

  if (!apiKey) throw new Error('Groq API key not configured. Get a free key at console.groq.com')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: selectedModel, messages, temperature: 0.7, max_tokens: 1024 }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Groq error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: selectedModel,
    provider: 'groq',
    tokens_used: data.usage?.total_tokens,
  }
}

async function chatOpenRouter(messages: ChatMessage[], model?: string): Promise<LLMResponse> {
  const apiKey = (await getSetting('openrouter_api_key')) || process.env.OPENROUTER_API_KEY || ''
  const selectedModel = model || (await getSetting('openrouter_model')) || 'meta-llama/llama-3.1-8b-instruct:free'

  if (!apiKey) throw new Error('OpenRouter API key not configured. Get a free key at openrouter.ai')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://whatsapp-agent-dashboard.vercel.app',
      'X-Title': 'WhatsApp Agent Dashboard',
    },
    body: JSON.stringify({ model: selectedModel, messages, temperature: 0.7, max_tokens: 1024 }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: selectedModel,
    provider: 'openrouter',
    tokens_used: data.usage?.total_tokens,
  }
}

export async function getOllamaModels(baseUrl?: string): Promise<string[]> {
  const url = baseUrl || (await getSetting('ollama_url')) || 'http://localhost:11434'
  try {
    const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return []
    const data = await response.json()
    return data.models?.map((m: any) => m.name) || []
  } catch {
    return []
  }
}

export async function checkOllamaHealth(baseUrl?: string): Promise<boolean> {
  const url = baseUrl || (await getSetting('ollama_url')) || 'http://localhost:11434'
  try {
    const response = await fetch(`${url}/api/version`, { signal: AbortSignal.timeout(3000) })
    return response.ok
  } catch {
    return false
  }
}

export async function judgeResponse(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  agentResponse: string,
  expectedBehavior: string,
  provider?: string,
  model?: string
): Promise<{ score: number; feedback: string; passed: boolean }> {
  const judgePrompt: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un evaluador experto de agentes de IA para WhatsApp. Evalúa si una respuesta cumple con el comportamiento esperado.

Responde ÚNICAMENTE en formato JSON:
{
  "score": <número del 0 al 10>,
  "feedback": "<explicación breve>",
  "passed": <true si score >= 7>
}`,
    },
    {
      role: 'user',
      content: `**System prompt:** ${systemPrompt.substring(0, 300)}...

**Conversación:**
${messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Agente'}: ${m.content}`).join('\n')}

**Respuesta del agente:**
${agentResponse}

**Comportamiento esperado:**
${expectedBehavior}

Evalúa y devuelve el JSON.`,
    },
  ]

  try {
    const result = await chat(judgePrompt, provider, model)
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        score: Math.min(10, Math.max(0, Number(parsed.score) || 0)),
        feedback: parsed.feedback || '',
        passed: Boolean(parsed.passed),
      }
    }
  } catch (e) {
    console.error('Judge error:', e)
  }

  return { score: 5, feedback: 'No se pudo evaluar automáticamente', passed: false }
}

export async function optimizePrompt(
  currentPrompt: string,
  failedTests: Array<{ scenario: string; response: string; feedback: string; expected: string }>,
  provider?: string,
  model?: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres un experto en prompt engineering para agentes de WhatsApp. Analiza los fallos y mejora el system prompt.

Devuelve ÚNICAMENTE el prompt mejorado, sin explicaciones ni formato markdown.`,
    },
    {
      role: 'user',
      content: `**System prompt actual:**
${currentPrompt}

**Pruebas fallidas:**
${failedTests.slice(0, 10).map((t, i) => `
Fallo ${i + 1}:
- Escenario: ${t.scenario}
- Respuesta del agente: ${t.response}
- Comportamiento esperado: ${t.expected}
- Feedback: ${t.feedback}
`).join('\n')}

Crea una versión mejorada del system prompt que corrija estos fallos.`,
    },
  ]

  const result = await chat(messages, provider, model)
  return result.content
}
