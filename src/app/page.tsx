'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bot, Beaker, TrendingUp, Activity,
  Plus, ArrowRight, MessageSquare, Phone,
  CheckCircle2, XCircle, Zap, Users,
} from 'lucide-react'

interface Stats {
  total_agents: number
  active_agents: number
  total_scenarios: number
  total_runs: number
  avg_score: number
  pass_rate: number
}

interface Agent {
  id: string
  name: string
  description: string
  channel: string
  is_active: boolean
  updated_at: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/agents').then(r => r.json()),
    ]).then(([dash, agentsList]) => {
      setStats(dash.stats)
      setAgents(agentsList.slice(0, 4))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona tus agentes de IA para WhatsApp y llamadas de voz</p>
        </div>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Agente
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          icon={<Bot className="w-5 h-5 text-indigo-400" />}
          label="Agentes"
          value={stats?.total_agents ?? '—'}
          color="indigo"
          loading={loading}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
          label="Activos"
          value={stats?.active_agents ?? '—'}
          color="emerald"
          loading={loading}
        />
        <StatCard
          icon={<Beaker className="w-5 h-5 text-amber-400" />}
          label="Escenarios"
          value={stats?.total_scenarios ?? '—'}
          color="amber"
          loading={loading}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
          label="Tests Corridos"
          value={stats?.total_runs ?? '—'}
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-violet-400" />}
          label="Score Promedio"
          value={stats ? `${stats.avg_score}/10` : '—'}
          color="violet"
          loading={loading}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-teal-400" />}
          label="Tasa de Éxito"
          value={stats ? `${stats.pass_rate}%` : '—'}
          color="teal"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Agents */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Agentes Recientes</h2>
            <Link href="/agents" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl skeleton" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-[#16162a] border border-white/5 rounded-xl p-12 text-center">
              <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No hay agentes todavía</p>
              <p className="text-slate-600 text-sm mt-1 mb-4">Crea tu primer agente de IA para WhatsApp</p>
              <Link
                href="/agents/new"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear Agente
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map(agent => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex items-center gap-4 bg-[#16162a] hover:bg-[#1e1e36] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    {agent.channel === 'voice' ? (
                      <Phone className="w-5 h-5 text-indigo-400" />
                    ) : agent.channel === 'both' ? (
                      <Zap className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm truncate">{agent.name}</p>
                      {agent.is_active && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{agent.description || 'Sin descripción'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ChannelBadge channel={agent.channel} />
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Start */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Inicio Rápido</h2>

          <div className="space-y-3">
            <QuickAction
              icon="🤖"
              title="Crear Agente"
              description="Configura un nuevo agente con skills"
              href="/agents/new"
              color="indigo"
            />
            <QuickAction
              icon="🧪"
              title="Testear Agente"
              description="Corre cientos de escenarios automáticos"
              href="/agents"
              color="amber"
            />
            <QuickAction
              icon="⚙️"
              title="Configurar LLM"
              description="Conecta Ollama o Groq (gratis)"
              href="/settings"
              color="emerald"
            />
          </div>

          {/* LLM Status */}
          <div className="bg-[#16162a] border border-white/5 rounded-xl p-4 mt-4">
            <p className="text-xs font-medium text-slate-400 mb-3">Modelos LLM Gratis</p>
            <div className="space-y-2">
              <LLMStatus name="Ollama (Local)" badge="100% gratis" color="emerald" />
              <LLMStatus name="Groq API" badge="14k req/día" color="blue" />
              <LLMStatus name="OpenRouter" badge="modelos :free" color="violet" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, loading }: any) {
  const colors: Record<string, string> = {
    indigo: 'border-indigo-500/20 bg-indigo-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    violet: 'border-violet-500/20 bg-violet-500/5',
    teal: 'border-teal-500/20 bg-teal-500/5',
  }

  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.indigo}`}>
      <div className="mb-2">{icon}</div>
      {loading ? (
        <div className="h-7 w-16 skeleton rounded-lg mb-1" />
      ) : (
        <p className="text-2xl font-bold text-white">{value}</p>
      )}
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function ChannelBadge({ channel }: { channel: string }) {
  const config = {
    whatsapp: { label: 'WhatsApp', class: 'bg-emerald-500/15 text-emerald-400' },
    voice: { label: 'Voz', class: 'bg-violet-500/15 text-violet-400' },
    both: { label: 'WA + Voz', class: 'bg-indigo-500/15 text-indigo-400' },
  }
  const c = config[channel as keyof typeof config] || config.whatsapp
  return (
    <span className={`badge text-xs ${c.class}`}>{c.label}</span>
  )
}

function QuickAction({ icon, title, description, href, color }: any) {
  const colors: Record<string, string> = {
    indigo: 'hover:border-indigo-500/30 hover:bg-indigo-500/5',
    amber: 'hover:border-amber-500/30 hover:bg-amber-500/5',
    emerald: 'hover:border-emerald-500/30 hover:bg-emerald-500/5',
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 bg-[#16162a] border border-white/5 rounded-xl p-3.5 transition-all ${colors[color]}`}
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-600 ml-auto" />
    </Link>
  )
}

function LLMStatus({ name, badge, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
    violet: 'bg-violet-500/15 text-violet-400',
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{name}</span>
      <span className={`badge text-xs ${colors[color]}`}>{badge}</span>
    </div>
  )
}
