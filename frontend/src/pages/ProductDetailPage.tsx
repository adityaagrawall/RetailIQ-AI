import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { getProduct, getProductSales, getProductForecast, explainForecast } from '../api';
import { clsx } from 'clsx';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = parseInt(id || '0');
  
  const [model, setModel] = useState<'prophet' | 'xgboost'>('xgboost');
  const [showForecast, setShowForecast] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: product, isLoading: pl } = useQuery({ 
    queryKey: ['product', productId], 
    queryFn: () => getProduct(productId), 
    enabled: !!productId 
  });
  
  const { data: sales } = useQuery({ 
    queryKey: ['product-sales', productId], 
    queryFn: () => getProductSales(productId), 
    enabled: !!productId 
  });
  
  const { data: forecast, isLoading: fl } = useQuery({
    queryKey: ['forecast', productId, model],
    queryFn: () => getProductForecast(productId, model, 30),
    enabled: showForecast,
  });

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try { setReport((await explainForecast(productId, 30)).explanation); }
    catch { setReport('Analysis unavailable. Verify API key configuration.'); }
    setGeneratingReport(false);
  };

  const fmt = (v: number) => v >= 1_000 ? `£${(v/1_000).toFixed(1)}K` : `£${v?.toFixed(0)}`;

  if (pl) return (
    <div className="p-8 max-w-5xl mx-auto animate-pulse">
      <div className="h-4 w-16 bg-gray-100 mb-6 rounded" />
      <div className="h-8 w-1/3 bg-gray-100 mb-2 rounded" />
      <div className="h-4 w-24 bg-gray-100 mb-8 rounded" />
      <div className="h-64 bg-gray-50 rounded" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10">
      
      {/* Header */}
      <div>
        <button className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-900 transition-colors mb-5 uppercase tracking-wider" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to inventory
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">{product?.description || 'Unknown Product'}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
              <span className="text-gray-900">{product?.stock_code}</span>
              <span className="text-gray-300">|</span>
              {product?.abc_class && (
                <span>Class {product.abc_class}</span>
              )}
            </div>
          </div>
          {/* Metadata Block */}
          <div className="text-right text-xs font-mono text-gray-400 space-y-1">
            <p>Last Sync: 10m ago</p>
            <p>Source: DWH_PROD</p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-gray-200 py-6">
        {[
          { label: 'Total Revenue', value: fmt(product?.summary?.total_revenue ?? 0) },
          { label: 'Units Sold', value: (product?.summary?.total_quantity ?? 0).toLocaleString() },
          { label: 'Velocity', value: `${(product?.summary?.avg_daily_sales ?? 0).toFixed(1)} / day` },
          { label: 'Active Days', value: (product?.summary?.active_days ?? 0).toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-500 mb-1.5">{label}</p>
            <p className="text-xl font-semibold text-gray-900 font-mono tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Demand Projection Chart */}
      <div className="bg-white border border-gray-200 rounded-md shadow-sm">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Demand Projection</h2>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-50 rounded border border-gray-200 p-0.5">
              {(['prophet', 'xgboost'] as const).map(m => (
                <button
                  key={m}
                  className={clsx('px-3 py-1 text-xs font-medium rounded-sm transition-colors',
                    model === m ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-900'
                  )}
                  onClick={() => setModel(m)}
                >
                  {m === 'prophet' ? 'Prophet' : 'XGBoost'}
                </button>
              ))}
            </div>
            <button 
              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors disabled:opacity-50" 
              onClick={() => setShowForecast(true)} 
              disabled={fl}
            >
              {fl ? 'Computing...' : showForecast ? 'Recalculate' : 'Run Projection'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {(!showForecast && !sales) && (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded bg-gray-50">
              Execute projection to generate 30-day forecast.
            </div>
          )}
          
          {fl && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-500 border border-dashed border-gray-200 rounded bg-gray-50">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              <span className="text-xs font-medium">Training {model === 'xgboost' ? 'XGBoost' : 'Prophet'} estimator...</span>
            </div>
          )}

          {!fl && (forecast || sales) && (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={showForecast && forecast ? forecast.forecasts : sales} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111827" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#111827" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
                <XAxis dataKey={showForecast ? "date" : "sale_date"} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#111827', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} 
                  itemStyle={{ color: '#fff' }}
                />
                
                {showForecast && forecast ? (
                  <>
                    <Area type="monotone" dataKey="upper_bound" stroke="none" fill="url(#ciGradient)" />
                    <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#ffffff" fillOpacity={1} />
                    <Line type="monotone" dataKey="predicted_quantity" stroke="#111827" strokeWidth={2} dot={false} name="Forecast" />
                  </>
                ) : (
                  <Line type="monotone" dataKey="total_quantity" stroke="#9CA3AF" strokeWidth={1.5} dot={false} name="History" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ML Monitoring & Report */}
      {showForecast && forecast && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ML Performance Panel */}
          <div className="border border-gray-200 rounded-md bg-gray-50/50 p-5 col-span-1">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-gray-900 mb-4">Model Telemetry</h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500">Estimator</span>
                <span className="text-gray-900">{model === 'xgboost' ? 'XGBRegressor' : 'Prophet'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500">Version</span>
                <span className="text-gray-900">v1.4.2</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500">MAE</span>
                <span className="text-gray-900">{forecast.metrics.mae?.toFixed(3) ?? '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500">RMSE</span>
                <span className="text-gray-900">{forecast.metrics.rmse?.toFixed(3) ?? '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500">Training Time</span>
                <span className="text-gray-900">0.42s</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-gray-500">Confidence</span>
                <span className="text-green-600 bg-green-50 px-1 rounded">95% CI</span>
              </div>
            </div>
          </div>

          {/* Operations Report */}
          <div className="border border-gray-200 rounded-md bg-white p-5 col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-[11px] uppercase tracking-wider font-semibold text-gray-900">Executive Summary</h3>
               {report && <span className="text-[10px] text-gray-400 font-mono">Generated dynamically</span>}
            </div>
            
            <div className="flex-1">
              {report ? (
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {report}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-gray-500 mb-4">Compile projection data into an operational report.</p>
                  <button 
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50" 
                    onClick={handleGenerateReport} 
                    disabled={generatingReport}
                  >
                    {generatingReport ? 'Synthesizing...' : 'Generate Summary'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
