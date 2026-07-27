import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getKPIs, getRevenueTrend, getAlerts } from '../api';
import { AlertCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

function OverviewMetric({ label, value, sub, hero }: { label: string; value: string | number; sub?: string; hero?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 mb-1 font-medium">{label}</span>
      <span className={clsx("font-semibold text-gray-900 tracking-tight font-mono", hero ? "text-4xl" : "text-xl")}>{value}</span>
      {sub && <span className="text-xs text-gray-400 mt-1">{sub}</span>}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded shadow-md px-3 py-2 text-xs border border-gray-800">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="font-medium font-mono">£{(payload[0].value).toLocaleString()}</p>
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: kpis, isLoading: kpiLoading } = useQuery<any>({
    queryKey: ['kpis'],
    queryFn: () => getKPIs(),
  });
  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['revenue-trend', 'weekly'],
    queryFn: () => getRevenueTrend('weekly'),
  });
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts-dash'],
    queryFn: () => getAlerts({ is_resolved: false, limit: 10 }),
  });
  
  const { data: uploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: () => import('../api').then(m => m.getAllUploads()),
  });

  const hasActiveDataset = uploads?.some((u: any) => u.is_active);

  const fmt = (v: number) =>
    v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000 ? `£${(v / 1_000).toFixed(1)}K`
    : `£${v?.toFixed(0) ?? 0}`;

  return (
    <div className="flex flex-col lg:flex-row h-full">
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

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200">
        
        {/* Header w/ Metadata */}
        <div className="p-8 border-b border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-8">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Overview</h1>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> System Operational</div>
              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Data Refreshed 10m ago</div>
              <div className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">Model: XGBoost v1.2</div>
            </div>
          </div>
          
          {/* Asymmetric KPIs */}
          <div className="flex flex-col md:flex-row gap-10 items-start">
            {kpiLoading ? (
              <div className="animate-pulse h-16 w-32 bg-gray-100 rounded" />
            ) : kpis ? (
              <>
                {/* Hero Metric */}
                <div className="md:w-1/3">
                  <OverviewMetric hero label="Net Revenue" value={fmt(kpis.total_revenue)} sub="Lifetime GMV" />
                </div>
                {/* Secondary Metrics */}
                <div className="flex-1 grid grid-cols-3 gap-6 border-l border-gray-100 pl-10">
                  <OverviewMetric label="Avg Daily Revenue" value={fmt(kpis.avg_daily_revenue)} sub={`${kpis.total_transactions?.toLocaleString()} orders`} />
                  <OverviewMetric label="Tracked SKUs" value={kpis.total_products?.toLocaleString()} sub="Active catalog" />
                  <OverviewMetric label="Avg Order Value" value={fmt(kpis.avg_order_value)} sub="Per transaction" />
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 py-4">No metrics available. Upload a dataset to begin processing.</div>
            )}
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-8 flex flex-col min-h-[400px] bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Revenue Velocity</h2>
            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200">Weekly Aggregation</span>
          </div>
          <div className="flex-1 w-full relative">
            {trendLoading ? (
              <div className="absolute inset-0 animate-pulse bg-gray-50 rounded" />
            ) : trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gBlack" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111827" stopOpacity={0.06} />
                      <stop offset="100%" stopColor="#111827" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tickFormatter={v => v?.slice(5)} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={1.5} fill="url(#gBlack)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#111827' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                Awaiting transaction data for velocity analysis
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Exceptions Sidebar ── */}
      <div className="w-full lg:w-80 flex-shrink-0 bg-[#FBFBFA] flex flex-col h-full border-l border-white">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-[#FBFBFA]">
          <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Operational Exceptions</h2>
          {alerts?.length > 0 && (
            <span className="text-xs font-mono bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded">{alerts.length}</span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alertsLoading ? (
             Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-white border border-gray-200 rounded" />
             ))
          ) : alerts?.length > 0 ? (
            alerts.map((a: any) => (
              <div key={a.id} className="bg-white border border-gray-200 rounded p-3 hover:border-gray-300 transition-colors cursor-pointer shadow-sm" onClick={() => navigate(`/inventory/${a.product_id}`)}>
                <div className="flex items-start gap-2.5">
                  <AlertCircle className={clsx('w-3.5 h-3.5 mt-0.5 flex-shrink-0', 
                    a.severity === 'high' ? 'text-red-500' : 
                    a.severity === 'medium' ? 'text-amber-500' : 'text-gray-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium text-gray-900 truncate">{a.stock_code}</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug line-clamp-2">{a.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 h-full border border-dashed border-gray-200 bg-white rounded">
              <p className="text-sm font-medium text-gray-900">No active exceptions.</p>
              <p className="text-xs text-gray-500 mt-1">Inventory operating within nominal parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
