import { createClient, type Client } from '@libsql/client'

// Local dev:  TURSO_DATABASE_URL=file:./data/agents.db
// Production: TURSO_DATABASE_URL=libsql://your-db.turso.io  + TURSO_AUTH_TOKEN=...
let client: Client | null = null

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || 'file:./data/agents.db'
    const authToken = process.env.TURSO_AUTH_TOKEN
    client = createClient({ url, authToken })
  }
  return client
}

export async function initDb() {
  const db = getClient()
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      channel TEXT DEFAULT 'whatsapp',
      system_prompt TEXT DEFAULT '',
      skills TEXT DEFAULT '[]',
      config TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      messages TEXT NOT NULL DEFAULT '[]',
      expected_behavior TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      response TEXT DEFAULT '',
      score REAL DEFAULT 0,
      feedback TEXT DEFAULT '',
      passed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  // Default settings (ignore conflicts)
  const defaults = [
    ['ollama_url', 'http://localhost:11434'],
    ['ollama_model', 'llama3.2'],
    ['groq_api_key', ''],
    ['groq_model', 'llama-3.1-8b-instant'],
    ['openrouter_api_key', ''],
    ['openrouter_model', 'meta-llama/llama-3.1-8b-instruct:free'],
    ['default_provider', 'ollama'],
    ['vapi_api_key', ''],
    ['twilio_account_sid', ''],
    ['twilio_auth_token', ''],
    ['twilio_phone_number', ''],
  ]
  for (const [key, value] of defaults) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      args: [key, value],
    })
  }
}

// ---- Agents ----

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

function parseAgent(row: any): Agent {
  return {
    ...row,
    skills: JSON.parse(row.skills || '[]'),
    config: JSON.parse(row.config || '{}'),
    is_active: row.is_active === 1 || row.is_active === true,
  }
}

