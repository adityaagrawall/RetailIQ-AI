import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, TrendingUp, Bell,
  Sparkles, BarChart3, Upload, Activity
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/forecasts', icon: TrendingUp, label: 'Forecasts' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/ai', icon: Sparkles, label: 'AI Assistant' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-[60px] flex items-center gap-3 px-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">RetailIQ</p>
            <p className="text-[10px] text-text-muted mt-0.5">Analytics Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <NavLink key={path} to={path}>
                <div className={clsx(
                  'nav-item',
                  isActive && 'active'
                )}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border">
          <NavLink to="/upload">
            <div className="nav-item">
              <Upload className="w-4 h-4 flex-shrink-0" />
              <span>Upload Data</span>
            </div>
          </NavLink>
          <p className="text-[10px] text-text-muted mt-3">UCI Online Retail II</p>
          <p className="text-[10px] text-text-muted">v1.0.0</p>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-[60px] flex items-center justify-between px-6 bg-bg-surface border-b border-border flex-shrink-0">
          <h1 className="text-sm font-medium text-text-primary">
            {NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.label || 'RetailIQ AI'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" title="System Online" />
            <span className="text-xs text-text-muted">System Online</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
