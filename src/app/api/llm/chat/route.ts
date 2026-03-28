import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/llm'

export async function POST(req: NextRequest) {
  try {
    const { messages, provider, model, system_prompt } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages are required' }, { status: 400 })
    }

    const allMessages = system_prompt
      ? [{ role: 'system' as const, content: system_prompt }, ...messages]
      : messages

    const result = await chat(allMessages, provider, model)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
