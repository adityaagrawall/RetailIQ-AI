import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { uploadFile, getUploadStatus } from '../api';
import { clsx } from 'clsx';

type UploadState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export default function UploadPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<UploadState>('idle');
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pollStatus = async (id: number) => {
    setState('processing');
    const interval = setInterval(async () => {
      try {
        const status = await getUploadStatus(id);
        setProgress(status);
        if (status.status === 'completed') {
          clearInterval(interval);
          setState('completed');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setState('failed');
          setError(status.error_message || 'Processing failed');
        }
      } catch (e) {
        clearInterval(interval);
        setState('failed');
        setError('Failed to check status');
      }
    }, 1500);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx'].includes(ext || '')) {
      setError('Only CSV and XLSX files are supported.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be under 100MB.');
      return;
    }

    setError(null);
    setState('uploading');

    try {
      const result = await uploadFile(file);
      setUploadId(result.upload_id);
      pollStatus(result.upload_id);
    } catch (e: any) {
      setState('failed');
      setError(e.message || 'Upload failed');
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const loadSampleData = async () => {
    // Inform user where to get the dataset
    window.open('https://archive.ics.uci.edu/dataset/502/online+retail+ii', '_blank');
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
            Intelligent Demand Forecasting
          </div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            RetailIQ <span className="text-gradient">AI</span>
          </h1>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Upload your retail transaction data to get AI-powered demand forecasts,
            inventory alerts, and business insights.
          </p>
        </div>

        {/* Upload Card */}
        <div className="card p-6">
          {state === 'idle' && (
            <>
              <div
                className={clsx(
                  'border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer',
                  dragOver
                    ? 'border-accent-blue bg-accent-blue/5'
                    : 'border-border hover:border-border-strong hover:bg-bg-raised'
                )}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className={clsx('w-10 h-10 mx-auto mb-3', dragOver ? 'text-accent-blue' : 'text-text-muted')} />
                <p className="text-sm font-medium text-text-primary mb-1">
                  Drop your CSV or XLSX file here
                </p>
                <p className="text-xs text-text-muted">
                  UCI Online Retail II format · Max 100MB
                </p>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={onFileInput}
                />
              </div>

              {error && (
                <div className="mt-3 flex items-center gap-2 text-danger text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  className="btn-secondary flex-1 justify-center"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <FileText className="w-4 h-4" /> Browse File
                </button>
                <button className="btn-ghost text-xs" onClick={loadSampleData}>
                  Get sample data ↗
                </button>
              </div>
            </>
          )}

          {(state === 'uploading' || state === 'processing') && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-accent-blue animate-spin mx-auto" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {state === 'uploading' ? 'Uploading file...' : 'Processing data...'}
                </p>
                {progress && (
                  <p className="text-xs text-text-muted mt-1">
                    {progress.valid_rows?.toLocaleString() || '—'} valid rows · {progress.invalid_rows || 0} errors
                  </p>
                )}
              </div>
              <div className="w-full bg-bg-raised rounded-full h-1">
                <div
                  className="h-1 bg-accent-blue rounded-full transition-all duration-500"
                  style={{ width: state === 'uploading' ? '30%' : '80%' }}
                />
              </div>
            </div>
          )}

          {state === 'completed' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle className="w-10 h-10 text-success mx-auto" />
              <div>
                <p className="text-sm font-medium text-text-primary">Upload Complete!</p>
                <p className="text-xs text-text-muted mt-1">
                  {progress?.valid_rows?.toLocaleString()} rows processed. Redirecting to dashboard...
                </p>
              </div>
            </div>
          )}

          {state === 'failed' && (
            <div className="py-8 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-danger mx-auto" />
              <div>
                <p className="text-sm font-medium text-text-primary">Upload Failed</p>
                <p className="text-xs text-text-muted mt-1">{error}</p>
              </div>
              <button className="btn-primary" onClick={() => { setState('idle'); setError(null); }}>
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Column guide */}
        <div className="mt-4 card p-4">
          <p className="text-xs font-medium text-text-secondary mb-2">Required columns (UCI Online Retail II format):</p>
          <div className="flex flex-wrap gap-1.5">
            {['InvoiceNo', 'StockCode', 'Description', 'Quantity', 'InvoiceDate', 'Price', 'Customer ID', 'Country'].map(col => (
              <span key={col} className="font-mono text-[10px] bg-bg-raised border border-border px-2 py-0.5 rounded text-accent-blue">
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Skip to dashboard */}
        <div className="mt-4 text-center">
          <button className="btn-ghost text-xs" onClick={() => navigate('/dashboard')}>
            Skip to dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
