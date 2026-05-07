import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewsApi } from '../services/api';
import { Review, SOURCE_LABELS, TYPE_LABELS, STATUS_LABELS, formatReviewNo } from '../types';

// 倒數秒數轉成「Xd Yh Zm」字串
const formatCountdown = (deadline: string): string => {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return '已過期';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d} 天 ${h} 時`;
  if (h > 0) return `${h} 時 ${m} 分`;
  return `${m} 分`;
};

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [, setTick] = useState(0);
  // 每分鐘重繪以更新倒數
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    review_type: '',
    status: '',
    source: '',
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('確定要刪除此評價？此操作無法復原。')) return;
    try {
      await reviewsApi.delete(id);
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('刪除失敗，請再試一次');
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filters.review_type) params.review_type = filters.review_type;
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;

      const res = await reviewsApi.search(params);
      setReviews(res.data.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'responded':
        return 'bg-[#e8ddd0] text-[#5c4033]';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">評價管理</h2>
        <Link
          to="/reviews/new"
          className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded"
        >
          新增評價
        </Link>
      </div>

      {/* 篩選 */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4 flex-wrap">
        <select
          value={filters.review_type}
          onChange={(e) => setFilters({ ...filters, review_type: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有類型</option>
          <option value="positive">正評</option>
          <option value="negative">負評</option>
          <option value="other">其他</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有狀態</option>
          <option value="pending">待處理</option>
          <option value="responded">已回覆</option>
          <option value="closed">已結案</option>
        </select>

        <select
          value={filters.source}
          onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有來源</option>
          <option value="google_map">Google MAP</option>
          <option value="facebook">Facebook</option>
          <option value="phone">電話客服</option>
          <option value="app">APP 客服</option>
          <option value="other">其他</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">沒有評價資料</div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#f9f6f2]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">編號</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">員工</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">類型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">來源</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">狀態</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">洗評論</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">建立時間</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-[#f9f6f2]">
                  <td className="px-4 py-3 font-mono text-sm text-gray-700">
                    {formatReviewNo(review.review_number) || '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {review.employees?.name || review.employee_name || '-'}
                    {review.employees?.store_name && (
                      <div className="text-xs text-gray-400">{review.employees.store_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getTypeColor(review.review_type)}`}>
                      {TYPE_LABELS[review.review_type] || review.review_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {SOURCE_LABELS[review.source] || review.source}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(review.status)}`}>
                      {STATUS_LABELS[review.status] || review.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {review.wash_task ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {review.wash_task.has_pending_review && (
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" title="有待審核照片"></span>
                          )}
                          {review.wash_task.status === 'completed' && (
                            <span className="text-green-600 font-medium">✓ 完成</span>
                          )}
                          {review.wash_task.status === 'failed' && (
                            <span className="text-red-600 font-medium">✗ 失敗</span>
                          )}
                          {review.wash_task.status === 'in_progress' && !review.wash_task.is_expired && (
                            <span className="text-[#8b6f4e] font-medium">{formatCountdown(review.wash_task.deadline)}</span>
                          )}
                          {review.wash_task.status === 'in_progress' && review.wash_task.is_expired && (
                            <span className="text-orange-600 font-medium">⚠️ 已過期</span>
                          )}
                        </div>
                        <div className="text-gray-500">
                          {review.wash_task.approved_count}/{review.wash_task.required_count}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(review.created_at).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <Link
                      to={`/reviews/${review.id}`}
                      className="text-[#8b6f4e] hover:underline text-sm"
                    >
                      查看
                    </Link>
                    <button
                      onClick={(e) => handleDelete(review.id, e)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      刪除
                    </button>
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

export default ReviewsPage;
