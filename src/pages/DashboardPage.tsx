import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reviewsApi, authApi } from '../services/api';

type Period = 'week' | 'month' | 'custom';

function rangeFor(period: Period, customFrom: string, customTo: string): { from: string; to: string } | null {
  const now = new Date();
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (period === 'custom') {
    if (!customFrom || !customTo) return null;
    return {
      from: new Date(customFrom + 'T00:00:00').toISOString(),
      to: new Date(customTo + 'T23:59:59').toISOString(),
    };
  }
  // 本週：週一 00:00 至今
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0);
  return { from: from.toISOString(), to: now.toISOString() };
}

const fmtDateTime = (s?: string) =>
  s
    ? new Date(s).toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : '—';

export default function DashboardPage() {
  const { user, employee, canManageReviews } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 登入統計
  const [period, setPeriod] = useState<Period>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loginStats, setLoginStats] = useState<any>(null);
  // 最近登入清單
  const [activity, setActivity] = useState<any>({ data: [], total: 0, page: 1, page_size: 10 });
  const [actKeyword, setActKeyword] = useState('');
  const [actPage, setActPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (canManageReviews) {
          const res = await reviewsApi.getStats();
          setStats(res.data);
        }
        if (employee) {
          setMyStats({
            total: employee.total_reviews || 0,
            positive: employee.positive_count || 0,
            negative: employee.negative_count || 0,
          });
        }
      } catch (err) {
        console.error('載入統計失敗:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [canManageReviews, employee]);

  // 登入排名（依區間）
  useEffect(() => {
    if (!canManageReviews) return;
    const r = rangeFor(period, customFrom, customTo);
    if (!r) return;
    authApi.getLoginStats(r).then(res => setLoginStats(res.data)).catch(() => {});
  }, [canManageReviews, period, customFrom, customTo]);

  // 最近登入清單（分頁 + 搜尋）
  useEffect(() => {
    if (!canManageReviews) return;
    authApi
      .getLoginActivity({ keyword: actKeyword, page: actPage, page_size: 10 })
      .then(res => setActivity(res.data))
      .catch(() => {});
  }, [canManageReviews, actKeyword, actPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-sm" style={{ color: '#8b7355' }}>載入中...</div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((activity.total || 0) / (activity.page_size || 10)));
  const periods: [Period, string][] = [['week', '本週'], ['month', '本月'], ['custom', '自訂區間']];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #8b6f4e 0%, #a68b6a 100%)', color: '#ffffff' }}
      >
        <p className="text-sm opacity-80 mb-1">歡迎回來</p>
        <h1 className="text-2xl font-bold">{user?.name}</h1>
        <p className="text-sm mt-2 opacity-75">
          {canManageReviews
            ? '您可以管理所有員工的評價與客戶回報記錄。'
            : '您可以查看自己的評價記錄與回覆客戶留言。'}
        </p>
      </div>

      {/* 管理員：系統總覽 */}
      {canManageReviews && stats && (
        <section>
          <SectionTitle>系統總覽</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="總評價數" value={stats.total} accent="#8b6f4e" />
            <StatCard label="正評" value={stats.positive} accent="#16a34a" />
            <StatCard label="負評" value={stats.negative} accent="#dc2626" />
            <StatCard label="待處理" value={stats.pending} accent="#d97706" />
            <StatCard label="本週新增" value={stats.recent_week} accent="#7c3aed" />
          </div>
        </section>
      )}

      {/* 管理員：登入統計 */}
      {canManageReviews && (
        <section>
          <SectionTitle>登入統計</SectionTitle>

          {/* 區間切換 */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '1px solid #e8ddd0' }}>
              {periods.map(([p, label], i) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-4 py-1.5 text-sm"
                  style={{
                    backgroundColor: period === p ? '#8b6f4e' : '#fff',
                    color: period === p ? '#fff' : '#8b7355',
                    borderLeft: i ? '1px solid #e8ddd0' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="inline-flex items-center gap-2 text-sm" style={{ color: '#8b7355' }}>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="px-2 py-1 border rounded"
                  style={{ borderColor: '#e8ddd0' }}
                />
                <span>~</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="px-2 py-1 border rounded"
                  style={{ borderColor: '#e8ddd0' }}
                />
              </div>
            )}
          </div>

          {/* 前5 / 後5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LoginRankCard title="最常登入 前 5 名" rows={loginStats?.top || []} accent="#16a34a" />
            <LoginRankCard title="最少登入 前 5 名（僅列有登入者）" rows={loginStats?.bottom || []} accent="#dc2626" />
          </div>

          {/* 人員最近登入時間 */}
          <div className="mt-3 rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e8ddd0' }}>
            <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: '1px solid #f0e9df' }}>
              <span className="text-sm font-semibold" style={{ color: '#8b7355' }}>人員最近登入時間</span>
              <input
                value={actKeyword}
                onChange={e => { setActKeyword(e.target.value); setActPage(1); }}
                placeholder="搜尋姓名 / 門市 / 員工編號"
                className="px-3 py-1.5 border rounded text-sm"
                style={{ borderColor: '#e8ddd0', minWidth: '220px' }}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: '#f9f6f2' }}>
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">門市</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">姓名</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">員工編號</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">最近登入時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(activity.data || []).length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">沒有資料</td></tr>
                  ) : (
                    activity.data.map((r: any, idx: number) => (
                      <tr key={r.erpid || idx}>
                        <td className="px-4 py-2">{r.store_name || '-'}</td>
                        <td className="px-4 py-2 font-medium">{r.name || r.erpid}</td>
                        <td className="px-4 py-2 text-gray-500">{r.erpid}</td>
                        <td className="px-4 py-2">{fmtDateTime(r.last_login_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-sm" style={{ color: '#8b7355', borderTop: '1px solid #f0e9df' }}>
              <span>共 {activity.total || 0} 筆 · 每頁 10 筆</span>
              <span className="inline-flex items-center gap-3">
                <button disabled={actPage <= 1} onClick={() => setActPage(p => Math.max(1, p - 1))} className="px-2 disabled:opacity-40">‹</button>
                <span>第 {actPage} / {totalPages} 頁</span>
                <button disabled={actPage >= totalPages} onClick={() => setActPage(p => Math.min(totalPages, p + 1))} className="px-2 disabled:opacity-40">›</button>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 我的評價統計 */}
      {myStats && (
        <section>
          <SectionTitle>我的評價統計</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="總評價數" value={myStats.total} accent="#8b6f4e" />
            <StatCard label="正評" value={myStats.positive} accent="#16a34a" />
            <StatCard label="負評" value={myStats.negative} accent="#dc2626" />
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#8b7355' }}>
      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#cdbea2' }} />
      {children}
    </h2>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-4 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #e8ddd0' }}>
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: accent }} />
      <p className="text-3xl font-bold pl-2" style={{ color: accent }}>{value}</p>
      <p className="text-xs mt-1 pl-2" style={{ color: '#8b7355' }}>{label}</p>
    </div>
  );
}

function LoginRankCard({ title, rows, accent }: { title: string; rows: any[]; accent: string }) {
  return (
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e8ddd0' }}>
      <div className="px-4 py-2 text-sm font-medium" style={{ backgroundColor: '#f9f6f2', color: '#8b7355' }}>{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500">
            <th className="px-4 py-2 text-left font-medium">門市</th>
            <th className="px-4 py-2 text-left font-medium">姓名</th>
            <th className="px-4 py-2 text-right font-medium">次數</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">尚無資料</td></tr>
          ) : (
            rows.map((r: any, idx: number) => (
              <tr key={r.erpid || idx}>
                <td className="px-4 py-2">{r.store_name || '-'}</td>
                <td className="px-4 py-2 font-medium">{r.name || r.erpid}</td>
                <td className="px-4 py-2 text-right font-semibold" style={{ color: accent }}>{r.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
