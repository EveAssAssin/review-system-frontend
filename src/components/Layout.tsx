import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout, canManageReviews, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: '儀表板', show: true },
    { path: '/my-reviews', label: '我的評價', show: true },
    { path: '/reviews', label: '評價管理', show: canManageReviews },
    { path: '/reviews/new', label: '新增評價', show: canManageReviews },
    { path: '/feedbacks', label: '客戶回報', show: canManageReviews },
    { path: '/feedbacks/new', label: '新增回報', show: canManageReviews },
    { path: '/service-records', label: '客服紀錄', show: canManageReviews },
    { path: '/service-records/new', label: '新增客服紀錄', show: canManageReviews },
    { path: '/employees', label: '員工列表', show: canManageReviews },
    { path: '/categories', label: '分類管理', show: canManageReviews },
    { path: '/alerts', label: '警示設定', show: canManageReviews },
    { path: '/users', label: '使用者管理', show: isSuperAdmin },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">員工評價系統</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.name}</span>
            <span className="text-xs px-2 py-1 rounded bg-gray-100">
              {user?.role === 'super_admin' ? '管理員' : user?.role === 'pr_admin' ? '公關部' : '一般'}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <ul className="space-y-1">
            {navItems.filter(item => item.show).map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`block px-4 py-2 rounded-lg ${
                    location.pathname === item.path
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
