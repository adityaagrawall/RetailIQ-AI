import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { getKPIs, getRevenueTrend, getAlerts, getABCAnalysis, getTopProducts, getSlowMovers, getAllUploads } from '../api';
import { 
  AlertCircle, Clock, Zap, TrendingUp, ShoppingBag, Sparkles, 
  Layers, Package, CheckCircle2, ArrowUpRight, BarChart3, ShieldAlert
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

function MetricCard({ 
  label, value, sub, icon: Icon, gradient, badge 
}: { 
  label: string; value: string | number; sub?: string; icon: any; gradient: string; badge?: string 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient} border border-white/10 backdrop-blur-md`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-white/70">{label}</span>
        <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight font-mono">{value}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
            {badge}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-white/60 mt-2 block font-sans">{sub}</span>}
    </motion.div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-xl p-3 shadow-xl border border-gray-800 text-xs">
        <p className="text-gray-400 mb-1 font-mono">{label}</p>
        <p className="font-semibold text-emerald-400 font-mono text-sm">
          ₹{(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const { data: kpis, isLoading: kpiLoading } = useQuery<any>({
    queryKey: ['kpis'],
    queryFn: () => getKPIs(),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['trend', granularity],
    queryFn: () => getRevenueTrend(granularity),
  });

  const { data: abcData } = useQuery({
    queryKey: ['abcAnalysis'],
    queryFn: () => getABCAnalysis(),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['topProducts'],
    queryFn: () => getTopProducts(5),
  });

  const { data: slowMovers } = useQuery({
    queryKey: ['slowMovers'],
    queryFn: () => getSlowMovers(30),
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts-dash'],
    queryFn: () => getAlerts({ is_resolved: false, limit: 10 }),
  });

  const { data: uploads } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => getAllUploads(),
  });

  const activeUpload = uploads?.find((u: any) => u.is_active);

  const fmt = (v?: number) => {
    if (v === undefined || v === null) return "₹0";
    return v >= 1_000_000_000 ? `₹${(v / 1_000_000_000).toFixed(2)}B`
    : v >= 1_000_000 ? `₹${(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000 ? `₹${(v / 1_000).toFixed(1)}K`
    : `₹${v?.toFixed(0) ?? 0}`;
  };

  // Prepare ABC Chart Data
  const abcPieData = abcData?.summary ? [
    { name: 'Class A (Top 80% Sales)', value: abcData.summary.A?.revenue_pct || 80, color: '#6366f1', count: abcData.summary.A?.count || 0 },
    { name: 'Class B (Mid 15% Sales)', value: abcData.summary.B?.revenue_pct || 15, color: '#3b82f6', count: abcData.summary.B?.count || 0 },
    { name: 'Class C (Bottom 5% Slow)', value: abcData.summary.C?.revenue_pct || 5, color: '#f59e0b', count: abcData.summary.C?.count || 0 },
  ] : [];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0F172A] text-slate-100 font-sans">
      
      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800/80 overflow-y-auto">
        
        {/* Top Gradient Banner */}
        <div className="p-8 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          
          {/* Hero ML Banner */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 rounded-2xl p-6 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-indigo-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 shadow-inner">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase tracking-widest">
                      AI Model Active
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Trained on {activeUpload?.filename || 'Jockey Dataset'}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    Demand Velocity & Store Intelligence Engine
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/insights')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 group"
                >
                  <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  Ask AI Insights
                </button>
              </div>
            </div>
          </motion.div>

          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {kpiLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-700/50" />
              ))
            ) : kpis ? (
              <>
                <MetricCard 
                  label="Gross Sales Turnover" 
                  value={fmt(kpis.total_revenue)} 
                  sub="Total Invoiced Gross Turnover"
                  icon={TrendingUp}
                  gradient="bg-gradient-to-br from-indigo-900/90 via-slate-900 to-indigo-950/80"
                  badge="Live"
                />
                <MetricCard 
                  label="Avg Daily Sales" 
                  value={fmt(kpis.avg_daily_revenue)} 
                  sub={`${kpis.total_transactions?.toLocaleString()} Sales Transactions`}
                  icon={BarChart3}
                  gradient="bg-gradient-to-br from-blue-900/90 via-slate-900 to-blue-950/80"
                />
                <MetricCard 
                  label="Active SKUs" 
                  value={kpis.total_products?.toLocaleString()} 
                  sub="Unique Catalog Items"
                  icon={Package}
                  gradient="bg-gradient-to-br from-violet-900/90 via-slate-900 to-purple-950/80"
                />
                <MetricCard 
                  label="Avg Basket Size" 
                  value={fmt(kpis.avg_order_value)} 
                  sub="Average Revenue Per Invoice"
                  icon={ShoppingBag}
                  gradient="bg-gradient-to-br from-emerald-900/90 via-slate-900 to-teal-950/80"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* ── Multi-Chart Dashboard Hub ── */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Sales Velocity Area Chart (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col min-h-[380px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Sales Velocity Trend
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Calculated movement over customizable time windows</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50 text-xs">
                {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg font-medium capitalize transition-all",
                      granularity === g 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                        : "text-slate-400 hover:text-white hover:bg-slate-700/40"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full relative min-h-[260px]">
              {trendLoading ? (
                <div className="absolute inset-0 animate-pulse bg-slate-800/30 rounded-xl" />
              ) : trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="indigoGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="period" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2.5} fill="url(#indigoGlow)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 bg-slate-800/20 rounded-xl border border-dashed border-slate-700/50">
                  Awaiting transaction data for velocity trend
                </div>
              )}
            </div>
          </div>

          {/* ABC Inventory Breakdown Card (1 col) */}
          <div className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-blue-400" />
                ABC Revenue Class
              </h2>
              <p className="text-xs text-slate-400 mb-4">Pareto revenue concentration (A: 80% | B: 15% | C: 5%)</p>
              
              <div className="h-44 w-full relative flex items-center justify-center">
                {abcPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={abcPieData}
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {abcPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value}% Turnover`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="animate-pulse w-32 h-32 rounded-full border-4 border-slate-700/40" />
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/60 text-xs">
              {abcPieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-300 font-mono">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-sans text-slate-400">{item.name}</span>
                  </div>
                  <span className="font-semibold text-white">{item.count} SKUs</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Product Performance Insights (Top Drivers vs Slow Movers) ── */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-800/80 bg-slate-950/40">
          
          {/* Top Revenue Drivers */}
          <div className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500/20 text-amber-400">🔥</span>
                Top Revenue Drivers
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Ranked by Invoiced Sales</span>
            </div>

            <div className="space-y-3">
              {topProducts?.slice(0, 4).map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-white truncate">{p.description || p.stock_code}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      SKU: {p.stock_code} • {p.total_quantity?.toLocaleString()} units
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex-shrink-0">
                    {fmt(p.total_revenue)}
                  </span>
                </div>
              )) || <p className="text-xs text-slate-500 py-4">Loading top performers...</p>}
            </div>
          </div>

          {/* Slow Moving Capital Locked */}
          <div className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="p-1 rounded bg-rose-500/20 text-rose-400">⚠️</span>
                Capital Locked (Slow Movers)
              </h3>
              <span className="text-[10px] text-amber-400 font-mono font-medium">Restock Risk</span>
            </div>

            <div className="space-y-3">
              {slowMovers?.slice(0, 4).map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-white truncate">{p.description || p.stock_code}</p>
                    <p className="text-[10px] text-rose-300/70 font-mono mt-0.5">
                      Velocity: {p.avg_30d_sales?.toFixed(2)} units/day
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex-shrink-0">
                    {p.severity || 'Slow'}
                  </span>
                </div>
              )) || <p className="text-xs text-slate-500 py-4">No slow movers detected.</p>}
            </div>
          </div>

        </div>
      </div>

      {/* ── Exceptions Sidebar ── */}
      <div className="w-full lg:w-80 flex-shrink-0 bg-slate-900/80 backdrop-blur-xl flex flex-col h-full border-l border-slate-800/80">
        <div className="px-6 py-5 border-b border-slate-800/80 flex justify-between items-center sticky top-0 bg-slate-900/90 z-20">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Operational Exceptions
          </h2>
          {alerts?.length > 0 && (
            <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
              {alerts.length}
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alertsLoading ? (
             Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-slate-800/40 rounded-xl border border-slate-700/40" />
             ))
          ) : alerts?.length > 0 ? (
            alerts.map((a: any) => (
              <div 
                key={a.id} 
                className="bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 transition-all cursor-pointer shadow-md group"
                onClick={() => navigate(`/inventory/${a.product_id}`)}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', 
                    a.severity === 'high' ? 'text-rose-400' : 
                    a.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                      {a.stock_code}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[11px] text-slate-300 mt-1.5 leading-snug line-clamp-2">{a.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 h-full border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-white">No active exceptions</p>
              <p className="text-[11px] text-slate-400 mt-1">Catalog operating within parameters.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
