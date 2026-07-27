import { useEffect, useMemo, useState } from 'react';
import { reviewScreenshotsApi } from '../services/api';

interface AnomalyRow {
  employee_id: string;
  employee_name?: string;
  store_name?: string;
  department?: string;
  app_number?: string;
  total_uploads: number;
  signals: {
    exif_high_suspicion_count: number;
    exif_edit_tool_count: number;
    ai_suspicious_high_count: number;
    posted_today_pct: number;
    top_surname?: string | null;
    top_surname_count: number;
    top_surname_pct: number;
    night_upload_pct: number;
  };
  risk_score: number;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function AnomalyReportPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(20);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await reviewScreenshotsApi.anomalyReport(month);
      setData(res.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const filtered = useMemo(() => data.filter(r => r.risk_score >= threshold), [data, threshold]);
  const high = data.filter(r => r.risk_score >= 50).length;
  const medium = data.filter(r => r.risk_score >= 20 && r.risk_score < 50).length;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">🕵️ 反造假異常報表</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">月份：</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-xs text-gray-500 mb-2">
          綜合計分（0-100）：EXIF 明確 AI 生成 (+30/張)、EXIF 編輯軟體 (+10/張)、
          Claude AI 疑似 ≥ 0.5 (+8/張)、剛剛評論佔比 ≥ 80% (+15)、姓氏頭字重複 ≥ 50% (+15)、
          深夜上傳佔比 ≥ 50% (+10)。分數越高越可疑。
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm">
            <span className="text-gray-600">總員工：</span><span className="font-semibold">{data.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-red-600">🚨 高風險 (≥50)：</span><span className="font-semibold">{high}</span>
          </div>
          <div className="text-sm">
            <span className="text-amber-600">⚠️ 中風險 (20-49)：</span><span className="font-semibold">{medium}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="text-gray-600">只看 risk ≥</label>
            <input
              type="number" min={0} max={100}
              value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 border rounded"
            />
          </div>
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {err}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">載入中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
          {data.length === 0 ? '本月尚無截圖上傳' : `門檻 ${threshold} 以上沒有任何員工，安全 ✓`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <RiskCard key={r.employee_id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

const RiskCard: React.FC<{ row: AnomalyRow }> = ({ row }) => {
  const s = row.signals;
  const isHigh = row.risk_score >= 50;
  const isMed = row.risk_score >= 20 && row.risk_score < 50;
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-start gap-4"
      style={{ borderLeft: `4px solid ${isHigh ? '#dc2626' : isMed ? '#f59e0b' : '#9ca3af'}` }}>
      <div className="w-16 text-center flex-shrink-0">
        <div className="text-3xl font-bold" style={{ color: isHigh ? '#dc2626' : isMed ? '#f59e0b' : '#9ca3af' }}>
          {row.risk_score}
        </div>
        <div className="text-xs text-gray-400">/ 100</div>
      </div>

      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-lg">{row.employee_name}</span>
          {row.store_name && <span className="text-sm text-gray-500">{row.store_name}</span>}
          {row.department && <span className="text-sm text-gray-500">{row.department}</span>}
          <span className="text-xs text-gray-400 ml-auto">上傳 {row.total_uploads} 張</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs mt-2">
          {s.exif_high_suspicion_count > 0 && (
            <span className="px-2 py-1 rounded" style={{ backgroundColor: '#7c1d1d', color: '#fff' }}>
              🧬 EXIF AI 工具 × {s.exif_high_suspicion_count}
            </span>
          )}
          {s.exif_edit_tool_count > 0 && (
            <span className="px-2 py-1 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              🧬 EXIF 編輯過 × {s.exif_edit_tool_count}
            </span>
          )}
          {s.ai_suspicious_high_count > 0 && (
            <span className="px-2 py-1 rounded" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              🚨 AI 疑似 × {s.ai_suspicious_high_count}
            </span>
          )}
          {s.posted_today_pct >= 0.8 && row.total_uploads >= 3 && (
            <span className="px-2 py-1 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              ⏰ 「剛剛」佔 {Math.round(s.posted_today_pct * 100)}%
            </span>
          )}
          {s.top_surname && s.top_surname_pct >= 0.5 && row.total_uploads >= 4 && (
            <span className="px-2 py-1 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              👥 姓「{s.top_surname}」佔 {Math.round(s.top_surname_pct * 100)}%
            </span>
          )}
          {s.night_upload_pct >= 0.5 && row.total_uploads >= 3 && (
            <span className="px-2 py-1 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              🌙 深夜上傳 {Math.round(s.night_upload_pct * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
