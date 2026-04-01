import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewsApi } from '../services/api';
import { Review, SOURCE_LABELS, TYPE_LABELS, STATUS_LABELS, URGENCY_LABELS } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchReview = async () => {
    try {
      const res = await reviewsApi.getById(id!);
      setReview(res.data);
    } catch (error) {
      console.error('Failed to fetch review:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, [id]);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      await reviewsApi.addReviewerResponse(id!, replyContent, user?.name || '公關部');
      setReplyContent('');
      fetchReview();
    } catch (error: any) {
      alert(error.response?.data?.message || '回覆失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    setSubmitting(true);
    try {
      await reviewsApi.close(id!, closeNote);
      setShowCloseModal(false);
      fetchReview();
    } catch (error: any) {
      alert(error.response?.data?.message || '結案失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此評價嗎？此操作無法復原。')) return;
    try {
      await reviewsApi.delete(id!);
      navigate('/reviews');
    } catch (error: any) {
      alert(error.response?.data?.message || '刪除失敗');
    }
  };

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

  if (loading) {
    return <div className="text-center py-8">載入中...</div>;
  }

  if (!review) {
    return <div className="text-center py-8">評價不存在</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 標題列 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">評價詳情</h2>
        <div className="flex gap-2">
          {review.status !== 'closed' && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              結案
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
          >
            刪除
          </button>
          <button
            onClick={() => navigate('/reviews')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            返回
          </button>
        </div>
      </div>

      {/* 基本資訊 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">員工</div>
            <div className="font-medium">{review.employee_name || review.employee_id.slice(0, 8)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">來源</div>
            <div className="font-medium">{SOURCE_LABELS[review.source]}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">類型</div>
            <span className={`px-2 py-1 rounded text-sm ${getTypeColor(review.review_type)}`}>
              {TYPE_LABELS[review.review_type]}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-500">狀態</div>
            <span className={`px-2 py-1 rounded text-sm ${getStatusColor(review.status)}`}>
              {STATUS_LABELS[review.status]}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-500">緊急程度</div>
            <div className="font-medium">{URGENCY_LABELS[review.urgency]}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">事件日期</div>
            <div className="font-medium">{review.event_date || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">建立時間</div>
            <div className="font-medium">{formatDate(review.created_at)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">回覆時間</div>
            <div className="font-medium">
              {review.responded_at ? formatDate(review.responded_at) : '-'}
            </div>
          </div>
        </div>

        {review.content && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500 mb-1">內容說明</div>
            <div className="whitespace-pre-wrap">{review.content}</div>
          </div>
        )}

        {review.close_note && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500 mb-1">結案備註</div>
            <div className="whitespace-pre-wrap">{review.close_note}</div>
          </div>
        )}
      </div>

      {/* 回覆記錄 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">回覆記錄</h3>
        {review.responses && review.responses.length > 0 ? (
          <div className="space-y-4">
            {review.responses.map((response) => (
              <div
                key={response.id}
                className={`p-4 rounded-lg ${
                  response.responder_type === 'employee' ? 'bg-blue-50 ml-0 mr-12' : 'bg-gray-50 ml-12 mr-0'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">
                    {response.responder_name || (response.responder_type === 'employee' ? '員工' : '公關部')}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(response.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap">{response.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">尚無回覆</div>
        )}

        {/* 新增回覆 */}
        {review.status !== 'closed' && (
          <div className="mt-4 pt-4 border-t">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="輸入回覆內容..."
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
            <button
              onClick={handleReply}
              disabled={submitting || !replyContent.trim()}
              className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {submitting ? '發送中...' : '發送回覆'}
            </button>
          </div>
        )}
      </div>

      {/* 結案 Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">結案評價</h3>
            <textarea
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              placeholder="結案備註（選填）"
              rows={3}
              className="w-full px-3 py-2 border rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                取消
              </button>
              <button
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {submitting ? '處理中...' : '確認結案'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDetailPage;
