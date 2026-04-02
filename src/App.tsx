import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
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
import UsersPage from './pages/UsersPage';

// 自動登入處理元件
const AutoLogin = ({ children }: { children: React.ReactNode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user, isLoading } = useAuth();
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    const uid = searchParams.get('uid');
    const appNumber = searchParams.get('app_number');
    
    if (uid) {
      localStorage.setItem('line_uid', uid);
    }

    if (appNumber && !user && !isLoading && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      login(appNumber)
        .then(() => {
          navigate('/', { replace: true });
        })
        .catch((err) => {
          console.error('自動登入失敗:', err);
          navigate('/login', { replace: true });
        });
    }
  }, [searchParams, user, isLoading, login, navigate, autoLoginAttempted]);

  const appNumber = searchParams.get('app_number');
  if (appNumber && !user && !autoLoginAttempted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">自動登入中...</div>
      </div>
    );
  }

  return <>{children}</>;
};

// 保護路由
const ProtectedRoute = ({ 
  children, 
  requirePrAdmin = false,
  requireSuperAdmin = false 
}: { 
  children: React.ReactNode; 
  requirePrAdmin?: boolean;
  requireSuperAdmin?: boolean;
}) => {
  const { user, isLoading, canManageReviews, isSuperAdmin } = useAuth();

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

  // 需要 super_admin 權限
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // 需要公關部權限（pr_admin 或 super_admin）
  if (requirePrAdmin && !canManageReviews) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <AutoLogin>
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

          {/* 公關部頁面（pr_admin 或 super_admin） */}
          <Route
            path="/reviews"
            element={
              <ProtectedRoute requirePrAdmin>
                <ReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews/new"
            element={
              <ProtectedRoute requirePrAdmin>
                <NewReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews/:id"
            element={
              <ProtectedRoute requirePrAdmin>
                <ReviewDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute requirePrAdmin>
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute requirePrAdmin>
                <AlertsPage />
              </ProtectedRoute>
            }
          />

          {/* 超級管理員頁面 */}
          <Route
            path="/users"
            element={
              <ProtectedRoute requireSuperAdmin>
                <UsersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AutoLogin>
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
