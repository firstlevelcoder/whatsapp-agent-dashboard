import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getScenarios, createScenario, deleteScenario, getAgent } from '@/lib/db'
import { SCENARIO_TEMPLATES } from '@/lib/skills'
import { chat } from '@/lib/llm'

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const scenarios = getScenarios(id)
    return NextResponse.json(scenarios)
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
      const created = templates.map(t =>
        createScenario({
          id: uuidv4(),
          agent_id: id,
          name: t.name,
          description: t.description,
          messages: t.messages,
          expected_behavior: t.expected_behavior,
          tags: t.tags,
        })
      )
      return NextResponse.json({ created: created.length, scenarios: created })
    }

    if (body.ai_generate) {
      const agent = getAgent(id)
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

      const count = Math.min(body.count || 10, 50)
      const category = body.category || 'general'

      const generationPrompt = [{
        role: 'system' as const,
        content: `Eres un experto en testing de agentes de IA para WhatsApp. Crea escenarios de prueba realistas y diversos.

Responde ÚNICAMENTE con un JSON array con esta estructura exacta:
[
  {
    "name": "Nombre del escenario",
    "description": "Descripción breve",
    "messages": [{"role": "user", "content": "Mensaje del usuario"}],
    "expected_behavior": "Descripción de qué debe hacer el agente",
    "tags": ["tag1", "tag2"]
  }
]`,
      }, {
        role: 'user' as const,
        content: `Crea ${count} escenarios de prueba para este agente de WhatsApp:

Nombre: ${agent.name}
Descripción: ${agent.description}
System prompt: ${agent.system_prompt.substring(0, 500)}...
Categoría de pruebas: ${category}

Los escenarios deben:
1. Cubrir casos de éxito, fallos y casos límite
2. Incluir conversaciones simples y multi-turno
3. Ser realistas para un negocio real
4. Variar en complejidad (fácil, medio, difícil)
5. Incluir diferentes tipos de usuarios (amigable, difícil, confuso, urgente)`,
      }]

      try {
        const result = await chat(generationPrompt, body.provider, body.model)
        const jsonMatch = result.content.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error('Invalid AI response format')

        const scenariosData = JSON.parse(jsonMatch[0])
        const created = scenariosData.map((s: any) =>
          createScenario({
            id: uuidv4(),
            agent_id: id,
            name: s.name || 'Escenario generado',
            description: s.description || '',
            messages: s.messages || [],
            expected_behavior: s.expected_behavior || '',
            tags: [...(s.tags || []), 'ai-generated'],
          })
        )
        return NextResponse.json({ created: created.length, scenarios: created })
      } catch (e: any) {
        return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 })
      }
    }

    const { name, description = '', messages = [], expected_behavior = '', tags = [] } = body
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const scenario = createScenario({
      id: uuidv4(),
      agent_id: id,
      name,
      description,
      messages,
      expected_behavior,
      tags,
    })

    return NextResponse.json(scenario, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { searchParams } = new URL(req.url)
    const scenarioId = searchParams.get('scenario_id')
    if (!scenarioId) return NextResponse.json({ error: 'scenario_id required' }, { status: 400 })

    const deleted = deleteScenario(scenarioId)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
