import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'agents.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
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
      created_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
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
      created_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS batch_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      total_scenarios INTEGER DEFAULT 0,
      passed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      avg_score REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
      ('ollama_url', 'http://localhost:11434', datetime('now')),
      ('ollama_model', 'llama3.2', datetime('now')),
      ('groq_api_key', '', datetime('now')),
      ('groq_model', 'llama-3.1-8b-instant', datetime('now')),
      ('openrouter_api_key', '', datetime('now')),
      ('openrouter_model', 'meta-llama/llama-3.1-8b-instruct:free', datetime('now')),
      ('default_provider', 'ollama', datetime('now')),
      ('vapi_api_key', '', datetime('now')),
      ('twilio_account_sid', '', datetime('now')),
      ('twilio_auth_token', '', datetime('now')),
      ('twilio_phone_number', '', datetime('now'));
  `)
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

export function getAgents(): Agent[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all() as any[]
  return rows.map(parseAgent)
}

export function getAgent(id: string): Agent | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any
  return row ? parseAgent(row) : null
}

export function createAgent(data: Omit<Agent, 'created_at' | 'updated_at'>): Agent {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO agents (id, name, description, channel, system_prompt, skills, config, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.name, data.description, data.channel,
    data.system_prompt, JSON.stringify(data.skills), JSON.stringify(data.config),
    data.is_active ? 1 : 0, now, now
  )
  return getAgent(data.id)!
}

export function updateAgent(id: string, data: Partial<Agent>): Agent | null {
  const db = getDb()
  const existing = getAgent(id)
  if (!existing) return null
  const updated = { ...existing, ...data }
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE agents SET name=?, description=?, channel=?, system_prompt=?, skills=?, config=?, is_active=?, updated_at=?
    WHERE id=?
  `).run(
    updated.name, updated.description, updated.channel, updated.system_prompt,
    JSON.stringify(updated.skills), JSON.stringify(updated.config),
    updated.is_active ? 1 : 0, now, id
  )
  return getAgent(id)
}

export function deleteAgent(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM agents WHERE id = ?').run(id)
  return result.changes > 0
}

function parseAgent(row: any): Agent {
  return {
    ...row,
    skills: JSON.parse(row.skills || '[]'),
    config: JSON.parse(row.config || '{}'),
    is_active: row.is_active === 1,
  }
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

export function getScenarios(agentId: string): Scenario[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM scenarios WHERE agent_id = ? ORDER BY created_at DESC').all(agentId) as any[]
  return rows.map(parseScenario)
}

export function getScenario(id: string): Scenario | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(id) as any
  return row ? parseScenario(row) : null
}

export function createScenario(data: Omit<Scenario, 'created_at'>): Scenario {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO scenarios (id, agent_id, name, description, messages, expected_behavior, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.agent_id, data.name, data.description,
    JSON.stringify(data.messages), data.expected_behavior, JSON.stringify(data.tags), now
  )
  return getScenario(data.id)!
}

export function deleteScenario(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM scenarios WHERE id = ?').run(id)
  return result.changes > 0
}

function parseScenario(row: any): Scenario {
  return {
    ...row,
    messages: JSON.parse(row.messages || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  }
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

export function getTestRuns(agentId: string, limit = 100): TestRun[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT tr.*, s.name as scenario_name
    FROM test_runs tr
    LEFT JOIN scenarios s ON s.id = tr.scenario_id
    WHERE tr.agent_id = ?
    ORDER BY tr.created_at DESC
    LIMIT ?
  `).all(agentId, limit) as any[]
  return rows.map(r => ({ ...r, passed: r.passed === 1 }))
}

export function createTestRun(data: Omit<TestRun, 'created_at'>): TestRun {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO test_runs (id, agent_id, scenario_id, model, provider, response, score, feedback, passed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.agent_id, data.scenario_id, data.model, data.provider,
    data.response, data.score, data.feedback, data.passed ? 1 : 0, now
  )
  return { ...data, created_at: now }
}

export function getAgentStats(agentId: string) {
  const db = getDb()
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT s.id) as total_scenarios,
      COUNT(tr.id) as total_runs,
      AVG(tr.score) as avg_score,
      SUM(CASE WHEN tr.passed = 1 THEN 1 ELSE 0 END) as passed_runs,
      SUM(CASE WHEN tr.passed = 0 THEN 1 ELSE 0 END) as failed_runs
    FROM scenarios s
    LEFT JOIN test_runs tr ON tr.scenario_id = s.id AND tr.agent_id = ?
    WHERE s.agent_id = ?
  `).get(agentId, agentId) as any
  return stats
}

export function getDashboardStats() {
  const db = getDb()
  const agents = db.prepare('SELECT COUNT(*) as count FROM agents').get() as any
  const active = db.prepare('SELECT COUNT(*) as count FROM agents WHERE is_active = 1').get() as any
  const scenarios = db.prepare('SELECT COUNT(*) as count FROM scenarios').get() as any
  const runs = db.prepare('SELECT COUNT(*) as count, AVG(score) as avg_score, SUM(passed) as passed FROM test_runs').get() as any
  return {
    total_agents: agents.count,
    active_agents: active.count,
    total_scenarios: scenarios.count,
    total_runs: runs.count || 0,
    avg_score: Math.round((runs.avg_score || 0) * 10) / 10,
    pass_rate: runs.count ? Math.round((runs.passed / runs.count) * 100) : 0,
  }
}

// ---- Settings ----

export function getSetting(key: string): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
  return row?.value || ''
}

export function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}
