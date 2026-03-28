import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getScenarios, createScenario, deleteScenario, getAgent } from '@/lib/db'
import { SCENARIO_TEMPLATES } from '@/lib/skills'
import { chat } from '@/lib/llm'

type Params = Promise<{ id: string }>

// Robust JSON parser — extracts as many valid scenario objects as possible
function safeParseScenarios(text: string): any[] {
  // Remove markdown code blocks if present
  const clean = text.replace(/```json|```/g, '').trim()

  // Try full parse first
  try {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
  } catch {}

  // Extract individual objects with regex as fallback
  const objects: any[] = []
  const objRegex = /\{[^{}]*"name"\s*:\s*"[^"]*"[^{}]*\}/g
  const matches = clean.match(objRegex) || []
  for (const m of matches) {
    try { objects.push(JSON.parse(m)) } catch {}
  }

  // Last resort: try to fix truncated JSON by closing it
  if (objects.length === 0) {
    try {
      const idx = clean.lastIndexOf('{"name"')
      const truncated = idx > 0 ? clean.substring(0, idx).replace(/,\s*$/, '') + ']' : ''
      if (truncated) return JSON.parse(truncated)
    } catch {}
  }

  return objects
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    return NextResponse.json(await getScenarios(id))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const body = await req.json()

    if (body.import_template) {
      const templates = SCENARIO_TEMPLATES[body.template_category as keyof typeof SCENARIO_TEMPLATES] || []
      const created = await Promise.all(templates.map(t =>
        createScenario({ id: uuidv4(), agent_id: id, name: t.name, description: t.description,
          messages: t.messages, expected_behavior: t.expected_behavior, tags: t.tags })
      ))
      return NextResponse.json({ created: created.length, scenarios: created })
    }

    if (body.ai_generate) {
      const agent = await getAgent(id)
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

      // Generate in batches of 5 to avoid truncated JSON
      const count = Math.min(body.count || 10, 30)
      const batchSize = 5
      const batches = Math.ceil(count / batchSize)
      const allCreated: any[] = []

      for (let b = 0; b < batches; b++) {
        const batchCount = Math.min(batchSize, count - b * batchSize)
        const generationPrompt = [{
          role: 'system' as const,
          content: `Eres un experto en testing de agentes de IA para WhatsApp. Crea escenarios de prueba.

IMPORTANTE: Responde SOLO con un JSON array válido, sin texto adicional, sin markdown, sin explicaciones.
Formato exacto (${batchCount} objetos):
[{"name":"string","description":"string","messages":[{"role":"user","content":"string"}],"expected_behavior":"string","tags":["string"]}]`,
        }, {
          role: 'user' as const,
          content: `Crea exactamente ${batchCount} escenarios de prueba para este agente:
Nombre: ${agent.name}
Descripción: ${agent.description}
Prompt: ${agent.system_prompt.substring(0, 300)}

Varía los escenarios: saludo inicial, queja, consulta de precio, usuario frustrado, pregunta inesperada.
Solo el JSON array, nada más.`,
        }]

        try {
          const result = await chat(generationPrompt, body.provider, body.model)
          const parsed = safeParseScenarios(result.content)
          const created = await Promise.all(parsed.map((s: any) =>
            createScenario({
              id: uuidv4(), agent_id: id,
              name: s.name || `Escenario ${allCreated.length + 1}`,
              description: s.description || '',
              messages: s.messages || [{ role: 'user', content: 'Hola' }],
              expected_behavior: s.expected_behavior || '',
              tags: [...(s.tags || []), 'ai-generated'],
            })
          ))
          allCreated.push(...created)
        } catch (e: any) {
          console.error(`Batch ${b} failed:`, e.message)
        }
      }

      if (allCreated.length === 0) {
        return NextResponse.json({ error: 'No se pudieron generar escenarios. Intenta con menos cantidad.' }, { status: 500 })
      }
      return NextResponse.json({ created: allCreated.length, scenarios: allCreated })
    }

    const { name, description = '', messages = [], expected_behavior = '', tags = [] } = body
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const scenario = await createScenario({ id: uuidv4(), agent_id: id, name, description, messages, expected_behavior, tags })
    return NextResponse.json(scenario, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const scenarioId = searchParams.get('scenario_id')
    if (!scenarioId) return NextResponse.json({ error: 'scenario_id required' }, { status: 400 })
    return NextResponse.json({ success: await deleteScenario(scenarioId) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
