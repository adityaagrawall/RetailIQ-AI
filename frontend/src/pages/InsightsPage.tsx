import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryAI, getAISummary } from '../api';
import { Search, Loader2, FileText, CornerDownLeft } from 'lucide-react';
import { clsx } from 'clsx';

const SUGGESTED_QUERIES = [
  'Which 5 products need immediate restocking?',
  'What is driving revenue this month?',
  'Summarize this week\'s inventory health',
  'Which product category has the highest return rate?',
];

interface QueryResult {
  question: string;
  answer: string;
}

export default function InsightsPage() {
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: uploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => import('../api').then(m => m.getAllUploads()),
  });
  const hasActiveDataset = uploads?.some((u: any) => u.is_active);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['ai-summary'],
    queryFn: getAISummary,
    retry: false,
  });

  useEffect(() => {
    if (history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, loading]);

  const runQuery = async (q: string) => {
    if (!q.trim() || loading) return;
    setInput(q);
    setLoading(true);

    try {
      const result = await queryAI(q);
      setHistory(prev => [...prev, { question: q, answer: result.answer }]);
      setInput('');
    } catch (e: any) {
      setHistory(prev => [...prev, { 
        question: q, 
        answer: `System Error: ${e.message || 'Analytics engine unavailable. Verify configuration.'}` 
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-4xl mx-auto border-x border-gray-200 shadow-sm relative">
      
      {/* Empty State */}
      {!uploadsLoading && !hasActiveDataset && (
        <div className="absolute inset-0 bg-[#FBFBFA] z-40 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-12 max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-2">No dataset uploaded yet.</h2>
            <p className="text-sm text-gray-500 mb-8">Upload a retail sales dataset to begin forecasting and business analysis.</p>
            <button 
              onClick={() => navigate('/upload')}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              Upload Dataset
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50/50">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Business Insights</h1>
        <p className="text-sm text-gray-500">Natural language querying for inventory and sales data.</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Executive Summary (Always visible at top if available) */}
        {(summary || summaryLoading) && history.length === 0 && (
          <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Daily Executive Summary</h2>
              {summary?.from_cache && <span className="badge badge-neutral ml-auto">Cached</span>}
            </div>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse" />
              </div>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed font-sans">{summary?.summary}</p>
            )}
          </div>
        )}

        {/* Query History (Document style, not chat) */}
        {history.map((item, idx) => (
          <div key={idx} className="space-y-3 pb-6 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <span className="text-gray-400">Q:</span> {item.question}
            </div>
            <div className="pl-6 prose prose-sm max-w-none text-gray-600 font-sans leading-relaxed whitespace-pre-wrap">
              {item.answer}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="space-y-3 pb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <span className="text-gray-400">Q:</span> {input}
            </div>
            <div className="pl-6 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              Analyzing data warehouse...
            </div>
          </div>
        )}

        {/* Suggestions when empty */}
        {history.length === 0 && !loading && (
          <div className="pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Example Queries</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q}
                  className="text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 py-2 px-3 rounded-md transition-colors w-full border border-transparent hover:border-gray-200"
                  onClick={() => runQuery(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area (Command Palette style) */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex-shrink-0">
        <form 
          className="relative max-w-3xl mx-auto"
          onSubmit={(e) => { e.preventDefault(); runQuery(input); }}
        >
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full bg-white border border-gray-300 rounded-md py-2.5 pl-9 pr-12 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-shadow"
            placeholder="Ask a question about your operational data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
              aria-label="Submit query"
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
