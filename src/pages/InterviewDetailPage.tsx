import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interviewsApi } from '../services/api';

interface ItemWithResponse {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
  response?: { content: string; image_urls: string[] } | null;
}

interface RecordDetail {
  id: string;
  month: string;
  interviewer_name?: string;
  summary?: string;
  ai_summary?: string;
  ai_summarized_at?: string;
  created_at: string;
  updated_at: string;
  employees?: { id: string; name: string; store_name?: string; department?: string; app_number?: string };
  items_with_responses: ItemWithResponse[];
}

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [summary, setSummary] = useState('');
  const [responses, setResponses] = useState<Record<string, { content: string; image_urls: string[] }>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await interviewsApi.getRecord(id);
      setRecord(res.data);
      setSummary(res.data.summary || '');
      const map: Record<string, { content: string; image_urls: string[] }> = {};
      (res.data.items_with_responses || []).forEach((it: ItemWithResponse) => {
        if (it.response) {
          map[it.id] = { content: it.response.content || '', image_urls: it.response.image_urls || [] };
        } else {
          map[it.id] = { content: '', image_urls: [] };
        }
      });
      setResponses(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    if (!id || !record) return;
    setSaving(true);
    try {
      const payload = record.items_with_responses.map(it => ({
        item_id: it.id,
        content: responses[it.id]?.content || '',
        image_urls: responses[it.id]?.image_urls || [],
      }));
      await interviewsApi.updateRecord(id, { summary, responses: payload });
      setEditMode(false);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleAi = async () => {
    if (!id) return;
    setAiBusy(true);
    try {
      const res = await interviewsApi.aiAnalyzeRecord(id);
      // 重新載入以拿到 ai_summarized_at
      await load();
      if (record) setRecord(prev => prev ? { ...prev, ai_summary: res.data.ai_summary } : prev);
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI 分析失敗');
    } finally {
      setAiBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('確定刪除此訪談紀錄？')) return;
    try {
      await interviewsApi.deleteRecord(id);
      navigate('/interviews');
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleAddImage = (itemId: string) => {
    const url = prompt('請貼上圖片網址');
    if (!url?.trim()) return;
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        content: prev[itemId]?.content || '',
        image_urls: [...(prev[itemId]?.image_urls || []), url.trim()],
      },
    }));
  };

  const handleRemoveImage = (itemId: string, idx: number) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        content: prev[itemId]?.content || '',
        image_urls: (prev[itemId]?.image_urls || []).filter((_, i) => i !== idx),
      },
    }));
  };

  if (loading) return <div className="p-6">載入中...</div>;
  if (!record) return <div className="p-6">找不到紀錄</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">訪談紀錄詳情</h1>
        <button onClick={() => navigate('/interviews')} className="text-gray-500 hover:text-gray-700 text-sm">← 返回列表</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* 基本資訊 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-500 text-sm">受訪員工</div>
            <div className="font-medium">{record.employees?.name}</div>
            <div className="text-sm text-gray-400">{record.employees?.store_name || record.employees?.department}</div>
            {record.employees && (
              <Link to={`/interviews/employees/${record.employees.id}`} className="text-xs text-purple-600 hover:underline">查看員工跨月總結 →</Link>
            )}
          </div>
          <div>
            <div className="text-gray-500 text-sm">月份</div>
            <div className="font-medium font-mono">{record.month}</div>
            <div className="text-gray-500 text-sm mt-2">訪談者</div>
            <div className="font-medium">{record.interviewer_name || '-'}</div>
          </div>
        </div>

        {/* 總結 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-700">訪談者總結</div>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="text-xs text-blue-600 hover:underline">編輯</button>
            )}
          </div>
          {editMode ? (
            <textarea
              rows={3}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          ) : (
            <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">{record.summary || '-'}</div>
          )}
        </div>

        {/* AI 分析 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold" style={{ color: '#5b7fad' }}>🧠 AI 心理分析</div>
            <button
              onClick={handleAi}
              disabled={aiBusy}
              className="text-xs px-3 py-1 text-white rounded disabled:opacity-50"
              style={{ backgroundColor: '#5b7fad' }}
            >{aiBusy ? '分析中...' : record.ai_summary ? '重新分析' : '執行 AI 分析'}</button>
          </div>
          {record.ai_summary ? (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm whitespace-pre-wrap leading-relaxed">
              {record.ai_summary}
              {record.ai_summarized_at && (
                <div className="text-xs text-gray-400 mt-2">分析時間：{new Date(record.ai_summarized_at).toLocaleString()}</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400">尚未執行 AI 分析</div>
          )}
        </div>

        {/* 題目作答 */}
        <div className="border-t pt-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">逐題回答</div>
          <div className="space-y-4">
            {record.items_with_responses.map((it, idx) => {
              const resp = responses[it.id] || { content: '', image_urls: [] };
              return (
                <div key={it.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-700 mb-1">{idx + 1}. {it.title}</div>
                  {it.description && <p className="text-xs text-gray-500 mb-2">{it.description}</p>}
                  {editMode ? (
                    <>
                      <textarea
                        rows={3}
                        value={resp.content}
                        onChange={e => setResponses(prev => ({
                          ...prev,
                          [it.id]: { content: e.target.value, image_urls: prev[it.id]?.image_urls || [] },
                        }))}
                        className="w-full px-3 py-2 border rounded text-sm bg-white"
                      />
                      {resp.image_urls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {resp.image_urls.map((url, i) => (
                            <div key={i} className="relative">
                              <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                              <button onClick={() => handleRemoveImage(it.id, i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => handleAddImage(it.id)} className="mt-2 text-xs text-blue-600 hover:underline">+ 加入圖片網址</button>
                    </>
                  ) : (
                    <>
                      <div className="bg-white p-2 rounded text-sm whitespace-pre-wrap">{resp.content || '（未填）'}</div>
                      {resp.image_urls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {resp.image_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 操作 */}
        <div className="border-t pt-4 flex gap-3 flex-wrap">
          {editMode ? (
            <>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-white rounded disabled:opacity-50" style={{ backgroundColor: '#8b6f4e' }}>
                {saving ? '儲存中...' : '儲存'}
              </button>
              <button onClick={() => { setEditMode(false); load(); }} className="px-4 py-2 border rounded">取消</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditMode(true)} className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#8b6f4e' }}>編輯內容</button>
              <button onClick={handleDelete} className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50">刪除</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
