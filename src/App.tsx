import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Customer pages
import ValidateTable from '@/pages/customer/ValidateTable';
import MenuPage from '@/pages/customer/MenuPage';

// Admin pages
import LoginPage from '@/pages/admin/LoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import OrdersPage from '@/pages/admin/OrdersPage';
import AdminMenuPage from '@/pages/admin/MenuPage';
import TablesPage from '@/pages/admin/TablesPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 rounded-2xl bg-amber-700 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="skeleton h-2 w-24 mx-auto rounded-full" />
        </div>
      </div>
    );
  }

  if (!user || !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Customer Routes */}
      <Route path="/order" element={<ValidateTable />} />
      <Route path="/order/menu" element={<MenuPage />} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="menu" element={<AdminMenuPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                  padding: '12px 16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                },
                success: {
                  iconTheme: { primary: '#65A30D', secondary: 'white' },
                },
                error: {
                  iconTheme: { primary: '#EF4444', secondary: 'white' },
                },
              }}
            />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
