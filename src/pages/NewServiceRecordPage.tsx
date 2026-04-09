import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceRecordsApi, feedbackApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Customer {
  id: number;
  clientName: string;
  mobile: string;
  clientCard: string;
  lastUnitId: number;
}

const UNIT_MAP: Record<number, string> = {};
const getUnitLabel = (id?: number) => {
  if (!id) return null;
  return UNIT_MAP[id] ? UNIT_MAP[id] : `門市 #${id}`;
};

const SEARCH_MODES = [
  { value: 'mobile', label: '電話' },
  { value: 'name', label: '姓名' },
  { value: 'client_card', label: '卡號' },
];

const NewServiceRecordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, employee: currentEmployee } = useAuth();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 客戶查詢
  const [customerType, setCustomerType] = useState<'member' | 'stranger'>('member');
  const [searchMode, setSearchMode] = useState<'mobile' | 'name' | 'client_card'>('mobile');
  const [lookupKeyword, setLookupKeyword] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<Customer[]>([]);
  const [lookupError, setLookupError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_card: '',
    customer_store: '',
    service_type: 'inquiry',
    handling_method: 'in_store',
    content: '',
    handling_detail: '',
    assignee_id: '',
    assignee_name: '',
    assignee_app_number: '',
    assignee_store: '',
  });

  // 關聯者
  const [relations, setRelations] = useState<any[]>([]);
  const [newRelation, setNewRelation] = useState({
    employee_id: '',
    employee_name: '',
    employee_app_number: '',
    employee_store: '',
    relation_reason: '',
  });

  useEffect(() => {
    employeesApi.search({ limit: 500 }).then(res => {
      setEmployees(res.data.data || []);
    }).catch(() => {});
  }, []);

  const handleLookup = async () => {
    if (!lookupKeyword.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResults([]);
    try {
      const params: any = { [searchMode]: lookupKeyword.trim() };
      const res = await feedbackApi.lookupCustomer(params);
      if (res.data.length === 0) {
        setLookupError('查無符合客戶，請手動填寫客戶資料');
      } else {
        setLookupResults(res.data);
      }
    } catch {
      setLookupError('查詢失敗，請手動填寫客戶資料');
    } finally {
      setLookupLoading(false);
    }
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setForm(prev => ({
      ...prev,
      customer_name: c.clientName || '',
      customer_mobile: c.mobile || '',
      customer_card: c.clientCard || '',
    }));
    setLookupResults([]);
    setLookupKeyword('');
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setForm(prev => ({ ...prev, customer_name: '', customer_mobile: '', customer_card: '' }));
  };

  const selectAssignee = (emp: any) => {
    setForm(prev => ({
      ...prev,
      assignee_id: emp.id,
      assignee_name: emp.name,
      assignee_app_number: emp.app_number || '',
      assignee_store: emp.store_name || '',
    }));
  };

  const addRelation = () => {
    if (!newRelation.employee_name.trim() || !newRelation.relation_reason.trim()) return;
    setRelations(prev => [...prev, { ...newRelation }]);
    setNewRelation({ employee_id: '', employee_name: '', employee_app_number: '', employee_store: '', relation_reason: '' });
  };

  const removeRelation = (idx: number) => {
    setRelations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) { setError('請填寫客服內容'); return; }
    if (customerType === 'member' && !form.customer_name.trim()) { setError('請填寫或查詢客戶姓名'); return; }

    setLoading(true);
    setError('');
    try {
      const payload: any = {
        customer_type: customerType,
        customer_id: selectedCustomer ? String(selectedCustomer.id) : undefined,
        customer_name: form.customer_name || undefined,
        customer_mobile: form.customer_mobile || undefined,
        customer_card: form.customer_card || undefined,
        customer_store: form.customer_store || undefined,
        service_type: form.service_type,
        handling_method: form.handling_method,
        content: form.content,
        handling_detail: form.handling_detail || undefined,
        assignee_id: form.assignee_id || undefined,
        assignee_name: form.assignee_name || undefined,
        assignee_app_number: form.assignee_app_number || undefined,
        assignee_store: form.assignee_store || undefined,
        creator_id: user?.id,
        creator_name: user?.name || '未知',
        creator_app_number: currentEmployee?.app_number,
        creator_store: currentEmployee?.store_name,
        relations: relations.length > 0 ? relations.map(r => ({ ...r, created_by: user?.name })) : undefined,
      };

      const res = await serviceRecordsApi.create(payload);
      navigate(`/service-records/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '建立失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/service-records')} className="text-gray-500 hover:text-gray-700">
          ← 返回
        </button>
        <h2 className="text-2xl font-bold">新增客服紀錄</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 客戶資料 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">客戶資料</h3>

          {/* 客戶類型切換 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setCustomerType('member'); clearCustomer(); }}
              className={`px-4 py-2 rounded text-sm font-medium ${customerType === 'member' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              會員查詢
            </button>
            <button
              type="button"
              onClick={() => { setCustomerType('stranger'); clearCustomer(); }}
              className={`px-4 py-2 rounded text-sm font-medium ${customerType === 'stranger' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              陌生客
            </button>
          </div>

          {/* 會員查詢 */}
          {customerType === 'member' && !selectedCustomer && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex rounded border overflow-hidden shrink-0">
                  {SEARCH_MODES.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { setSearchMode(m.value as any); setLookupKeyword(''); setLookupResults([]); setLookupError(''); }}
                      className={`px-3 py-2 text-sm ${searchMode === m.value ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder={searchMode === 'mobile' ? '輸入電話...' : searchMode === 'name' ? '輸入姓名...' : '輸入卡號...'}
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
                        {c.lastUnitId && (
                          <span className="text-xs text-blue-500 ml-2">最後到訪：{getUnitLabel(c.lastUnitId)}</span>
                        )}
                      </div>
                      {c.clientCard && <span className="text-xs text-gray-400">#{c.clientCard}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 已選取會員 */}
          {customerType === 'member' && selectedCustomer && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-3">
              <div>
                <span className="font-medium text-green-800">{selectedCustomer.clientName}</span>
                {selectedCustomer.mobile && <span className="text-green-600 text-sm ml-2">{selectedCustomer.mobile}</span>}
                {selectedCustomer.clientCard && <span className="text-gray-400 text-xs ml-2">#{selectedCustomer.clientCard}</span>}
                {selectedCustomer.lastUnitId && (
                  <span className="text-xs text-gray-500 ml-2">最後到訪：{getUnitLabel(selectedCustomer.lastUnitId)}</span>
                )}
              </div>
              <button type="button" onClick={clearCustomer} className="text-xs text-gray-400 hover:text-red-400 ml-4">✕ 清除</button>
            </div>
          )}

          {/* 客戶基本欄位 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客戶姓名{customerType !== 'stranger' && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder={customerType === 'stranger' ? '可不填' : '請輸入或查詢'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
              <input
                type="text"
                value={form.customer_mobile}
                onChange={e => setForm({ ...form, customer_mobile: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            {customerType === 'member' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">會員卡號</label>
                <input
                  type="text"
                  value={form.customer_card}
                  onChange={e => setForm({ ...form, customer_card: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
          </div>
        </div>

        {/* 客服資訊 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">客服資訊</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">服務類型</label>
              <select
                value={form.service_type}
                onChange={e => setForm({ ...form, service_type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="inquiry">詢問</option>
                <option value="complaint">投訴</option>
                <option value="suggestion">建議</option>
                <option value="maintenance">維修</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">處理方式</label>
              <select
                value={form.handling_method}
                onChange={e => setForm({ ...form, handling_method: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="in_store">到店</option>
                <option value="phone">電話</option>
                <option value="online">線上</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              客服內容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded"
              placeholder="請描述客服情況..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">處理方式說明</label>
            <textarea
              value={form.handling_detail}
              onChange={e => setForm({ ...form, handling_detail: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded"
              placeholder="記錄如何處理（可選填）"
            />
          </div>
        </div>

        {/* 交辦者（非必填） */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">交辦者 <span className="text-gray-400 text-sm font-normal">（選填）</span></h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">交辦給</label>
            <select
              value={form.assignee_id}
              onChange={e => {
                const emp = employees.find(em => em.id === e.target.value);
                if (emp) selectAssignee(emp);
                else setForm(prev => ({ ...prev, assignee_id: '', assignee_name: '', assignee_app_number: '', assignee_store: '' }));
              }}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">不交辦</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.store_name ? ` (${emp.store_name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 關聯者（非必填） */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">關聯者 <span className="text-gray-400 text-sm font-normal">（選填）</span></h3>

          {relations.length > 0 && (
            <div className="space-y-2">
              {relations.map((rel, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                  <div>
                    <span className="font-medium text-sm">{rel.employee_name}</span>
                    {rel.employee_store && <span className="text-xs text-gray-400 ml-2">{rel.employee_store}</span>}
                    <span className="text-xs text-gray-500 ml-2">— {rel.relation_reason}</span>
                  </div>
                  <button type="button" onClick={() => removeRelation(idx)} className="text-xs text-red-400 hover:text-red-600">移除</button>
                </div>
              ))}
            </div>
          )}

          <div className="border rounded p-3 space-y-2 bg-gray-50">
            <p className="text-xs text-gray-500 font-medium">新增關聯者</p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newRelation.employee_id}
                onChange={e => {
                  const emp = employees.find(em => em.id === e.target.value);
                  if (emp) {
                    setNewRelation(prev => ({
                      ...prev,
                      employee_id: emp.id,
                      employee_name: emp.name,
                      employee_app_number: emp.app_number || '',
                      employee_store: emp.store_name || '',
                    }));
                  } else {
                    setNewRelation(prev => ({ ...prev, employee_id: '', employee_name: '', employee_app_number: '', employee_store: '' }));
                  }
                }}
                className="px-2 py-1.5 border rounded text-sm"
              >
                <option value="">選擇員工</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{emp.store_name ? ` (${emp.store_name})` : ''}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="關聯原因（必填）"
                value={newRelation.relation_reason}
                onChange={e => setNewRelation(prev => ({ ...prev, relation_reason: e.target.value }))}
                className="px-2 py-1.5 border rounded text-sm"
              />
            </div>
            <button
              type="button"
              onClick={addRelation}
              disabled={!newRelation.employee_name || !newRelation.relation_reason}
              className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-40"
            >
              + 新增
            </button>
          </div>
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
            {loading ? '建立中...' : '建立客服紀錄'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/service-records')}
            className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewServiceRecordPage;
