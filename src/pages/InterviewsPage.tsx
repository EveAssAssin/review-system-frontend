import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { interviewsApi } from '../services/api';

interface Record {
  id: string;
  month: string;
  interviewer_name?: string;
  summary?: string;
  ai_summary?: string;
  created_at: string;
  updated_at: string;
  employees?: { id: string; name: string; store_name?: string; department?: string };
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function InterviewsPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMonth, setAiMonth] = useState(currentMonth());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await interviewsApi.listRecords({ month: month || undefined, limit: 100 });
      setRecords(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const handleAiMonth = async () => {
    if (!aiMonth) return;
    setAiBusy(true);
    setAiText('');
    try {
      const res = await interviewsApi.aiAnalyzeMonth(aiMonth);
      setAiText(res.data.ai_summary);
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI 分析失敗');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">訪談紀錄</h1>
        <div className="flex gap-2">
          <Link to="/interviews/items" className="px-3 py-2 text-sm border rounded hover:bg-gray-50">⚙️ 題目管理</Link>
          <Link to="/interviews/new" className="px-4 py-2 text-sm text-white rounded" style={{ backgroundColor: '#8b6f4e' }}>＋ 新增訪談</Link>
        </div>
      </div>

      {/* AI 月度分析 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">🧠 AI 月度組織分析：</span>
          <input
            type="month"
            value={aiMonth}
            onChange={e => setAiMonth(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={handleAiMonth}
            disabled={aiBusy}
            className="px-3 py-1 text-sm text-white rounded disabled:opacity-50"
            style={{ backgroundColor: '#5b7fad' }}
          >{aiBusy ? '分析中...' : '執行 AI 分析'}</button>
          <span className="text-xs text-gray-400 ml-auto">分析整月所有員工訪談找共同議題</span>
        </div>
        {aiText && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 text-sm whitespace-pre-wrap leading-relaxed">
            {aiText}
          </div>
        )}
      </div>

      {/* 篩選 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">篩選月份：</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm"
        />
        {month && (
          <button onClick={() => setMonth('')} className="text-xs text-gray-500 hover:underline">清除</button>
        )}
        <span className="text-xs text-gray-400 ml-auto">共 {records.length} 筆</span>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-400">載入中...</div>
        ) : records.length === 0 ? (
          <div className="p-6 text-center text-gray-400">無訪談紀錄</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">月份</th>
                <th className="px-3 py-2 text-left">員工</th>
                <th className="px-3 py-2 text-left">門市/部門</th>
                <th className="px-3 py-2 text-left">訪談者</th>
                <th className="px-3 py-2 text-left">總結摘要</th>
                <th className="px-3 py-2 text-center w-20">AI</th>
                <th className="px-3 py-2 text-right w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{r.month}</td>
                  <td className="px-3 py-2 font-medium">{r.employees?.name || '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{r.employees?.store_name || r.employees?.department || '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{r.interviewer_name || '-'}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-md truncate">{r.summary || '-'}</td>
                  <td className="px-3 py-2 text-center">{r.ai_summary ? '✓' : '-'}</td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    <Link to={`/interviews/${r.id}`} className="text-xs text-blue-600 hover:underline">詳情</Link>
                    {r.employees && (
                      <Link to={`/interviews/employees/${r.employees.id}`} className="text-xs text-purple-600 hover:underline">員工總結</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
