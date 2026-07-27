import { useState, useEffect } from 'react';
import { ArrowDown, Database, Play, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadDemoDataset } from '../api';

export default function WelcomeScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem('retailiq_ftue_seen');
    if (!seen) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('retailiq_ftue_seen', 'true');
    setShow(false);
  };

  const handleDemo = async () => {
    try {
      await loadDemoDataset();
      handleDismiss();
      // Reload window to trigger react-query refetch globally
      window.location.href = '/overview';
    } catch (e) {
      console.error(e);
      alert("Failed to load demo dataset.");
    }
  };

  const handleLearnMore = () => {
    handleDismiss();
    navigate('/help');
  };

  if (!show) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto py-16 px-6">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">RetailIQ</h1>
          <p className="text-xl text-gray-600 font-medium">Retail Operations Intelligence Platform</p>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Analyze retail sales, forecast demand, optimize inventory, detect operational risks, 
            and generate executive business insights using machine learning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-8">
            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">What this platform does</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                RetailIQ transforms raw transactional data into actionable intelligence. It automatically cleanses data, models seasonal demand patterns, calculates safety stock levels, and flags inventory anomalies before they impact your bottom line.
              </p>
            </section>
            
            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Who it is for</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Operations Managers, Inventory Planners, and Retail Executives who need data-driven forecasting without writing SQL or building complex spreadsheets.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">What datasets are supported</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Standard retail transactional logs (.csv or .xlsx) containing Invoice No, Stock Code, Quantity, Price, and Date. (Based on the standard UCI Online Retail II format).
              </p>
            </section>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100 flex flex-col items-center text-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">Workflow</h3>
            
            <div className="flex flex-col items-center text-xs font-mono font-medium text-gray-600 space-y-2">
              <div className="bg-white px-4 py-2 border border-gray-200 rounded shadow-sm w-48">Upload Dataset</div>
              <ArrowDown className="w-4 h-4 text-gray-400" />
              <div className="bg-white px-4 py-2 border border-gray-200 rounded shadow-sm w-48">Data Validation</div>
              <ArrowDown className="w-4 h-4 text-gray-400" />
              <div className="bg-white px-4 py-2 border border-gray-200 rounded shadow-sm w-48">Machine Learning</div>
              <ArrowDown className="w-4 h-4 text-gray-400" />
              <div className="bg-white px-4 py-2 border border-gray-200 rounded shadow-sm w-48">Forecasting</div>
              <ArrowDown className="w-4 h-4 text-gray-400" />
              <div className="bg-white px-4 py-2 border border-gray-200 rounded shadow-sm w-48">Inventory Analysis</div>
              <ArrowDown className="w-4 h-4 text-gray-400" />
              <div className="bg-white px-4 py-2 border border-gray-200 rounded shadow-sm w-48">Business Insights</div>
              <ArrowDown className="w-4 h-4 text-gray-400" />
              <div className="bg-white px-4 py-2 border border-gray-200 rounded shadow-sm w-48">Executive Reports</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={handleDismiss}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Database className="w-4 h-4" />
            Get Started
          </button>
          
          <button 
            onClick={handleDemo}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 border border-gray-200 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Play className="w-4 h-4" />
            View Demo Dataset
          </button>

          <button 
            onClick={handleLearnMore}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-500 border border-transparent font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Learn More
          </button>
        </div>

      </div>
    </div>
  );
}
