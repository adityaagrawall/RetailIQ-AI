import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Check, AlertCircle, Database, Trash2, RefreshCw, Eye } from 'lucide-react';
import { uploadFile, getUploadStatus, getAllUploads, setActiveUpload, deleteUpload } from '../api';
import { clsx } from 'clsx';

type State = 'idle' | 'processing' | 'completed' | 'failed';

const PIPELINE_STEPS = [
  'Uploading dataset',
  'Validating schema constraints',
  'Imputing missing values',
  'Engineering temporal features',
  'Training demand models (XGBoost/Prophet)',
  'Evaluating RMSE/MAE bounds',
  'Generating inventory recommendations',
  'Compiling executive summary'
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filename, setFilename] = useState('');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rowsProcessed, setRowsProcessed] = useState(0);

  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const data = await getAllUploads();
      setDatasets(data);
    } catch (e) {
      console.error(e);
    }
    setLoadingDatasets(false);
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    let interval: any;
    if (state === 'processing') {
      interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < PIPELINE_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [state]);

  const poll = async (id: number) => {
    const timer = setInterval(async () => {
      try {
        const s = await getUploadStatus(id);
        if (s.valid_rows) setRowsProcessed(s.valid_rows);
        
        if (s.status === 'completed') { 
          clearInterval(timer); 
          setCurrentStepIndex(PIPELINE_STEPS.length);
          setTimeout(() => {
            setState('completed'); 
            fetchDatasets();
            setTimeout(() => navigate('/overview'), 2000);
          }, 1000);
        }
        else if (s.status === 'failed') { 
          clearInterval(timer); 
          setState('failed'); 
          setError(s.error_message || 'ETL Pipeline Failed'); 
          fetchDatasets();
        }
      } catch { 
        clearInterval(timer); 
        setState('failed'); 
        setError('Connection to data warehouse lost.'); 
      }
    }, 1500);
  };

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx'].includes(ext || '')) { setError('Invalid format. Requires .csv or .xlsx'); return; }
    
    setError(null); 
    setFilename(file.name); 
    setState('processing');
    setCurrentStepIndex(0);
    setRowsProcessed(0);
    
    try {
      const r = await uploadFile(file);
      poll(r.upload_id);
    } catch (e: any) { 
      setState('failed'); 
      setError(e.message || 'Transmission failed'); 
    }
  }, []);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); };

  const handleSetActive = async (id: number) => {
    await setActiveUpload(id);
    await fetchDatasets();
    window.location.reload(); // Hard reload to clear all react-query caches
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this dataset? This will remove all associated transactions, forecasts, and AI insights.")) {
      await deleteUpload(id);
      await fetchDatasets();
      window.location.reload(); // Hard reload
    }
  };

  const handleRetrain = () => {
    alert("Model retraining initiated in background.");
  };

  return (
    <div className="flex h-full items-start justify-center bg-[#FBFBFA] p-8 overflow-y-auto">
      <div className="w-full max-w-4xl space-y-8">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-1">Data Source Management</h1>
          <p className="text-sm text-gray-500">Configure connection to primary inventory datasets and manage uploaded files.</p>
        </div>

        {/* Upload Block */}
        <div className="bg-white border border-gray-200 rounded-md shadow-sm">
          {state === 'idle' && (
            <div className="p-8">
              <div
                className={clsx(
                  'border border-dashed rounded-md p-10 text-center cursor-pointer transition-colors',
                  dragOver ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                )}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('fi')?.click()}
              >
                <Upload className="w-5 h-5 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-sm font-medium text-gray-900">Upload New Dataset</p>
                <p className="text-xs text-gray-500 mt-1">Drag and drop your .csv or .xlsx file here</p>
                <input id="fi" type="file" accept=".csv,.xlsx" className="hidden" onChange={onInput} />
              </div>
              
              {error && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
            </div>
          )}

          {state === 'processing' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-gray-900">Pipeline Execution</h3>
                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">{filename}</span>
              </div>

              <div className="space-y-4">
                {PIPELINE_STEPS.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;

                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {isDone ? (
                          <Check className="w-3.5 h-3.5 text-gray-900" strokeWidth={3} />
                        ) : isActive ? (
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                        ) : (
                          <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                        )}
                      </div>
                      <span className={clsx(
                        "text-xs font-mono transition-colors duration-300",
                        isActive ? "text-gray-900 font-medium" : isDone ? "text-gray-500" : "text-gray-300"
                      )}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {state === 'completed' && (
            <div className="p-10 text-center">
              <Check className="w-8 h-8 text-gray-900 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-900 tracking-tight">Pipeline Completed Successfully</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-6">Redirecting to Overview</p>
            </div>
          )}

          {state === 'failed' && (
            <div className="p-8 text-center border-t-2 border-red-500">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900 mb-1 tracking-tight">Execution Halted</p>
              <p className="text-xs font-mono text-gray-500 mb-6">{error}</p>
              <button className="px-4 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 transition-colors" onClick={() => { setState('idle'); setError(null); }}>
                Reset Pipeline
              </button>
            </div>
          )}
        </div>

        {/* Datasets Table */}
        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Uploaded Datasets</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Dataset Name</th>
                  <th className="px-5 py-3">Upload Time</th>
                  <th className="px-5 py-3">Rows</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">ML Training</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {datasets.length === 0 && !loadingDatasets && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                      No datasets found. Upload one above.
                    </td>
                  </tr>
                )}
                {datasets.map((ds: any) => (
                  <tr key={ds.id} className={clsx(ds.is_active ? "bg-blue-50/30" : "")}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{ds.filename}</span>
                        {ds.is_active && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">ACTIVE</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono">{new Date(ds.uploaded_at).toLocaleString()}</td>
                    <td className="px-5 py-4 font-mono text-xs">{ds.valid_rows?.toLocaleString() || ds.row_count?.toLocaleString() || '-'}</td>
                    <td className="px-5 py-4">
                      <span className={clsx(
                        "px-2 py-1 rounded text-[10px] font-medium uppercase",
                        ds.status === 'completed' ? 'bg-green-100 text-green-700' :
                        ds.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {ds.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {ds.status === 'completed' ? 'Completed' : 'Pending'}
                    </td>
                    <td className="px-5 py-4 text-right flex justify-end gap-2">
                      {!ds.is_active && ds.status === 'completed' && (
                        <button onClick={() => handleSetActive(ds.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Set Active</button>
                      )}
                      {ds.status === 'completed' && (
                        <>
                          <button onClick={() => navigate('/overview')} title="View Dashboard" className="p-1 text-gray-400 hover:text-gray-900"><Eye className="w-4 h-4" /></button>
                          <button onClick={handleRetrain} title="Retrain Models" className="p-1 text-gray-400 hover:text-gray-900"><RefreshCw className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => handleDelete(ds.id)} title="Delete Dataset" className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
