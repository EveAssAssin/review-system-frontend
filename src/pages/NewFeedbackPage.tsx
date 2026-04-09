import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackApi, feedbackCategoriesApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Customer {
  id: number;
  clientName: string;
  mobile: string;
  clientCard: string;
  lastUnitId: number;
}

const NewFeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 客戶查詢
  const [lookupKeyword, setLookupKeyword] = useState('');
  const [lookupType, setLookupType] = useState<'mobile' | 'client_card' | 'client_id'>('mobile');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<Customer[]>([]);
  const [lookupError, setLookupError] = useState('');

  const [form, setForm] = useState({
    feedback_type: 'suggestion',
    client_id: '',
    client_name: '',
    client_phone: '',
    client_card: '',
    category_id: '',
    urgency: 'normal',
    content: '',
    source: 'phone',
    assigned_employee_id: '',
    send_sms: false,
  });

  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catsRes, empsRes] = await Promise.all([
          feedbackCategoriesApi.getAll(),
          employeesApi.search({ limit: 500 }),
        ]);
        setCategories(catsRes.data);
        setEmployees(empsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  const handleLookup = async () => {
    if (!lookupKeyword.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResults([]);
    try {
      const params: any = {};
      if (lookupType === 'mobile') params.mobile = lookupKeyword.trim();
      else if (lookupType === 'client_card') params.client_card = lookupKeyword.trim();
      else params.client_id = lookupKeyword.trim();

      const res = await feedbackApi.lookupCustomer(params);
      if (res.data.length === 0) {
        setLookupError('查無符合客戶，請直接於下方手動填寫客戶資料');
      } else {
        setLookupResults(res.data);
      }
    } catch (err) {
      setLookupError('客戶查詢服務暫時無法使用，請直接於下方手動填寫客戶資料');
    } finally {
      setLookupLoading(false);
    }
  };

  const selectCustomer = (c: Customer) => {
    setForm(prev => ({
      ...prev,
      client_id: String(c.id),
      client_name: c.clientName,
      client_phone: c.mobile || '',
      client_card: c.clientCard || '',
    }));
    setLookupResults([]);
    setLookupKeyword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) {
      setError('請填寫客戶姓名');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await feedbackApi.create({
        ...form,
        created_by: user?.name,
      });
      navigate(`/feedbacks/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '建立失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/feedbacks')} className="text-gray-500 hover:text-gray-700">
          ← 返回
        </button>
        <h2 className="text-2xl font-bold">新增客戶回報</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 客戶查詢 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">客戶資料查詢</h3>
          <div className="flex gap-2">
            <select
              value={lookupType}
              onChange={e => setLookupType(e.target.value as any)}
              className="px-3 py-2 border rounded text-sm"
            >
              <option value="mobile">手機號碼</option>
              <option value="client_card">會員卡號</option>
              <option value="client_id">客戶ID</option>
            </select>
            <input
              type="text"
              placeholder="輸入查詢內容..."
              value={lookupKeyword}
              onChange={e => setLookupKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
            >
              {lookupLoading ? '查詢中...' : '查詢'}
            </button>
          </div>
          {lookupError && <p className="text-red-500 text-sm">{lookupError}</p>}
          {lookupResults.length > 0 && (
            <div className="border rounded divide-y max-h-48 overflow-y-auto">
              {lookupResults.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{c.clientName}</span>
                    {c.mobile && <span className="text-gray-500 text-sm ml-2">{c.mobile}</span>}
                  </div>
                  {c.clientCard && <span className="text-xs text-gray-400">#{c.clientCard}</span>}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客戶姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.client_name}
                onChange={e => setForm({ ...form, client_name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="可手動輸入"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話號碼</label>
              <input
                type="text"
                value={form.client_phone}
                onChange={e => setForm({ ...form, client_phone: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">會員卡號</label>
              <input
                type="text"
                value={form.client_card}
                onChange={e => setForm({ ...form, client_card: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* 回報資訊 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">回報資訊</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">回報類型</label>
              <select
                value={form.feedback_type}
                onChange={e => setForm({ ...form, feedback_type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="suggestion">建議</option>
                <option value="complaint">投訴</option>
                <option value="praise">稱讚</option>
                <option value="inquiry">詢問</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">回報來源</label>
              <select
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="phone">電話</option>
                <option value="walk_in">到店</option>
                <option value="line">LINE</option>
                <option value="app">APP</option>
                <option value="web">網路</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
              <select
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">選擇類別</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">緊急度</label>
              <select
                value={form.urgency}
                onChange={e => setForm({ ...form, urgency: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="normal">普通</option>
                <option value="urgent">緊急</option>
                <option value="urgent_plus">特急</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">回報內容</label>
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded"
              placeholder="請輸入客戶回報的詳細內容..."
            />
          </div>
        </div>

        {/* 指派與通知 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">指派與通知</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">指派負責人員</label>
            <select
              value={form.assigned_employee_id}
              onChange={e => setForm({ ...form, assigned_employee_id: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">不指派</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.store_name ? ` (${emp.store_name})` : ''}
                </option>
              ))}
            </select>
            {form.assigned_employee_id && (
              <p className="text-xs text-blue-500 mt-1">✓ 指派後將自動發送 LINE 通知給負責人員</p>
            )}
          </div>

          {form.client_phone && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="send_sms"
                checked={form.send_sms}
                onChange={e => setForm({ ...form, send_sms: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="send_sms" className="text-sm text-gray-700">
                發送 SMS 給客戶（{form.client_phone}），告知回報已收到
              </label>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? '建立中...' : '建立回報'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/feedbacks')}
            className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewFeedbackPage;
