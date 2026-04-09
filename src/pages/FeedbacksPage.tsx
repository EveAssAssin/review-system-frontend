import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { feedbackApi } from '../services/api';

const TYPE_LABELS: Record<string, string> = {
  suggestion: '建議',
  complaint: '投訴',
  praise: '稱讚',
  inquiry: '詢問',
  other: '其他',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待處理',
  processing: '處理中',
  resolved: '已解決',
  closed: '已結案',
};

const URGENCY_LABELS: Record<string, string> = {
  urgent_plus: '特急',
  urgent: '緊急',
  normal: '普通',
};

const FeedbacksPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    feedback_type: '',
    status: '',
    urgency: '',
    keyword: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filters.feedback_type) params.feedback_type = filters.feedback_type;
      if (filters.status) params.status = filters.status;
      if (filters.urgency) params.urgency = filters.urgency;
      if (filters.keyword) params.keyword = filters.keyword;

      const [feedbacksRes, statsRes] = await Promise.all([
        feedbackApi.search(params),
        feedbackApi.getStats(),
      ]);
      setFeedbacks(feedbacksRes.data.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-[#e8ddd0] text-[#5c4033]';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint': return 'bg-red-100 text-red-800';
      case 'praise': return 'bg-green-100 text-green-800';
      case 'suggestion': return 'bg-[#e8ddd0] text-[#5c4033]';
      case 'inquiry': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent_plus': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-400 text-white';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">客戶回報管理</h2>
        <Link
          to="/feedbacks/new"
          className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded"
        >
          新增回報
        </Link>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-500 mt-1">總計</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-gray-500 mt-1">待處理</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-red-500">{stats.urgent_pending}</div>
            <div className="text-sm text-gray-500 mt-1">特急待處理</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-[#8b6f4e]">{stats.complaint}</div>
            <div className="text-sm text-gray-500 mt-1">投訴件數</div>
          </div>
        </div>
      )}

      {/* 篩選 */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="搜尋客戶姓名、電話、內容..."
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          className="px-3 py-2 border rounded flex-1 min-w-40"
        />
        <select
          value={filters.feedback_type}
          onChange={(e) => setFilters({ ...filters, feedback_type: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有類型</option>
          <option value="suggestion">建議</option>
          <option value="complaint">投訴</option>
          <option value="praise">稱讚</option>
          <option value="inquiry">詢問</option>
          <option value="other">其他</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有狀態</option>
          <option value="pending">待處理</option>
          <option value="processing">處理中</option>
          <option value="resolved">已解決</option>
          <option value="closed">已結案</option>
        </select>
        <select
          value={filters.urgency}
          onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有緊急度</option>
          <option value="urgent_plus">特急</option>
          <option value="urgent">緊急</option>
          <option value="normal">普通</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">沒有回報資料</div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#f9f6f2]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客戶</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">類型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">類別</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">緊急度</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">狀態</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">負責人員</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">建立時間</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {feedbacks.map((fb) => (
                <tr key={fb.id} className="hover:bg-[#f9f6f2]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{fb.client_name}</div>
                    {fb.client_phone && (
                      <div className="text-xs text-gray-400">{fb.client_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getTypeColor(fb.feedback_type)}`}>
                      {TYPE_LABELS[fb.feedback_type] || fb.feedback_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {fb.feedback_categories?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {fb.urgency !== 'normal' ? (
                      <span className={`px-2 py-1 text-xs rounded font-medium ${getUrgencyColor(fb.urgency)}`}>
                        {URGENCY_LABELS[fb.urgency]}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">普通</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(fb.status)}`}>
                      {STATUS_LABELS[fb.status] || fb.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {fb.employees?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {new Date(fb.created_at).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/feedbacks/${fb.id}`}
                      className="text-[#8b6f4e] hover:underline"
                    >
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FeedbacksPage;
