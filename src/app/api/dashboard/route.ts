import { NextResponse } from 'next/server'
import { getDashboardStats, getAgents } from '@/lib/db'

export async function GET() {
  try {
    const [stats, agents] = await Promise.all([getDashboardStats(), getAgents()])
    return NextResponse.json({ stats, recent_agents: agents.slice(0, 5) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
