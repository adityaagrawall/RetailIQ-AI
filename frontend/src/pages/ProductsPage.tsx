import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import { getProducts } from '../api';
import { clsx } from 'clsx';

const ABC_TABS = [
  { key: '', label: 'All Inventory' },
  { key: 'A', label: 'Class A (Top 80%)' },
  { key: 'B', label: 'Class B (Mid 15%)' },
  { key: 'C', label: 'Class C (Bottom 5%)' },
];

export default function ProductsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [abc, setAbc] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, abc, search],
    queryFn: () => getProducts({ page, limit: 50, abc_class: abc || undefined, search: search || undefined }),
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header & Controls */}
      <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-1">Inventory Management</h1>
              <p className="text-xs text-gray-500 font-mono">
                {isLoading ? 'SYNCING...' : `${data?.total?.toLocaleString() ?? 0} SKUS ACTIVE`}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* ABC Filters */}
              <div className="flex bg-gray-100 p-0.5 rounded border border-gray-200">
                {ABC_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-sm transition-all select-none',
                      abc === key 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                        : 'text-gray-500 hover:text-gray-900'
                    )}
                    onClick={() => { setAbc(key); setPage(1); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Search */}
              <form onSubmit={e => { e.preventDefault(); setSearch(q); setPage(1); }}>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    className="w-full bg-white border border-gray-300 rounded py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-shadow"
                    placeholder="Search SKU or Product Name..." 
                    value={q} 
                    onChange={e => setQ(e.target.value)} 
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-gray-50/20">
        <table className="table w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 w-32">SKU</th>
              <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10">Product Name</th>
              <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 w-24 text-center">Class</th>
              <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 w-32 text-right">Velocity (30d)</th>
              <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 w-32 text-right">Est. On Hand</th>
              <th className="px-4 py-3 sticky top-0 bg-gray-50 z-10 w-32 text-right">Last Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              Array.from({ length: 20 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : data?.data?.length > 0 ? (
              data.data.map((p: any) => {
                const estStock = p.current_stock || 0;
                const stockStatus = estStock <= p.safety_stock ? 'critical' : estStock <= (p.safety_stock + (p.avg_daily_sales * p.lead_time_days)) ? 'low' : 'healthy';
                
                return (
                  <tr key={p.id} onClick={() => navigate(`/inventory/${p.id}`)} className="group cursor-pointer hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-gray-900 group-hover:text-blue-600">
                      {p.stock_code}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-900 truncate max-w-[300px]">
                      {p.description || 'Unknown'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                        {p.abc_class || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-600">
                      {p.avg_daily_sales > 0 ? `${p.avg_daily_sales.toFixed(1)}/d` : <span className="text-gray-400">0.0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">
                       <span className={clsx(
                         stockStatus === 'critical' ? 'text-red-600' :
                         stockStatus === 'low' ? 'text-amber-600' : 'text-gray-900'
                       )}>
                         {estStock.toLocaleString()}
                       </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 font-mono text-[11px]">
                      {p.last_sale_date ? p.last_sale_date.slice(0, 10) : '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <PackageOpen className="w-8 h-8 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-900">No inventory records found.</p>
                    <p className="text-xs text-gray-500 mt-1">Adjust your search parameters or connect a data source to begin.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data && data.pages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing <span className="font-medium text-gray-900 font-mono">{(page - 1) * 50 + 1}</span> to <span className="font-medium text-gray-900 font-mono">{Math.min(page * 50, data.total)}</span> of <span className="font-medium text-gray-900 font-mono">{data.total?.toLocaleString()}</span> records
          </p>
          <div className="flex items-center gap-1.5">
            <button className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 font-medium px-2">Page {page}</span>
            <button className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
