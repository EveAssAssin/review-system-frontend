import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reviewsApi } from '../services/api';

export default function DashboardPage() {
  const { user, employee, canManageReviews } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-sm" style={{ color: '#8b7355' }}>載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #8b6f4e 0%, #a68b6a 100%)',
          color: '#ffffff',
        }}
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
    <h2
      className="text-sm font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
      style={{ color: '#8b7355' }}
    >
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ backgroundColor: '#cdbea2' }}
      />
      {children}
    </h2>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className="rounded-xl p-4 shadow-sm relative overflow-hidden"
      style={{ backgroundColor: '#ffffff', border: '1px solid #e8ddd0' }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: accent }}
      />
      <p
        className="text-3xl font-bold pl-2"
        style={{ color: accent }}
      >
        {value}
      </p>
      <p className="text-xs mt-1 pl-2" style={{ color: '#8b7355' }}>
        {label}
      </p>
    </div>
  );
}
