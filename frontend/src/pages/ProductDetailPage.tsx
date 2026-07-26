import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { ArrowLeft, TrendingUp, Sparkles, Play, Loader2 } from 'lucide-react';
import { getProduct, getProductSales, getProductForecast, explainForecast } from '../api';
import { clsx } from 'clsx';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = parseInt(id || '0');
  const [model, setModel] = useState<'prophet' | 'xgboost'>('prophet');
  const [showForecast, setShowForecast] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  });

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['product-sales', productId],
    queryFn: () => getProductSales(productId),
    enabled: !!productId,
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['forecast', productId, model],
    queryFn: () => getProductForecast(productId, model, 30),
    enabled: showForecast,
  });

  const handleExplain = async () => {
    setLoadingAI(true);
    try {
      const result = await explainForecast(productId, 30);
      setAiExplanation(result.explanation);
    } catch {
      setAiExplanation('AI explanation unavailable. Check GEMINI_API_KEY configuration.');
    }
    setLoadingAI(false);
  };

  const formatCurrency = (v: number) =>
    v >= 1_000 ? `£${(v / 1_000).toFixed(1)}K` : `£${v.toFixed(0)}`;

  if (productLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button className="btn-ghost py-1 px-2" onClick={() => navigate('/products')}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              {product?.description || product?.stock_code}
            </h2>
            {product?.abc_class && (
              <span className={`badge badge-${product.abc_class}`}>{product.abc_class}</span>
            )}
          </div>
          <p className="text-xs text-text-muted font-mono mt-0.5">{product?.stock_code}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: formatCurrency(product?.summary?.total_revenue || 0) },
          { label: 'Total Quantity', value: product?.summary?.total_quantity?.toLocaleString() || '0' },
          { label: 'Avg Daily Sales', value: product?.summary?.avg_daily_sales?.toFixed(1) || '0' },
          { label: 'Active Days', value: product?.summary?.active_days?.toLocaleString() || '0' },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4">
            <p className="text-lg font-semibold text-text-primary">{value}</p>
            <p className="text-xs text-text-secondary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sales History */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Sales History</h3>
        {salesLoading ? (
          <div className="skeleton h-52 w-full rounded" />
        ) : sales?.length > 0 ? (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={sales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sale_date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }}
                formatter={(v: number, name: string) => [v, name === 'total_quantity' ? 'Qty' : 'Revenue']}
              />
              <Line type="monotone" dataKey="total_quantity" stroke="#3B82F6" strokeWidth={2} dot={false} name="Qty" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-52 flex items-center justify-center text-text-muted text-sm">No sales history</div>
        )}
      </div>

      {/* Forecast Section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Demand Forecast</h3>
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="flex gap-1">
              {(['prophet', 'xgboost'] as const).map((m) => (
                <button
                  key={m}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded font-medium transition-all',
                    model === m
                      ? 'bg-accent-purple text-white'
                      : 'bg-bg-raised border border-border text-text-secondary hover:text-text-primary'
                  )}
                  onClick={() => setModel(m)}
                >
                  {m === 'prophet' ? 'Prophet' : 'XGBoost'}
                </button>
              ))}
            </div>
            <button
              className="btn-primary py-1 text-xs gap-1.5"
              onClick={() => setShowForecast(true)}
            >
              {forecastLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run Forecast
            </button>
          </div>
        </div>

        {!showForecast && (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-center">
            <TrendingUp className="w-10 h-10 text-text-muted" />
            <p className="text-sm text-text-muted">Click "Run Forecast" to generate 30-day demand predictions</p>
          </div>
        )}

        {showForecast && forecastLoading && (
          <div className="h-52 flex items-center justify-center gap-2 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin text-accent-purple" />
            <span className="text-sm">Training {model} model...</span>
          </div>
        )}

        {showForecast && forecast && !forecastLoading && (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={forecast.forecasts} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }}
                  formatter={(v: number, name: string) => [Math.round(v), name]}
                />
                <Area type="monotone" dataKey="upper_bound" stroke="none" fill="#8B5CF6" fillOpacity={0.12} name="Upper 95%" />
                <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#0A0A0B" fillOpacity={1} name="Lower 95%" />
                <Line type="monotone" dataKey="predicted_quantity" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Forecast" />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Metrics */}
            {forecast.metrics && (
              <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                {[
                  { label: 'MAE', value: forecast.metrics.mae?.toFixed(2) },
                  { label: 'RMSE', value: forecast.metrics.rmse?.toFixed(2) },
                  { label: 'MAPE', value: forecast.metrics.mape ? `${forecast.metrics.mape.toFixed(1)}%` : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-text-muted">{label}</p>
                    <p className="text-sm font-mono font-medium text-text-primary">{value || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* AI Explain */}
            <div className="mt-3">
              {aiExplanation ? (
                <div className="card p-3 bg-accent-purple/5 border-accent-purple/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
                    <span className="text-xs font-medium text-accent-purple">AI Explanation</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{aiExplanation}</p>
                </div>
              ) : (
                <button
                  className="btn-ghost text-xs gap-1.5"
                  onClick={handleExplain}
                  disabled={loadingAI}
                >
                  {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Explain this forecast with AI
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
