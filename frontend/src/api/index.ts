import api from './client';

// ─── Upload ────────────────────────────────────────────────────────────────────

export const uploadFile = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getUploadStatus = async (uploadId: number) => {
  const { data } = await api.get(`/upload/${uploadId}/status`);
  return data;
};

export const getAllUploads = async () => {
  const { data } = await api.get('/upload');
  return data;
};

export const setActiveUpload = async (uploadId: number) => {
  const { data } = await api.post(`/upload/${uploadId}/active`);
  return data;
};

export const deleteUpload = async (uploadId: number) => {
  const { data } = await api.delete(`/upload/${uploadId}`);
  return data;
};

export const loadDemoDataset = async () => {
  const { data } = await api.post('/upload/demo');
  return data;
};

// ─── Analytics ─────────────────────────────────────────────────────────────────

export const getKPIs = async (params?: { start_date?: string; end_date?: string }) => {
  const { data } = await api.get('/analytics/kpis', { params });
  return data;
};

export const getABCAnalysis = async () => {
  const { data } = await api.get('/analytics/abc');
  return data;
};

export const getSlowMovers = async (thresholdDays = 30) => {
  const { data } = await api.get('/analytics/slow-movers', {
    params: { threshold_days: thresholdDays },
  });
  return data;
};

export const getRevenueTrend = async (granularity: 'daily' | 'weekly' | 'monthly' = 'daily') => {
  const { data } = await api.get('/analytics/revenue-trend', { params: { granularity } });
  return data;
};

export const getTopProducts = async (n = 10) => {
  const { data } = await api.get('/analytics/top-products', { params: { n } });
  return data;
};

// ─── Products ──────────────────────────────────────────────────────────────────

export const getProducts = async (params?: {
  page?: number;
  limit?: number;
  abc_class?: string;
  search?: string;
}) => {
  const { data } = await api.get('/products', { params });
  return data;
};

export const getProduct = async (productId: number) => {
  const { data } = await api.get(`/products/${productId}`);
  return data;
};

export const getProductSales = async (
  productId: number,
  params?: { start_date?: string; end_date?: string }
) => {
  const { data } = await api.get(`/products/${productId}/sales`, { params });
  return data;
};

// ─── Forecasts ─────────────────────────────────────────────────────────────────

export const trainModel = async (payload: {
  model?: string;
  product_ids?: number[];
  horizon_days?: number;
}) => {
  const { data } = await api.post('/forecasts/train', payload);
  return data;
};

export const getProductForecast = async (
  productId: number,
  model: string = 'prophet',
  horizonDays: number = 30
) => {
  const { data } = await api.get(`/forecasts/${productId}`, {
    params: { model, horizon_days: horizonDays },
  });
  return data;
};

export const getMLRuns = async (limit = 20) => {
  const { data } = await api.get('/forecasts/runs/list', { params: { limit } });
  return data;
};

// ─── Alerts ────────────────────────────────────────────────────────────────────

export const getAlerts = async (params?: {
  alert_type?: string;
  severity?: string;
  is_resolved?: boolean;
  limit?: number;
}) => {
  const { data } = await api.get('/alerts', { params });
  return data;
};

export const resolveAlert = async (alertId: number) => {
  const { data } = await api.patch(`/alerts/${alertId}/resolve`);
  return data;
};

export const generateAlerts = async () => {
  const { data } = await api.post('/alerts/generate');
  return data;
};

// ─── AI ────────────────────────────────────────────────────────────────────────

export const queryAI = async (question: string) => {
  const { data } = await api.post('/ai/query', { question });
  return data;
};

export const getAISummary = async (date?: string) => {
  const { data } = await api.get('/ai/summary', { params: { date } });
  return data;
};

export const explainForecast = async (productId: number, horizonDays = 30) => {
  const { data } = await api.post('/ai/explain-forecast', {
    product_id: productId,
    horizon_days: horizonDays,
  });
  return data;
};

// ─── Export ────────────────────────────────────────────────────────────────────

export const exportForecastsCSV = (productIds?: number[]) => {
  const params = productIds ? `?product_ids=${productIds.join(',')}` : '';
  window.open(`${api.defaults.baseURL}/export/forecasts${params}`, '_blank');
};

export const exportAlertsCSV = () => {
  window.open(`${api.defaults.baseURL}/export/alerts`, '_blank');
};
