import React, { useEffect, useState } from 'react';
import { demeritApi } from '../api/demerit';

interface Category {
  id: string;
  name: string;
  description?: string;
  threshold: number;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = { name: '', description: '', threshold: 5 };

const DemeritCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await demeritApi.getCategories(includeInactive);
      setCategories(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [includeInactive]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '', threshold: cat.threshold });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('品項名稱為必填'); return; }
    if (form.threshold < 1) { setError('達標數量至少 1'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await demeritApi.updateCategory(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          threshold: form.threshold,
        });
      } else {
        await demeritApi.createCategory({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          threshold: form.threshold,
        });
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: Category) => {
    try {
      await demeritApi.updateCategory(cat.id, { is_active: !cat.is_active });
      load();
    } catch { alert('操作失敗'); }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`確定要刪除「${cat.name}」？若已有紀錄將改為停用。`)) return;
    try {
      await demeritApi.deleteCategory(cat.id);
      load();
    } catch { alert('刪除失敗'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">扣分品項管理</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={e => setIncludeInactive(e.target.checked)}
              className="w-4 h-4"
            />
            顯示停用品項
          </label>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm text-white rounded-lg"
            style={{ backgroundColor: '#8b6f4e' }}
          >
            ＋ 新增品項
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">載入中...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-400">尚未建立任何品項</div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: '#f5f0eb' }}>
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold">品項名稱</th>
                <th className="px-4 py-3 text-left text-gray-600 font-semibold hidden md:table-cell">說明</th>
                <th className="px-4 py-3 text-center text-gray-600 font-semibold w-24">達標次數</th>
                <th className="px-4 py-3 text-center text-gray-600 font-semibold w-20">狀態</th>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(cat => (
                <tr key={cat.id} className={cat.is_active ? '' : 'opacity-50 bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {cat.description || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                      {cat.threshold} 次
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {cat.is_active ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => toggleActive(cat)}
                        className={`text-xs ${cat.is_active ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700'}`}
                      >
                        {cat.is_active ? '停用' : '啟用'}
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg">{editing ? '編輯品項' : '新增品項'}</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                品項名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); if (error) setError(''); }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="例：遲到、未戴名牌"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">說明（選填）</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="例：上班遲到 5 分鐘以上"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                達標次數 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.threshold}
                onChange={e => { setForm({ ...form, threshold: Number(e.target.value) }); if (error) setError(''); }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-0.5">累積扣分達此次數即標記「達標」</p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
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
};

export default DemeritCategoriesPage;
