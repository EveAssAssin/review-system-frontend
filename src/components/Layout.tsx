import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout, canManageReviews, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        { path: '/my-service-evaluation', label: '我的服務評鑑', show: true, icon: '🎯' },
      ],
    },
    {
      label: '客服管理',
      items: [
        { path: '/feedbacks', label: '客戶回報', show: canManageReviews, icon: '💬' },
        { path: '/feedbacks/new', label: '新增回報', show: canManageReviews, icon: '＋' },
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
      label: '扣分系統',
      items: [
        { path: '/demerit/records', label: '扣分登記', show: true, icon: '✏️' },
        { path: '/demerit/summary', label: '扣分總表', show: true, icon: '📉' },
        { path: '/demerit/categories', label: '品項管理', show: canManageReviews, icon: '⚙️' },
      ],
    },
    {
      label: '服務評鑑',
      items: [
        { path: '/service-evaluations', label: '服務評鑑', show: canManageReviews, icon: '🏅' },
        { path: '/anomaly-report', label: '反造假異常報表', show: canManageReviews, icon: '🕵️' },
        { path: '/screenshot-appeals', label: '截圖申訴審核', show: canManageReviews, icon: '🙋' },
        { path: '/google-places', label: 'Google 對照設定', show: canManageReviews, icon: '🌐' },
        { path: '/google-alerts', label: 'Google 負評告警', show: canManageReviews, icon: '🚨' },
      ],
    },
    {
      label: '訪談紀錄',
      items: [
        { path: '/interviews', label: '訪談列表', show: canManageReviews, icon: '🗒' },
        { path: '/interviews/new', label: '新增訪談', show: canManageReviews, icon: '＋' },
        { path: '/interviews/items', label: '題目管理', show: canManageReviews, icon: '⚙️' },
      ],
    },
    {
      label: '系統設定',
      items: [
        { path: '/feedback-categories', label: '回報類別', show: canManageReviews, icon: '📂' },
        { path: '/feedback-sources', label: '回報來源', show: canManageReviews, icon: '📡' },
        { path: '/feedback-tags', label: '結案標籤', show: canManageReviews, icon: '🏷' },
        { path: '/categories', label: '評價分類', show: canManageReviews, icon: '🏷' },
        { path: '/alerts', label: '警示設定', show: canManageReviews, icon: '🔔' },
        { path: '/users', label: '使用者管理', show: isSuperAdmin, icon: '🔑' },
      ],
    },
  ];

  const roleLabel =
    user?.role === 'super_admin' ? '系統管理員' :
    user?.role === 'pr_admin' ? '客服主管' : '一般人員';

  const NavContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      {navGroups.map((group) => {
        const visibleItems = group.items.filter(i => i.show);
        if (visibleItems.length === 0) return null;
        return (
          <div key={group.label} className="py-2">
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-widest" style={{ color: '#cdbea2' }}>
              {group.label}
            </p>
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center gap-2 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { backgroundColor: '#8b6f4e', color: '#ffffff' }
                      : { color: '#5c4033' }
                  }
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#f5f0eb'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}
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
    </>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0eb' }}>

      {/* ─── Header ─── */}
      <header style={{ backgroundColor: '#8b6f4e' }} className="shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 漢堡按鈕（手機才顯示） */}
            <button
              className="md:hidden text-white p-1 rounded"
              onClick={() => setDrawerOpen(true)}
              aria-label="開啟選單"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
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
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-sm leading-none mt-0.5" style={{ color: '#cdbea2' }}>{roleLabel}</p>
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

      {/* ─── 手機抽屜選單 ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* 抽屜本體 */}
          <div
            className="absolute top-0 left-0 h-full w-72 overflow-y-auto shadow-xl"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* 抽屜標題 */}
            <div className="flex items-center justify-between px-4 py-3 sticky top-0" style={{ backgroundColor: '#8b6f4e' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#cdbea2', color: '#8b6f4e' }}>樂</div>
                <span className="text-white font-semibold text-sm">選單</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: '#cdbea2' }}>{user?.name}</span>
                <button onClick={() => setDrawerOpen(false)} className="text-white p-1" aria-label="關閉">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <NavContent onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ─── 主體佈局 ─── */}
      <div className="max-w-7xl mx-auto px-3 py-4 md:px-4 md:py-6 md:flex md:gap-5">

        {/* 桌面側邊欄（手機隱藏） */}
        <nav
          className="hidden md:block w-52 flex-shrink-0 rounded-xl overflow-hidden shadow-sm"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8ddd0', alignSelf: 'flex-start', position: 'sticky', top: '80px' }}
        >
          <NavContent />
        </nav>

        {/* 主內容（手機全寬） */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
