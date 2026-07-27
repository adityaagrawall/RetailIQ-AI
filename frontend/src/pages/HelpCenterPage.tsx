import { HelpCircle } from 'lucide-react';

export default function HelpCenterPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-gray-400" />
          Help Center
        </h1>
        <p className="text-sm text-gray-500 mt-2">Everything you need to know about RetailIQ.</p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Project Overview</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            RetailIQ is a robust retail operations intelligence platform. It analyzes sales, forecasts demand, 
            optimizes inventory, detects operational risks, and generates executive business insights using machine learning.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Supported Dataset Formats</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            The platform supports standard CSV and XLSX formats, specifically structured for retail transaction logs.
          </p>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Required Columns:</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
            <li><code className="bg-gray-100 px-1 rounded">InvoiceNo</code> - Unique transaction identifier (starts with 'C' for returns)</li>
            <li><code className="bg-gray-100 px-1 rounded">StockCode</code> - Unique product identifier</li>
            <li><code className="bg-gray-100 px-1 rounded">Description</code> - Product name</li>
            <li><code className="bg-gray-100 px-1 rounded">Quantity</code> - Number of items purchased</li>
            <li><code className="bg-gray-100 px-1 rounded">InvoiceDate</code> - Timestamp of transaction</li>
            <li><code className="bg-gray-100 px-1 rounded">Price</code> - Unit price</li>
            <li><code className="bg-gray-100 px-1 rounded">Customer ID</code> - Unique customer identifier</li>
            <li><code className="bg-gray-100 px-1 rounded">Country</code> - Customer location</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">How Forecasting Works</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            RetailIQ uses advanced time-series modeling (Prophet or XGBoost) to predict future demand. 
            It analyzes historical daily sales velocity, seasonality, and trend lines to project demand horizons 
            up to 30, 60, or 90 days into the future.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">How Inventory Recommendations Work</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Safety stock is dynamically calculated based on lead time variations and service level targets. 
            When forecasted demand outpaces current stock levels, the system automatically flags the product 
            as an "Operational Exception" on your dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Understanding Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Net Revenue</h3>
              <p className="text-xs text-gray-600 mt-1">Total revenue generated minus any returns or cancellations.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Average Order Value (AOV)</h3>
              <p className="text-xs text-gray-600 mt-1">Average revenue generated per individual transaction invoice.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Revenue Velocity</h3>
              <p className="text-xs text-gray-600 mt-1">The rate at which revenue is generated over time, shown in the main chart.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">ABC Classification</h3>
              <p className="text-xs text-gray-600 mt-1">Products are categorized A, B, or C based on their cumulative contribution to total revenue.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Technology Stack & Models</h2>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-2 ml-2">
            <li><strong>Frontend:</strong> React, Vite, TailwindCSS</li>
            <li><strong>Backend:</strong> Python, FastAPI, SQLAlchemy, SQLite</li>
            <li><strong>Machine Learning:</strong> Pandas, Prophet, XGBoost for predictive analytics</li>
            <li><strong>Generative AI:</strong> Google Gemini API for executive reporting</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Privacy Notice & Limitations</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            <strong>Privacy:</strong> All uploaded data is processed locally on your backend server except for AI insights, 
            which securely send aggregated contexts to the Google Gemini API.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong>Limitations:</strong> As a prototype, the system currently assumes a single active user and dataset. 
            Extremely large datasets (over 100MB) may experience processing timeouts.
          </p>
        </section>
      </div>
    </div>
  );
}
