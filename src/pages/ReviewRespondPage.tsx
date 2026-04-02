import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reviewsApi, uploadsApi } from '../services/api';
import FileUpload from '../components/FileUpload';

interface Review {
  id: string;
  employee_name?: string;
  content?: string;
  review_type: string;
  source: string;
  event_date?: string;
  status: string;
  created_at: string;
}

interface Response {
  id: string;
  responder_type: 'employee' | 'reviewer';
  responder_name: string;
  content: string;
  created_at: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'image' | 'video';
  uploaded_by: string;
}

export default function ReviewRespondPage() {
  const { token } = useParams<{ token: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState('');
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loadReview();
    }
  }, [token]);

  const loadReview = async () => {
    try {
      const res = await reviewsApi.getByToken(token!);
      setReview(res.data);
      if (res.data.id) {
        const [responsesRes, attachRes] = await Promise.all([
          reviewsApi.getResponses(res.data.id),
          uploadsApi.getByReviewId(res.data.id),
        ]);
        setResponses(responsesRes.data);
        setAttachments(attachRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '無法載入評價資料');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) {
      alert('請輸入回覆內容');
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.respond(token!, response);
      if (filesToUpload.length > 0 && review) {
        await uploadsApi.uploadForResponse(review.id, filesToUpload, 'employee');
      }
      setSubmitted(true);
      setResponse('');
      setFilesToUpload([]);
      // 重新載入以顯示新回覆
      loadReview();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || '回覆失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const sourceLabels: Record<string, string> = {
    google_map: 'Google MAP',
    facebook: 'Facebook',
    phone: '電話客服',
    app: 'APP 客服',
    other: '其他',
  };

  const typeLabels: Record<string, string> = {
    positive: '正評',
    negative: '負評',
    other: '其他',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow max-w-md text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <div className="text-gray-700">{error}</div>
        </div>
      </div>
    );
  }

  if (review?.status === 'closed') {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <div className="text-gray-500 text-xl mb-2">📋</div>
              <h2 className="text-xl font-bold mb-2">此評價已結案</h2>
              <p className="text-gray-600">此評價已經處理完成，無法再進行回覆。</p>
            </div>
            
            {/* 顯示回覆記錄 */}
            {responses.length > 0 && (
              <div className="border-t pt-4">
                <div className="text-gray-500 text-sm mb-3">回覆記錄</div>
                <div className="space-y-3">
                  {responses.map((resp) => (
                    <div key={resp.id} className={resp.responder_type === 'employee' ? 'bg-blue-50 p-3 rounded' : 'bg-green-50 p-3 rounded'}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={resp.responder_type === 'employee' ? 'font-medium text-blue-700' : 'font-medium text-green-700'}>
                          {resp.responder_type === 'employee' ? '👤 我的回覆' : '🏢 公關部回覆'}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(resp.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-700">{resp.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const reviewerAttachments = attachments.filter(a => a.uploaded_by === 'reviewer');

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">評價回覆</h1>

          {/* 成功提示 */}
          {submitted && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              ✓ 回覆已送出，公關部會盡快處理。
            </div>
          )}

          {/* 評價資訊 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">員工：</span>
                <span className="font-medium ml-1">{review?.employee_name}</span>
              </div>
              <div>
                <span className="text-gray-500">類型：</span>
                <span className={review?.review_type === 'positive' ? 'font-medium ml-1 text-green-600' : review?.review_type === 'negative' ? 'font-medium ml-1 text-red-600' : 'font-medium ml-1 text-gray-600'}>
                  {typeLabels[review?.review_type || ''] || review?.review_type}
                </span>
              </div>
              <div>
                <span className="text-gray-500">來源：</span>
                <span className="font-medium ml-1">{sourceLabels[review?.source || ''] || review?.source}</span>
              </div>
              <div>
                <span className="text-gray-500">日期：</span>
                <span className="font-medium ml-1">{review?.event_date ? new Date(review.event_date).toLocaleDateString() : '-'}</span>
              </div>
            </div>
            {review?.content && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-gray-500 text-sm mb-1">評價內容：</div>
                <div className="text-gray-800">{review.content}</div>
              </div>
            )}
            {reviewerAttachments.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-gray-500 text-sm mb-2">相關附件：</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {reviewerAttachments.map((att) => (
                    <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="block">
                      {att.file_type === 'image' ? (
                        <img src={att.file_url} alt={att.file_name} className="w-full h-20 object-cover rounded border hover:opacity-80" />
                      ) : (
                        <video src={att.file_url} className="w-full h-20 object-cover rounded border" />
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 回覆記錄 */}
          {responses.length > 0 && (
            <div className="mb-6">
              <div className="text-gray-500 text-sm mb-3">回覆記錄</div>
              <div className="space-y-3">
                {responses.map((resp) => (
                  <div key={resp.id} className={resp.responder_type === 'employee' ? 'bg-blue-50 p-3 rounded' : 'bg-green-50 p-3 rounded'}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={resp.responder_type === 'employee' ? 'font-medium text-blue-700' : 'font-medium text-green-700'}>
                        {resp.responder_type === 'employee' ? '👤 我的回覆' : '🏢 公關部回覆'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(resp.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-700">{resp.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 回覆表單 */}
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {responses.length > 0 ? '追加回覆' : '您的回覆'} <span className="text-red-500">*</span>
              </label>
              <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={5} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="請針對此評價進行說明或回覆..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">附件（選填，可上傳相關圖片或影片）</label>
              <FileUpload onFilesSelected={setFilesToUpload} maxFiles={5} maxSizeMB={50} />
            </div>
            <button type="submit" disabled={submitting || !response.trim()} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '送出中...' : responses.length > 0 ? '送出追加回覆' : '送出回覆'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
