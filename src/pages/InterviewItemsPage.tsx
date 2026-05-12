import { useEffect, useState } from 'react';
import { interviewsApi } from '../services/api';

type ItemType = 'text' | 'scale_1_5';

interface InterviewItem {
  id: string;
  month: string;
  title: string;
  description?: string;
  item_type: ItemType;
  sort_order: number;
  is_active: boolean;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function InterviewItemsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [form, setForm] = useState<{ title: string; description: string; item_type: ItemType; sort_order: number }>({
    title: '',
    description: '',
    item_type: 'text',
    sort_order: 0,
  });
  const [copyForm, setCopyForm] = useState({ from_month: '', to_month: currentMonth() });

  const load = async () => {
    setLoading(true);
    try {
      const res = await interviewsApi.listItems(month, true);
      setItems(res.data);
    } catch (err) {
      console.error('載入題目失敗', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const handleCreate = async () => {
    if (!form.title.trim()) { alert('請輸入題目'); return; }
    try {
      await interviewsApi.createItem({
        month,
        title: form.title,
        description: form.description || undefined,
        item_type: form.item_type,
        sort_order: form.sort_order,
      });
      setForm({ title: '', description: '', item_type: 'text', sort_order: 0 });
      setShowCreate(false);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || '新增失敗');
    }
  };

  const handleToggle = async (item: InterviewItem) => {
    try {
      await interviewsApi.updateItem(item.id, { is_active: !item.is_active });
      await load();
    } catch (err) {
      alert('更新失敗');
    }
  };

  const handleDelete = async (item: InterviewItem) => {
    if (!confirm(`確定刪除「${item.title}」？`)) return;
    try {
      await interviewsApi.deleteItem(item.id);
      await load();
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleCopy = async () => {
    if (!copyForm.from_month || !copyForm.to_month) { alert('請填寫月份'); return; }
    try {
      const res = await interviewsApi.copyMonth(copyForm);
      alert(`已複製 ${res.data.copied} 筆題目`);
      setShowCopy(false);
      setMonth(copyForm.to_month);
    } catch (err: any) {
      alert(err.response?.data?.message || '複製失敗');
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">訪談題目管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCopy(true)}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
          >📋 複製月份題目</button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm text-white rounded"
            style={{ backgroundColor: '#8b6f4e' }}
          >＋ 新增題目</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">月份：</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm"
        />
        <span className="text-xs text-gray-400 ml-auto">{items.length} 題（含停用）</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-400">載入中...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-gray-400">本月份尚無題目，點上方「新增題目」開始</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left w-16">順序</th>
                <th className="px-3 py-2 text-left w-24">類型</th>
                <th className="px-3 py-2 text-left">題目</th>
                <th className="px-3 py-2 text-left">說明</th>
                <th className="px-3 py-2 text-center w-20">狀態</th>
                <th className="px-3 py-2 text-right w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-t ${item.is_active ? '' : 'opacity-50'}`}>
                  <td className="px-3 py-2 text-gray-500">{item.sort_order}</td>
                  <td className="px-3 py-2">
                    {item.item_type === 'scale_1_5' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e8eef5', color: '#5b7fad' }}>1-5 量表</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">文字</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2 text-gray-500">{item.description || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    {item.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">啟用</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">停用</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button onClick={() => handleToggle(item)} className="text-xs text-blue-600 hover:underline">
                      {item.is_active ? '停用' : '啟用'}
                    </button>
                    <button onClick={() => handleDelete(item)} className="text-xs text-red-500 hover:underline">
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 新增 modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">新增題目（{month}）</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">題型</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`border rounded-lg p-3 cursor-pointer text-sm ${form.item_type === 'text' ? 'border-[#8b6f4e] bg-[#faf7f4]' : 'border-gray-300'}`}>
                    <input
                      type="radio"
                      name="item_type"
                      value="text"
                      checked={form.item_type === 'text'}
                      onChange={() => setForm({ ...form, item_type: 'text' })}
                      className="mr-2"
                    />
                    <span className="font-medium">📝 文字題</span>
                    <div className="text-xs text-gray-500 mt-1">員工以文字回答</div>
                  </label>
                  <label className={`border rounded-lg p-3 cursor-pointer text-sm ${form.item_type === 'scale_1_5' ? 'border-[#5b7fad] bg-[#f3f7fc]' : 'border-gray-300'}`}>
                    <input
                      type="radio"
                      name="item_type"
                      value="scale_1_5"
                      checked={form.item_type === 'scale_1_5'}
                      onChange={() => setForm({ ...form, item_type: 'scale_1_5' })}
                      className="mr-2"
                    />
                    <span className="font-medium">📊 1-5 量表</span>
                    <div className="text-xs text-gray-500 mt-1">類似心理測驗：1=非常不像我 ~ 5=非常像我</div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">題目</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder={form.item_type === 'scale_1_5' ? '例：我覺得最近工作壓力很大' : '例：本月工作壓力來源'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">說明（選填）</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="補充說明，員工填寫時會看到"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顯示順序</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#8b6f4e' }}>新增</button>
            </div>
          </div>
        </div>
      )}

      {/* 複製 modal */}
      {showCopy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">複製月份題目</h2>
            <p className="text-xs text-gray-500 mb-3">把來源月份的所有「啟用中」題目複製到目標月份</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">來源月份</label>
                <input
                  type="month"
                  value={copyForm.from_month}
                  onChange={e => setCopyForm({ ...copyForm, from_month: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目標月份</label>
                <input
                  type="month"
                  value={copyForm.to_month}
                  onChange={e => setCopyForm({ ...copyForm, to_month: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCopy(false)} className="px-4 py-2 border rounded">取消</button>
              <button onClick={handleCopy} className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#8b6f4e' }}>確認複製</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
