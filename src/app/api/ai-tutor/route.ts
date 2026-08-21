import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || '';

    // Build a focused prompt from context and conversation
    const systemPrompt = context || 'You are a helpful academic tutor.';
    const conversationHistory = messages
      .slice(-10)
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\n\nTutor:`;

    // Use the z-ai-web-dev-sdk for LLM via dynamic import
    const { createLLM } = await import('z-ai-web-dev-sdk');
    const llm = createLLM();
    const response = await llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10).map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    const content = typeof response === 'string' ? response : response?.content || response?.message || JSON.stringify(response);

    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI Tutor error:', error);
    return NextResponse.json({ content: 'I encountered an issue processing your request. Please try again.', error: true }, { status: 200 });
  }
}
