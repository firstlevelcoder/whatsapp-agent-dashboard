import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAgents, createAgent } from '@/lib/db'
import { buildSystemPrompt } from '@/lib/skills'

export async function GET() {
  try {
    const agents = getAgents()
    return NextResponse.json(agents)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      description = '',
      channel = 'whatsapp',
      skills = [],
      config = {},
      custom_instructions = '',
      use_template_prompt = false,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const defaultConfig = {
      temperature: 0.7,
      max_tokens: 1024,
      language: 'es',
      greeting_message: '',
      fallback_message: 'Lo siento, no pude entender tu mensaje. ¿Puedes reformularlo?',
      ...config,
    }

    // Auto-generate system prompt from skills if requested
    let system_prompt = body.system_prompt || ''
    if (use_template_prompt || (!system_prompt && skills.length > 0)) {
      system_prompt = buildSystemPrompt(name, description, skills, custom_instructions, channel)
    }

    const agent = createAgent({
      id: uuidv4(),
      name,
      description,
      channel,
      system_prompt,
      skills,
      config: defaultConfig,
      is_active: false,
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
