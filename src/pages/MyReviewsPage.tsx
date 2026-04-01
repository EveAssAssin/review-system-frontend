import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Review, SOURCE_LABELS, TYPE_LABELS, STATUS_LABELS } from '../types';

const MyReviewsPage: React.FC = () => {
  const { employee } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyReviews = async () => {
      if (!employee?.id) return;
      try {
        const res = await reviewsApi.search({ employee_id: employee.id, limit: 100 });
        setReviews(res.data.data);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyReviews();
  }, [employee]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-TW');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!employee) {
    return <div className="text-center py-8">找不到員工資料</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">我的評價</h2>

      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-blue-600">{employee.total_reviews}</div>
          <div className="text-gray-500 text-sm">總評價</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-green-600">{employee.positive_count}</div>
          <div className="text-gray-500 text-sm">正評</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-red-600">{employee.negative_count}</div>
          <div className="text-gray-500 text-sm">負評</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-gray-600">{employee.other_count}</div>
          <div className="text-gray-500 text-sm">其他</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-yellow-600">{employee.avg_response_hours.toFixed(1)}h</div>
          <div className="text-gray-500 text-sm">平均回覆時間</div>
        </div>
      </div>

      {/* 評價列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 font-medium">評價記錄</div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">尚無評價記錄</div>
        ) : (
          <div className="divide-y">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-sm ${getTypeColor(review.review_type)}`}>
                      {TYPE_LABELS[review.review_type]}
                    </span>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(review.status)}`}>
                      {STATUS_LABELS[review.status]}
                    </span>
                    <span className="text-sm text-gray-500">
                      {SOURCE_LABELS[review.source]}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                </div>
                {review.content && (
                  <p className="text-gray-700 line-clamp-2">{review.content}</p>
                )}
                {review.status === 'pending' && review.requires_response && (
                  <Link
                    to={`/review/respond/${review.response_token}`}
                    className="inline-block mt-2 text-blue-500 hover:underline text-sm"
                  >
                    前往回覆 →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReviewsPage;
