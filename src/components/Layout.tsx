import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '儀表板', adminOnly: false },
    { path: '/reviews', label: '評價管理', adminOnly: true },
    { path: '/employees', label: '員工列表', adminOnly: true },
    { path: '/my-reviews', label: '我的評價', adminOnly: false },
    { path: '/alerts', label: '警示設定', adminOnly: true },
    { path: '/settings', label: '系統設定', adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">員工評價系統</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              {user?.name} ({isAdmin ? '管理員' : '一般使用者'})
            </span>
            <button
              onClick={logout}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white shadow min-h-[calc(100vh-64px)]">
          <nav className="p-4">
            <ul className="space-y-2">
              {filteredNavItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block px-4 py-2 rounded ${
                      location.pathname === item.path
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
