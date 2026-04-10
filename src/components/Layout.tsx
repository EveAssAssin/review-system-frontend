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

  const navGroups = [
    {
      label: '我的工作',
      items: [
        { path: '/', label: '儀表板', show: true, icon: '⬛' },
        { path: '/my-reviews', label: '我的評價', show: true, icon: '⭐' },
        { path: '/my-feedbacks', label: '我的待辦', show: true, icon: '📌' },
      ],
    },
    {
      label: '客服管理',
      items: [
        { path: '/feedbacks', label: '客戶回報', show: canManageReviews, icon: '💬' },
        { path: '/feedbacks/new', label: '新增回報', show: canManageReviews, icon: '＋' },
        { path: '/service-records', label: '客服紀錄', show: canManageReviews, icon: '📋' },
        { path: '/service-records/new', label: '新增客服紀錄', show: canManageReviews, icon: '＋' },
        { path: '/analytics', label: '客服分析', show: canManageReviews, icon: '📊' },
      ],
    },
    {
      label: '評價管理',
      items: [
        { path: '/reviews', label: '評價管理', show: canManageReviews, icon: '🗂' },
        { path: '/reviews/new', label: '新增評價', show: canManageReviews, icon: '＋' },
        { path: '/employees', label: '員工列表', show: canManageReviews, icon: '👥' },
      ],
    },
    {
      label: '系統設定',
      items: [
        { path: '/feedback-tags', label: '結案標籤', show: canManageReviews, icon: '🏷' },
        { path: '/categories', label: '分類管理', show: canManageReviews, icon: '🏷' },
        { path: '/alerts', label: '警示設定', show: canManageReviews, icon: '🔔' },
        { path: '/users', label: '使用者管理', show: isSuperAdmin, icon: '🔑' },
      ],
    },
  ];

  const roleLabel =
    user?.role === 'super_admin' ? '系統管理員' :
    user?.role === 'pr_admin' ? '客服主管' : '一般人員';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0eb' }}>
      {/* ─── Header / Masthead ─── */}
      <header style={{ backgroundColor: '#8b6f4e' }} className="shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: '#cdbea2', color: '#8b6f4e' }}
            >
              樂
            </div>
            <span className="text-white font-semibold text-base tracking-wide">
              樂活眼鏡｜員工評價系統
            </span>
          </div>

          {/* Right: user info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-sm leading-none mt-0.5" style={{ color: '#cdbea2' }}>
                {roleLabel}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: '#cdbea2', color: '#8b6f4e' }}
            >
              {user?.name?.charAt(0) || '?'}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{ borderColor: '#cdbea2', color: '#cdbea2' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#cdbea2';
                (e.currentTarget as HTMLButtonElement).style.color = '#8b6f4e';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#cdbea2';
              }}
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-5">
        {/* ─── Sidebar ─── */}
        <nav
          className="w-52 flex-shrink-0 rounded-xl overflow-hidden shadow-sm"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8ddd0', alignSelf: 'flex-start', position: 'sticky', top: '80px' }}
        >
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(i => i.show);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="py-2">
                <p
                  className="px-4 py-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: '#cdbea2' }}
                >
                  {group.label}
                </p>
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-2 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={
                        isActive
                          ? { backgroundColor: '#8b6f4e', color: '#ffffff' }
                          : { color: '#5c4033' }
                      }
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#f5f0eb';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="mx-4 mt-2" style={{ borderBottom: '1px solid #e8ddd0' }} />
              </div>
            );
          })}
        </nav>

        {/* ─── Main Content ─── */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
