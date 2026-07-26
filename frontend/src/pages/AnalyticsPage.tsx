import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { getABCAnalysis, getSlowMovers, getRevenueTrend } from '../api';
import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

const ABC_COLORS = {
  A: '#22C55E',
  B: '#3B82F6',
  C: '#52525B',
};

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#06B6D4', '#EC4899'];

export default function AnalyticsPage() {
  const { data: abc, isLoading: abcLoading } = useQuery({
    queryKey: ['abc-analysis'],
    queryFn: getABCAnalysis,
  });

  const { data: slowMovers, isLoading: slowLoading } = useQuery({
    queryKey: ['slow-movers'],
    queryFn: () => getSlowMovers(30),
  });

  const abcPieData = abc ? [
    { name: 'Class A (Top 80%)', value: abc.A?.length || 0, color: ABC_COLORS.A },
    { name: 'Class B (Mid 15%)', value: abc.B?.length || 0, color: ABC_COLORS.B },
    { name: 'Class C (Bottom 5%)', value: abc.C?.length || 0, color: ABC_COLORS.C },
  ] : [];

  const abcRevPieData = abc ? [
    { name: 'Class A', value: abc.summary?.A?.revenue_pct || 0, color: ABC_COLORS.A },
    { name: 'Class B', value: abc.summary?.B?.revenue_pct || 0, color: ABC_COLORS.B },
    { name: 'Class C', value: abc.summary?.C?.revenue_pct || 0, color: ABC_COLORS.C },
  ] : [];

  return (
    <div className="space-y-5">
      {/* ABC Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ABC by Product Count */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">ABC Analysis — Product Count</h3>
          <p className="text-xs text-text-muted mb-4">Products classified by revenue contribution</p>
          {abcLoading ? (
            <div className="skeleton h-52 w-full rounded" />
          ) : abcPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={abcPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {abcPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [v, name]}
                  contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-text-muted text-sm">
              Run ABC analysis first
            </div>
          )}
        </div>

        {/* ABC by Revenue */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">ABC Analysis — Revenue Share</h3>
          <p className="text-xs text-text-muted mb-4">Percentage of total revenue per class</p>
          {abcLoading ? (
            <div className="skeleton h-52 w-full rounded" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={abcRevPieData} cx="50%" cy="50%" outerRadius={65} paddingAngle={2} dataKey="value">
                    {abcRevPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                    contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {abc?.summary && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {(['A', 'B', 'C'] as const).map((cls) => (
                    <div key={cls} className="text-center card p-2">
                      <span className={`badge badge-${cls} mb-1`}>{cls}</span>
                      <p className="text-base font-semibold text-text-primary">{abc.summary[cls]?.count}</p>
                      <p className="text-xs text-text-muted">{abc.summary[cls]?.revenue_pct?.toFixed(1)}% rev</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Slow Movers Table */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-text-primary">Slow-Moving Products</h3>
          <span className="text-xs text-text-muted ml-auto">
            IQR-based · last 30 days
          </span>
        </div>
        {slowLoading ? (
          <div className="skeleton h-40 w-full rounded" />
        ) : slowMovers?.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Stock Code</th>
                  <th>Description</th>
                  <th className="text-right">Avg Daily Sales</th>
                  <th className="text-right">Threshold</th>
                  <th className="text-right">Days Since Sale</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {slowMovers.map((p: any) => (
                  <tr key={p.product_id}>
                    <td className="font-mono text-xs text-accent-blue">{p.stock_code}</td>
                    <td className="text-xs truncate max-w-xs">{p.description}</td>
                    <td className="text-right font-mono text-xs">{p.avg_30d_sales?.toFixed(2)}</td>
                    <td className="text-right font-mono text-xs text-text-muted">{p.threshold?.toFixed(2)}</td>
                    <td className="text-right font-mono text-xs">{p.days_since_last_sale ?? '—'}</td>
                    <td><span className={`badge badge-${p.severity}`}>{p.severity}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-8">No slow-moving products detected</p>
        )}
      </div>
    </div>
  );
}
