import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    client = createClient(url, key)
  }
  return client
}

// ---- Types ----

export interface Agent {
  id: string
  name: string
  description: string
  channel: 'whatsapp' | 'voice' | 'both'
  system_prompt: string
  skills: string[]
  config: AgentConfig
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentConfig {
  temperature: number
  max_tokens: number
  language: string
  voice_provider?: string
  voice_id?: string
  phone_number?: string
  greeting_message?: string
  fallback_message?: string
}

export interface Scenario {
  id: string
  agent_id: string
  name: string
  description: string
  messages: ScenarioMessage[]
  expected_behavior: string
  tags: string[]
  created_at: string
}

export interface ScenarioMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TestRun {
  id: string
  agent_id: string
  scenario_id: string
  model: string
  provider: string
  response: string
  score: number
  feedback: string
  passed: boolean
  created_at: string
  scenario_name?: string
}

// ---- Agents ----

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await getClient()
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Agent[]
}

export async function getAgent(id: string): Promise<Agent | null> {
  const { data, error } = await getClient()
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Agent
}

export async function createAgent(data: Omit<Agent, 'created_at' | 'updated_at'>): Promise<Agent> {
  const now = new Date().toISOString()
  const { data: row, error } = await getClient()
    .from('agents')
    .insert({ ...data, created_at: now, updated_at: now })
    .select()
    .single()
  if (error) throw error
  return row as Agent
}

export async function updateAgent(id: string, data: Partial<Agent>): Promise<Agent | null> {
  const { data: row, error } = await getClient()
    .from('agents')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return null
  return row as Agent
}

export async function deleteAgent(id: string): Promise<boolean> {
  const { error } = await getClient().from('agents').delete().eq('id', id)
  return !error
}

// ---- Scenarios ----

export async function getScenarios(agentId: string): Promise<Scenario[]> {
  const { data, error } = await getClient()
    .from('scenarios')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Scenario[]
}

export async function getScenario(id: string): Promise<Scenario | null> {
  const { data, error } = await getClient()
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Scenario
}

export async function createScenario(data: Omit<Scenario, 'created_at'>): Promise<Scenario> {
  const { data: row, error } = await getClient()
    .from('scenarios')
    .insert({ ...data, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return row as Scenario
}

export async function deleteScenario(id: string): Promise<boolean> {
  const { error } = await getClient().from('scenarios').delete().eq('id', id)
  return !error
}

// ---- Test Runs ----

export async function getTestRuns(agentId: string, limit = 100): Promise<TestRun[]> {
  const { data, error } = await getClient()
    .from('test_runs')
    .select('*, scenarios(name)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).map((r: any) => ({
    ...r,
    scenario_name: r.scenarios?.name,
    scenarios: undefined,
  })) as TestRun[]
}

export async function createTestRun(data: Omit<TestRun, 'created_at'>): Promise<TestRun> {
  const { data: row, error } = await getClient()
    .from('test_runs')
    .insert({ ...data, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return row as TestRun
}

export async function getAgentStats(agentId: string) {
  const [scenariosRes, runsRes] = await Promise.all([
    getClient().from('scenarios').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
    getClient().from('test_runs').select('score, passed').eq('agent_id', agentId),
  ])

  const totalScenarios = scenariosRes.count ?? 0
  const runs = runsRes.data ?? []
  const totalRuns = runs.length
  const passedRuns = runs.filter((r: any) => r.passed).length
  const avgScore = totalRuns ? runs.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / totalRuns : 0

  return {
    total_scenarios: totalScenarios,
    total_runs: totalRuns,
    avg_score: Math.round(avgScore * 10) / 10,
    passed_runs: passedRuns,
    failed_runs: totalRuns - passedRuns,
  }
}

export async function getDashboardStats() {
  const [agentsRes, activeRes, scenariosRes, runsRes] = await Promise.all([
    getClient().from('agents').select('id', { count: 'exact', head: true }),
    getClient().from('agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
    getClient().from('scenarios').select('id', { count: 'exact', head: true }),
    getClient().from('test_runs').select('score, passed'),
  ])

  const runs = runsRes.data ?? []
  const totalRuns = runs.length
  const passed = runs.filter((r: any) => r.passed).length
  const avgScore = totalRuns ? runs.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / totalRuns : 0

  return {
    total_agents: agentsRes.count ?? 0,
    active_agents: activeRes.count ?? 0,
    total_scenarios: scenariosRes.count ?? 0,
    total_runs: totalRuns,
    avg_score: Math.round(avgScore * 10) / 10,
    pass_rate: totalRuns ? Math.round((passed / totalRuns) * 100) : 0,
  }
}

// ---- Settings ----

export async function getSetting(key: string): Promise<string> {
  const { data } = await getClient().from('settings').select('value').eq('key', key).single()
  return data?.value ?? ''
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getClient()
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const { data } = await getClient().from('settings').select('key, value')
  return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))
}
