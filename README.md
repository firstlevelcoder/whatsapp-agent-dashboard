# WhatsApp Agent Dashboard 🤖

Dashboard profesional para crear, configurar y testear agentes de IA para WhatsApp y llamadas de voz.

## 🚀 Features

- **Builder de Agentes** — Crea agentes con 25+ skills/prompts predefinidos
- **8 Templates** — Atención al cliente, ventas, restaurante, inmobiliaria, clínica, etc.
- **Testing Automático** — Corre cientos de escenarios y evalúa respuestas automáticamente
- **Judge LLM** — El LLM evalúa respuestas de 0-10 y da feedback detallado
- **Auto-Optimización** — Analiza fallos y mejora el system prompt automáticamente
- **Chat Simulado** — Prueba conversaciones en tiempo real
- **Generación de Escenarios con IA** — Genera 20+ escenarios de prueba automáticamente

## 💰 100% Gratis

| Proveedor | Tipo | Límite |
|-----------|------|--------|
| **Ollama** (llama3.2, mistral, qwen2.5...) | Local | Sin límites |
| **Groq** (llama-3.3-70b, llama-3.1-8b...) | Cloud | 14,400 req/día |
| **OpenRouter** (:free models) | Cloud | Según modelo |
| **whatsapp-web.js** | WhatsApp | Sin límites |
| **VAPI.ai** | Voz | 10 min/mes gratis |

## 📦 Instalación

```bash
# 1. Clonar el repo
git clone https://github.com/firstlevelcoder/whatsapp-agent-dashboard
cd whatsapp-agent-dashboard

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Edita .env.local con tus API keys

# 4. Instalar Ollama (para LLM local gratis)
# Descargar desde https://ollama.ai
ollama pull llama3.2   # Modelo recomendado

# 5. Iniciar el dashboard
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎯 Flujo de Trabajo

1. **Crear Agente** → Elige un template o empieza en blanco
2. **Configurar Skills** → Selecciona capacidades (saludo, ventas, soporte, etc.)
3. **Generar Prompt** → El sistema crea el system prompt automáticamente de los skills
4. **Crear Escenarios** → Manualmente, importando templates o generando con IA
5. **Correr Tests** → Batchea cientos de escenarios con Ollama/Groq gratis
6. **Auto-Optimizar** → El LLM analiza fallos y mejora el prompt automáticamente
7. **Iterar** → Repite hasta lograr >90% de tasa de éxito

## 🛠 Stack Técnico

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Base de datos**: SQLite (better-sqlite3)
- **LLM Testing**: Ollama (local) / Groq (cloud free) / OpenRouter (cloud free)
- **WhatsApp**: whatsapp-web.js (sin API oficial)
- **Voz**: VAPI.ai / Twilio

## 📱 Canales Soportados

- **WhatsApp** — Via whatsapp-web.js (escanear QR code)
- **Voz (llamadas)** — Via VAPI.ai o Twilio
- **Ambos** — Agentes multi-canal

## 🤖 Skills Disponibles

### Núcleo
- Saludo Profesional, Empatía, Detección de Idioma, Formato WhatsApp, Escalación, Cierre

### Ventas
- Calificación de Leads (BANT), Presentación de Productos, Manejo de Objeciones, Upsell/Cross-sell

### Soporte
- FAQ Handler, Gestión de Quejas, Seguimiento de Pedidos

### Reservas
- Booking de Citas, Consulta de Disponibilidad

### E-commerce
- Búsqueda de Productos, Soporte de Pagos

### Voz
- Estilo para Llamadas, Recopilación por Voz

### Multiidioma
- Español LATAM, Bilingüe ES/EN

### Especializados
- Restaurante, Bienes Raíces, Salud/Clínica, Educación

## 📄 Licencia

MIT
