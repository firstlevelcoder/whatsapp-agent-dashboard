'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Wand2, Plus, Trash2, Play,
  MessageSquare, Phone, Zap, Bot, RefreshCw,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Download, Upload, Sparkles,
} from 'lucide-react'
import { SKILLS, SKILL_CATEGORIES } from '@/lib/skills'

interface Agent {
  id: string; name: string; description: string
  channel: string; system_prompt: string; skills: string[]
  config: any; is_active: boolean; stats?: any
}

interface Scenario {
  id: string; name: string; description: string
  messages: any[]; expected_behavior: string; tags: string[]
}

type Tab = 'builder' | 'scenarios' | 'results'

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [tab, setTab] = useState<Tab>('builder')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [form, setForm] = useState<Partial<Agent>>({})
  const [newScenario, setNewScenario] = useState(false)
  const [scenarioForm, setScenarioForm] = useState({ name: '', description: '', user_message: '', expected_behavior: '' })
  const [importing, setImporting] = useState(false)
  const [generating, setGenerating] = useState(false)

  const loadAgent = async () => {
    const res = await fetch(`/api/agents/${id}`)
    const data = await res.json()
    setAgent(data)
    setForm(data)
  }

  const loadScenarios = async () => {
    const res = await fetch(`/api/agents/${id}/scenarios`)
    const data = await res.json()
    setScenarios(data)
  }

  useEffect(() => {
    Promise.all([loadAgent(), loadScenarios()]).finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await loadAgent()
    setSaving(false)
  }

  const handleRebuildPrompt = async () => {
    setRebuilding(true)
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rebuild_prompt: true }),
    })
    const updated = await res.json()
    setAgent(updated)
    setForm(updated)
    setRebuilding(false)
  }

  const toggleSkill = (skillId: string) => {
    const skills = form.skills || []
    setForm(f => ({
      ...f,
      skills: skills.includes(skillId) ? skills.filter(s => s !== skillId) : [...skills, skillId],
    }))
  }

  const handleAddScenario = async () => {
    if (!scenarioForm.name || !scenarioForm.user_message) return
    await fetch(`/api/agents/${id}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: scenarioForm.name,
        description: scenarioForm.description,
        messages: [{ role: 'user', content: scenarioForm.user_message }],
        expected_behavior: scenarioForm.expected_behavior,
        tags: [],
      }),
    })
    setNewScenario(false)
    setScenarioForm({ name: '', description: '', user_message: '', expected_behavior: '' })
    loadScenarios()
  }

  const handleImportTemplates = async (category: string) => {
    setImporting(true)
    await fetch(`/api/agents/${id}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ import_template: true, template_category: category }),
    })
    await loadScenarios()
    setImporting(false)
  }

  const handleGenerateScenarios = async () => {
    setGenerating(true)
    await fetch(`/api/agents/${id}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_generate: true, count: 20, category: 'general' }),
    })
    await loadScenarios()
    setGenerating(false)
  }

  const handleDeleteScenario = async (scenarioId: string) => {
    await fetch(`/api/agents/${id}/scenarios?scenario_id=${scenarioId}`, { method: 'DELETE' })
    loadScenarios()
  }

  if (loading) return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="h-8 w-48 skeleton rounded-lg mb-8" />
      <div className="h-96 skeleton rounded-xl" />
    </div>
  )

  if (!agent) return (
    <div className="p-8 text-center">
      <p className="text-slate-400">Agente no encontrado</p>
      <Link href="/agents" className="text-indigo-400 hover:text-indigo-300 mt-2 block">Volver a Agentes</Link>
    </div>
  )

  const skillsByCategory = SKILL_CATEGORIES.map(cat => ({
    ...cat,
    skills: SKILLS.filter(s =>
      s.category === cat.id &&
      (s.compatible_channels.includes(form.channel as any) || s.compatible_channels.includes('both') || form.channel === 'both')
    ),
  })).filter(c => c.skills.length > 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/agents" className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{agent.name}</h1>
          <p className="text-slate-500 text-xs mt-0.5">{agent.description || 'Sin descripción'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/agents/${id}/test`}
            className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Testear
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>

      {/* Stats row */}
      {agent.stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Escenarios', value: agent.stats.total_scenarios || 0, color: 'text-indigo-400' },
            { label: 'Tests Corridos', value: agent.stats.total_runs || 0, color: 'text-blue-400' },
            { label: 'Score Promedio', value: agent.stats.avg_score ? `${Math.round(agent.stats.avg_score * 10) / 10}/10` : '—', color: 'text-amber-400' },
            { label: 'Aprobados', value: agent.stats.passed_runs || 0, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#16162a] border border-white/5 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#16162a] border border-white/5 rounded-xl p-1 mb-6">
        {([
          { id: 'builder', label: 'Builder', icon: Bot },
          { id: 'scenarios', label: `Escenarios (${scenarios.length})`, icon: MessageSquare },
          { id: 'results', label: 'Resultados', icon: CheckCircle2 },
        ] as any[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Builder */}
      {tab === 'builder' && (
        <div className="space-y-6">
          {/* Basic info */}
          <div className="bg-[#16162a] border border-white/5 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Información del Agente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Nombre</label>
                <input
                  value={form.name || ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Canal</label>
                <select
                  value={form.channel || 'whatsapp'}
                  onChange={e => setForm(f => ({ ...f, channel: e.target.value as any }))}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="voice">Voz (llamadas)</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1.5 block">Descripción</label>
                <input
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-[#16162a] border border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Skills del Agente</h3>
                <p className="text-xs text-slate-500 mt-0.5">{(form.skills || []).length} seleccionados</p>
              </div>
              <button
                onClick={handleRebuildPrompt}
                disabled={rebuilding}
                className="flex items-center gap-1.5 text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                {rebuilding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Regenerar Prompt
              </button>
            </div>
            <div className="space-y-4">
              {skillsByCategory.map(category => (
                <div key={category.id}>
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: category.color }} />
                    {category.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {category.skills.map(skill => {
                      const selected = (form.skills || []).includes(skill.id)
                      return (
                        <button
                          key={skill.id}
                          onClick={() => toggleSkill(skill.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            selected
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                              : 'bg-[#0a0a14] border-white/5 text-slate-400 hover:border-white/10'
                          }`}
                        >
                          <span className="text-lg">{skill.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{skill.name}</p>
                            <p className="text-xs text-slate-600 truncate">{skill.description.substring(0, 40)}...</p>
                          </div>
                          {selected && <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div className="bg-[#16162a] border border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">System Prompt</h3>
                <p className="text-xs text-slate-500 mt-0.5">Instrucciones completas del agente. Se genera automáticamente de los skills.</p>
              </div>
              <span className="text-xs text-slate-500">{(form.system_prompt || '').length} chars</span>
            </div>
            <textarea
              value={form.system_prompt || ''}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
              rows={16}
              className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none focus:border-indigo-500/50 resize-none prompt-editor"
              placeholder="El system prompt se generará automáticamente al seleccionar skills y hacer clic en 'Regenerar Prompt'..."
            />
          </div>
        </div>
      )}

      {/* Tab: Scenarios */}
      {tab === 'scenarios' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewScenario(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Escenario
            </button>
            <button
              onClick={() => handleImportTemplates('customer_service')}
              disabled={importing}
              className="flex items-center gap-2 bg-[#16162a] hover:bg-[#1e1e36] border border-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Importar Templates
            </button>
            <button
              onClick={handleGenerateScenarios}
              disabled={generating}
              className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generar con IA (20)
            </button>
          </div>

          {/* New scenario form */}
          {newScenario && (
            <div className="bg-[#16162a] border border-indigo-500/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Nuevo Escenario de Prueba</h3>
              <div className="space-y-3">
                <input
                  placeholder="Nombre del escenario *"
                  value={scenarioForm.name}
                  onChange={e => setScenarioForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
                <textarea
                  placeholder="Mensaje del usuario (primer turno) *"
                  value={scenarioForm.user_message}
                  onChange={e => setScenarioForm(f => ({ ...f, user_message: e.target.value }))}
                  rows={3}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
                <textarea
                  placeholder="¿Qué se espera que responda el agente? (para evaluación automática)"
                  value={scenarioForm.expected_behavior}
                  onChange={e => setScenarioForm(f => ({ ...f, expected_behavior: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddScenario}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                  <button
                    onClick={() => setNewScenario(false)}
                    className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scenarios list */}
          {scenarios.length === 0 ? (
            <div className="text-center py-16 bg-[#16162a] border border-white/5 rounded-xl">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No hay escenarios de prueba</p>
              <p className="text-slate-600 text-sm mt-1">Crea escenarios manualmente, importa templates o genera con IA</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scenarios.map(scenario => (
                <div key={scenario.id} className="bg-[#16162a] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white">{scenario.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {scenario.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="badge bg-white/5 text-slate-500 border-none text-xs">{tag}</span>
                        ))}
                      </div>
                      <button onClick={() => handleDeleteScenario(scenario.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {scenario.messages[0]?.content || 'Sin mensaje'}
                  </p>
                  {scenario.expected_behavior && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                      Esperado: {scenario.expected_behavior}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Results */}
      {tab === 'results' && (
        <div className="space-y-4">
          <ResultsView agentId={id} />
        </div>
      )}
    </div>
  )
}

function ResultsView({ agentId }: { agentId: string }) {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/test`)
      .then(r => r.json())
      .then(setRuns)
      .finally(() => setLoading(false))
  }, [agentId])

  if (loading) return <div className="h-32 skeleton rounded-xl" />

  if (runs.length === 0) return (
    <div className="text-center py-16 bg-[#16162a] border border-white/5 rounded-xl">
      <CheckCircle2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">Sin resultados de tests</p>
      <p className="text-slate-600 text-sm mt-1">Corre tests en la pestaña "Testear"</p>
      <Link
        href={`/agents/${agentId}/test`}
        className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-lg text-sm font-medium mt-4 hover:bg-amber-500/25 transition-colors"
      >
        <Play className="w-4 h-4" />
        Ir a Testing
      </Link>
    </div>
  )

  const passed = runs.filter(r => r.passed).length
  const avgScore = runs.reduce((s, r) => s + r.score, 0) / runs.length

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#16162a] border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{runs.length}</p>
          <p className="text-xs text-slate-500">Total Tests</p>
        </div>
        <div className="bg-[#16162a] border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{Math.round((passed / runs.length) * 100)}%</p>
          <p className="text-xs text-slate-500">Tasa de Éxito</p>
        </div>
        <div className="bg-[#16162a] border border-amber-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{Math.round(avgScore * 10) / 10}/10</p>
          <p className="text-xs text-slate-500">Score Promedio</p>
        </div>
      </div>

      <div className="space-y-2">
        {runs.slice(0, 50).map(run => (
          <div key={run.id} className="bg-[#16162a] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-white">{run.scenario_name || 'Escenario'}</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${run.score >= 7 ? 'text-emerald-400' : run.score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                  {run.score}/10
                </span>
                {run.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2">{run.feedback}</p>
            <p className="text-xs text-slate-600 mt-1">Modelo: {run.provider}/{run.model}</p>
          </div>
        ))}
      </div>
    </>
  )
}
