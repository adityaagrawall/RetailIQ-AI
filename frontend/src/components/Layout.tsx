import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/insights', icon: BarChart2, label: 'Insights' },
];

const SETTINGS_ITEMS = [
  { path: '/upload', label: 'Data Source' },
  { path: '/help', label: 'Getting Started / Help' }
];



export default function Layout() {
  const location = useLocation();

  const renderPrimaryNav = (items: typeof NAV_ITEMS) => items.map(({ path, icon: Icon, label }) => {
    const isActive = location.pathname.startsWith(path);
    return (
      <NavLink key={path} to={path} className="block group outline-none">
        <div className={clsx(
          'flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-md text-sm select-none transition-colors duration-75',
          isActive
            ? 'bg-gray-200/50 text-gray-900 font-medium shadow-sm border border-gray-200/50'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 group-focus-visible:ring-1 ring-gray-400'
        )}>
          <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
          <span>{label}</span>
        </div>
      </NavLink>
    );
  });

  const renderSecondaryNav = (items: typeof SETTINGS_ITEMS) => items.map(({ path, label }) => {
    const isActive = location.pathname.startsWith(path);
    return (
      <NavLink key={path} to={path} className="block group outline-none">
        <div className={clsx(
          'flex items-center px-3 py-1 mx-2 rounded-md text-xs select-none transition-colors duration-75',
          isActive
            ? 'text-gray-900 font-medium bg-gray-100'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        )}>
          <span>{label}</span>
        </div>
      </NavLink>
    );
  });

  return (
    <div className="flex h-screen bg-[#FBFBFA] overflow-hidden font-sans">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-[#FBFBFA] border-r border-gray-200 flex flex-col">
        {/* Workspace Selector */}
        <div className="h-14 flex items-center gap-2.5 px-5 mt-1 mb-2">
          <img src="/logo.jpg" alt="RetailIQ Logo" className="w-6 h-6 rounded-md shadow-sm border border-gray-200/60" />
          <span className="text-sm font-bold text-gray-900 tracking-tight">RetailIQ AI</span>
        </div>

        {/* Primary Nav */}
        <nav className="space-y-0.5">
          {renderPrimaryNav(NAV_ITEMS)}
        </nav>

        {/* Secondary Nav */}
        <div className="py-4 mt-4 border-t border-gray-200/60 space-y-0.5">
          {renderSecondaryNav(SETTINGS_ITEMS)}
        </div>
        
        {/* User Profile */}
        <div className="mt-auto px-4 py-3 border-t border-gray-200/60 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-gray-300 to-gray-400 shadow-inner" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-gray-900 truncate">System Admin</span>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
