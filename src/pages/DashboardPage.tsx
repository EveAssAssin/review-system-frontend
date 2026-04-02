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
        // 公關部/管理員看全部統計
        if (canManageReviews) {
          const res = await reviewsApi.getStats();
          setStats(res.data);
        }
        
        // 所有人都看自己的統計（從 employee 資料取得）
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
    return <div className="p-6">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>

      {/* 歡迎訊息 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold">歡迎，{user?.name}！</h2>
        <p className="text-gray-600 mt-1">
          {canManageReviews 
            ? '您可以管理所有員工的評價記錄。' 
            : '您可以查看自己的評價記錄。'}
        </p>
      </div>

      {/* 公關部/管理員：顯示全部統計 */}
      {canManageReviews && stats && (
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">系統總覽</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="總評價數" value={stats.total} color="blue" />
            <StatCard label="正評" value={stats.positive} color="green" />
            <StatCard label="負評" value={stats.negative} color="red" />
            <StatCard label="待處理" value={stats.pending} color="yellow" />
            <StatCard label="本週新增" value={stats.recent_week} color="purple" />
          </div>
        </div>
      )}

      {/* 一般人員：只顯示自己的統計 */}
      {!canManageReviews && myStats && (
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">我的評價統計</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="總評價數" value={myStats.total} color="blue" />
            <StatCard label="正評" value={myStats.positive} color="green" />
            <StatCard label="負評" value={myStats.negative} color="red" />
          </div>
        </div>
      )}

      {/* 公關部也顯示自己的統計 */}
      {canManageReviews && myStats && (
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">我的評價統計</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="總評價數" value={myStats.total} color="blue" />
            <StatCard label="正評" value={myStats.positive} color="green" />
            <StatCard label="負評" value={myStats.negative} color="red" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  );
}
