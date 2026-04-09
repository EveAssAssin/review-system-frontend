import { useState, useEffect } from 'react';
import { categoriesApi } from '../services/api';

interface Category {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.getAll(true);
      setCategories(res.data);
    } catch (err) {
      console.error('載入分類失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, form);
      } else {
        await categoriesApi.create(form);
      }
      setShowModal(false);
      setEditingCategory(null);
      setForm({ name: '', description: '', sort_order: 0 });
      loadCategories();
    } catch (err) {
      console.error('儲存分類失敗:', err);
      alert('儲存失敗');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      sort_order: category.sort_order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要停用「${name}」分類嗎？`)) return;
    try {
      await categoriesApi.delete(id);
      loadCategories();
    } catch (err) {
      console.error('刪除分類失敗:', err);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await categoriesApi.update(category.id, { is_active: !category.is_active });
      loadCategories();
    } catch (err) {
      console.error('更新狀態失敗:', err);
    }
  };

  if (loading) {
    return <div className="p-6">載入中...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">評價分類管理</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setForm({ name: '', description: '', sort_order: categories.length + 1 });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#8b6f4e] text-white rounded-lg hover:bg-blue-700"
        >
          新增分類
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#f9f6f2]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排序</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名稱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">說明</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((cat) => (
              <tr key={cat.id} className={!cat.is_active ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{cat.sort_order}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{cat.name}</td>
                <td className="px-6 py-4 text-gray-500">{cat.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`px-2 py-1 rounded text-xs ${
                      cat.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat.is_active ? '啟用' : '停用'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="text-[#8b6f4e] hover:text-blue-800 mr-3"
                  >
                    編輯
                  </button>
                  {cat.is_active && (
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      停用
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? '編輯分類' : '新增分類'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名稱 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="例如：服務態度"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">說明</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="例如：員工服務態度相關"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">排序</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCategory(null);
                }}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name}
                className="px-4 py-2 bg-[#8b6f4e] text-white rounded disabled:opacity-50"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
