import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewsApi, uploadsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from '../components/FileUpload';

interface Review {
  id: string;
  employee_id: string;
  is_proxy: boolean;
  actual_employee_id?: string;
  category_id?: string;
  source: string;
  review_type: string;
  urgency: string;
  event_date?: string;
  content?: string;
  status: string;
  requires_response: boolean;
  response_deadline?: string;
  response_token?: string;
  employee_response?: string;
  employee_responded_at?: string;
  reviewer_response?: string;
  reviewer_name?: string;
  reviewer_responded_at?: string;
  close_note?: string;
  immediate_response?: string;
  closed_at?: string;
  created_at: string;
  employees?: {
    name: string;
    store_name?: string;
    department?: string;
  };
  actual_employee?: {
    id: string;
    name: string;
    store_name?: string;
    department?: string;
    app_number?: string;
  } | null;
  review_categories?: {
    id: string;
    name: string;
  };
}

interface Response {
  id: string;
  review_id: string;
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
  upload_context: string;
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  useEffect(() => {
    if (id) {
      loadReview();
    }
  }, [id]);

  const loadReview = async () => {
    try {
      const res = await reviewsApi.getById(id!);
      setReview(res.data);
      
      const [responsesRes, attachRes] = await Promise.all([
        reviewsApi.getResponses(id!),
        uploadsApi.getByReviewId(id!),
      ]);
      setResponses(responsesRes.data);
      setAttachments(attachRes.data);
    } catch (err) {
      console.error('載入評價失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewerResponse = async () => {
    if (!responseContent.trim()) {
      alert('請輸入回覆內容');
      return;
    }

    setSubmitting(true);
    try {
      await reviewsApi.addReviewerResponse(id!, responseContent, user?.name || '公關部');
      
      if (filesToUpload.length > 0) {
        await uploadsApi.uploadForResponse(id!, filesToUpload, 'reviewer');
      }

      setShowResponseForm(false);
      setResponseContent('');
      setFilesToUpload([]);
      loadReview();
    } catch (err) {
      console.error('回覆失敗:', err);
      alert('回覆失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    setSubmitting(true);
    try {
      await reviewsApi.close(id!, closeNote);
      setShowCloseForm(false);
      loadReview();
    } catch (err) {
      console.error('結案失敗:', err);
      alert('結案失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('確定要刪除此附件嗎？')) return;
    try {
      await uploadsApi.delete(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('刪除附件失敗:', err);
      alert('刪除失敗');
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

  const statusLabels: Record<string, string> = {
    pending: '待處理',
    responded: '已回覆',
    closed: '已結案',
  };

  const urgencyLabels: Record<string, string> = {
    normal: '一般',
    urgent: '緊急',
    urgent_plus: '非常緊急',
  };

  if (loading) {
    return <div className="p-6">載入中...</div>;
  }

  if (!review) {
    return <div className="p-6">找不到評價資料</div>;
  }

  const reviewAttachments = attachments.filter(a => a.upload_context === 'review');

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">評價詳情</h1>
        <button onClick={() => navigate('/reviews')} className="text-gray-500 hover:text-gray-700">返回列表</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* 基本資訊 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-500 text-sm">
              {review.is_proxy ? '代理處理人（店長/主管）' : '評價對象'}
            </div>
            <div className="font-medium">
              {review.employees?.name || '-'}
              {review.is_proxy && (
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">代理處理</span>
              )}
            </div>
            <div className="text-sm text-gray-400">{review.employees?.store_name || review.employees?.department}</div>
            {/* 實際當事人 */}
            {review.is_proxy && review.actual_employee && (
              <div className="mt-2 flex items-center gap-1 text-sm text-orange-700 bg-orange-50 rounded px-2 py-1">
                <span className="font-medium">實際當事人：</span>
                <span>{review.actual_employee.name}</span>
                <span className="text-orange-400">
                  ({review.actual_employee.store_name || review.actual_employee.department})
                </span>
              </div>
            )}
            {review.is_proxy && !review.actual_employee && (
              <div className="mt-1 text-xs text-gray-400">實際當事人：未填寫</div>
            )}
          </div>
          <div>
            <div className="text-gray-500 text-sm">狀態</div>
            <div className={review.status === 'pending' ? 'font-medium text-yellow-600' : review.status === 'responded' ? 'font-medium text-[#8b6f4e]' : 'font-medium text-green-600'}>
              {statusLabels[review.status]}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">類型</div>
            <div className={review.review_type === 'positive' ? 'font-medium text-green-600' : review.review_type === 'negative' ? 'font-medium text-red-600' : 'font-medium text-gray-600'}>
              {typeLabels[review.review_type]}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">來源</div>
            <div className="font-medium">{sourceLabels[review.source]}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">分類</div>
            <div className="font-medium">{review.review_categories?.name || '-'}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">急迫程度</div>
            <div className={review.urgency === 'urgent_plus' ? 'font-medium text-red-600' : review.urgency === 'urgent' ? 'font-medium text-orange-600' : 'font-medium'}>
              {urgencyLabels[review.urgency]}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">事件日期</div>
            <div className="font-medium">{review.event_date ? new Date(review.event_date).toLocaleDateString() : '-'}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">建立時間</div>
            <div className="font-medium">{new Date(review.created_at).toLocaleString()}</div>
          </div>
        </div>

        {/* 評價內容 */}
        {review.content && (
          <div className="border-t pt-4">
            <div className="text-gray-500 text-sm mb-1">評價內容</div>
            <div className="bg-gray-50 p-3 rounded">{review.content}</div>
          </div>
        )}

        {/* 即時應急回覆 */}
        {review.immediate_response && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-semibold" style={{ color: '#8b6f4e' }}>即時應急回覆</div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>建立時記錄</span>
            </div>
            <div className="p-3 rounded-lg text-sm text-gray-700 leading-relaxed"
              style={{ backgroundColor: '#faf7f4', borderLeft: '3px solid #cdbea2' }}>
              {review.immediate_response}
            </div>
          </div>
        )}

        {/* 評價附件 */}
        {reviewAttachments.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-gray-500 text-sm mb-2">評價附件</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {reviewAttachments.map((att) => (
                <div key={att.id} className="relative group">
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                    {att.file_type === 'image' ? (
                      <img src={att.file_url} alt={att.file_name} className="w-full h-24 object-cover rounded" />
                    ) : (
                      <video src={att.file_url} className="w-full h-24 object-cover rounded" />
                    )}
                  </a>
                  <button onClick={() => handleDeleteAttachment(att.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 回覆記錄（多筆） */}
        {responses.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-gray-500 text-sm mb-3">回覆記錄</div>
            <div className="space-y-3">
              {responses.map((resp) => (
                <div key={resp.id} className={resp.responder_type === 'employee' ? 'bg-[#f5f0eb] p-3 rounded' : 'bg-green-50 p-3 rounded'}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={resp.responder_type === 'employee' ? 'font-medium text-blue-700' : 'font-medium text-green-700'}>
                      {resp.responder_type === 'employee' ? '👤 員工回覆' : '🏢 公關部回覆'} - {resp.responder_name}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(resp.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-700">{resp.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 結案備註 */}
        {review.status === 'closed' && review.close_note && (
          <div className="border-t pt-4">
            <div className="text-gray-500 text-sm mb-1">
              結案備註
              <span className="ml-2 text-xs text-gray-400">{review.closed_at && new Date(review.closed_at).toLocaleString()}</span>
            </div>
            <div className="bg-gray-100 p-3 rounded">{review.close_note}</div>
          </div>
        )}

        {/* 操作按鈕 */}
        {review.status !== 'closed' && (
          <div className="border-t pt-4 flex gap-3">
            <button onClick={() => setShowResponseForm(true)} className="px-4 py-2 bg-[#8b6f4e] text-white rounded hover:bg-blue-700">公關部回覆</button>
            <button onClick={() => setShowCloseForm(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">結案</button>
          </div>
        )}
      </div>

      {/* 公關部回覆 Modal */}
      {showResponseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">公關部回覆</h2>
            <textarea value={responseContent} onChange={(e) => setResponseContent(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded mb-4" placeholder="請輸入回覆內容..." />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">附件</label>
              <FileUpload onFilesSelected={setFilesToUpload} maxFiles={5} maxSizeMB={50} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowResponseForm(false); setFilesToUpload([]); }} className="px-4 py-2 border rounded">取消</button>
              <button onClick={handleReviewerResponse} disabled={submitting} className="px-4 py-2 bg-[#8b6f4e] text-white rounded disabled:opacity-50">{submitting ? '送出中...' : '送出'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 結案 Modal */}
      {showCloseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">結案</h2>
            <textarea value={closeNote} onChange={(e) => setCloseNote(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded mb-4" placeholder="結案備註（選填）..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCloseForm(false)} className="px-4 py-2 border rounded">取消</button>
              <button onClick={handleClose} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">{submitting ? '處理中...' : '確認結案'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
