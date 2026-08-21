import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const zaiCache: { instance: InstanceType<typeof ZAI> | null } = { instance: null };

async function getZAI() {
  if (!zaiCache.instance) {
    zaiCache.instance = await ZAI.create();
  }
  return zaiCache.instance;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();
    const systemPrompt = context || 'You are a helpful academic tutor.';
    const zai = await getZAI();

    const apiMessages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: apiMessages,
      thinking: { type: 'disabled' },
    });

    const content = completion.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI Tutor error:', error);
    return NextResponse.json({ content: 'I encountered an issue. Please try again.', error: true }, { status: 200 });
  }
}
