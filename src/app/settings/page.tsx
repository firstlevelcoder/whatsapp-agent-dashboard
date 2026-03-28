'use client'
import { useEffect, useState } from 'react'
import {
  Settings, Server, Key, CheckCircle2, XCircle,
  RefreshCw, Save, Phone, MessageSquare, Info,
  ExternalLink, Copy, Eye, EyeOff, Zap,
} from 'lucide-react'

interface Settings {
  ollama_url: string; ollama_model: string
  groq_api_key: string; groq_model: string
  openrouter_api_key: string; openrouter_model: string
  default_provider: string
  vapi_api_key: string
  twilio_account_sid: string; twilio_auth_token: string; twilio_phone_number: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3.2',
    groq_api_key: '',
    groq_model: 'llama-3.1-8b-instant',
    openrouter_api_key: '',
    openrouter_model: 'meta-llama/llama-3.1-8b-instruct:free',
    default_provider: 'ollama',
    vapi_api_key: '',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, any>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async (action: string) => {
    setTesting(action)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, url: settings.ollama_url }),
    })
    const data = await res.json()
    setTestResult(prev => ({ ...prev, [action]: data }))
    setTesting(null)
  }

  const toggleShow = (key: string) => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="text-slate-500 text-sm mt-1">Configura los modelos LLM y canales de comunicación</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? '¡Guardado!' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Provider Default */}
        <Section title="Proveedor por Defecto" icon={<Zap className="w-4 h-4 text-indigo-400" />}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'ollama', label: 'Ollama Local', badge: 'Gratis', color: 'emerald' },
              { id: 'groq', label: 'Groq', badge: '14k/día', color: 'blue' },
              { id: 'openrouter', label: 'OpenRouter', badge: ':free models', color: 'violet' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setSettings(s => ({ ...s, default_provider: p.id }))}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all text-sm ${
                  settings.default_provider === p.id
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-white'
                    : 'bg-[#0a0a14] border-white/5 text-slate-500 hover:border-white/10'
                }`}
              >
                <span className="font-medium">{p.label}</span>
                <span className={`badge text-xs bg-${p.color}-500/15 text-${p.color}-400`}>{p.badge}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Ollama */}
        <Section
          title="Ollama (Local - 100% Gratis)"
          icon={<Server className="w-4 h-4 text-emerald-400" />}
          badge={<span className="badge bg-emerald-500/15 text-emerald-400 text-xs">Recomendado</span>}
        >
          <div className="space-y-4">
            <InfoBox>
              Ollama ejecuta modelos LLM localmente en tu máquina sin costo. Instala desde{' '}
              <a href="https://ollama.ai" target="_blank" className="text-indigo-400 hover:underline">ollama.ai</a>{' '}
              y ejecuta: <code className="bg-black/40 px-1.5 py-0.5 rounded text-emerald-400 text-xs">ollama pull llama3.2</code>
            </InfoBox>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">URL Base</label>
                <input
                  value={settings.ollama_url}
                  onChange={e => setSettings(s => ({ ...s, ollama_url: e.target.value }))}
                  className="input-field"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Modelo por Defecto</label>
                <select
                  value={settings.ollama_model}
                  onChange={e => setSettings(s => ({ ...s, ollama_model: e.target.value }))}
                  className="input-field"
                >
                  <option value="llama3.2">llama3.2 (Meta) — Recomendado</option>
                  <option value="llama3.1">llama3.1 8B (Meta)</option>
                  <option value="mistral">mistral 7B</option>
                  <option value="qwen2.5">qwen2.5 7B (Alibaba)</option>
                  <option value="phi3">phi3 (Microsoft)</option>
                  <option value="gemma2">gemma2 (Google)</option>
                  <option value="deepseek-r1">deepseek-r1</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTest('test_ollama')}
                disabled={testing === 'test_ollama'}
                className="flex items-center gap-2 bg-[#0a0a14] hover:bg-white/5 border border-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {testing === 'test_ollama' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                Probar Conexión
              </button>

              {testResult.test_ollama && (
                <div className={`flex items-center gap-1.5 text-sm ${testResult.test_ollama.healthy ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.test_ollama.healthy ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult.test_ollama.healthy
                    ? `Conectado • ${testResult.test_ollama.models?.length || 0} modelos instalados`
                    : 'No disponible — ¿Está corriendo Ollama?'}
                </div>
              )}
            </div>

            {testResult.test_ollama?.models?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Modelos instalados:</p>
                <div className="flex flex-wrap gap-1.5">
                  {testResult.test_ollama.models.map((m: string) => (
                    <span key={m} className="badge bg-emerald-500/10 text-emerald-400 border-none text-xs">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Groq */}
        <Section
          title="Groq (Free Tier)"
          icon={<Zap className="w-4 h-4 text-blue-400" />}
          badge={<span className="badge bg-blue-500/15 text-blue-400 text-xs">14,400 req/día gratis</span>}
        >
          <div className="space-y-4">
            <InfoBox>
              Groq ofrece inferencia ultra-rápida gratis. Regístrate en{' '}
              <a href="https://console.groq.com" target="_blank" className="text-indigo-400 hover:underline">console.groq.com</a>{' '}
              y obtén tu API key gratuita.
            </InfoBox>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.groq ? 'text' : 'password'}
                    value={settings.groq_api_key}
                    onChange={e => setSettings(s => ({ ...s, groq_api_key: e.target.value }))}
                    className="input-field pr-10"
                    placeholder="gsk_..."
                  />
                  <button onClick={() => toggleShow('groq')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showKeys.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Modelo</label>
                <select
                  value={settings.groq_model}
                  onChange={e => setSettings(s => ({ ...s, groq_model: e.target.value }))}
                  className="input-field"
                >
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant — Más rápido</option>
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile — Mejor calidad</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                  <option value="gemma2-9b-it">Gemma 2 9B (Google)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => handleTest('test_groq')}
              disabled={testing === 'test_groq' || !settings.groq_api_key}
              className="flex items-center gap-2 bg-[#0a0a14] hover:bg-white/5 border border-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {testing === 'test_groq' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Verificar API Key
            </button>

            {testResult.test_groq && (
              <div className={`flex items-center gap-1.5 text-sm ${testResult.test_groq.healthy ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.test_groq.healthy ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {testResult.test_groq.healthy ? 'API Key válida' : `Error: ${testResult.test_groq.error || 'Key inválida'}`}
              </div>
            )}
          </div>
        </Section>

        {/* OpenRouter */}
        <Section
          title="OpenRouter (Modelos Gratuitos)"
          icon={<Zap className="w-4 h-4 text-violet-400" />}
          badge={<span className="badge bg-violet-500/15 text-violet-400 text-xs">Modelos :free</span>}
        >
          <div className="space-y-4">
            <InfoBox>
              OpenRouter da acceso a múltiples modelos. Los marcados con{' '}
              <code className="bg-black/40 px-1.5 py-0.5 rounded text-violet-400 text-xs">:free</code>{' '}
              son completamente gratuitos. Regístrate en{' '}
              <a href="https://openrouter.ai" target="_blank" className="text-indigo-400 hover:underline">openrouter.ai</a>.
            </InfoBox>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.openrouter ? 'text' : 'password'}
                    value={settings.openrouter_api_key}
                    onChange={e => setSettings(s => ({ ...s, openrouter_api_key: e.target.value }))}
                    className="input-field pr-10"
                    placeholder="sk-or-..."
                  />
                  <button onClick={() => toggleShow('openrouter')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showKeys.openrouter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Modelo Gratuito</label>
                <select
                  value={settings.openrouter_model}
                  onChange={e => setSettings(s => ({ ...s, openrouter_model: e.target.value }))}
                  className="input-field"
                >
                  <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Meta) :free</option>
                  <option value="google/gemma-2-9b-it:free">Gemma 2 9B (Google) :free</option>
                  <option value="microsoft/phi-3-mini-128k-instruct:free">Phi-3 Mini (Microsoft) :free</option>
                  <option value="deepseek/deepseek-r1:free">DeepSeek R1 :free</option>
                  <option value="mistralai/mistral-7b-instruct:free">Mistral 7B :free</option>
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* Voice */}
        <Section
          title="Llamadas de Voz"
          icon={<Phone className="w-4 h-4 text-violet-400" />}
        >
          <div className="space-y-4">
            <InfoBox>
              Para agentes de voz necesitas un proveedor de telefonía. VAPI ofrece 10 min/mes gratis para pruebas.
              Regístrate en{' '}
              <a href="https://vapi.ai" target="_blank" className="text-indigo-400 hover:underline">vapi.ai</a>{' '}
              o usa Twilio con crédito de prueba.
            </InfoBox>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">VAPI API Key</label>
              <div className="relative">
                <input
                  type={showKeys.vapi ? 'text' : 'password'}
                  value={settings.vapi_api_key}
                  onChange={e => setSettings(s => ({ ...s, vapi_api_key: e.target.value }))}
                  className="input-field pr-10"
                  placeholder="Tu VAPI API key..."
                />
                <button onClick={() => toggleShow('vapi')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showKeys.vapi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-slate-500 mb-3">Twilio (alternativa con crédito de prueba)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Account SID</label>
                  <input
                    type="text"
                    value={settings.twilio_account_sid}
                    onChange={e => setSettings(s => ({ ...s, twilio_account_sid: e.target.value }))}
                    className="input-field"
                    placeholder="ACxxxx..."
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Auth Token</label>
                  <input
                    type="password"
                    value={settings.twilio_auth_token}
                    onChange={e => setSettings(s => ({ ...s, twilio_auth_token: e.target.value }))}
                    className="input-field"
                    placeholder="Tu auth token..."
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Número Twilio</label>
                  <input
                    type="text"
                    value={settings.twilio_phone_number}
                    onChange={e => setSettings(s => ({ ...s, twilio_phone_number: e.target.value }))}
                    className="input-field"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* WhatsApp */}
        <Section
          title="WhatsApp (whatsapp-web.js)"
          icon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
          badge={<span className="badge bg-emerald-500/15 text-emerald-400 text-xs">100% Gratis</span>}
        >
          <InfoBox>
            Se conecta a WhatsApp Web de forma gratuita sin necesidad de WhatsApp Business API.
            Solo escanea el código QR con tu teléfono. Para activarlo, ejecuta:{' '}
            <code className="bg-black/40 px-1.5 py-0.5 rounded text-emerald-400 text-xs">npm run start:whatsapp</code>
          </InfoBox>
          <div className="mt-4 p-4 bg-[#0a0a14] border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-400 font-medium mb-1">✓ Configurado automáticamente</p>
            <p className="text-xs text-slate-500">
              El agente de WhatsApp se inicia por separado. Ve al agente específico y actívalo para
              conectarlo a WhatsApp Web.
            </p>
          </div>
        </Section>
      </div>

      {/* Save button bottom */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? '¡Guardado!' : 'Guardar Configuración'}
        </button>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          background: #0a0a14;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 13px;
          color: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: rgba(99, 102, 241, 0.5);
        }
        .input-field option {
          background: #16162a;
        }
      `}</style>
    </div>
  )
}

function Section({ title, icon, badge, children }: any) {
  return (
    <div className="bg-[#16162a] border border-white/5 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 text-xs text-slate-400">
      <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  )
}
