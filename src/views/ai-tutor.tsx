'use client';

import { useStore } from '@/lib/store';
import {
  getSubjectProgress,
  getSubjectAttendance,
  getSemesterHealth,
  getStudyStreak,
  getStudyTimeThisWeek,
} from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Bot, User, Wifi, WifiOff, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AITutorView() {
  const { subjects, syllabusUnits, profile, exams, assignments, revisionItems, studySessions } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // ── Syllabus-aware context ───────────────────────────────────────
  const buildContext = useCallback(() => {
    const state = useStore.getState();
    const activeSubjects = subjects.filter((s) => !s.archived);
    const todayStr = new Date().toISOString().split('T')[0];

    const subjectDetails = activeSubjects.map((s) => {
      const progress = getSubjectProgress(state, s.id);
      const att = getSubjectAttendance(state, s.id);
      const incompleteTopics = syllabusUnits
        .filter((u) => u.subjectId === s.id)
        .flatMap((u) => u.topics)
        .filter((t) => !t.completed)
        .slice(0, 10)
        .map((t) => t.name);
      return {
        name: s.name,
        code: s.code,
        credits: s.credits,
        progress,
        attendance: att.percentage,
        incompleteTopics,
      };
    });

    const upcomingExams = exams
      .filter((e) => e.status === 'upcoming' && e.date >= todayStr)
      .map((e) => {
        const sub = subjects.find((s) => s.id === e.subjectId);
        return { name: e.name, subject: sub?.name || 'Unknown', date: e.date, type: e.type };
      });

    const upcomingAssignments = assignments
      .filter((a) => a.status !== 'completed' && a.deadline >= todayStr)
      .map((a) => {
        const sub = subjects.find((s) => s.id === a.subjectId);
        return { title: a.title, subject: sub?.name || 'Unknown', deadline: a.deadline };
      });

    const healthScore = getSemesterHealth(state);
    const streak = getStudyStreak(state);
    const weeklySeconds = getStudyTimeThisWeek(state);
    const weeklyHours = Math.round((weeklySeconds / 3600) * 10) / 10;

    const context = `You are an AI academic tutor for a university student named ${profile.name}, studying ${profile.branch || 'Engineering'} in Semester ${profile.semester}.

## Student's Academic Profile
- Academic Health Score: ${healthScore}/100
- Study Streak: ${streak} day${streak !== 1 ? 's' : ''}
- Weekly Study Time: ${weeklyHours}h

## Subjects (${subjectDetails.length})
${subjectDetails.map((s) => 
  `- **${s.name}** (${s.code}, ${s.credits} credits): Syllabus ${s.progress}% complete, Attendance ${s.attendance}%${s.incompleteTopics.length > 0 ? `\n  Incomplete topics: ${s.incompleteTopics.join(', ')}` : ''}`).join('\n')}

${upcomingExams.length > 0 ? `## Upcoming Exams\n${upcomingExams.map((e) => `- ${e.name} (${e.subject}) — ${e.date} [${e.type}]`).join('\n')}` : ''}

${upcomingAssignments.length > 0 ? `## Upcoming Assignments\n${upcomingAssignments.map((a) => `- ${a.title} (${a.subject}) — due ${a.deadline}`).join('\n')}` : ''}

Answer academic questions clearly and concisely using markdown formatting (bullet points, bold, headers, code blocks, tables) when helpful. Help with concepts, problem-solving, and study strategies. Reference the student's actual data (progress, attendance, upcoming exams) when relevant. Be encouraging but honest.`;
    return context;
  }, [subjects, syllabusUnits, profile, exams, assignments]);

  // ── Dynamic quick prompts ────────────────────────────────────────
  const quickPrompts = useMemo(() => {
    const state = useStore.getState();
    const activeSubjects = subjects.filter((s) => !s.archived);
    const todayStr = new Date().toISOString().split('T')[0];
    const prompts: string[] = [];

    // Subject with lowest progress
    if (activeSubjects.length > 0) {
      let lowestSub = activeSubjects[0];
      let lowestProg = 100;
      for (const s of activeSubjects) {
        const p = getSubjectProgress(state, s.id);
        if (p < lowestProg) {
          lowestProg = p;
          lowestSub = s;
        }
      }
      // Get first incomplete topic for this subject
      const firstIncomplete = syllabusUnits
        .filter((u) => u.subjectId === lowestSub.id)
        .flatMap((u) => u.topics)
        .find((t) => !t.completed);
      if (firstIncomplete) {
        prompts.push(`Explain ${firstIncomplete.name} from ${lowestSub.name}`);
      }
    }

    // Upcoming exam
    const nextExam = exams
      .filter((e) => e.status === 'upcoming' && e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (nextExam) {
      const sub = subjects.find((s) => s.id === nextExam.subjectId);
      prompts.push(`Help me prepare for ${nextExam.name}${sub ? ` (${sub.name})` : ''}`);
    }

    // Due revision items
    const dueRevisions = revisionItems.filter((r) => r.nextReview <= todayStr);
    if (dueRevisions.length > 0) {
      const revSubjectIds = [...new Set(dueRevisions.map((r) => r.subjectId))];
      const revSubject = subjects.find((s) => s.id === revSubjectIds[0]);
      if (revSubject) {
        prompts.push(`Suggest a revision strategy for ${revSubject.name}`);
      }
    }

    // Generic fallback prompts
    if (prompts.length < 2) {
      prompts.push('How should I improve my study routine?');
    }
    if (prompts.length < 3) {
      prompts.push('Tips for better exam preparation');
    }

    return prompts.slice(0, 4);
  }, [subjects, syllabusUnits, exams, assignments, revisionItems]);

  // ── Send with streaming ──────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: buildContext() }),
        signal: abortController.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get('content-type') || '';

      // Streaming response
      if (contentType.includes('text/event-stream')) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        // Add placeholder assistant message
        const assistantMsg: Message = { role: 'assistant', content: '', timestamp: Date.now() };
        setMessages([...newMessages, assistantMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                accumulated = parsed.content;
                break;
              }
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: accumulated,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        // Finalize
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].content) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: 'I could not generate a response. Please try again.',
            };
          }
          return updated;
        });
      } else {
        // Fallback: non-streaming JSON response
        const data = await res.json();
        if (data.error) throw new Error(data.content || 'Unknown error');
        setMessages([...newMessages, { role: 'assistant', content: data.content, timestamp: Date.now() }]);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const topic = userMsg.content.toLowerCase();
      let response = 'I\'m currently offline, but here\'s a suggestion: try breaking down this topic into smaller parts and study each one systematically. Use the Revision feature to schedule spaced repetition sessions.';
      if (topic.includes('formula') || topic.includes('equation')) {
        response = 'For formulas, I recommend creating flashcards with derivations. Try writing them out from memory first, then check your work. Consistent practice is key.';
      } else if (topic.includes('exam') || topic.includes('prepare')) {
        response = 'For exam prep, I suggest: 1) Review your syllabus completion, 2) Focus on topics with low revision scores, 3) Practice previous year questions. Check your Analytics for weak areas.';
      } else if (topic.includes('attend')) {
        response = 'Attendance matters! Check your Attendance view to see which subjects need attention. Even if you can\'t attend, try to get notes from classmates.';
      }
      setMessages([...newMessages, { role: 'assistant', content: response, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  // ── Markdown components ──────────────────────────────────────────
  const mdComponents = useMemo(() => ({
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-semibold mt-3 mb-1.5 first:mt-0">{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="text-xs font-semibold mt-2 mb-1 first:mt-0">{children}</h4>
    ),
    code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        return (
          <code className={`${className} bg-muted rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto block whitespace-pre`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre className="bg-muted rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto my-2">{children}</pre>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside text-xs space-y-0.5 my-1.5">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside text-xs space-y-0.5 my-1.5">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {children}
      </a>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-2">
        <table className="border-collapse border border-border text-xs w-full">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-border px-2 py-1">{children}</td>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground">{children}</blockquote>
    ),
    hr: () => <hr className="border-border my-2" />,
  }), []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="section-label" style={{ fontSize: '13px', letterSpacing: '0' }}>AI Tutor</span>
              {isOnline ? (
                <span className="flex items-center gap-1 text-[10px] text-[var(--delulu-success)] font-medium">
                  <Wifi className="h-2.5 w-2.5" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[var(--delulu-warning)] font-medium">
                  <WifiOff className="h-2.5 w-2.5" /> Offline
                </span>
              )}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground h-7 text-xs">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-base font-semibold mb-1.5">How can I help you study?</h2>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                Ask me about concepts, exam prep, study strategies, or anything academic.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="text-left text-xs p-3 rounded-lg border border-border hover:border-primary/25 bg-card transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div className={`rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border'
                  }`}>
                    {msg.role === 'assistant' ? (
                      msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : isStreaming ? (
                        <div className="flex items-center gap-1 py-1">
                          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                          <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                          <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : null
                    ) : (
                      msg.content
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                  </span>
                </div>
                {msg.role === 'user' && (
                  <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </motion.div>
            ))}
            {/* Non-streaming loading fallback */}
            {isLoading && !isStreaming && (
              <div className="flex gap-2.5">
                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                    <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                    <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-border bg-card shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything about your studies..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
            {isLoading ? (
              <span className="flex items-center gap-0.5">
                <span className="typing-dot" style={{ animationDelay: '0ms', background: 'currentColor' }} />
                <span className="typing-dot" style={{ animationDelay: '150ms', background: 'currentColor' }} />
                <span className="typing-dot" style={{ animationDelay: '300ms', background: 'currentColor' }} />
              </span>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">AI Tutor uses your academic data for personalized help. Works offline with limited responses.</p>
      </div>
    </div>
  );
}
