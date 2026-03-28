'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Play, Pause, RefreshCw, Zap,
  CheckCircle2, XCircle, AlertCircle, Bot,
  Send, MessageSquare, Sparkles, TrendingUp,
  ChevronDown, ChevronRight, BarChart3, Download,
} from 'lucide-react'

interface Agent {
  id: string; name: string; system_prompt: string
  channel: string; skills: string[]
}

interface Scenario {
  id: string; name: string; messages: any[]; expected_behavior: string; tags: string[]
}

interface TestResult {
  scenario_id: string; scenario_name: string
  response: string; score: number; feedback: string; passed: boolean
}

interface Provider {
  id: string; name: string; available: boolean; requires_api_key: boolean; free: boolean
  models: { id: string; name: string; free: boolean }[]
}

export default function TestPage() {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'batch' | 'chat' | 'optimize'>('batch')
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/agents/${id}`).then(r => r.json()),
      fetch(`/api/agents/${id}/scenarios`).then(r => r.json()),
      fetch('/api/llm/models?health=true').then(r => r.json()),
    ]).then(([agentData, scenariosData, providersData]) => {
      setAgent(agentData)
      setScenarios(scenariosData)
      setProviders(providersData)

      // Auto-select available provider
      const available = providersData.find((p: Provider) => p.available)
      if (available) {
        setSelectedProvider(available.id)
        setSelectedModel(available.models[0]?.id || '')
      }
    })
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const currentProvider = providers.find(p => p.id === selectedProvider)
  const availableModels = currentProvider?.models || []

  const handleRunTests = async () => {
    if (!scenarios.length) return alert('No hay escenarios. Ve al agente y crea escenarios primero.')
    setRunning(true)
    setResults([])
    setSummary(null)

    try {
      const res = await fetch(`/api/agents/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          scenario_ids: selectedScenarios.length ? selectedScenarios : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResults(data.results || [])
        setSummary(data)
      } else {
        alert(data.error || 'Error running tests')
      }
    } finally {
      setRunning(false)
    }
  }

  const handleOptimize = async (apply: boolean) => {
    setOptimizing(true)
    setOptimizationResult(null)
    try {
      const res = await fetch(`/api/agents/${id}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel, apply }),
      })
      const data = await res.json()
      setOptimizationResult(data)
    } finally {
      setOptimizing(false)
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading || !agent) return
    const userMsg = { role: 'user', content: chatInput }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          system_prompt: agent.system_prompt,
          provider: selectedProvider,
          model: selectedModel,
        }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content || data.error }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el LLM' }])
    } finally {
      setChatLoading(false)
    }
  }

  const toggleScenario = (id: string) => {
    setSelectedScenarios(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const passRate = summary ? Math.round((summary.passed / summary.tested) * 100) : 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/agents/${id}`} className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Testing: {agent?.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{scenarios.length} escenarios disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Config Panel */}
        <div className="space-y-4">
          {/* LLM Config */}
          <div className="bg-[#16162a] border border-white/5 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Modelo LLM</p>
            <div className="space-y-2">
              {providers.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProvider(provider.id)
                    setSelectedModel(provider.models[0]?.id || '')
                  }}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-all ${
                    selectedProvider === provider.id
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                      : 'bg-transparent border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${provider.available ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className="flex-1 font-medium">{provider.name}</span>
                  {provider.free && <span className="badge bg-emerald-500/15 text-emerald-400 text-xs">Free</span>}
                </button>
              ))}
            </div>

            {availableModels.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1.5">Modelo</p>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
                >
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>
              </div>
            )}

            {!currentProvider?.available && (
              <p className="text-xs text-amber-400 mt-2 bg-amber-500/10 rounded-lg p-2">
                {selectedProvider === 'ollama'
                  ? 'Ollama no detectado. Instala ollama.ai y corre: ollama pull llama3.2'
                  : 'Configura la API key en Configuración'}
              </p>
            )}
          </div>

          {/* Scenarios Filter */}
          <div className="bg-[#16162a] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Escenarios</p>
              <button
                onClick={() => setSelectedScenarios(selectedScenarios.length === scenarios.length ? [] : scenarios.map(s => s.id))}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {selectedScenarios.length === scenarios.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {scenarios.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">No hay escenarios</p>
              ) : (
                scenarios.map(scenario => (
                  <label key={scenario.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScenarios.length === 0 || selectedScenarios.includes(scenario.id)}
                      onChange={() => toggleScenario(scenario.id)}
                      className="w-3.5 h-3.5 rounded accent-indigo-500"
                    />
                    <span className="text-xs text-slate-400 truncate">{scenario.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunTests}
            disabled={running || !currentProvider?.available}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 text-black font-semibold py-3 rounded-xl transition-colors"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Corriendo tests...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Correr Tests ({selectedScenarios.length || scenarios.length})
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-[#16162a] border border-white/5 rounded-xl p-1 mb-4">
            {[
              { id: 'batch', label: 'Tests en Lote', icon: BarChart3 },
              { id: 'chat', label: 'Chat Simulado', icon: MessageSquare },
              { id: 'optimize', label: 'Auto-Optimizar', icon: Sparkles },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Batch Results */}
          {activeTab === 'batch' && (
            <div>
              {running && (
                <div className="bg-[#16162a] border border-amber-500/20 rounded-xl p-6 text-center mb-4">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
                  <p className="text-white font-medium">Ejecutando tests...</p>
                  <p className="text-slate-500 text-sm mt-1">Esto puede tomar unos minutos según los escenarios</p>
                </div>
              )}

              {summary && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total', value: summary.tested, color: 'text-white' },
                    { label: 'Aprobados', value: summary.passed, color: 'text-emerald-400' },
                    { label: 'Fallidos', value: summary.failed, color: 'text-red-400' },
                    { label: 'Score Prom.', value: `${summary.avg_score}/10`, color: 'text-amber-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#16162a] border border-white/5 rounded-xl p-3 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {summary && (
                <div className="mb-4 bg-[#16162a] border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Tasa de Éxito</span>
                    <span className={`text-sm font-bold ${passRate >= 80 ? 'text-emerald-400' : passRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {passRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${passRate >= 80 ? 'bg-emerald-400' : passRate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                  {passRate < 70 && (
                    <p className="text-xs text-amber-400 mt-2">
                      Tasa baja. Usa "Auto-Optimizar" para mejorar el prompt automáticamente.
                    </p>
                  )}
                </div>
              )}

              {results.length === 0 && !running ? (
                <div className="bg-[#16162a] border border-white/5 rounded-xl p-12 text-center">
                  <Play className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">Ejecuta los tests para ver resultados</p>
                  <p className="text-slate-600 text-sm mt-1">
                    Se usará el LLM para simular conversaciones y evaluarlas automáticamente
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {results.map((result, i) => (
                    <ResultCard key={i} result={result} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat Simulator */}
          {activeTab === 'chat' && (
            <div className="bg-[#16162a] border border-white/5 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-white/5">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{agent?.name}</p>
                  <p className="text-xs text-emerald-400">● Simulado con {selectedModel}</p>
                </div>
                <button
                  onClick={() => setChatMessages([])}
                  className="ml-auto text-xs text-slate-500 hover:text-slate-300"
                >
                  Limpiar
                </button>
              </div>

              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Simula una conversación con el agente</p>
                      <p className="text-slate-600 text-xs mt-1">El agente responderá con su system prompt configurado</p>
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user' ? 'wa-bubble-user' : 'wa-bubble-agent'
                    }`}>
                      <p className="text-slate-200 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="wa-bubble-agent rounded-2xl px-4 py-2.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escribe un mensaje como usuario..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                    className="flex-1 bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {!currentProvider?.available && (
                  <p className="text-xs text-amber-400 mt-2">
                    {selectedProvider === 'ollama' ? '⚠ Ollama no disponible. Instala desde ollama.ai' : '⚠ Configura API key en Configuración'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Auto-Optimize */}
          {activeTab === 'optimize' && (
            <div className="space-y-4">
              <div className="bg-[#16162a] border border-white/5 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Auto-Optimización de Prompt</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Analiza los tests fallidos automáticamente y sugiere mejoras al system prompt del agente para aumentar la tasa de éxito.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleOptimize(false)}
                    disabled={optimizing}
                    className="flex items-center justify-center gap-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20 text-violet-400 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {optimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    Solo Sugerir Mejora
                  </button>
                  <button
                    onClick={() => handleOptimize(true)}
                    disabled={optimizing}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {optimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Sugerir y Aplicar
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Necesitas haber corrido tests primero. El optimizador analiza los fallos y usa el LLM para mejorar el prompt automáticamente.
                </p>
              </div>

              {optimizing && (
                <div className="bg-[#16162a] border border-violet-500/20 rounded-xl p-6 text-center">
                  <Sparkles className="w-8 h-8 text-violet-400 animate-pulse mx-auto mb-2" />
                  <p className="text-white font-medium">Analizando fallos y generando mejoras...</p>
                  <p className="text-slate-500 text-sm mt-1">El LLM está revisando los escenarios fallidos</p>
                </div>
              )}

              {optimizationResult && (
                <div className="space-y-3">
                  <div className="bg-[#16162a] border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-xs font-medium text-emerald-400 mb-1">✓ {optimizationResult.message}</p>
                    <p className="text-xs text-slate-500">Se analizaron {optimizationResult.improvements_count} tests fallidos</p>
                    {optimizationResult.applied && (
                      <p className="text-xs text-indigo-400 mt-1">✓ El prompt ha sido actualizado en el agente</p>
                    )}
                  </div>

                  {optimizationResult.improved_prompt && !optimizationResult.applied && (
                    <div className="bg-[#16162a] border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-white">Prompt Sugerido</p>
                        <button
                          onClick={() => handleOptimize(true)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-colors"
                        >
                          Aplicar Ahora
                        </button>
                      </div>
                      <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono bg-[#0a0a14] rounded-lg p-3 max-h-60 overflow-y-auto">
                        {optimizationResult.improved_prompt}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultCard({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false)
  const scoreColor = result.score >= 7 ? 'text-emerald-400' : result.score >= 5 ? 'text-amber-400' : 'text-red-400'
  const borderColor = result.passed ? 'border-emerald-500/15' : 'border-red-500/15'

  return (
    <div className={`bg-[#16162a] border ${borderColor} rounded-xl overflow-hidden`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/3"
        onClick={() => setExpanded(!expanded)}
      >
        {result.passed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        )}
        <p className="text-sm text-white flex-1 truncate">{result.scenario_name}</p>
        <span className={`text-sm font-bold ${scoreColor}`}>{result.score}/10</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Respuesta del Agente:</p>
            <p className="text-xs text-slate-300 bg-[#0a0a14] rounded-lg p-3">{result.response}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Evaluación:</p>
            <p className="text-xs text-slate-400">{result.feedback}</p>
          </div>
        </div>
      )}
    </div>
  )
}
