import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAgent, createScenario } from '@/lib/db'
import { chat } from '@/lib/llm'

type Params = Promise<{ id: string }>

// Scenario categories to get diversity across 300-500 scenarios
const SCENARIO_TYPES = [
  { type: 'greeting', desc: 'saludos iniciales, primeros contactos, usuarios nuevos' },
  { type: 'complaint', desc: 'quejas, problemas con productos/servicios, clientes frustrados' },
  { type: 'pricing', desc: 'preguntas de precio, presupuesto, comparativas, descuentos' },
  { type: 'objection', desc: 'objeciones de venta, dudas antes de comprar, "necesito pensarlo"' },
  { type: 'urgent', desc: 'urgencias, emergencias, plazos límite, clientes impacientes' },
  { type: 'confused', desc: 'usuarios confusos, preguntas mal formuladas, mensajes poco claros' },
  { type: 'info', desc: 'solicitudes de información, características, cómo funciona' },
  { type: 'comparison', desc: 'comparaciones con competidores, "¿por qué ustedes y no X?"' },
  { type: 'followup', desc: 'seguimientos, conversaciones previas, "quedamos en que..."' },
  { type: 'edge', desc: 'casos límite, preguntas inesperadas, fuera de contexto, spam' },
  { type: 'angry', desc: 'clientes muy enojados, lenguaje agresivo, amenazas de irse' },
  { type: 'happy', desc: 'clientes contentos, recomendaciones, referencias, testimonios' },
  { type: 'technical', desc: 'preguntas técnicas detalladas, especificaciones, integraciones' },
  { type: 'negotiation', desc: 'negociación de precio, condiciones, términos especiales' },
  { type: 'cancel', desc: 'cancelaciones, bajas, clientes que quieren irse' },
]

function safeParseScenarios(text: string): any[] {
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
  } catch {}
  const objects: any[] = []
  const objRegex = /\{\s*"name"\s*:[^{}]*\}/g
  const matches = clean.match(objRegex) || []
  for (const m of matches) {
    try { objects.push(JSON.parse(m)) } catch {}
  }
  return objects
}

async function generateBatch(
  agentName: string,
  agentDesc: string,
  systemPromptSnippet: string,
  scenarioType: { type: string; desc: string },
  batchSize: number,
  provider: string,
  model: string
): Promise<any[]> {
  const prompt = [{
    role: 'system' as const,
    content: `Eres un experto en QA de agentes de WhatsApp. Crea escenarios de prueba realistas.
Responde SOLO con un JSON array válido, sin texto extra ni markdown.
Formato (${batchSize} objetos):
[{"name":"string","messages":[{"role":"user","content":"string"}],"expected_behavior":"string","tags":["string"]}]`,
  }, {
    role: 'user' as const,
    content: `Crea ${batchSize} escenarios de tipo "${scenarioType.desc}" para:
Agente: ${agentName} - ${agentDesc}
Contexto: ${systemPromptSnippet}

Solo JSON array.`,
  }]

  const result = await chat(prompt, provider, model)
  return safeParseScenarios(result.content)
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const body = await req.json()
  const {
    count = 100,
    provider = 'groq',
    model = 'llama-3.1-8b-instant',
  } = body

  const agent = await getAgent(id)
  if (!agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), { status: 404 })
  }

  const totalCount = Math.min(count, 500)
  const batchSize = 5
  const systemSnippet = agent.system_prompt.substring(0, 200)

  // Build job list: spread across scenario types for diversity
  const jobs: { type: (typeof SCENARIO_TYPES)[0]; count: number }[] = []
  let remaining = totalCount
  let typeIdx = 0
  while (remaining > 0) {
    const thisBatch = Math.min(batchSize, remaining)
    jobs.push({ type: SCENARIO_TYPES[typeIdx % SCENARIO_TYPES.length], count: thisBatch })
    remaining -= thisBatch
    typeIdx++
  }

  // SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'start', total: totalCount, jobs: jobs.length })

      let created = 0
      let failed = 0
      const PARALLEL = 3 // 3 concurrent calls to avoid rate limits

      for (let i = 0; i < jobs.length; i += PARALLEL) {
        const chunk = jobs.slice(i, i + PARALLEL)
        const results = await Promise.allSettled(
          chunk.map(job => generateBatch(
            agent.name, agent.description, systemSnippet,
            job.type, job.count, provider, model
          ))
        )

        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          if (result.status === 'fulfilled' && result.value.length > 0) {
            const scenarios = result.value
            // Save to Supabase
            const saved = await Promise.allSettled(
              scenarios.map(s => createScenario({
                id: uuidv4(),
                agent_id: id,
                name: s.name || `Escenario ${created + 1}`,
                description: s.description || '',
                messages: s.messages || [{ role: 'user', content: 'Hola' }],
                expected_behavior: s.expected_behavior || '',
                tags: [...(s.tags || []), chunk[j].type.type, 'bulk-generated'],
              }))
            )
            const savedOk = saved.filter(r => r.status === 'fulfilled').length
            created += savedOk
            failed += scenarios.length - savedOk
          } else {
            failed += chunk[j].count
          }

          send({
            type: 'progress',
            created,
            failed,
            total: totalCount,
            percent: Math.round((created / totalCount) * 100),
            current_type: chunk[j].type.type,
          })
        }

        // Small delay between parallel chunks to respect Groq rate limits
        if (i + PARALLEL < jobs.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      send({ type: 'done', created, failed, total: totalCount })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
