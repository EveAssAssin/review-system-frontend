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
import FeedbacksPage from './pages/FeedbacksPage';
import NewFeedbackPage from './pages/NewFeedbackPage';
import FeedbackDetailPage from './pages/FeedbackDetailPage';
import ServiceRecordsPage from './pages/ServiceRecordsPage';
import NewServiceRecordPage from './pages/NewServiceRecordPage';
import ServiceRecordDetailPage from './pages/ServiceRecordDetailPage';

// 自動登入處理元件
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 5000; // 每次重試間隔 5 秒

const AutoLogin = ({ children }: { children: React.ReactNode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user, isLoading } = useAuth();
  const [autoLoginState, setAutoLoginState] = useState<'idle' | 'logging_in' | 'done' | 'failed'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState('自動登入中...');

  const appNumber = searchParams.get('app_number');
  const uid = searchParams.get('uid');

  useEffect(() => {
    if (uid) {
      localStorage.setItem('line_uid', uid);
    }
  }, [uid]);

  useEffect(() => {
    if (!appNumber || user || isLoading || autoLoginState === 'done') return;
    if (autoLoginState !== 'idle') return;

    setAutoLoginState('logging_in');

    const tryLogin = (attempt: number) => {
      if (attempt > 1) {
        setStatusMsg(`伺服器啟動中，請稍候... (${attempt}/${MAX_RETRY})`);
      } else {
        setStatusMsg('自動登入中...');
      }

      login(appNumber.trim())
        .then(() => {
          setAutoLoginState('done');
          navigate('/', { replace: true });
        })
        .catch((err) => {
          console.error(`自動登入失敗 (第 ${attempt} 次):`, err);
          // 帳號明確不存在（401 含 message）才不重試，其他都重試
          const isDefiniteAuthError =
            err.response?.status === 401 &&
            err.response?.data?.message;

          if (!isDefiniteAuthError && attempt < MAX_RETRY) {
            setTimeout(() => {
              setRetryCount(attempt);
              tryLogin(attempt + 1);
            }, RETRY_DELAY_MS);
          } else {
            setAutoLoginState('failed');
          }
        });
    };

    tryLogin(1);
  }, [appNumber, user, isLoading, autoLoginState, login, navigate]);

  // 登入流程中 → 顯示等待畫面
  if (appNumber && !user && autoLoginState !== 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">{statusMsg}</div>
          {retryCount > 0 && (
            <div className="text-gray-400 text-sm">系統正在喚醒，請勿關閉頁面</div>
          )}
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

          {/* 客戶回報模組 */}
          <Route
            path="/feedbacks"
            element={
              <ProtectedRoute requirePrAdmin>
                <FeedbacksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedbacks/new"
            element={
              <ProtectedRoute requirePrAdmin>
                <NewFeedbackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedbacks/:id"
            element={
              <ProtectedRoute requirePrAdmin>
                <FeedbackDetailPage />
              </ProtectedRoute>
            }
          />

          {/* 客服紀錄模組 */}
          <Route
            path="/service-records"
            element={
              <ProtectedRoute requirePrAdmin>
                <ServiceRecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-records/new"
            element={
              <ProtectedRoute requirePrAdmin>
                <NewServiceRecordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-records/:id"
            element={
              <ProtectedRoute requirePrAdmin>
                <ServiceRecordDetailPage />
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
