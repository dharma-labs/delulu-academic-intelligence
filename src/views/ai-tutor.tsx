'use client';

import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Wifi, WifiOff, Loader2, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AITutorView() {
  const { subjects, syllabusUnits, profile } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [messages]);

  const buildContext = () => {
    const subjectNames = subjects.filter((s) => !s.archived).map((s) => s.name);
    const context = `You are an AI academic tutor for a university student named ${profile.name}, studying ${profile.branch || 'Engineering'} in Semester ${profile.semester}.\nSubjects: ${subjectNames.join(', ') || 'None'}.\nAnswer academic questions clearly and concisely. Help with concepts, problem-solving, and study strategies. Be encouraging but honest.`;
    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: buildContext() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...newMessages, { role: 'assistant', content: data.content, timestamp: Date.now() }]);
    } catch {
      // Offline fallback - generate a helpful response
      const topic = userMsg.content.toLowerCase();
      let response = 'I\'m currently offline, but here\'s a suggestion: try breaking down this topic into smaller parts and study each one systematically. Use the Revision feature to schedule spaced repetition sessions.';
      if (topic.includes('formula') || topic.includes('equation')) {
        response = 'For formulas, I recommend creating flashcards with derivations. Try writing them out from memory first, then check your work. Consistent practice is key.';
      } else if (topic.includes('exam') || topic.includes('prepare')) {
        response = `For exam prep, I suggest: 1) Review your syllabus completion, 2) Focus on topics with low revision scores, 3) Practice previous year questions. Check your Analytics for weak areas.`;
      } else if (topic.includes('attend')) {
        response = 'Attendance matters! Check your Attendance view to see which subjects need attention. Even if you can\'t attend, try to get notes from classmates.';
      }
      setMessages([...newMessages, { role: 'assistant', content: response, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const quickPrompts = [
    'Explain a concept from my syllabus',
    'How should I prepare for my next exam?',
    'Help me create a study plan',
    'Tips for improving my attendance strategy',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">AI Tutor</h1>
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <Badge variant="outline" className="text-[10px] gap-1 border-[var(--delulu-success)]/30 text-[var(--delulu-success)]">
                  <Wifi className="w-2.5 h-2.5" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] gap-1 border-[var(--delulu-warning)]/30 text-[var(--delulu-warning)]">
                  <WifiOff className="w-2.5 h-2.5" /> Offline
                </Badge>
              )}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
            <Trash2 className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">How can I help you study?</h2>
            <p className="text-sm text-muted-foreground mb-6">Ask me about concepts, exam prep, study strategies, or anything academic.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="text-left text-sm p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
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
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">AI Tutor is optional. Works offline with limited responses.</p>
      </div>
    </div>
  );
}