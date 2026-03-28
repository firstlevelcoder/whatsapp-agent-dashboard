import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAgent, getScenarios, getScenario, createTestRun, getTestRuns } from '@/lib/db'
import { chat, judgeResponse } from '@/lib/llm'

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const runs = getTestRuns(id)
    return NextResponse.json(runs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { provider, model, scenario_ids } = body

    const agent = getAgent(id)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const scenarios = scenario_ids?.length
      ? scenario_ids.map((sid: string) => getScenario(sid)).filter(Boolean)
      : getScenarios(id)

    if (!scenarios.length) {
      return NextResponse.json({ error: 'No scenarios found. Create scenarios first.' }, { status: 400 })
    }

    const results: any[] = []
    const errors: { scenario_id: string; scenario_name: string; error: string }[] = []
    let passed = 0

    const CONCURRENCY = 3
    const chunks: any[][] = []
    for (let i = 0; i < scenarios.length; i += CONCURRENCY) {
      chunks.push(scenarios.slice(i, i + CONCURRENCY))
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (scenario: any) => {
          try {
            const conversationMessages = [
              { role: 'system' as const, content: agent.system_prompt },
              ...scenario.messages.map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
            ]

            const agentResponse = await chat(conversationMessages, provider, model)

            const judgment = await judgeResponse(
              agent.system_prompt,
              scenario.messages,
              agentResponse.content,
              scenario.expected_behavior,
              provider,
              model
            )

            const testRun = createTestRun({
              id: uuidv4(),
              agent_id: id,
              scenario_id: scenario.id,
              model: agentResponse.model,
              provider: agentResponse.provider,
              response: agentResponse.content,
              score: judgment.score,
              feedback: judgment.feedback,
              passed: judgment.passed,
            })

            if (judgment.passed) passed++

            return {
              scenario_id: scenario.id,
              scenario_name: scenario.name,
              response: agentResponse.content,
              score: judgment.score,
              feedback: judgment.feedback,
              passed: judgment.passed,
              run_id: testRun.id,
            }
          } catch (e: any) {
            errors.push({ scenario_id: scenario.id, scenario_name: scenario.name, error: e.message })
            return null
          }
        })
      )

      for (const result of chunkResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
        }
      }
    }

    const avgScore = results.length
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0

    return NextResponse.json({
      total: scenarios.length,
      tested: results.length,
      passed,
      failed: results.length - passed,
      avg_score: Math.round(avgScore * 10) / 10,
      pass_rate: results.length ? Math.round((passed / results.length) * 100) : 0,
      results,
      errors,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
