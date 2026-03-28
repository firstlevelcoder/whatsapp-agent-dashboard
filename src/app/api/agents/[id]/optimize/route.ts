import { NextRequest, NextResponse } from 'next/server'
import { getAgent, getTestRuns, getScenario, updateAgent } from '@/lib/db'
import { optimizePrompt } from '@/lib/llm'

type Params = Promise<{ id: string }>

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { provider, model, apply = false } = body

    const agent = getAgent(id)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const allRuns = getTestRuns(id, 200)
    const failedRuns = allRuns.filter(r => !r.passed).slice(0, 20)

    if (failedRuns.length === 0) {
      return NextResponse.json({
        message: 'No failed tests found. Run some tests first or your agent is already performing well!',
        current_prompt: agent.system_prompt,
        improved_prompt: null,
        improvements_count: 0,
      })
    }

    const failedTests = failedRuns.map(run => {
      const scenario = getScenario(run.scenario_id)
      return {
        scenario: scenario?.name || 'Unknown scenario',
        response: run.response,
        feedback: run.feedback,
        expected: scenario?.expected_behavior || '',
      }
    })

    const improvedPrompt = await optimizePrompt(
      agent.system_prompt,
      failedTests,
      provider,
      model
    )

    if (apply && improvedPrompt) {
      updateAgent(id, { system_prompt: improvedPrompt })
    }

    return NextResponse.json({
      message: apply
        ? `Prompt optimizado y aplicado. Se analizaron ${failedRuns.length} pruebas fallidas.`
        : `Optimización generada. Se analizaron ${failedRuns.length} pruebas fallidas.`,
      current_prompt: agent.system_prompt,
      improved_prompt: improvedPrompt,
      improvements_count: failedRuns.length,
      applied: apply,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
