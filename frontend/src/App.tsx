import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import TrainerPage from './pages/TrainerPage';
import ProfilePage from './pages/ProfilePage';
import QRValidatorPage from './pages/QRValidatorPage';
import FacilitiesPage from './pages/FacilitiesPage';
import WorkoutsPage from './pages/WorkoutsPage';
import PaymentResultPage from './pages/PaymentResultPage';

function RoleRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'trainer') return <Navigate to="/trainer" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* ── Rutas de resultado de pago MercadoPago (públicas) ── */}
          <Route path="/payment/success" element={<PaymentResultPage type="success" />} />
          <Route path="/payment/failure" element={<PaymentResultPage type="failure" />} />
          <Route path="/payment/pending" element={<PaymentResultPage type="pending" />} />

          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Layout><ProfilePage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['member']}>
                <Layout><DashboardPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/entrenamientos"
            element={
              <ProtectedRoute roles={['member']}>
                <Layout><WorkoutsPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/entrenamientos"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><WorkoutsPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/entrenamientos"
            element={
              <ProtectedRoute roles={['trainer']}>
                <Layout><WorkoutsPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/instalaciones"
            element={
              <ProtectedRoute>
                <Layout><FacilitiesPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/instalaciones"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><FacilitiesPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/validar-qr"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><QRValidatorPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><AdminPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/socios"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout><AdminPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer"
            element={
              <ProtectedRoute roles={['trainer']}>
                <Layout><TrainerPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/socios"
            element={
              <ProtectedRoute roles={['trainer']}>
                <Layout><TrainerPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-800 mb-2">403</h1>
                  <p className="text-gray-500 mb-4">No tienes permiso para acceder a esta página.</p>
                  <a href="/login" className="text-indigo-600 hover:underline">Volver al inicio</a>
                </div>
              </div>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
