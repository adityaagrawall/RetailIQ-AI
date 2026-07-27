import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';

// Lazy loaded pages for performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
import WelcomeScreen from './components/WelcomeScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WelcomeScreen>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/overview" replace />} />
              
              <Route path="overview" element={
                <Suspense fallback={<LoadingFallback />}><DashboardPage /></Suspense>
              } />
              
              <Route path="inventory" element={
                <Suspense fallback={<LoadingFallback />}><ProductsPage /></Suspense>
              } />
              
              <Route path="inventory/:id" element={
                <Suspense fallback={<LoadingFallback />}><ProductDetailPage /></Suspense>
              } />
              
              <Route path="insights" element={
                <Suspense fallback={<LoadingFallback />}><InsightsPage /></Suspense>
              } />
              
              <Route path="upload" element={
                <Suspense fallback={<LoadingFallback />}><UploadPage /></Suspense>
              } />
              
              <Route path="help" element={
                <Suspense fallback={<LoadingFallback />}><HelpCenterPage /></Suspense>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </WelcomeScreen>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
