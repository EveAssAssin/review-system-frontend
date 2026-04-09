import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
};

const TYPE_MAP: Record<string, string> = {
  suggestion: '建議', complaint: '投訴', praise: '稱讚', inquiry: '詢問', other: '其他',
};

export default function MyAssignedFeedbacksPage() {
  const { employee } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee?.id) { setLoading(false); return; }
    feedbackApi.getMyAssigned(employee.id)
      .then(res => setFeedbacks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [employee]);

  if (loading) {
    return <div className="p-6 text-sm" style={{ color: '#8b7355' }}>載入中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#3d2b1f' }}>我的待辦案件</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8b7355' }}>
            指派給我的未結案回報，點進去可回報處理進度
          </p>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: '#8b6f4e', color: '#fff' }}
        >
          {feedbacks.length} 件待辦
        </span>
      </div>

      {feedbacks.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ backgroundColor: '#fff', border: '1px solid #e8ddd0' }}
        >
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium" style={{ color: '#3d2b1f' }}>目前沒有待辦案件</p>
          <p className="text-sm mt-1" style={{ color: '#8b7355' }}>所有指派給你的案件都已完成</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(fb => {
            const urgency = URGENCY_MAP[fb.urgency] || URGENCY_MAP.normal;
            const status  = STATUS_MAP[fb.status]   || STATUS_MAP.pending;
            return (
              <Link
                key={fb.id}
                to={`/my-feedbacks/${fb.id}`}
                className="block rounded-xl p-4 transition-all hover:shadow-md"
                style={{ backgroundColor: '#fff', border: '1px solid #e8ddd0' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 頂部標籤列 */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={urgency.style}>
                        {urgency.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={status.style}>
                        {status.label}
                      </span>
                      <span className="text-xs" style={{ color: '#cdbea2' }}>
                        {TYPE_MAP[fb.feedback_type] || fb.feedback_type}
                      </span>
                      {fb.feedback_categories?.name && (
                        <span className="text-xs" style={{ color: '#cdbea2' }}>
                          · {fb.feedback_categories.name}
                        </span>
                      )}
                    </div>
                    {/* 客戶資料 */}
                    <p className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>
                      {fb.client_name}
                      {fb.client_phone && (
                        <span className="font-normal ml-2 text-xs" style={{ color: '#8b7355' }}>
                          {fb.client_phone}
                        </span>
                      )}
                    </p>
                    {/* 內容預覽 */}
                    {fb.content && (
                      <p className="text-sm mt-1 line-clamp-2" style={{ color: '#5c4033' }}>
                        {fb.content}
                      </p>
                    )}
                  </div>
                  {/* 右側：日期 + 箭頭 */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: '#cdbea2' }}>
                      {new Date(fb.created_at).toLocaleDateString('zh-TW')}
                    </p>
                    <p className="text-lg mt-2" style={{ color: '#cdbea2' }}>›</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
