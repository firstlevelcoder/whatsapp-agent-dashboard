'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot, LayoutDashboard, Settings, Beaker,
  MessageSquare, Phone, Zap, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/agents', icon: Bot, label: 'Agentes' },
  { href: '/settings', icon: Settings, label: 'Configuración' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 bg-[#111121] border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white leading-tight">Agent Studio</p>
            <p className="text-xs text-slate-500">WhatsApp + Voice AI</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-xs text-slate-600 font-medium px-3 py-2 uppercase tracking-wider">Principal</p>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3" />}
            </Link>
          )
        })}

        <div className="pt-4">
          <p className="text-xs text-slate-600 font-medium px-3 py-2 uppercase tracking-wider">Canales</p>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>WhatsApp</span>
              <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Free</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500">
              <Phone className="w-4 h-4 text-violet-500" />
              <span>Voice Calls</span>
              <span className="ml-auto text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">VAPI</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500">
              <Beaker className="w-4 h-4 text-amber-500" />
              <span>Testing</span>
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Ollama</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3">
          <p className="text-xs font-medium text-indigo-300">100% Gratis</p>
          <p className="text-xs text-slate-500 mt-0.5">Ollama local + Groq free tier</p>
        </div>
      </div>
    </aside>
  )
}
