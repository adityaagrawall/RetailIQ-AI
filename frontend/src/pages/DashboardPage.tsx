import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { getKPIs, getRevenueTrend, getAlerts, getABCAnalysis, getTopProducts, getSlowMovers, getAllUploads } from '../api';
import { 
  AlertCircle, Clock, Zap, TrendingUp, ShoppingBag, Sparkles, 
  Layers, Package, CheckCircle2, ArrowUpRight, BarChart3, ShieldAlert,
  ArrowUp, Sparkle, RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

function MetricCard({ 
  label, value, sub, icon: Icon, colorTheme, badge 
}: { 
  label: string; value: string | number; sub?: string; icon: any; colorTheme: 'indigo' | 'emerald' | 'amber' | 'blue'; badge?: string 
}) {
  const themeStyles = {
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30',
      border: 'border-indigo-100',
      iconBg: 'bg-indigo-100 text-indigo-600',
      badge: 'bg-indigo-100/80 text-indigo-700 border-indigo-200'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100 text-emerald-600',
      badge: 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100 text-amber-600',
      badge: 'bg-amber-100/80 text-amber-700 border-amber-200'
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30',
      border: 'border-blue-100',
      iconBg: 'bg-blue-100 text-blue-600',
      badge: 'bg-blue-100/80 text-blue-700 border-blue-200'
    }
  }[colorTheme];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${themeStyles.bg} border ${themeStyles.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`p-2 rounded-xl ${themeStyles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${themeStyles.badge}`}>
            {badge}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-slate-500 mt-1.5 block font-sans">{sub}</span>}
    </motion.div>
  );
}

const LightChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-800 text-xs">
        <p className="text-slate-400 mb-1 font-mono">{label}</p>
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

  // ABC Data Formatting
  const abcPieData = abcData?.summary ? [
    { name: 'Class A (Fast Movers)', value: abcData.summary.A?.revenue_pct || 80, color: '#4f46e5', count: abcData.summary.A?.count || 0 },
    { name: 'Class B (Steady Sellers)', value: abcData.summary.B?.revenue_pct || 15, color: '#0284c7', count: abcData.summary.B?.count || 0 },
    { name: 'Class C (Slow Movers)', value: abcData.summary.C?.revenue_pct || 5, color: '#f59e0b', count: abcData.summary.C?.count || 0 },
  ] : [];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      
      {/* ── Main Dashboard Body ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200/80 overflow-y-auto">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-200/80 bg-white">
          
          {/* Main Hero Line: AI Training Banner */}
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl p-5 bg-gradient-to-r from-indigo-50 via-purple-50/50 to-pink-50/30 border border-indigo-100/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                    Model Active & Trained
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Dataset: <strong className="text-slate-800 font-semibold">{activeUpload?.filename || 'Jockey April Sales'}</strong>
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                  AI Model trained on Jockey Sales Report ({activeUpload?.valid_rows || 1270} transactions)
                </h2>
              </div>
            </div>

            <button
              onClick={() => navigate('/insights')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Ask AI Assistant
            </button>
          </motion.div>

          {/* Title Bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Jockey Store Overview</h1>
              <p className="text-xs text-slate-500 mt-0.5">Real-time sales velocity, top revenue drivers, and inventory metrics</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Sync
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
              ))
            ) : kpis ? (
              <>
                <MetricCard 
                  label="Total Sales Turnover" 
                  value={fmt(kpis.total_revenue)} 
                  sub="Gross Sales Revenue (₹ Invoiced)"
                  icon={TrendingUp}
                  colorTheme="indigo"
                  badge="April 2026"
                />
                <MetricCard 
                  label="Avg Daily Sales" 
                  value={fmt(kpis.avg_daily_revenue)} 
                  sub={`${kpis.total_transactions?.toLocaleString()} Total Sales Lines`}
                  icon={BarChart3}
                  colorTheme="emerald"
                />
                <MetricCard 
                  label="Active SKUs" 
                  value={kpis.total_products?.toLocaleString()} 
                  sub="Jockey Product Catalog"
                  icon={Package}
                  colorTheme="blue"
                />
                <MetricCard 
                  label="Avg Basket Size" 
                  value={fmt(kpis.avg_order_value)} 
                  sub="Average Revenue Per Invoice"
                  icon={ShoppingBag}
                  colorTheme="amber"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* ── Visual Analytics Section ── */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sales Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 rounded-2xl p-6 bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Sales Velocity Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Aggregated turnover patterns over time</p>
              </div>

              {/* Granularity Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200/60">
                {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={clsx(
                      "px-3 py-1 rounded-lg capitalize transition-all",
                      granularity === g 
                        ? "bg-white text-slate-900 shadow-sm font-semibold" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full relative">
              {trendLoading ? (
                <div className="absolute inset-0 bg-slate-50 animate-pulse rounded-xl" />
              ) : trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="softIndigo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<LightChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#softIndigo)" activeDot={{ r: 5, fill: '#4f46e5' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Awaiting transaction data for graph
                </div>
              )}
            </div>
          </div>

          {/* ABC Categorization Card (1 Col) */}
          <div className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-0.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                ABC Inventory Classes
              </h3>
              <p className="text-xs text-slate-500 mb-4">Product categorization by sales turnover share</p>
              
              <div className="h-40 w-full relative flex items-center justify-center">
                {abcPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={abcPieData}
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
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
                  <div className="w-28 h-28 rounded-full border-4 border-slate-100 animate-pulse" />
                )}
              </div>
            </div>

            <div className="space-y-2 mt-2 pt-3 border-t border-slate-100 text-xs">
              {abcPieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 font-mono">{item.count} items</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Product Performance (Top Drivers vs Slow Movers) ── */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 border-t border-slate-200/80">
          
          {/* Top Sellers */}
          <div className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">🔥</span>
                Top Revenue Drivers
              </h4>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Ranked by Invoiced Turnover</span>
            </div>

            <div className="space-y-2.5">
              {topProducts?.slice(0, 4).map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-slate-900 truncate">{p.description || p.stock_code}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      SKU: {p.stock_code} • {p.total_quantity?.toLocaleString()} units sold
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 flex-shrink-0">
                    {fmt(p.total_revenue)}
                  </span>
                </div>
              )) || <p className="text-xs text-slate-400 py-3">Loading top items...</p>}
            </div>
          </div>

          {/* Slow Movers */}
          <div className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-100 text-amber-700">⚠️</span>
                Capital Locked (Slow Movers)
              </h4>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Restock Alert
              </span>
            </div>

            <div className="space-y-2.5">
              {slowMovers?.slice(0, 4).map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-100/80">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-slate-900 truncate">{p.description || p.stock_code}</p>
                    <p className="text-[10px] text-amber-700 font-mono mt-0.5">
                      Velocity: {p.avg_30d_sales?.toFixed(2)} units/day
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0">
                    {p.severity || 'Slow'}
                  </span>
                </div>
              )) || <p className="text-xs text-slate-400 py-3">No slow movers detected.</p>}
            </div>
          </div>

        </div>

      </div>

      {/* ── Operational Exceptions Sidebar ── */}
      <div className="w-full lg:w-80 flex-shrink-0 bg-white flex flex-col h-full border-l border-slate-200/80">
        <div className="px-6 py-5 border-b border-slate-200/80 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            Stock Risk Alerts
          </h3>
          {alerts?.length > 0 && (
            <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
              {alerts.length}
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alertsLoading ? (
             Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-slate-50 rounded-xl" />
             ))
          ) : alerts?.length > 0 ? (
            alerts.map((a: any) => (
              <div 
                key={a.id} 
                className="bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 rounded-xl p-3.5 transition-all cursor-pointer shadow-2xs group"
                onClick={() => navigate(`/inventory/${a.product_id}`)}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', 
                    a.severity === 'high' ? 'text-rose-500' : 
                    a.severity === 'medium' ? 'text-amber-500' : 'text-slate-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                      {a.stock_code}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">{a.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 h-full border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-800">No active stock alerts</p>
              <p className="text-[11px] text-slate-400 mt-1">Catalog operating within parameters.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
