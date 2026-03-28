import { NextResponse } from 'next/server'
import { getDashboardStats, getAgents, getTestRuns } from '@/lib/db'

export async function GET() {
  try {
    const stats = getDashboardStats()
    const agents = getAgents().slice(0, 5)

    // Recent test activity (last 20 runs across all agents)
    const recentActivity: any[] = []

    return NextResponse.json({
      stats,
      recent_agents: agents,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
