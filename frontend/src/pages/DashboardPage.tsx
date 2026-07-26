import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  ShoppingCart, AlertTriangle, Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';
import { getKPIs, getRevenueTrend, getTopProducts, getAlerts, getAISummary } from '../api';
import { clsx } from 'clsx';
import { exportAlertsCSV } from '../api';

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, trend, color = 'blue'
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'purple' | 'green' | 'amber';
}) {
  const colors = {
    blue: 'text-accent-blue bg-accent-blue/10',
    purple: 'text-accent-purple bg-accent-purple/10',
    green: 'text-success bg-success/10',
    amber: 'text-warning bg-warning/10',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={clsx('flex items-center gap-0.5 text-xs font-medium',
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted'
          )}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-text-primary tracking-tight">{value}</p>
        <p className="text-xs text-text-secondary mt-0.5">{label}</p>
        {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton w-9 h-9 rounded-lg" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-3 w-32" />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: getKPIs,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['revenue-trend', 'weekly'],
    queryFn: () => getRevenueTrend('weekly'),
  });

  const { data: topProducts, isLoading: topLoading } = useQuery({
    queryKey: ['top-products', 10],
    queryFn: () => getTopProducts(10),
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', { is_resolved: false }],
    queryFn: () => getAlerts({ is_resolved: false, limit: 4 }),
  });

  const { data: aiSummary, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-summary'],
    queryFn: getAISummary,
    retry: false, // Don't retry if Gemini key not set
  });

  const formatCurrency = (v: number) =>
    v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000 ? `£${(v / 1_000).toFixed(1)}K`
    : `£${v.toFixed(0)}`;

  return (
    <div className="space-y-6">
      {/* ── KPI Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : kpis ? (
          <>
            <StatCard
              label="Total Revenue"
              value={formatCurrency(kpis.total_revenue)}
              sub={`${kpis.date_range_start} → ${kpis.date_range_end}`}
              icon={DollarSign}
              color="blue"
              trend="up"
            />
            <StatCard
              label="Avg Daily Revenue"
              value={formatCurrency(kpis.avg_daily_revenue)}
              sub={`${kpis.total_transactions?.toLocaleString()} transactions`}
              icon={TrendingUp}
              color="purple"
              trend="up"
            />
            <StatCard
              label="Products Tracked"
              value={kpis.total_products?.toLocaleString()}
              sub={`Return rate: ${kpis.return_rate_pct}%`}
              icon={Package}
              color="green"
            />
            <StatCard
              label="Avg Order Value"
              value={formatCurrency(kpis.avg_order_value)}
              sub={`Top market: ${kpis.top_country}`}
              icon={ShoppingCart}
              color="amber"
            />
          </>
        ) : (
          <div className="col-span-4 card p-8 text-center">
            <p className="text-text-muted">No data yet. <button className="text-accent-blue hover:underline" onClick={() => navigate('/upload')}>Upload your first dataset →</button></p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Revenue Trend ──────────────────────────────────────── */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Revenue Trend</h2>
            <span className="text-xs text-text-muted">Weekly</span>
          </div>
          {trendLoading ? (
            <div className="skeleton h-56 w-full rounded" />
          ) : trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [`£${v.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }}
                  labelStyle={{ color: '#A1A1AA' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-text-muted text-sm">No revenue data</div>
          )}
        </div>

        {/* ── AI Summary ─────────────────────────────────────────── */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            <h2 className="text-sm font-semibold text-text-primary">AI Daily Summary</h2>
            {aiSummary?.from_cache && (
              <span className="text-[10px] text-text-muted ml-auto">cached</span>
            )}
          </div>
          {aiLoading ? (
            <div className="space-y-2 flex-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={clsx('skeleton h-3', i % 3 === 2 ? 'w-3/4' : 'w-full')} />
              ))}
            </div>
          ) : aiSummary ? (
            <p className="text-xs text-text-secondary leading-relaxed flex-1">{aiSummary.summary}</p>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
              <Sparkles className="w-8 h-8 text-text-muted" />
              <p className="text-xs text-text-muted">Configure GEMINI_API_KEY to enable AI insights</p>
              <button className="btn-secondary text-xs py-1" onClick={() => navigate('/ai')}>
                Open AI Assistant
              </button>
            </div>
          )}
          {aiSummary && (
            <button
              className="btn-ghost mt-3 text-xs justify-center"
              onClick={() => navigate('/ai')}
            >
              Ask a question <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ── Top Products ───────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Top Products by Revenue</h2>
            <button className="btn-ghost text-xs" onClick={() => navigate('/products')}>
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {topLoading ? (
            <div className="skeleton h-48 w-full rounded" />
          ) : topProducts?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 80, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="description" tick={{ fontSize: 10 }} width={80} tickFormatter={(v: string) => v?.slice(0, 14) + (v?.length > 14 ? '…' : '')} />
                <Tooltip
                  formatter={(v: number) => [`£${v.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }}
                />
                <Bar dataKey="total_revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">No product data</div>
          )}
        </div>

        {/* ── Recent Alerts ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Active Alerts</h2>
            <button className="btn-ghost text-xs" onClick={() => navigate('/alerts')}>
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {alerts && alerts.length > 0 ? (
              alerts.slice(0, 4).map((alert: any) => (
                <div
                  key={alert.id}
                  className={clsx('card p-3 cursor-pointer', `alert-${alert.severity}`)}
                  onClick={() => navigate('/alerts')}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={clsx(
                      'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                      alert.severity === 'high' ? 'text-danger' : alert.severity === 'medium' ? 'text-warning' : 'text-success'
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{alert.description || alert.stock_code}</p>
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{alert.message}</p>
                    </div>
                    <span className={clsx('badge flex-shrink-0', `badge-${alert.severity}`)}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-48 flex items-center justify-center flex-col gap-2 text-center">
                <AlertTriangle className="w-8 h-8 text-text-muted" />
                <p className="text-sm text-text-muted">No active alerts</p>
                <p className="text-xs text-text-muted">Upload data to generate alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
