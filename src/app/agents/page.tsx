'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bot, Plus, MessageSquare, Phone, Zap,
  Trash2, Play, Edit3, MoreVertical,
  Activity, Search, Filter,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string
  channel: 'whatsapp' | 'voice' | 'both'
  skills: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'voice' | 'both'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () =>
    fetch('/api/agents').then(r => r.json()).then(setAgents).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const filtered = agents.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.channel === filter
    return matchSearch && matchFilter
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el agente "${name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    await load()
    setDeleting(null)
  }

  const handleToggleActive = async (agent: Agent) => {
    await fetch(`/api/agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !agent.is_active }),
    })
    load()
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes</h1>
          <p className="text-slate-500 text-sm mt-1">{agents.length} agente{agents.length !== 1 ? 's' : ''} creado{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Agente
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar agentes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#16162a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'whatsapp', 'voice', 'both'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-[#16162a] text-slate-500 border border-white/5 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'whatsapp' ? 'WhatsApp' : f === 'voice' ? 'Voz' : 'Ambos'}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-52 rounded-xl skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Bot className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          {agents.length === 0 ? (
            <>
              <p className="text-slate-300 font-semibold text-lg mb-2">Crea tu primer agente</p>
              <p className="text-slate-500 text-sm mb-6">
                Configura un agente de IA para WhatsApp o llamadas de voz en minutos
              </p>
              <Link
                href="/agents/new"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear Primer Agente
              </Link>
            </>
          ) : (
            <p className="text-slate-500">No se encontraron agentes con ese filtro</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={() => handleDelete(agent.id, agent.name)}
              onToggle={() => handleToggleActive(agent)}
              deleting={deleting === agent.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AgentCard({ agent, onDelete, onToggle, deleting }: {
  agent: Agent
  onDelete: () => void
  onToggle: () => void
  deleting: boolean
}) {
  const channelConfig = {
    whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    voice: { icon: Phone, label: 'Voz', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    both: { icon: Zap, label: 'WA + Voz', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  }
  const ch = channelConfig[agent.channel] || channelConfig.whatsapp
  const Icon = ch.icon

  return (
    <div className="bg-[#16162a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all group flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${ch.bg}`}>
          <Icon className={`w-5 h-5 ${ch.color}`} />
        </div>
        <div className="flex items-center gap-2">
          {agent.is_active && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-xs text-emerald-400">Activo</span>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-white mb-1 truncate">{agent.name}</h3>
      <p className="text-xs text-slate-500 mb-3 line-clamp-2 flex-1">
        {agent.description || 'Sin descripción'}
      </p>

      <div className="flex items-center gap-2 mb-4">
        <span className={`badge text-xs border ${ch.bg} ${ch.color}`}>{ch.label}</span>
        <span className="badge text-xs bg-white/5 text-slate-400 border border-white/5">
          {agent.skills?.length || 0} skills
        </span>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        <Link
          href={`/agents/${agent.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Editar
        </Link>
        <Link
          href={`/agents/${agent.id}/test`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        >
          <Play className="w-3 h-3" />
          Testear
        </Link>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg px-2.5 py-2 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
