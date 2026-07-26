import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, resolveAlert, generateAlerts, exportAlertsCSV } from '../api';
import { AlertTriangle, CheckCircle, RefreshCw, Download, Package } from 'lucide-react';
import { clsx } from 'clsx';

const ALERT_TYPES = [
  { key: '', label: 'All Alerts' },
  { key: 'reorder_needed', label: 'Reorder Needed' },
  { key: 'stockout_risk', label: 'Stockout Risk' },
  { key: 'slow_mover', label: 'Slow Movers' },
];

const SEVERITIES = ['', 'high', 'medium', 'low'];

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [alertType, setAlertType] = useState('');
  const [severity, setSeverity] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', alertType, severity, showResolved],
    queryFn: () => getAlerts({
      alert_type: alertType || undefined,
      severity: severity || undefined,
      is_resolved: showResolved,
      limit: 200,
    }),
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const generateMutation = useMutation({
    mutationFn: generateAlerts,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const activeAlerts = alerts || [];
  const highCount = activeAlerts.filter((a: any) => a.severity === 'high').length;
  const medCount = activeAlerts.filter((a: any) => a.severity === 'medium').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Inventory Alerts</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {activeAlerts.length} alerts · <span className="text-danger">{highCount} high</span> · <span className="text-warning">{medCount} medium</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => exportAlertsCSV()}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            className="btn-primary text-xs"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', generateMutation.isPending && 'animate-spin')} />
            Regenerate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1">
          {ALERT_TYPES.map(({ key, label }) => (
            <button
              key={key}
              className={clsx(
                'px-3 py-1.5 text-xs rounded font-medium transition-all',
                alertType === key
                  ? 'bg-accent-blue text-white'
                  : 'bg-bg-raised border border-border text-text-secondary hover:text-text-primary'
              )}
              onClick={() => setAlertType(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {SEVERITIES.map((sev) => (
            <button
              key={sev}
              className={clsx(
                'px-2.5 py-1.5 text-xs rounded font-medium transition-all',
                severity === sev
                  ? sev === 'high' ? 'bg-danger text-white'
                    : sev === 'medium' ? 'bg-warning text-white'
                    : sev === 'low' ? 'bg-success text-white'
                    : 'bg-accent-blue text-white'
                  : 'bg-bg-raised border border-border text-text-secondary hover:text-text-primary'
              )}
              onClick={() => setSeverity(sev)}
            >
              {sev || 'All'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="w-3 h-3 accent-accent-blue"
          />
          Show resolved
        </label>
      </div>

      {/* Alert Cards */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))
        ) : activeAlerts.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-sm text-text-primary">No alerts found</p>
            <p className="text-xs text-text-muted mt-1">Try clicking "Regenerate" to run fresh analysis</p>
          </div>
        ) : (
          activeAlerts.map((alert: any) => (
            <div
              key={alert.id}
              className={clsx(
                'card p-4 flex items-start gap-3 transition-all',
                `alert-${alert.severity}`,
                alert.is_resolved && 'opacity-50'
              )}
            >
              <AlertTriangle className={clsx(
                'w-4 h-4 mt-0.5 flex-shrink-0',
                alert.severity === 'high' ? 'text-danger'
                  : alert.severity === 'medium' ? 'text-warning' : 'text-success'
              )} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-accent-blue">{alert.stock_code}</span>
                  <span className="text-xs text-text-primary font-medium truncate">{alert.description}</span>
                  <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                  <span className="badge bg-bg-raised text-text-muted border-border capitalize">
                    {alert.alert_type?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{alert.message}</p>
                {alert.reorder_qty && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-text-muted">
                      <Package className="w-3 h-3 inline mr-1" />
                      Reorder: <strong className="text-text-primary">{alert.reorder_qty} units</strong>
                    </span>
                    {alert.reorder_point && (
                      <span className="text-xs text-text-muted">
                        Reorder point: <strong className="text-text-primary">{alert.reorder_point?.toFixed(1)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!alert.is_resolved && (
                <button
                  className="btn-ghost text-xs py-1 flex-shrink-0"
                  onClick={() => resolveMutation.mutate(alert.id)}
                  disabled={resolveMutation.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Resolve
                </button>
              )}
              {alert.is_resolved && (
                <span className="text-xs text-success flex items-center gap-1 flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" /> Resolved
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
