import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReviewsPage from './pages/ReviewsPage';
import NewReviewPage from './pages/NewReviewPage';
import ReviewDetailPage from './pages/ReviewDetailPage';
import ReviewRespondPage from './pages/ReviewRespondPage';
import MyReviewsPage from './pages/MyReviewsPage';
import EmployeesPage from './pages/EmployeesPage';
import AlertsPage from './pages/AlertsPage';

// 保護路由
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* 公開頁面 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/review/respond/:token" element={<ReviewRespondPage />} />

      {/* 需登入的頁面 */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/my-reviews" element={<MyReviewsPage />} />

        {/* 管理員頁面 */}
        <Route
          path="/reviews"
          element={
            <ProtectedRoute adminOnly>
              <ReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews/new"
          element={
            <ProtectedRoute adminOnly>
              <NewReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews/:id"
          element={
            <ProtectedRoute adminOnly>
              <ReviewDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute adminOnly>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute adminOnly>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 其他路由導向首頁 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
