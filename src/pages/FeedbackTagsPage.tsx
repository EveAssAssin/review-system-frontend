import { useEffect, useState } from 'react';
import { feedbackApi } from '../services/api';

const PRESET_COLORS = [
  '#8b6f4e', '#dc2626', '#ea580c', '#d97706',
  '#16a34a', '#0369a1', '#7c3aed', '#db2777',
  '#475569', '#065f46',
];

export default function FeedbackTagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', color: '#8b6f4e', description: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await feedbackApi.getTags();
      setTags(res.data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingTag(null);
    setForm({ name: '', color: '#8b6f4e', description: '' });
    setShowForm(true);
  };

  const openEdit = (tag: any) => {
    setEditingTag(tag);
    setForm({ name: tag.name, color: tag.color || '#8b6f4e', description: tag.description || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingTag) {
        await feedbackApi.updateTag(editingTag.id, { name: form.name.trim(), color: form.color, description: form.description.trim() || undefined });
      } else {
        await feedbackApi.createTag({ name: form.name.trim(), color: form.color, description: form.description.trim() || undefined });
      }
      setShowForm(false);
      setMsg(editingTag ? '已更新標籤' : '已新增標籤');
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || '操作失敗');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleDelete = async (tag: any) => {
    if (!confirm(`確定停用標籤「${tag.name}」？`)) return;
    try {
      await feedbackApi.deleteTag(tag.id);
      setMsg('已停用標籤');
      await load();
    } catch { setMsg('操作失敗'); }
    finally { setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="p-6 text-sm" style={{ color: '#8b7355' }}>載入中...</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#3d2b1f' }}>結案標籤管理</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8b7355' }}>自訂結案報告可選用的 #TAG，支援複選</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#8b6f4e' }}
        >
          + 新增標籤
        </button>
      </div>

      {msg && (
        <p className="text-sm px-4 py-2 rounded-lg" style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>
          {msg}
        </p>
      )}

      {/* 標籤列表 */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e8ddd0' }}>
        {tags.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: '#8b7355', backgroundColor: '#fff' }}>
            尚無標籤，點右上角「新增標籤」建立
          </div>
        ) : (
          <table className="w-full bg-white">
            <thead style={{ backgroundColor: '#f9f6f2' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#8b7355' }}>標籤</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#8b7355' }}>說明</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#8b7355' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, i) => (
                <tr key={tag.id} style={{ borderTop: i > 0 ? '1px solid #f5f0eb' : 'none' }}>
                  <td className="px-4 py-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: tag.color || '#8b6f4e', color: '#fff' }}
                    >
                      #{tag.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#5c4033' }}>
                    {tag.description || <span style={{ color: '#cdbea2' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(tag)}
                        className="text-xs px-3 py-1 rounded"
                        style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="text-xs px-3 py-1 rounded"
                        style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                      >
                        停用
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 新增/編輯 Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ backgroundColor: '#fff' }}>
            <h2 className="font-bold text-lg" style={{ color: '#3d2b1f' }}>
              {editingTag ? '編輯標籤' : '新增標籤'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#5c4033' }}>標籤名稱 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #cdbea2' }}
                  placeholder="例：需追蹤"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#5c4033' }}>標籤顏色</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: form.color === c ? '#3d2b1f' : 'transparent',
                        transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: form.color }}
                  >
                    #{form.name || '預覽'}
                  </span>
                  <span className="text-xs" style={{ color: '#cdbea2' }}>{form.color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#5c4033' }}>說明（選填）</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #cdbea2' }}
                  placeholder="此標籤的使用說明..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: saving || !form.name.trim() ? '#cdbea2' : '#8b6f4e' }}
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: '#f5f0eb', color: '#5c4033' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
