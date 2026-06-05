import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewsApi, uploadsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatReviewNo } from '../types';
import FileUpload from '../components/FileUpload';
import WashSection from '../components/WashSection';

interface Review {
  id: string;
  review_number?: number;
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
  const { user, canManageReviews, employee } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [showEmployeeResponseForm, setShowEmployeeResponseForm] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [employeeResponseContent, setEmployeeResponseContent] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [closeReason, setCloseReason] = useState<'normal' | 'wash_failed' | 'wash_completed'>('normal');
  const [washFailedExposed, setWashFailedExposed] = useState(false);
  const [aiTone, setAiTone] = useState('誠懇道歉');
  const [aiCustomTone, setAiCustomTone] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [replyTemplates, setReplyTemplates] = useState<any[]>([]);
  useEffect(() => { reviewsApi.listReplyTemplates().then(r => setReplyTemplates(r.data || [])).catch(() => {}); }, []);

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

  const handleAiGenerate = async () => {
    if (!review?.content) { alert('此評價沒有內容可供生成'); return; }
    const tone = aiTone === '自訂' ? (aiCustomTone.trim() || '誠懇、專業') : aiTone;
    setAiGenerating(true);
    try {
      const res = await reviewsApi.aiReplyDraft(review.content, tone);
      if (res.data?.draft) setResponseContent(res.data.draft);
      else alert('AI 未生成內容（可能後端未設定金鑰）');
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI 生成失敗');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!responseContent.trim()) { alert('回覆內容是空的'); return; }
    const name = prompt('範本名稱：');
    if (!name || !name.trim()) return;
    try {
      await reviewsApi.createReplyTemplate({ name: name.trim(), tone: aiTone, content: responseContent, created_by: user?.name });
      const r = await reviewsApi.listReplyTemplates();
      setReplyTemplates(r.data || []);
      alert('已儲存範本');
    } catch (err: any) {
      alert(err.response?.data?.message || '儲存失敗');
    }
  };

  const handleUploadTemplateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResponseContent(String(reader.result || ''));
    reader.readAsText(file);
    e.target.value = '';
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
      await reviewsApi.close(id!, closeNote, closeReason);
      setShowCloseForm(false);
      setCloseReason('normal');
      loadReview();
    } catch (err) {
      console.error('結案失敗:', err);
      alert('結案失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeResponse = async () => {
    if (!employeeResponseContent.trim()) { alert('請輸入回覆內容'); return; }
    if (!review?.response_token) { alert('此評價無法回覆'); return; }
    setSubmitting(true);
    try {
      await reviewsApi.submitResponse(review.response_token, {
        content: employeeResponseContent,
        employee_name: user?.name || employee?.name || '員工',
      });
      setShowEmployeeResponseForm(false);
      setEmployeeResponseContent('');
      loadReview();
    } catch (err) {
      console.error('回覆失敗:', err);
      alert('回覆失敗');
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
  // 是否為本人評價（employee_id 或 actual_employee_id 匹配）
  const isMyReview = employee && (review.employee_id === employee.id || review.actual_employee_id === employee.id);
  const canRespond = isMyReview && review.status !== 'closed' && review.requires_response && review.response_token;

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-baseline gap-2">
          評價詳情
          {review.review_number != null && (
            <span className="font-mono text-base text-gray-500">{formatReviewNo(review.review_number)}</span>
          )}
        </h1>
        <button
          onClick={() => navigate(canManageReviews ? '/reviews' : '/my-reviews')}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← 返回列表
        </button>
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
            <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap">{review.content}</div>
          </div>
        )}

        {/* 與人員對話（對話式 / 建立評價時自動發起） */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold" style={{ color: '#5b7fad' }}>💬 與人員對話</div>
            <span className="text-xs text-gray-400">建立評價時自動發起</span>
          </div>
          <div className="rounded-lg p-3 space-y-3" style={{ backgroundColor: '#faf9f6', border: '1px solid #ede8e2' }}>
            {responses.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">尚無對話紀錄，{canManageReviews ? '可使用下方「公關部回覆」開始溝通' : (canRespond ? '請點擊下方「我要回覆」開始溝通' : '等待公關部開始溝通')}</div>
            ) : (
              responses.map((resp) => {
                const isEmployee = resp.responder_type === 'employee';
                return (
                  <div key={resp.id} className={`flex ${isEmployee ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isEmployee ? 'bg-white text-gray-800' : 'text-white'}`}
                      style={isEmployee ? { border: '1px solid #ede8e2' } : { backgroundColor: '#8b6f4e' }}>
                      <div className={`flex items-center gap-2 mb-1 text-[11px] ${isEmployee ? 'text-gray-500' : 'text-white/80'}`}>
                        <span className="font-medium">
                          {isEmployee ? `👤 ${resp.responder_name || '員工'}` : `🏢 ${resp.responder_name || '公關部'}`}
                        </span>
                        <span>·</span>
                        <span>{new Date(resp.created_at).toLocaleString()}</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{resp.content}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 洗評論（5-1～5-8）— 上傳開放給所有可看到本頁的使用者；審核仍限公關 */}
        <WashSection
          reviewId={review.id}
          reviewClosed={review.status === 'closed'}
          isPrAdmin={!!canManageReviews}
          currentUserName={user?.name || employee?.name}
          onChange={loadReview}
          onWashFailedExposed={setWashFailedExposed}
        />

        {/* 即時應急回覆（客服當下留言給客人，讓客人知道公司已注意到） */}
        {review.immediate_response && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-semibold" style={{ color: '#8b6f4e' }}>即時應急回覆</div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>客服→客人</span>
            </div>
            <div className="p-3 rounded-lg text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
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
          <div className="border-t pt-4 flex flex-wrap gap-3">
            {/* 公關部管理員才看得到 */}
            {canManageReviews && (
              <>
                <button onClick={() => setShowResponseForm(true)} className="px-4 py-2 bg-[#8b6f4e] text-white rounded hover:opacity-80 text-sm">🏢 公關部回覆</button>
                <button onClick={() => setShowCloseForm(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:opacity-80 text-sm">✓ 結案</button>
              </>
            )}
            {/* 本人員工回覆 */}
            {canRespond && !showEmployeeResponseForm && (
              <button onClick={() => setShowEmployeeResponseForm(true)} className="px-4 py-2 text-white rounded hover:opacity-80 text-sm" style={{ backgroundColor: '#5b7fad' }}>👤 我要回覆</button>
            )}
          </div>
        )}

        {/* 員工回覆表單（inline，不用 Modal） */}
        {showEmployeeResponseForm && (
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-semibold" style={{ color: '#5b7fad' }}>👤 員工回覆</div>
            <textarea
              value={employeeResponseContent}
              onChange={e => setEmployeeResponseContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded text-sm"
              placeholder="描述你的處理過程、與客戶的溝通結果、或你的說明..."
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleEmployeeResponse} disabled={submitting}
                className="px-4 py-2 text-white rounded text-sm disabled:opacity-50"
                style={{ backgroundColor: '#5b7fad' }}>
                {submitting ? '送出中...' : '送出回覆'}
              </button>
              <button onClick={() => { setShowEmployeeResponseForm(false); setEmployeeResponseContent(''); }}
                className="px-4 py-2 border rounded text-sm text-gray-600">
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 公關部回覆 Modal */}
      {showResponseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">公關部回覆</h2>

            {/* AI 生成回覆範本 */}
            <div className="border rounded p-3 mb-3" style={{ borderColor: '#d6c9ea', backgroundColor: '#faf8fd' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: '#7c5cab' }}>✨ AI 生成回覆範本</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {['誠懇道歉', '專業正式', '親切感謝', '自訂'].map((t) => (
                  <button key={t} type="button" onClick={() => setAiTone(t)}
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{ backgroundColor: aiTone === t ? '#7c5cab' : '#fff', color: aiTone === t ? '#fff' : '#6b5b8a', borderColor: '#d6c9ea' }}>
                    {t}
                  </button>
                ))}
              </div>
              {aiTone === '自訂' && (
                <input type="text" value={aiCustomTone} onChange={(e) => setAiCustomTone(e.target.value)}
                  placeholder="輸入想要的語氣，例如：簡短、強調補償方案" className="w-full px-2 py-1 border rounded text-xs mb-2" />
              )}
              <button type="button" onClick={handleAiGenerate} disabled={aiGenerating}
                className="text-xs px-3 py-1.5 rounded text-white disabled:opacity-50" style={{ backgroundColor: '#7c5cab' }}>
                {aiGenerating ? 'AI 生成中...' : '✨ AI 生成'}
              </button>
              <span className="text-xs text-gray-400 ml-2">會讀取此評價內容生成草稿</span>
            </div>

            <textarea value={responseContent} onChange={(e) => setResponseContent(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded mb-2" placeholder="請輸入回覆內容..." />

            {/* 範本操作 */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button type="button" onClick={handleSaveTemplate} className="text-xs px-3 py-1 border rounded text-gray-600">📑 儲存為範本</button>
              <select value="" onChange={(e) => { const t = replyTemplates.find((x) => x.id === e.target.value); if (t) setResponseContent(t.content); }}
                className="text-xs px-2 py-1 border rounded">
                <option value="">載入範本…</option>
                {replyTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.tone ? `（${t.tone}）` : ''}</option>
                ))}
              </select>
              <label className="text-xs px-3 py-1 border rounded text-gray-600 cursor-pointer">
                ⬆ 上傳檔案
                <input type="file" accept=".txt,text/plain" className="hidden" onChange={handleUploadTemplateFile} />
              </label>
            </div>
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

            {/* 結案類型 */}
            <div className="mb-4 space-y-2">
              <div className="text-sm font-medium text-gray-700">結案類型</div>
              <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50" style={{ borderColor: closeReason === 'normal' ? '#8b6f4e' : '#e5e7eb' }}>
                <input type="radio" name="closeReason" value="normal" checked={closeReason === 'normal'} onChange={() => setCloseReason('normal')} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">一般結案</div>
                  <div className="text-xs text-gray-500">已正常處理結束</div>
                </div>
              </label>
              {washFailedExposed && (
                <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-red-50" style={{ borderColor: closeReason === 'wash_failed' ? '#dc2626' : '#fecaca' }}>
                  <input type="radio" name="closeReason" value="wash_failed" checked={closeReason === 'wash_failed'} onChange={() => setCloseReason('wash_failed')} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-700">人員未洗評價結案</div>
                    <div className="text-xs text-red-500">標記為負面結案，AI 評價會反映較差，對外 API 會把此狀態傳出</div>
                  </div>
                </label>
              )}
            </div>

            <textarea value={closeNote} onChange={(e) => setCloseNote(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded mb-4" placeholder="結案備註（選填）..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCloseForm(false); setCloseReason('normal'); }} className="px-4 py-2 border rounded">取消</button>
              <button onClick={handleClose} disabled={submitting}
                className="px-4 py-2 text-white rounded disabled:opacity-50"
                style={{ backgroundColor: closeReason === 'wash_failed' ? '#dc2626' : '#16a34a' }}>
                {submitting ? '處理中...' : '確認結案'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
