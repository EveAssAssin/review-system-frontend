import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reviewsApi } from '../services/api';
import { Review, SOURCE_LABELS, TYPE_LABELS, STATUS_LABELS, ReviewType, ReviewStatus } from '../types';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    review_type: '',
    status: '',
  });
  const navigate = useNavigate();
  const limit = 20;

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset: page * limit };
      if (filters.review_type) params.review_type = filters.review_type;
      if (filters.status) params.status = filters.status;
      
      const res = await reviewsApi.search(params);
      setReviews(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, filters]);

  const getTypeColor = (type: ReviewType) => {
    switch (type) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: ReviewStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-TW');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">評價管理</h2>
        <button
          onClick={() => navigate('/reviews/new')}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          新增評價
        </button>
      </div>

      {/* 篩選 */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4">
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
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">沒有評價記錄</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">員工</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">來源</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">類型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">狀態</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">建立時間</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {review.employee_name || review.employee_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    {SOURCE_LABELS[review.source] || review.source}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${getTypeColor(review.review_type)}`}>
                      {TYPE_LABELS[review.review_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(review.status)}`}>
                      {STATUS_LABELS[review.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(review.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/reviews/${review.id}`}
                      className="text-blue-500 hover:underline"
                    >
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 分頁 */}
        {total > limit && (
          <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              共 {total} 筆，第 {page + 1} / {Math.ceil(total / limit)} 頁
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一頁
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
