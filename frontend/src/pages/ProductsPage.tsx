import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts } from '../api';
import { clsx } from 'clsx';

const ABC_FILTERS = [
  { label: 'All', value: '' },
  { label: 'A — Top 80%', value: 'A' },
  { label: 'B — Mid 15%', value: 'B' },
  { label: 'C — Low 5%', value: 'C' },
];

export default function ProductsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [abcFilter, setAbcFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, abcFilter, search],
    queryFn: () => getProducts({ page, limit: 50, abc_class: abcFilter || undefined, search: search || undefined }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatCurrency = (v: number) =>
    v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000 ? `£${(v / 1_000).toFixed(1)}K`
    : `£${v.toFixed(0)}`;

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Products</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {data?.total?.toLocaleString() || '—'} products tracked
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* ABC Filter */}
          <div className="flex gap-1">
            {ABC_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                className={clsx(
                  'px-3 py-1.5 text-xs rounded font-medium transition-all',
                  abcFilter === value
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-raised border border-border text-text-secondary hover:text-text-primary'
                )}
                onClick={() => { setAbcFilter(value); setPage(1); }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                className="input pl-8 py-1.5 w-48 text-xs"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-secondary py-1.5 text-xs">Search</button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Stock Code</th>
              <th>Description</th>
              <th>ABC</th>
              <th className="text-right">Total Revenue</th>
              <th className="text-right">Total Qty</th>
              <th className="text-right">Avg Daily Sales</th>
              <th>Last Sale</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                  ))}
                </tr>
              ))
            ) : data?.data?.length > 0 ? (
              data.data.map((p: any) => (
                <tr
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/products/${p.id}`)}
                >
                  <td className="font-mono text-xs text-accent-blue">{p.stock_code}</td>
                  <td className="max-w-xs truncate text-text-primary">{p.description || '—'}</td>
                  <td>
                    {p.abc_class ? (
                      <span className={`badge badge-${p.abc_class}`}>{p.abc_class}</span>
                    ) : '—'}
                  </td>
                  <td className="text-right font-mono text-xs">{formatCurrency(p.total_revenue)}</td>
                  <td className="text-right font-mono text-xs">{p.total_quantity?.toLocaleString()}</td>
                  <td className="text-right font-mono text-xs">{p.avg_daily_sales?.toFixed(1)}</td>
                  <td className="text-xs text-text-muted">{p.last_sale_date || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text-muted">
                  {search ? `No products matching "${search}"` : 'No products found. Upload data first.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Page {page} of {data.pages} · {data.total?.toLocaleString()} total
          </p>
          <div className="flex gap-1">
            <button
              className="btn-secondary py-1 px-2 text-xs"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              className="btn-secondary py-1 px-2 text-xs"
              disabled={page >= data.pages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
