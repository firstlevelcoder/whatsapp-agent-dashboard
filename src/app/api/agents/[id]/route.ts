import { NextRequest, NextResponse } from 'next/server'
import { getAgent, updateAgent, deleteAgent, getAgentStats } from '@/lib/db'
import { buildSystemPrompt } from '@/lib/skills'

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const agent = getAgent(id)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const stats = getAgentStats(id)
    return NextResponse.json({ ...agent, stats })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { rebuild_prompt, custom_instructions, ...updateData } = body

    if (rebuild_prompt && updateData.skills) {
      const agent = getAgent(id)
      if (agent) {
        updateData.system_prompt = buildSystemPrompt(
          updateData.name || agent.name,
          updateData.description || agent.description,
          updateData.skills,
          custom_instructions || '',
          updateData.channel || agent.channel
        )
      }
    }

    const agent = updateAgent(id, updateData)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    return NextResponse.json(agent)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const deleted = deleteAgent(id)
    if (!deleted) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
