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

// 自動登入處理元件
const AutoLogin = ({ children }: { children: React.ReactNode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user, isLoading } = useAuth();
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    const uid = searchParams.get('uid');
    const appNumber = searchParams.get('app_number');
    
    // 保存 uid 到 localStorage（供後續 API 使用）
    if (uid) {
      localStorage.setItem('line_uid', uid);
    }

    // 如果有 app_number 參數且尚未登入且尚未嘗試自動登入
    if (appNumber && !user && !isLoading && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      login(appNumber)
        .then(() => {
          // 登入成功，移除 URL 參數並跳轉到首頁
          navigate('/', { replace: true });
        })
        .catch((err) => {
          console.error('自動登入失敗:', err);
          // 登入失敗，跳轉到登入頁
          navigate('/login', { replace: true });
        });
    }
  }, [searchParams, user, isLoading, login, navigate, autoLoginAttempted]);

  // 如果正在自動登入中，顯示載入畫面
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
