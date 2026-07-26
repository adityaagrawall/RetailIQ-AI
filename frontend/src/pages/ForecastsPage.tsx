import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getProducts, getProductForecast, trainModel, getMLRuns, exportForecastsCSV } from '../api';
import { Play, Download, Loader2, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

export default function ForecastsPage() {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [model, setModel] = useState<'prophet' | 'xgboost'>('prophet');
  const [horizon, setHorizon] = useState(30);

  const { data: productsData } = useQuery({
    queryKey: ['products', 1, '', ''],
    queryFn: () => getProducts({ limit: 200 }),
  });

  const { data: forecast, isLoading: forecastLoading, refetch: refetchForecast } = useQuery({
    queryKey: ['forecast', selectedProduct, model, horizon],
    queryFn: () => getProductForecast(selectedProduct!, model, horizon),
    enabled: !!selectedProduct,
  });

  const { data: runs } = useQuery({
    queryKey: ['ml-runs'],
    queryFn: () => getMLRuns(10),
  });

  const trainMutation = useMutation({
    mutationFn: () => trainModel({ model, horizon_days: horizon }),
  });

  const products = productsData?.data || [];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Product */}
          <div className="sm:col-span-2">
            <label className="text-xs text-text-secondary mb-1 block">Product</label>
            <select
              className="input"
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">— Select a product —</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.stock_code} · {p.description?.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Model</label>
            <select className="input" value={model} onChange={(e) => setModel(e.target.value as any)}>
              <option value="prophet">Prophet (Meta)</option>
              <option value="xgboost">XGBoost</option>
            </select>
          </div>

          {/* Horizon */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Forecast Horizon</label>
            <select className="input" value={horizon} onChange={(e) => setHorizon(parseInt(e.target.value))}>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            className="btn-primary text-xs"
            onClick={() => refetchForecast()}
            disabled={!selectedProduct || forecastLoading}
          >
            {forecastLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Forecast
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={() => trainMutation.mutate()}
            disabled={trainMutation.isPending}
          >
            {trainMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
            Train All Products
          </button>
          {selectedProduct && (
            <button className="btn-ghost text-xs ml-auto" onClick={() => exportForecastsCSV([selectedProduct])}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>

        {trainMutation.isSuccess && (
          <p className="text-xs text-success mt-2">
            Training started (Run #{trainMutation.data?.run_id}). Check ML Runs below for progress.
          </p>
        )}
      </div>

      {/* Forecast Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">
            {selectedProduct
              ? `Forecast: ${forecast?.product_stock_code || '...'}`
              : 'Select a product to view forecast'}
          </h3>
          {forecast?.model_name && (
            <span className="text-xs text-text-muted">
              {forecast.model_name} · {forecast.horizon_days}d horizon · 95% CI
            </span>
          )}
        </div>

        {!selectedProduct && (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
            <TrendingUp className="w-10 h-10 text-text-muted" />
            <p className="text-sm text-text-muted">Select a product to view demand forecast</p>
          </div>
        )}

        {selectedProduct && forecastLoading && (
          <div className="h-64 flex items-center justify-center gap-2 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin text-accent-purple" />
            <span className="text-sm">Training {model} model...</span>
          </div>
        )}

        {forecast && !forecastLoading && (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={forecast.forecasts} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }}
                  formatter={(v: number, name: string) => [Math.round(v), name]}
                  labelStyle={{ color: '#A1A1AA', fontSize: 11 }}
                />
                <Area type="monotone" dataKey="upper_bound" stroke="none" fill="url(#ciGrad)" name="Upper 95%" />
                <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#0A0A0B" fillOpacity={1} name="Lower 95%" />
                <Line type="monotone" dataKey="predicted_quantity" stroke="#8B5CF6" strokeWidth={2.5} dot={false} name="Predicted Qty" />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Metrics */}
            {forecast.metrics && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                {[
                  { label: 'MAE', value: forecast.metrics.mae?.toFixed(2), desc: 'Mean Absolute Error' },
                  { label: 'RMSE', value: forecast.metrics.rmse?.toFixed(2), desc: 'Root Mean Squared Error' },
                  { label: 'MAPE', value: forecast.metrics.mape ? `${forecast.metrics.mape.toFixed(1)}%` : '—', desc: 'Mean Abs % Error' },
                ].map(({ label, value, desc }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-text-muted">{desc}</p>
                    <p className="text-xl font-semibold font-mono text-text-primary mt-1">{value || '—'}</p>
                    <p className="text-xs text-text-muted">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ML Runs Table */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Recent ML Training Runs</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Model</th>
                <th>Status</th>
                <th className="text-right">Products</th>
                <th className="text-right">MAE</th>
                <th className="text-right">MAPE</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {runs?.length > 0 ? (
                runs.map((run: any) => (
                  <tr key={run.id}>
                    <td className="font-mono text-xs text-text-muted">#{run.id}</td>
                    <td className="text-xs capitalize">{run.model_name}</td>
                    <td>
                      <span className={clsx(
                        'badge',
                        run.status === 'completed' ? 'badge-low'
                          : run.status === 'running' ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/20'
                          : run.status === 'failed' ? 'badge-high'
                          : 'badge bg-bg-raised text-text-muted'
                      )}>
                        {run.status}
                      </span>
                    </td>
                    <td className="text-right font-mono text-xs">{run.products_trained ?? '—'}</td>
                    <td className="text-right font-mono text-xs">{run.mae?.toFixed(2) ?? '—'}</td>
                    <td className="text-right font-mono text-xs">{run.mape ? `${run.mape.toFixed(1)}%` : '—'}</td>
                    <td className="text-xs text-text-muted">{run.created_at?.slice(0, 10)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-text-muted text-sm">
                    No training runs yet. Click "Train All Products" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