function parseScenario(row: any): Scenario {
  return {
    ...row,
    messages: JSON.parse(row.messages || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  }
}

export async function getAgents(): Promise<Agent[]> {
  await initDb()
  const db = getClient()
  const result = await db.execute('SELECT * FROM agents ORDER BY created_at DESC')
  return result.rows.map(parseAgent)
}

export async function getAgent(id: string): Promise<Agent | null> {
  await initDb()
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT * FROM agents WHERE id = ?', args: [id] })
  return result.rows[0] ? parseAgent(result.rows[0]) : null
}

export async function createAgent(data: Omit<Agent, 'created_at' | 'updated_at'>): Promise<Agent> {
  await initDb()
  const db = getClient()
  const now = new Date().toISOString()
  await db.execute({
    sql: `INSERT INTO agents (id, name, description, channel, system_prompt, skills, config, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id, data.name, data.description, data.channel,
      data.system_prompt, JSON.stringify(data.skills), JSON.stringify(data.config),
      data.is_active ? 1 : 0, now, now,
    ],
  })
  return (await getAgent(data.id))!
}

export async function updateAgent(id: string, data: Partial<Agent>): Promise<Agent | null> {
  const existing = await getAgent(id)
  if (!existing) return null
  const updated = { ...existing, ...data }
  const now = new Date().toISOString()
  const db = getClient()
  await db.execute({
    sql: `UPDATE agents SET name=?, description=?, channel=?, system_prompt=?, skills=?, config=?, is_active=?, updated_at=? WHERE id=?`,
    args: [
      updated.name, updated.description, updated.channel, updated.system_prompt,
      JSON.stringify(updated.skills), JSON.stringify(updated.config),
      updated.is_active ? 1 : 0, now, id,
    ],
  })
  return getAgent(id)
}

export async function deleteAgent(id: string): Promise<boolean> {
  const db = getClient()
  const result = await db.execute({ sql: 'DELETE FROM agents WHERE id = ?', args: [id] })
  return (result.rowsAffected ?? 0) > 0
}

// ---- Scenarios ----

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

export async function getScenarios(agentId: string): Promise<Scenario[]> {
  await initDb()
  const db = getClient()
  const result = await db.execute({
    sql: 'SELECT * FROM scenarios WHERE agent_id = ? ORDER BY created_at DESC',
    args: [agentId],
  })
  return result.rows.map(parseScenario)
}

export async function getScenario(id: string): Promise<Scenario | null> {
  await initDb()
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT * FROM scenarios WHERE id = ?', args: [id] })
  return result.rows[0] ? parseScenario(result.rows[0]) : null
}

export async function createScenario(data: Omit<Scenario, 'created_at'>): Promise<Scenario> {
  await initDb()
  const db = getClient()
  const now = new Date().toISOString()
  await db.execute({
    sql: `INSERT INTO scenarios (id, agent_id, name, description, messages, expected_behavior, tags, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.id, data.agent_id, data.name, data.description,
           JSON.stringify(data.messages), data.expected_behavior, JSON.stringify(data.tags), now],
  })
  return (await getScenario(data.id))!
}

export async function deleteScenario(id: string): Promise<boolean> {
  const db = getClient()
  const result = await db.execute({ sql: 'DELETE FROM scenarios WHERE id = ?', args: [id] })
  return (result.rowsAffected ?? 0) > 0
}

// ---- Test Runs ----

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

export async function getTestRuns(agentId: string, limit = 100): Promise<TestRun[]> {
  await initDb()
  const db = getClient()
  const result = await db.execute({
    sql: `SELECT tr.*, s.name as scenario_name
          FROM test_runs tr
          LEFT JOIN scenarios s ON s.id = tr.scenario_id
          WHERE tr.agent_id = ?
          ORDER BY tr.created_at DESC
          LIMIT ?`,
    args: [agentId, limit],
  })
  return result.rows.map(r => {
    const row = r as any
    return { ...row, passed: row.passed === 1 || row.passed === true } as TestRun
  })
}

export async function createTestRun(data: Omit<TestRun, 'created_at'>): Promise<TestRun> {
  await initDb()
  const db = getClient()
  const now = new Date().toISOString()
  await db.execute({
    sql: `INSERT INTO test_runs (id, agent_id, scenario_id, model, provider, response, score, feedback, passed, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.id, data.agent_id, data.scenario_id, data.model, data.provider,
           data.response, data.score, data.feedback, data.passed ? 1 : 0, now],
  })
  return { ...data, created_at: now }
}

export async function getAgentStats(agentId: string) {
  await initDb()
  const db = getClient()
  const result = await db.execute({
    sql: `SELECT
            COUNT(DISTINCT s.id) as total_scenarios,
            COUNT(tr.id) as total_runs,
            AVG(tr.score) as avg_score,
            SUM(CASE WHEN tr.passed = 1 THEN 1 ELSE 0 END) as passed_runs,
            SUM(CASE WHEN tr.passed = 0 THEN 1 ELSE 0 END) as failed_runs
          FROM scenarios s
          LEFT JOIN test_runs tr ON tr.scenario_id = s.id AND tr.agent_id = ?
          WHERE s.agent_id = ?`,
    args: [agentId, agentId],
  })
  return result.rows[0] || {}
}

export async function getDashboardStats() {
  await initDb()
  const db = getClient()
  const [agents, active, scenarios, runs] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM agents'),
    db.execute('SELECT COUNT(*) as count FROM agents WHERE is_active = 1'),
    db.execute('SELECT COUNT(*) as count FROM scenarios'),
    db.execute('SELECT COUNT(*) as count, AVG(score) as avg_score, SUM(passed) as passed FROM test_runs'),
  ])
  const r = runs.rows[0] as any
  return {
    total_agents: (agents.rows[0] as any).count,
    active_agents: (active.rows[0] as any).count,
    total_scenarios: (scenarios.rows[0] as any).count,
    total_runs: r.count || 0,
    avg_score: Math.round(((r.avg_score as number) || 0) * 10) / 10,
    pass_rate: r.count ? Math.round(((r.passed as number) / (r.count as number)) * 100) : 0,
  }
}

// ---- Settings ----

export async function getSetting(key: string): Promise<string> {
  await initDb()
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] })
  return (result.rows[0] as any)?.value || ''
}

export async function setSetting(key: string, value: string): Promise<void> {
  await initDb()
  const db = getClient()
  await db.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, value],
  })
}

export async function getAllSettings(): Promise<Record<string, string>> {
  await initDb()
  const db = getClient()
  const result = await db.execute('SELECT key, value FROM settings')
  return Object.fromEntries(result.rows.map((r: any) => [r.key, r.value]))
}
