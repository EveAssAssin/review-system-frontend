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
import CategoriesPage from './pages/CategoriesPage';

// 自動登入處理元件
const AutoLogin = ({ children }: { children: React.ReactNode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user, isLoading } = useAuth();
  // 'idle' | 'logging_in' | 'done' | 'failed'
  const [autoLoginState, setAutoLoginState] = useState<'idle' | 'logging_in' | 'done' | 'failed'>('idle');

  const appNumber = searchParams.get('app_number');
  const uid = searchParams.get('uid');

  useEffect(() => {
    if (uid) {
      localStorage.setItem('line_uid', uid);
    }

    // 只在有 app_number、尚未登入、auth 載入完成、且尚未嘗試時執行
    if (appNumber && !user && !isLoading && autoLoginState === 'idle') {
      setAutoLoginState('logging_in');
      login(appNumber)
        .then(() => {
          setAutoLoginState('done');
          navigate('/', { replace: true });
        })
        .catch((err) => {
          console.error('自動登入失敗:', err);
          setAutoLoginState('failed');
        });
    }
  }, [appNumber, uid, user, isLoading, login, navigate, autoLoginState]);

  // 有 app_number 且尚未登入且登入尚未失敗 → 全程顯示「自動登入中...」
  // 這樣可避免登入表單短暫閃出
  if (appNumber && !user && autoLoginState !== 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">自動登入中...</div>
          <div className="text-gray-400 text-sm">請稍候</div>
        </div>
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
          <Route
            path="/categories"
            element={
              <ProtectedRoute requirePrAdmin>
                <CategoriesPage />
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
