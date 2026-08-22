import { NextRequest } from 'next/server';
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
      { role: 'system' as const, content: systemPrompt },
      ...messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: apiMessages,
      stream: true,
      thinking: { type: 'disabled' },
    });

    // If the SDK returned a ReadableStream (streaming mode)
    if (completion instanceof ReadableStream) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = completion.getReader();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;

                if (trimmed === 'data: [DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                if (trimmed.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6));
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                      );
                    }
                  } catch {
                    // Skip malformed JSON chunks
                  }
                }
              }
            }

            // Send [DONE] if the stream ended without it
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Stream processing error:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: 'I encountered an issue while streaming. Please try again.', error: true })}\n\n`)
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Fallback: SDK returned JSON (non-streaming)
    const content = completion.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
    return new Response(
      JSON.stringify({ content }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI Tutor error:', error);
    return new Response(
      JSON.stringify({ content: 'I encountered an issue. Please try again.', error: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
