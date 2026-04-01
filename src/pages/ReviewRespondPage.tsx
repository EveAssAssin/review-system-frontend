import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reviewsApi } from '../services/api';
import { Review, SOURCE_LABELS, TYPE_LABELS, STATUS_LABELS } from '../types';

const ReviewRespondPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchReview = async () => {
    try {
      const res = await reviewsApi.getByToken(token!);
      setReview(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '無法載入評價');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('請輸入回覆內容');
      return;
    }

    setSubmitting(true);
    try {
      await reviewsApi.respond(token!, content);
      setSubmitted(true);
      fetchReview();
    } catch (err: any) {
      alert(err.response?.data?.message || '回覆失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-TW');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <div className="text-gray-700">{error}</div>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">評價不存在</div>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="bg-blue-500 text-white p-6">
            <h1 className="text-xl font-bold">員工評價回覆</h1>
            <p className="text-blue-100 mt-1">{review.employee_name}</p>
          </div>

          {/* 評價資訊 */}
          <div className="p-6 border-b">
            <div className="flex gap-2 mb-4">
              <span className={`px-2 py-1 rounded text-sm ${getTypeColor(review.review_type)}`}>
                {TYPE_LABELS[review.review_type]}
              </span>
              <span className="px-2 py-1 rounded text-sm bg-gray-100">
                {SOURCE_LABELS[review.source]}
              </span>
              <span className="px-2 py-1 rounded text-sm bg-gray-100">
                {STATUS_LABELS[review.status]}
              </span>
            </div>

            {review.content && (
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">評價內容</div>
                <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">{review.content}</div>
              </div>
            )}

            <div className="text-sm text-gray-500">
              建立時間：{formatDate(review.created_at)}
            </div>
          </div>

          {/* 回覆記錄 */}
          {review.responses && review.responses.length > 0 && (
            <div className="p-6 border-b">
              <h3 className="font-medium mb-4">對話記錄</h3>
              <div className="space-y-4">
                {review.responses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-4 rounded-lg ${
                      response.responder_type === 'employee' ? 'bg-blue-50 ml-0 mr-8' : 'bg-gray-50 ml-8 mr-0'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">
                        {response.responder_type === 'employee' ? '我' : '公關部'}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(response.created_at)}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{response.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 回覆表單 */}
          <div className="p-6">
            {review.status === 'closed' ? (
              <div className="text-center text-gray-500 py-4">
                此評價已結案，無法再回覆
              </div>
            ) : !review.requires_response ? (
              <div className="text-center text-gray-500 py-4">
                此評價不需要回覆
              </div>
            ) : submitted ? (
              <div className="text-center py-4">
                <div className="text-green-500 text-2xl mb-2">✓</div>
                <div className="text-gray-700">回覆已送出</div>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setContent('');
                  }}
                  className="mt-4 text-blue-500 hover:underline"
                >
                  繼續回覆
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="請輸入您的回覆..."
                  rows={5}
                  className="w-full px-3 py-2 border rounded mb-4"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {submitting ? '送出中...' : '送出回覆'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewRespondPage;
