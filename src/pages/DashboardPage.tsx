import React, { useEffect, useState } from 'react';
import { reviewsApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  reviews: {
    total: number;
    pending: number;
    responded: number;
    closed: number;
    by_type: Record<string, number>;
    by_source: Record<string, number>;
  };
  employees: {
    total: number;
    active: number;
    by_department: Record<string, number>;
  };
}

const DashboardPage: React.FC = () => {
  const { user, employee, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [reviewsRes, employeesRes] = await Promise.all([
          reviewsApi.getStats(),
          isAdmin ? employeesApi.getStats() : Promise.resolve({ data: null }),
        ]);
        setStats({
          reviews: reviewsRes.data,
          employees: employeesRes.data || { total: 0, active: 0, by_department: {} },
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">儀表板</h2>

      {/* 歡迎訊息 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">
          歡迎，{user?.name}！
        </h3>
        <p className="text-gray-600">
          {isAdmin ? '您擁有管理員權限，可以管理所有評價和設定。' : '您可以查看自己的評價記錄。'}
        </p>
      </div>

      {/* 評價統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">{stats?.reviews.total || 0}</div>
          <div className="text-gray-500">總評價數</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-yellow-600">{stats?.reviews.pending || 0}</div>
          <div className="text-gray-500">待處理</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600">{stats?.reviews.responded || 0}</div>
          <div className="text-gray-500">已回覆</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-gray-600">{stats?.reviews.closed || 0}</div>
          <div className="text-gray-500">已結案</div>
        </div>
      </div>

      {/* 評價類型分佈 */}
      {isAdmin && stats?.reviews.by_type && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">評價類型分佈</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                {stats.reviews.by_type.positive || 0}
              </div>
              <div className="text-gray-600">正評</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">
                {stats.reviews.by_type.negative || 0}
              </div>
              <div className="text-gray-600">負評</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-600">
                {stats.reviews.by_type.other || 0}
              </div>
              <div className="text-gray-600">其他</div>
            </div>
          </div>
        </div>
      )}

      {/* 員工個人統計 */}
      {!isAdmin && employee && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">我的評價統計</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{employee.total_reviews}</div>
              <div className="text-gray-600">總評價</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{employee.positive_count}</div>
              <div className="text-gray-600">正評</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{employee.negative_count}</div>
              <div className="text-gray-600">負評</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {employee.avg_response_hours.toFixed(1)}h
              </div>
              <div className="text-gray-600">平均回覆時間</div>
            </div>
          </div>
        </div>
      )}

      {/* 員工統計（管理員） */}
      {isAdmin && stats?.employees && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">員工統計</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.employees.total}</div>
              <div className="text-gray-600">總員工數</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.employees.active}</div>
              <div className="text-gray-600">在職員工</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
