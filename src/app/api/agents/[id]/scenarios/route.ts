import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getScenarios, createScenario, deleteScenario, getAgent } from '@/lib/db'
import { SCENARIO_TEMPLATES } from '@/lib/skills'
import { chat } from '@/lib/llm'

type Params = Promise<{ id: string }>

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

      const count = Math.min(body.count || 10, 50)
      const generationPrompt = [{
        role: 'system' as const,
        content: `Eres un experto en testing de agentes de IA. Crea escenarios de prueba realistas.

Responde ÚNICAMENTE con un JSON array:
[{"name":"...","description":"...","messages":[{"role":"user","content":"..."}],"expected_behavior":"...","tags":["..."]}]`,
      }, {
        role: 'user' as const,
        content: `Crea ${count} escenarios para este agente:
Nombre: ${agent.name}
Descripción: ${agent.description}
Prompt: ${agent.system_prompt.substring(0, 400)}...

Incluye: casos fáciles, difíciles, usuarios frustrados, preguntas inesperadas, multi-turno.`,
      }]

      try {
        const result = await chat(generationPrompt, body.provider, body.model)
        const jsonMatch = result.content.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error('Invalid AI response format')
        const data = JSON.parse(jsonMatch[0])
        const created = await Promise.all(data.map((s: any) =>
          createScenario({ id: uuidv4(), agent_id: id, name: s.name || 'Escenario', description: s.description || '',
            messages: s.messages || [], expected_behavior: s.expected_behavior || '',
            tags: [...(s.tags || []), 'ai-generated'] })
        ))
        return NextResponse.json({ created: created.length, scenarios: created })
      } catch (e: any) {
        return NextResponse.json({ error: `AI generation failed: ${e.message}` }, { status: 500 })
      }
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
