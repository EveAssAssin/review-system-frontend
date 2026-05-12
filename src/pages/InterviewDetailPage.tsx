import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { interviewsApi } from '../services/api';

interface ItemWithResponse {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
  response?: { content: string; image_urls: string[] } | null;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface RecordDetail {
  id: string;
  month: string;
  interviewer_name?: string;
  ai_summary?: string;
  ai_summarized_at?: string;
  employee_analysis?: string;
  analysis_chat?: ChatMsg[];
  analysis_generated_at?: string;
  created_at: string;
  updated_at: string;
  employees?: { id: string; name: string; store_name?: string; department?: string; app_number?: string };
  items_with_responses: ItemWithResponse[];
}

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // 由門市點名 picker 新建的訪談會帶 ?edit=1，直接進入編輯模式
  const [editMode, setEditMode] = useState(searchParams.get('edit') === '1');
  const [responses, setResponses] = useState<Record<string, { content: string; image_urls: string[] }>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI 人員分析 + 對談
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await interviewsApi.getRecord(id);
      setRecord(res.data);
      const map: Record<string, { content: string; image_urls: string[] }> = {};
      (res.data.items_with_responses || []).forEach((it: ItemWithResponse) => {
        if (it.response) {
          map[it.id] = { content: it.response.content || '', image_urls: it.response.image_urls || [] };
        } else {
          map[it.id] = { content: '', image_urls: [] };
        }
      });
      setResponses(map);
      setChatMessages(Array.isArray(res.data.analysis_chat) ? res.data.analysis_chat : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // 對話新訊息自動捲到底
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleSave = async () => {
    if (!id || !record) return;
    setSaving(true);
    try {
      const payload = record.items_with_responses.map(it => ({
        item_id: it.id,
        content: responses[it.id]?.content || '',
        image_urls: responses[it.id]?.image_urls || [],
      }));
      await interviewsApi.updateRecord(id, { responses: payload });
      setEditMode(false);
      if (searchParams.get('edit')) {
        searchParams.delete('edit');
        setSearchParams(searchParams, { replace: true });
      }
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
      await load();
      if (record) setRecord(prev => prev ? { ...prev, ai_summary: res.data.ai_summary } : prev);
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI 分析失敗');
    } finally {
      setAiBusy(false);
    }
  };

  const handleEmployeeAnalysis = async () => {
    if (!id) return;
    if (record?.employee_analysis && !confirm('已有分析結果，重新分析會清空對談歷史。確定要重跑？')) return;
    setAnalysisBusy(true);
    try {
      await interviewsApi.runEmployeeAnalysis(id);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI 人員分析失敗');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const handleSendChat = async () => {
    if (!id || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    // 樂觀更新：先把使用者訊息推進畫面
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatBusy(true);
    try {
      const res = await interviewsApi.appendAnalysisChat(id, text);
      setChatMessages(res.data.chat);
    } catch (err: any) {
      // 回滾
      setChatMessages(prev => prev.slice(0, -1));
      setChatInput(text);
      alert(err.response?.data?.message || '送出失敗');
    } finally {
      setChatBusy(false);
    }
  };

  const handleResetChat = async () => {
    if (!id) return;
    if (!confirm('確定清空對談歷史？分析結果會保留。')) return;
    try {
      await interviewsApi.resetAnalysisChat(id);
      setChatMessages([]);
    } catch (err) {
      alert('清空失敗');
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

        {/* AI 人員分析（取代原訪談者總結） */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold" style={{ color: '#7c5cab' }}>🧠 AI 人員分析（讀員工歷次評價做會前 briefing）</div>
            <button
              onClick={handleEmployeeAnalysis}
              disabled={analysisBusy}
              className="text-xs px-3 py-1 text-white rounded disabled:opacity-50"
              style={{ backgroundColor: '#7c5cab' }}
            >
              {analysisBusy ? '分析中...' : record.employee_analysis ? '重新分析' : '執行 AI 分析'}
            </button>
          </div>

          {record.employee_analysis ? (
            <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm whitespace-pre-wrap leading-relaxed">
              {record.employee_analysis}
              {record.analysis_generated_at && (
                <div className="text-xs text-gray-400 mt-2">分析時間：{new Date(record.analysis_generated_at).toLocaleString()}</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400">尚未執行 AI 分析。點「執行 AI 分析」會把這位員工所有評價當參考資料，產生一份訪談會前 briefing。</div>
          )}

          {/* AI 對談區（必須先有分析才能對談） */}
          {record.employee_analysis && (
            <div className="mt-4 border rounded-lg overflow-hidden" style={{ borderColor: '#e1d4ec' }}>
              <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: '#f5eef9' }}>
                <span className="text-xs font-semibold" style={{ color: '#7c5cab' }}>💬 跟 AI 討論訪談注意事項</span>
                {chatMessages.length > 0 && (
                  <button onClick={handleResetChat} className="text-xs text-gray-500 hover:underline">清空對話</button>
                )}
              </div>

              {/* 對話訊息 */}
              <div className="bg-white p-3 space-y-2 max-h-96 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-400 text-xs py-3">
                    例：「他過去 3 次都不太回應，怎麼開場？」「結案備註裡有失誤，要怎麼讓他願意承認？」「最近負評多，怎麼避免讓他覺得被責備？」
                  </div>
                ) : (
                  chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed`}
                        style={m.role === 'user'
                          ? { backgroundColor: '#7c5cab', color: '#fff' }
                          : { backgroundColor: '#f5eef9', color: '#3d2a52', border: '1px solid #e1d4ec' }}>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                {chatBusy && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 text-xs text-gray-400">AI 思考中...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* 輸入區 */}
              <div className="border-t p-2 flex gap-2" style={{ borderColor: '#e1d4ec' }}>
                <textarea
                  rows={2}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && !chatBusy) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  className="flex-1 px-3 py-2 border rounded text-sm resize-none focus:outline-none"
                  placeholder="輸入你想問的訪談問題（Enter 送出，Shift+Enter 換行）..."
                  disabled={chatBusy}
                />
                <button
                  onClick={handleSendChat}
                  disabled={chatBusy || !chatInput.trim()}
                  className="px-4 text-white rounded text-sm disabled:opacity-50 self-stretch"
                  style={{ backgroundColor: '#7c5cab' }}
                >送出</button>
              </div>
            </div>
          )}
        </div>

        {/* AI 心理分析（針對本次訪談答案） */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold" style={{ color: '#5b7fad' }}>🧠 AI 心理分析（針對本次訪談答案）</div>
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
              <button onClick={() => setEditMode(true)} className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#8b6f4e' }}>編輯答案</button>
              <button onClick={handleDelete} className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50">刪除</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
