import React, { useEffect, useState, useCallback } from 'react';
import { demeritApi } from '../api/demerit';
import { useAuth } from '../contexts/AuthContext';
import EmployeeQuickSearch from '../components/EmployeeQuickSearch';

interface Category {
  id: string;
  name: string;
  threshold: number;
}

interface Employee {
  id: number;
  app_number: string;
  name: string;
  store_name?: string;
}

interface Record {
  id: string;
  target_employee_name?: string;
  target_app_number: string;
  category_name?: string;
  points: number;
  reason?: string;
  recorded_by_name?: string;
  recorded_at: string;
}

const DemeritRecordPage: React.FC = () => {
  const { canManageReviews } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [reason, setReason] = useState('');

  const loadCategories = async () => {
    try {
      const res = await demeritApi.getCategories(false);
      setCategories(res.data);
    } catch { /* ignore */ }
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await demeritApi.getRecords({ limit: 50 });
      setRecords(res.data.records || []);
      setTotal(res.data.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadCategories();
    loadRecords();
  }, [loadRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) { setError('請選擇被扣分人員'); return; }
    if (!categoryId) { setError('請選擇扣分品項'); return; }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await demeritApi.createRecord({
        target_app_number: selectedEmployee.app_number,
        category_id: categoryId,
        reason: reason.trim() || undefined,
      });
      setSuccess(`已為「${selectedEmployee.name}」登記扣 1 分`);
      setSelectedEmployee(null);
      setCategoryId('');
      setReason('');
      loadRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || '送出失敗，請再試一次');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此筆扣分紀錄？')) return;
    try {
      await demeritApi.deleteRecord(id);
      loadRecords();
    } catch { alert('刪除失敗'); }
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('zh-TW', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">扣分登記</h2>

      {/* 新增扣分表單 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="font-semibold text-gray-700">新增扣分</h3>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            被扣分人員 <span className="text-red-500">*</span>
          </label>
          <EmployeeQuickSearch
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            placeholder="搜尋姓名 / ERP / APP 編號..."
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            扣分品項 <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">請選擇品項</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}（達標：{c.threshold} 次）</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">原因備註（選填）</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="填入具體原因或補充說明..."
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
            ✓ {success}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 text-white rounded-lg text-sm disabled:opacity-50"
          style={{ backgroundColor: '#8b6f4e' }}
        >
          {submitting ? '送出中...' : '送出扣分'}
        </button>
      </form>

      {/* 最近紀錄 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#f5f0eb' }}>
          <span className="font-semibold text-gray-700">最近扣分紀錄</span>
          <span className="text-xs text-gray-500">共 {total} 筆</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">載入中...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-400">尚無扣分紀錄</div>
        ) : (
          <div className="divide-y text-sm">
            {records.map(rec => (
              <div key={rec.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {rec.target_employee_name || rec.target_app_number}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                      {rec.category_name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                      -1 分
                    </span>
                  </div>
                  {rec.reason && (
                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{rec.reason}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-0.5">
                    {formatDate(rec.recorded_at)}
                    {rec.recorded_by_name && ` · 由 ${rec.recorded_by_name} 登記`}
                  </p>
                </div>
                {canManageReviews && (
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    刪除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DemeritRecordPage;
