import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryAI, getAISummary } from '../api';
import { Sparkles, Send, Loader2, User, Bot } from 'lucide-react';
import { clsx } from 'clsx';

const SUGGESTED_QUESTIONS = [
  'Which 5 products need immediate restocking?',
  'What is driving revenue this month?',
  'Which products should I consider discontinuing?',
  'Summarize this week\'s inventory health.',
  'Which product category has the highest return rate?',
  'What are my top slow-moving products?',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['ai-summary'],
    queryFn: getAISummary,
    retry: false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: question };
    const loadingMsg: Message = { role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await queryAI(question);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: result.answer },
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `Error: ${e.message || 'AI service unavailable. Check GEMINI_API_KEY in your .env file.'}`,
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] space-y-4">
      {/* AI Summary Card */}
      {(summary || summaryLoading) && (
        <div className="card p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            <h2 className="text-sm font-semibold text-text-primary">Today's Executive Summary</h2>
            {summary?.from_cache && <span className="text-[10px] text-text-muted ml-auto">cached</span>}
          </div>
          {summaryLoading ? (
            <div className="space-y-1.5">
              {[1, 0.85, 0.7].map((w, i) => (
                <div key={i} className="skeleton h-3 rounded" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-secondary leading-relaxed">{summary?.summary}</p>
          )}
        </div>
      )}

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <div className="flex-shrink-0">
          <p className="text-xs text-text-muted mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                className="btn-secondary text-xs py-1.5 text-left"
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={clsx('flex gap-2.5 items-start', msg.role === 'user' && 'flex-row-reverse')}
          >
            {/* Avatar */}
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
              msg.role === 'user'
                ? 'bg-accent-blue/15 text-accent-blue'
                : 'bg-accent-purple/15 text-accent-purple'
            )}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            {/* Bubble */}
            <div className={clsx(
              'max-w-[75%] rounded-lg px-4 py-2.5',
              msg.role === 'user'
                ? 'bg-accent-blue/15 border border-accent-blue/20'
                : 'card'
            )}>
              {msg.loading ? (
                <div className="flex gap-1 py-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
        >
          <input
            className="input flex-1"
            placeholder="Ask about your inventory, forecasts, or sales performance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-primary px-4 flex-shrink-0"
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="text-[10px] text-text-muted mt-1.5 text-center">
          Powered by Google Gemini · Responses cached 24h
        </p>
      </div>
    </div>
  );
}
