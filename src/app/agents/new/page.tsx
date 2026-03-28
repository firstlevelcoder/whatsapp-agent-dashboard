'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Wand2, MessageSquare, Phone, Zap,
  ChevronRight, Bot, Sparkles,
} from 'lucide-react'
import { AGENT_TEMPLATES, SKILLS, SKILL_CATEGORIES } from '@/lib/skills'

export default function NewAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState<'template' | 'configure'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    channel: 'whatsapp' as 'whatsapp' | 'voice' | 'both',
    skills: [] as string[],
    custom_instructions: '',
    system_prompt: '',
    use_template_prompt: true,
  })

  const handleSelectTemplate = (templateId: string) => {
    const template = AGENT_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setForm(f => ({
        ...f,
        name: template.name,
        description: template.description,
        channel: template.channel,
        skills: template.skills,
        use_template_prompt: true,
      }))
    }
    setStep('configure')
  }

  const handleStartBlank = () => {
    setSelectedTemplate(null)
    setStep('configure')
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return alert('El nombre del agente es requerido')
    setCreating(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const agent = await res.json()
      if (res.ok) {
        router.push(`/agents/${agent.id}`)
      } else {
        alert(agent.error || 'Error creando agente')
      }
    } finally {
      setCreating(false)
    }
  }

  const toggleSkill = (skillId: string) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skillId)
        ? f.skills.filter(s => s !== skillId)
        : [...f.skills, skillId],
    }))
  }

  if (step === 'template') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/agents" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Nuevo Agente</h1>
            <p className="text-slate-500 text-sm mt-0.5">Elige una plantilla o empieza desde cero</p>
          </div>
        </div>

        {/* Start from scratch */}
        <button
          onClick={handleStartBlank}
          className="w-full mb-6 flex items-center gap-4 bg-[#16162a] hover:bg-[#1e1e36] border border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl p-5 transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Agente en Blanco</p>
            <p className="text-sm text-slate-500">Configura todo desde cero con total control</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </button>

        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-4">O usa una plantilla</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENT_TEMPLATES.map(template => {
            const channelLabel = template.channel === 'whatsapp' ? 'WhatsApp' : template.channel === 'voice' ? 'Voz' : 'WA + Voz'
            const channelColor = template.channel === 'whatsapp' ? 'text-emerald-400' : template.channel === 'voice' ? 'text-violet-400' : 'text-indigo-400'
            return (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template.id)}
                className="flex items-start gap-4 bg-[#16162a] hover:bg-[#1e1e36] border border-white/5 hover:border-white/10 rounded-xl p-5 transition-all text-left group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${template.color}15`, border: `1px solid ${template.color}30` }}
                >
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white text-sm">{template.name}</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${channelColor}`}>{channelLabel}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-500">{template.skills.length} skills</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Configure step
  const skillsByCategory = SKILL_CATEGORIES.map(cat => ({
    ...cat,
    skills: SKILLS.filter(s =>
      s.category === cat.id &&
      (s.compatible_channels.includes(form.channel) || s.compatible_channels.includes('both') || form.channel === 'both')
    ),
  })).filter(c => c.skills.length > 0)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setStep('template')} className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Configurar Agente</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {selectedTemplate ? `Basado en: ${AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}` : 'Agente en blanco'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Section title="Información Básica">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Nombre del Agente *</label>
              <input
                type="text"
                placeholder="ej. Asistente de Ventas"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Descripción</label>
              <input
                type="text"
                placeholder="ej. Agente para atención al cliente 24/7"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
        </Section>

        {/* Channel */}
        <Section title="Canal">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', desc: 'Mensajes de texto', color: 'emerald' },
              { id: 'voice', icon: Phone, label: 'Voz', desc: 'Llamadas VAPI/Twilio', color: 'violet' },
              { id: 'both', icon: Zap, label: 'Ambos', desc: 'WhatsApp + Voz', color: 'indigo' },
            ].map(({ id, icon: Icon, label, desc, color }) => (
              <button
                key={id}
                onClick={() => setForm(f => ({ ...f, channel: id as any }))}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  form.channel === id
                    ? `bg-${color}-500/15 border-${color}-500/30 text-${color}-300`
                    : 'bg-[#0a0a14] border-white/5 text-slate-500 hover:border-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs opacity-70">{desc}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Skills */}
        <Section title={`Skills (${form.skills.length} seleccionados)`} description="Selecciona las capacidades de tu agente">
          <div className="space-y-4">
            {skillsByCategory.map(category => (
              <div key={category.id}>
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: category.color }} />
                  {category.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {category.skills.map(skill => (
                    <button
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        form.skills.includes(skill.id)
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                          : 'bg-[#0a0a14] border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <span className="text-lg">{skill.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{skill.name}</p>
                        <p className="text-xs text-slate-600 truncate">{skill.description.substring(0, 45)}...</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Custom Instructions */}
        <Section title="Instrucciones Adicionales" description="Agrega reglas específicas de tu negocio">
          <textarea
            placeholder="ej. Somos una empresa de tecnología llamada TechCorp. Nuestro horario es de 9am a 6pm. El precio del plan básico es $29/mes..."
            value={form.custom_instructions}
            onChange={e => setForm(f => ({ ...f, custom_instructions: e.target.value }))}
            rows={5}
            className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
        </Section>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleCreate}
            disabled={creating || !form.name}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {creating ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Creando agente...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Crear Agente con IA
              </>
            )}
          </button>
          <Link
            href="/agents"
            className="px-6 py-3 rounded-xl text-slate-400 hover:text-slate-200 font-medium transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#16162a] border border-white/5 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}
