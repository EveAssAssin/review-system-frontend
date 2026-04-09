import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { feedbackApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const URGENCY_MAP: Record<string, { label: string; style: React.CSSProperties }> = {
  urgent_plus: { label: '特急', style: { backgroundColor: '#dc2626', color: '#fff' } },
  urgent:      { label: '緊急', style: { backgroundColor: '#ea580c', color: '#fff' } },
  normal:      { label: '普通', style: { backgroundColor: '#e8ddd0', color: '#5c4033' } },
};
const STATUS_MAP: Record<string, { label: string; style: React.CSSProperties }> = {
  pending:    { label: '待處理', style: { backgroundColor: '#fef9c3', color: '#854d0e' } },
  processing: { label: '處理中', style: { backgroundColor: '#e8ddd0', color: '#5c4033' } },
  resolved:   { label: '已解決', style: { backgroundColor: '#dcfce7', color: '#166534' } },
  closed:     { label: '已結案', style: { backgroundColor: '#f3f4f6', color: '#6b7280' } },
};
const TYPE_MAP: Record<string, string> = {
  suggestion: '建議', complaint: '投訴', praise: '稱讚', inquiry: '詢問', other: '其他',
};

export default function MyAssignedFeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, employee } = useAuth();

  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 新增紀錄 + 標記完成
  const [recordContent, setRecordContent] = useState('');
  const [markResolved, setMarkResolved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const load = async () => {
    try {
      const res = await feedbackApi.getById(id!);
      setFeedback(res.data);
    } catch { navigate('/my-feedbacks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordContent.trim()) return;
    setSubmitting(true);
    setResultMsg('');
    try {
      const res = await feedbackApi.employeeUpdate(id!, {
        content: recordContent.trim(),
        employee_name: user?.name || employee?.name || '員工',
        employee_id: employee?.id,
        mark_resolved: markResolved,
      });
      if (res.data.success) {
        setResultMsg(res.data.message);
        setRecordContent('');
        setMarkResolved(false);
        await load();
      } else {
        setResultMsg(`⚠ ${res.data.message}`);
      }
    } catch {
      setResultMsg('⚠ 送出失敗，請稍後再試');
    } finally {
      setSubmitting(false);
      setTimeout(() => setResultMsg(''), 4000);
    }
  };

  if (loading) return <div className="p-6 text-sm" style={{ color: '#8b7355' }}>載入中...</div>;
  if (!feedback) return null;

  const urgency = URGENCY_MAP[feedback.urgency] || URGENCY_MAP.normal;
  const status  = STATUS_MAP[feedback.status]   || STATUS_MAP.pending;
  const isClosed = feedback.status === 'closed';
  const isResolved = feedback.status === 'resolved';

  return (
    <div className="max-w-xl space-y-4">
      {/* Back */}
      <button
        onClick={() => navigate('/my-feedbacks')}
        className="text-sm flex items-center gap-1"
        style={{ color: '#8b7355' }}
      >
        ← 返回待辦列表
      </button>

      {/* Case header */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: '#fff', border: '1px solid #e8ddd0' }}
      >
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={urgency.style}>
            {urgency.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={status.style}>
            {status.label}
          </span>
          <span className="text-xs" style={{ color: '#8b7355' }}>
            {TYPE_MAP[feedback.feedback_type] || feedback.feedback_type}
          </span>
          {feedback.feedback_categories?.name && (
            <span className="text-xs" style={{ color: '#8b7355' }}>
              · {feedback.feedback_categories.name}
            </span>
          )}
        </div>

        <h2 className="font-bold text-lg" style={{ color: '#3d2b1f' }}>
          {feedback.client_name}
        </h2>
        {feedback.client_phone && (
          <p className="text-sm mt-0.5" style={{ color: '#8b7355' }}>{feedback.client_phone}</p>
        )}
        {feedback.content && (
          <p className="mt-3 text-sm whitespace-pre-wrap" style={{ color: '#5c4033' }}>
            {feedback.content}
          </p>
        )}
        <p className="text-xs mt-3" style={{ color: '#cdbea2' }}>
          建立：{new Date(feedback.created_at).toLocaleString('zh-TW')}
        </p>
      </div>

      {/* 已解決狀態提示 */}
      {(isResolved || isClosed) && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: isClosed ? '#f3f4f6' : '#dcfce7',
            color: isClosed ? '#6b7280' : '#166534',
            border: `1px solid ${isClosed ? '#e5e7eb' : '#bbf7d0'}`,
          }}
        >
          {isClosed
            ? `✅ 此案件已結案${feedback.close_note ? `：${feedback.close_note}` : ''}`
            : `✅ 你已回報處理完成，等待公關部審核結案`}
        </div>
      )}

      {/* 新增紀錄 + 標記完成（未結案才顯示） */}
      {!isClosed && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: '#fff', border: '1px solid #e8ddd0' }}
        >
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>
            回報處理進度
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#5c4033' }}>
                處理說明 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={recordContent}
                onChange={e => setRecordContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid #cdbea2', backgroundColor: '#faf8f5', color: '#3d2b1f' }}
                placeholder="描述你的處理方式、溝通結果、下一步驟..."
                required
              />
            </div>

            {/* 標記完成 checkbox */}
            {!isResolved && (
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg"
                style={{ backgroundColor: markResolved ? '#f0fdf4' : '#f9f6f2', border: `1px solid ${markResolved ? '#bbf7d0' : '#e8ddd0'}` }}>
                <input
                  type="checkbox"
                  checked={markResolved}
                  onChange={e => setMarkResolved(e.target.checked)}
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: markResolved ? '#166534' : '#3d2b1f' }}>
                    ✅ 標記我已處理完成
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>
                    勾選後，案件狀態改為「已解決」，公關部會收到通知並進行結案
                  </p>
                </div>
              </label>
            )}

            {resultMsg && (
              <p className="text-sm" style={{ color: resultMsg.startsWith('⚠') ? '#dc2626' : '#16a34a' }}>
                {resultMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !recordContent.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: submitting || !recordContent.trim() ? '#cdbea2' : '#8b6f4e',
                cursor: submitting || !recordContent.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '送出中...' : markResolved ? '送出並標記完成' : '新增處理紀錄'}
            </button>
          </form>
        </div>
      )}

      {/* 歷史紀錄 */}
      {feedback.records && feedback.records.length > 0 && (
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: '#fff', border: '1px solid #e8ddd0' }}
        >
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>
            處理紀錄
          </h3>
          <div className="space-y-2">
            {[...feedback.records].reverse().map((r: any) => (
              <div
                key={r.id}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: r.recorder_type === 'system' ? '#f9f6f2' : r.recorder_type === 'assignee' ? '#f0fdf4' : '#faf8f5',
                  borderLeft: `3px solid ${r.recorder_type === 'system' ? '#cdbea2' : r.recorder_type === 'assignee' ? '#86efac' : '#8b6f4e'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-xs" style={{ color: '#5c4033' }}>
                    {r.recorder_name || '系統'}
                    {r.recorder_type === 'assignee' && (
                      <span className="ml-1 text-green-600">（負責人員）</span>
                    )}
                  </span>
                  <span className="text-xs" style={{ color: '#cdbea2' }}>
                    {new Date(r.created_at).toLocaleString('zh-TW')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap" style={{ color: '#3d2b1f' }}>{r.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
