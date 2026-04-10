import { useState, useEffect } from 'react';
import { feedbackCategoriesApi } from '../services/api';

interface FeedbackCategory {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = { name: '', description: '', sort_order: 0 };

export default function FeedbackCategoriesPage() {
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<FeedbackCategory | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await feedbackCategoriesApi.getAll(true);
      setCategories(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function openNew() {
    setEditingCat(null);
    setForm({ ...emptyForm, sort_order: categories.length + 1 });
    setShowModal(true);
  }

  function openEdit(cat: FeedbackCategory) {
    setEditingCat(cat);
    setForm({ name: cat.name, description: cat.description || '', sort_order: cat.sort_order });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingCat(null);
    setForm(emptyForm);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingCat) {
        await feedbackCategoriesApi.update(editingCat.id, form);
        flash('類別已更新');
      } else {
        await feedbackCategoriesApi.create(form);
        flash('新增成功');
      }
      closeModal();
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        alert('此類別名稱已存在，請換一個名稱');
      } else {
        alert('儲存失敗，請稍後再試');
      }
    } finally { setSaving(false); }
  }

  async function toggleActive(cat: FeedbackCategory) {
    try {
      await feedbackCategoriesApi.update(cat.id, { is_active: !cat.is_active });
      flash(cat.is_active ? '已停用' : '已啟用');
      load();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(cat: FeedbackCategory) {
    if (!confirm(`確定要刪除「${cat.name}」嗎？此操作無法復原。`)) return;
    try {
      await feedbackCategoriesApi.delete(cat.id);
      flash('已刪除');
      load();
    } catch (e) { console.error(e); }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  const active = categories.filter(c => c.is_active);
  const inactive = categories.filter(c => !c.is_active);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#5c4033' }}>回報類別管理</h1>
          <p className="text-sm text-gray-500 mt-1">自訂新增回報時可選擇的類別品項</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#8b6f4e' }}
        >
          ＋ 新增類別
        </button>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Active categories */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">載入中...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#e8ddd4' }}>
            <div className="px-5 py-3 text-sm font-semibold" style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>
              啟用中（{active.length} 項）
            </div>
            {active.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">尚無啟用類別</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#f0e8df' }}>
                    <th className="text-left px-5 py-2.5 font-medium text-gray-500 w-16">排序</th>
                    <th className="text-left px-5 py-2.5 font-medium text-gray-500">名稱</th>
                    <th className="text-left px-5 py-2.5 font-medium text-gray-500">說明</th>
                    <th className="px-5 py-2.5 w-36"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {active.map(cat => (
                    <tr key={cat.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-center">{cat.sort_order}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{cat.name}</td>
                      <td className="px-5 py-3 text-gray-500">{cat.description || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(cat)}
                            className="text-xs px-2.5 py-1 rounded border transition-colors hover:bg-amber-50"
                            style={{ borderColor: '#cdbea2', color: '#8b6f4e' }}>
                            編輯
                          </button>
                          <button onClick={() => toggleActive(cat)}
                            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                            停用
                          </button>
                          <button onClick={() => handleDelete(cat)}
                            className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Inactive categories */}
          {inactive.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden opacity-70" style={{ borderColor: '#e8ddd4' }}>
              <div className="px-5 py-3 text-sm font-semibold text-gray-400" style={{ backgroundColor: '#fafafa' }}>
                已停用（{inactive.length} 項）
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {inactive.map(cat => (
                    <tr key={cat.id} className="text-gray-400">
                      <td className="px-5 py-3 w-16 text-center">{cat.sort_order}</td>
                      <td className="px-5 py-3 line-through">{cat.name}</td>
                      <td className="px-5 py-3">{cat.description || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => toggleActive(cat)}
                            className="text-xs px-2.5 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
                            重新啟用
                          </button>
                          <button onClick={() => handleDelete(cat)}
                            className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Modal header */}
            <div className="px-6 py-4 border-b" style={{ borderColor: '#f0e8df' }}>
              <h2 className="text-lg font-bold" style={{ color: '#5c4033' }}>
                {editingCat ? '編輯類別' : '新增類別'}
              </h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">類別名稱 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="例：鏡框問題"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#cdbea2' }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">說明 <span className="text-gray-400 font-normal">（選填）</span></label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="例：關於鏡框品質、款式的問題"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#cdbea2' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序數字</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-28 px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#cdbea2' }}
                  min={0}
                />
                <p className="text-xs text-gray-400 mt-1">數字越小越前面</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: '#f0e8df' }}>
              <button onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm border text-gray-600 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#cdbea2' }}>
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#8b6f4e' }}
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
