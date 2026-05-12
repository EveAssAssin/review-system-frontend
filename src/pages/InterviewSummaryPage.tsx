import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interviewsApi } from '../services/api';

interface MonthBlock {
  record_id: string;
  month: string;
  interviewer_name?: string;
  summary?: string;
  ai_summary?: string;
  created_at: string;
  responses: {
    item_id: string;
    item_title?: string;
    item_description?: string;
    content?: string;
    image_urls: string[];
  }[];
}

interface SummaryData {
  employee: {
    id: string;
    name: string;
    store_name?: string;
    department?: string;
    app_number?: string;
    erpid?: string;
  };
  total: number;
  months: MonthBlock[];
}

export default function InterviewSummaryPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    interviewsApi.employeeSummary(employeeId)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const handleAi = async () => {
    if (!employeeId) return;
    setAiBusy(true);
    setAiText('');
    try {
      const res = await interviewsApi.aiAnalyzeEmployee(employeeId);
      setAiText(res.data.ai_summary);
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI 分析失敗');
    } finally {
      setAiBusy(false);
    }
  };

  if (loading) return <div className="p-6">載入中...</div>;
  if (!data) return <div className="p-6">找不到員工資料</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">員工訪談總結</h1>
        <button onClick={() => navigate('/interviews')} className="text-gray-500 hover:text-gray-700 text-sm">← 返回列表</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex items-baseline gap-3 mb-2">
          <h2 className="text-xl font-bold">{data.employee.name}</h2>
          <span className="text-sm text-gray-500">{data.employee.store_name || data.employee.department}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {data.employee.erpid && <span>ERP {data.employee.erpid}</span>}
          {data.employee.app_number && <span>· APP {data.employee.app_number}</span>}
          <span>· 共 {data.total} 筆訪談</span>
        </div>
      </div>

      {/* AI 跨月分析 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold" style={{ color: '#5b7fad' }}>🧠 AI 跨月份心理輔導分析</div>
          <button
            onClick={handleAi}
            disabled={aiBusy || data.total === 0}
            className="px-3 py-1 text-xs text-white rounded disabled:opacity-50"
            style={{ backgroundColor: '#5b7fad' }}
          >{aiBusy ? '分析中...' : '執行 AI 分析'}</button>
        </div>
        <p className="text-xs text-gray-400 mb-2">綜合 {data.total} 筆訪談紀錄，由 AI 分析心理變化趨勢與輔導建議</p>
        {aiText && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm whitespace-pre-wrap leading-relaxed">
            {aiText}
          </div>
        )}
      </div>

      {/* 月份時間軸 */}
      {data.months.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">尚無訪談紀錄</div>
      ) : (
        <div className="space-y-4">
          {data.months.map(m => (
            <div key={m.record_id} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold font-mono" style={{ color: '#8b6f4e' }}>{m.month}</span>
                  {m.interviewer_name && <span className="text-xs text-gray-400">訪談者：{m.interviewer_name}</span>}
                </div>
                <Link to={`/interviews/${m.record_id}`} className="text-xs text-blue-600 hover:underline">查看完整紀錄 →</Link>
              </div>
              {m.summary && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">訪談者總結</div>
                  <div className="bg-gray-50 p-2 rounded text-sm whitespace-pre-wrap">{m.summary}</div>
                </div>
              )}
              {m.ai_summary && (
                <div className="mb-3">
                  <div className="text-xs mb-1" style={{ color: '#5b7fad' }}>🧠 AI 分析</div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm whitespace-pre-wrap line-clamp-4">{m.ai_summary}</div>
                </div>
              )}
              <div className="space-y-2">
                {m.responses.length === 0 ? (
                  <div className="text-xs text-gray-400">無作答</div>
                ) : (
                  m.responses.map(r => (
                    <div key={r.item_id} className="border-l-2 border-gray-200 pl-3">
                      <div className="text-xs font-semibold text-gray-700">{r.item_title}</div>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap">{r.content || '（未填）'}</div>
                      {r.image_urls.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {r.image_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" className="w-12 h-12 object-cover rounded border" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
