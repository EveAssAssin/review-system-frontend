import { useState, useEffect } from 'react';
import { feedbackSourcesApi } from '../services/api';

interface FeedbackSource {
  id: string;
  name: string;
  value: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = { name: '', value: '', sort_order: 0 };

export default function FeedbackSourcesPage() {
  const [sources, setSources] = useState<FeedbackSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSrc, setEditingSrc] = useState<FeedbackSource | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await feedbackSourcesApi.getAll(true);
      setSources(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function openNew() {
    setEditingSrc(null);
    setForm({ ...emptyForm, sort_order: sources.filter(s => s.is_active).length + 1 });
    setShowModal(true);
  }

  function openEdit(src: FeedbackSource) {
    setEditingSrc(src);
    setForm({ name: src.name, value: src.value, sort_order: src.sort_order });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSrc(null);
    setForm(emptyForm);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.value.trim()) return;
    setSaving(true);
    try {
      if (editingSrc) {
        await feedbackSourcesApi.update(editingSrc.id, form);
        flash('已更新');
      } else {
        await feedbackSourcesApi.create(form);
        flash('新增成功');
      }
      closeModal();
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        alert('此識別值已存在，請換一個');
      } else {
        alert('儲存失敗，請稍後再試');
      }
    } finally { setSaving(false); }
  }

  async function toggleActive(src: FeedbackSource) {
    try {
      await feedbackSourcesApi.update(src.id, { is_active: !src.is_active });
      flash(src.is_active ? '已停用' : '已啟用');
      load();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(src: FeedbackSource) {
    if (!confirm(`確定要刪除「${src.name}」嗎？此操作無法復原。`)) return;
    try {
      await feedbackSourcesApi.delete(src.id);
      flash('已刪除');
      load();
    } catch (e) { console.error(e); }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  const active = sources.filter(s => s.is_active);
  const inactive = sources.filter(s => !s.is_active);

  // Auto-generate value from name (lowercase, replace spaces/中文 with underscore)
  function autoValue(name: string) {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '') || '';
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#5c4033' }}>回報來源管理</h1>
          <p className="text-sm text-gray-500 mt-1">新增回報與客服紀錄的「回報來源」選項，兩者共用同一份清單</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#8b6f4e' }}>
          ＋ 新增來源
        </button>
      </div>

      {successMsg && (
        <div className="px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
          ✓ {successMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">載入中...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#e8ddd4' }}>
            <div className="px-5 py-3 text-sm font-semibold" style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>
              啟用中（{active.length} 項）
            </div>
            {active.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">尚無啟用來源</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#f0e8df' }}>
                    <th className="text-left px-5 py-2.5 font-medium text-gray-500 w-16">排序</th>
                    <th className="text-left px-5 py-2.5 font-medium text-gray-500">顯示名稱</th>
                    <th className="text-left px-5 py-2.5 font-medium text-gray-500">識別值</th>
                    <th className="px-5 py-2.5 w-40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {active.map(src => (
                    <tr key={src.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-center">{src.sort_order}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{src.name}</td>
                      <td className="px-5 py-3">
                        <code className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>
                          {src.value}
                        </code>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(src)}
                            className="text-xs px-2.5 py-1 rounded border transition-colors hover:bg-amber-50"
                            style={{ borderColor: '#cdbea2', color: '#8b6f4e' }}>
                            編輯
                          </button>
                          <button onClick={() => toggleActive(src)}
                            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                            停用
                          </button>
                          <button onClick={() => handleDelete(src)}
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

          {inactive.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden opacity-70" style={{ borderColor: '#e8ddd4' }}>
              <div className="px-5 py-3 text-sm font-semibold text-gray-400" style={{ backgroundColor: '#fafafa' }}>
                已停用（{inactive.length} 項）
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {inactive.map(src => (
                    <tr key={src.id} className="text-gray-400">
                      <td className="px-5 py-3 w-16 text-center">{src.sort_order}</td>
                      <td className="px-5 py-3 line-through">{src.name}</td>
                      <td className="px-5 py-3">
                        <code className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-400">{src.value}</code>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => toggleActive(src)}
                            className="text-xs px-2.5 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
                            重新啟用
                          </button>
                          <button onClick={() => handleDelete(src)}
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

      {/* Info */}
      <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#faf7f4', borderLeft: '3px solid #cdbea2' }}>
        <p className="font-semibold mb-1" style={{ color: '#8b6f4e' }}>識別值說明</p>
        <p className="text-gray-500">識別值儲存於資料庫，建議使用英文小寫與底線，例如：<code className="bg-gray-100 px-1 rounded">walk_in</code>、<code className="bg-gray-100 px-1 rounded">line</code>。已建立的紀錄識別值不影響顯示名稱修改。</p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b" style={{ borderColor: '#f0e8df' }}>
              <h2 className="text-lg font-bold" style={{ color: '#5c4033' }}>
                {editingSrc ? '編輯來源' : '新增來源'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  顯示名稱 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value;
                    setForm(f => ({
                      ...f,
                      name,
                      value: editingSrc ? f.value : autoValue(name),
                    }));
                  }}
                  placeholder="例：官網表單"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#cdbea2' }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  識別值 <span className="text-red-400">*</span>
                  <span className="text-gray-400 font-normal ml-1">（英文小寫 + 底線）</span>
                </label>
                <input
                  type="text"
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  placeholder="例：website_form"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none"
                  style={{ borderColor: '#cdbea2' }}
                />
                {editingSrc && (
                  <p className="text-xs text-amber-600 mt-1">⚠ 修改識別值不影響已有紀錄的顯示，但資料庫儲存值會更新</p>
                )}
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
                disabled={!form.name.trim() || !form.value.trim() || saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#8b6f4e' }}>
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
