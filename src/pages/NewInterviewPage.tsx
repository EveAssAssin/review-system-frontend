import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewsApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  app_number?: string;
  store_name?: string;
  department?: string;
}

interface InterviewItem {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function NewInterviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [summary, setSummary] = useState('');
  const [responses, setResponses] = useState<Record<string, { content: string; image_urls: string[] }>>({});
  const [busy, setBusy] = useState(false);

  // 載入該月份題目
  useEffect(() => {
    setItemsLoading(true);
    interviewsApi.listItems(month, false)
      .then(res => setItems(res.data))
      .catch(err => console.error(err))
      .finally(() => setItemsLoading(false));
  }, [month]);

  const searchEmployees = async (query: string) => {
    if (query.length < 2) { setEmployees([]); return; }
    try {
      const res = await employeesApi.search({ q: query, limit: 10 });
      setEmployees(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateResponse = (itemId: string, field: 'content' | 'image_urls', value: any) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        content: prev[itemId]?.content || '',
        image_urls: prev[itemId]?.image_urls || [],
        ...{ [field]: value },
      },
    }));
  };

  const handleAddImageUrl = (itemId: string) => {
    const url = prompt('請貼上圖片網址 (https://...)');
    if (!url || !url.trim()) return;
    const prev = responses[itemId]?.image_urls || [];
    updateResponse(itemId, 'image_urls', [...prev, url.trim()]);
  };

  const handleRemoveImage = (itemId: string, idx: number) => {
    const prev = responses[itemId]?.image_urls || [];
    updateResponse(itemId, 'image_urls', prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) { alert('請選擇員工'); return; }
    if (items.length === 0) { alert('本月份尚無題目，請先到「題目管理」建立'); return; }

    setBusy(true);
    try {
      const responsePayload = items
        .map(it => ({
          item_id: it.id,
          content: responses[it.id]?.content || '',
          image_urls: responses[it.id]?.image_urls || [],
        }))
        .filter(r => r.content || r.image_urls.length > 0);

      const res = await interviewsApi.createRecord(
        {
          employee_id: selectedEmployee.id,
          month,
          interviewer_name: user?.name || '',
          summary: summary || undefined,
          responses: responsePayload,
        },
        user?.name,
      );
      navigate(`/interviews/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || '建立失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增訪談紀錄</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* 月份 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">訪談月份</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <p className="text-xs text-gray-400 mt-1">會自動載入該月份的題目；若無題目請先到「題目管理」建立</p>
        </div>

        {/* 員工搜尋 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            受訪員工 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="搜尋姓名 / ERP / APP 編號..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              searchEmployees(e.target.value);
            }}
            className="w-full px-3 py-2 border rounded"
          />
          {employees.length > 0 && (
            <div className="mt-1 border rounded max-h-40 overflow-y-auto">
              {employees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setSearchQuery(emp.name);
                    setEmployees([]);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {emp.name} - {emp.store_name || emp.department} ({emp.app_number})
                </div>
              ))}
            </div>
          )}
          {selectedEmployee && (
            <div className="mt-2 p-2 bg-[#f5f0eb] rounded text-sm">
              已選擇：<strong>{selectedEmployee.name}</strong>（{selectedEmployee.store_name || selectedEmployee.department}）
            </div>
          )}
        </div>

        {/* 整體總結 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">訪談者總結（選填）</label>
          <textarea
            rows={3}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="本次訪談的整體印象、重點觀察..."
          />
        </div>

        {/* 題目作答 */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-700 mb-3">逐題作答（{month}）</h3>
          {itemsLoading ? (
            <div className="text-gray-400 text-sm">載入題目中...</div>
          ) : items.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700">
              ⚠️ {month} 尚未建立題目，請先到「題目管理」建立或從上個月複製
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((it, idx) => {
                const resp = responses[it.id] || { content: '', image_urls: [] };
                return (
                  <div key={it.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-700">{idx + 1}. {it.title}</span>
                    </div>
                    {it.description && (
                      <p className="text-xs text-gray-500 mb-2">{it.description}</p>
                    )}
                    <textarea
                      rows={3}
                      value={resp.content}
                      onChange={e => updateResponse(it.id, 'content', e.target.value)}
                      className="w-full px-3 py-2 border rounded text-sm bg-white"
                      placeholder="員工回答..."
                    />
                    {/* 圖片 URL 列表 */}
                    {resp.image_urls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {resp.image_urls.map((url, i) => (
                          <div key={i} className="relative">
                            <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                            <button
                              onClick={() => handleRemoveImage(it.id, i)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleAddImageUrl(it.id)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >+ 加入圖片網址</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={busy || !selectedEmployee}
            className="flex-1 py-2 text-white rounded disabled:opacity-50"
            style={{ backgroundColor: '#8b6f4e' }}
          >{busy ? '建立中...' : '建立訪談紀錄'}</button>
          <button onClick={() => navigate('/interviews')} className="px-6 py-2 border rounded">取消</button>
        </div>
      </div>
    </div>
  );
}
