import React, { useEffect, useState, useRef } from 'react';
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

const UNIT_MAP: Record<number, string> = {};
const getUnitLabel = (id?: number) => {
  if (!id) return null;
  return UNIT_MAP[id] ? UNIT_MAP[id] : `門市 #${id}`;
};

const SEARCH_MODES = [
  { value: 'mobile', label: '電話' },
  { value: 'name', label: '姓名' },
  { value: 'client_card', label: '卡號' },
  { value: 'client_id', label: '客戶ID' },
];

// ── 員工快速搜尋元件 ────────────────────────────────────────────────────────
interface EmployeeSearchProps {
  employees: any[];
  value: any | null;                        // 已選員工物件
  onChange: (emp: any | null) => void;
  placeholder?: string;
}

const EmployeeSearch: React.FC<EmployeeSearchProps> = ({ employees, value, onChange, placeholder = '輸入姓名或門市搜尋...' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? employees.filter(e =>
        e.name?.includes(query) ||
        e.store_name?.includes(query) ||
        e.app_number?.includes(query)
      ).slice(0, 20)
    : [];

  // 點外部關閉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between bg-[#f5f0eb] border border-blue-200 rounded px-3 py-2">
        <div className="text-sm">
          <span className="font-medium text-blue-800">{value.name}</span>
          {value.store_name && <span className="text-[#8b6f4e] ml-2 text-xs">({value.store_name})</span>}
          {value.app_number && <span className="text-gray-400 ml-2 text-xs">#{value.app_number}</span>}
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-400 hover:text-red-400 ml-3">✕</button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded text-sm"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded shadow-lg max-h-48 overflow-y-auto mt-0.5">
          {filtered.map(emp => (
            <button
              key={emp.id}
              type="button"
              onMouseDown={() => { onChange(emp); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#f5f0eb] text-sm flex justify-between"
            >
              <span>
                <span className="font-medium">{emp.name}</span>
                {emp.store_name && <span className="text-gray-400 ml-1.5 text-xs">({emp.store_name})</span>}
              </span>
              {emp.app_number && <span className="text-gray-400 text-xs">#{emp.app_number}</span>}
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded shadow mt-0.5 px-3 py-2 text-sm text-gray-400">
          查無符合員工
        </div>
      )}
    </div>
  );
};

// ── 主頁面 ─────────────────────────────────────────────────────────────────
const NewFeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 客戶查詢
  const [searchMode, setSearchMode] = useState<'mobile' | 'name' | 'client_card' | 'client_id'>('mobile');
  const [lookupKeyword, setLookupKeyword] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<Customer[]>([]);
  const [lookupError, setLookupError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // 指派員工
  const [assignedEmployee, setAssignedEmployee] = useState<any | null>(null);

  // 關聯者
  const [relations, setRelations] = useState<any[]>([]);
  const [pendingRelation, setPendingRelation] = useState<any | null>(null);
  const [pendingReason, setPendingReason] = useState('');

  // 回報者為內部人員
  const [reporterIsInternal, setReporterIsInternal] = useState(false);
  const [reporterEmployee, setReporterEmployee] = useState<any | null>(null);

  // LINE 推波通知（建立時）
  const [lineNotifyAssignee, setLineNotifyAssignee] = useState(false);
  const [lineNotifyAssigneeMsg, setLineNotifyAssigneeMsg] = useState('');
  const [lineNotifyReporter, setLineNotifyReporter] = useState(false);
  const [lineNotifyReporterMsg, setLineNotifyReporterMsg] = useState('');

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
    send_sms: false,
    notify_on_complete: false,
  });

  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      feedbackCategoriesApi.getAll(),
      employeesApi.search({ limit: 500 }),
    ]).then(([catsRes, empsRes]) => {
      setCategories(catsRes.data);
      setEmployees(empsRes.data.data || []);
    }).catch(console.error);
  }, []);

  const handleLookup = async () => {
    if (!lookupKeyword.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResults([]);
    try {
      const res = await feedbackApi.lookupCustomer({ [searchMode]: lookupKeyword.trim() });
      if (res.data.length === 0) {
        setLookupError('查無符合客戶，請直接手動填寫客戶資料');
      } else {
        setLookupResults(res.data);
      }
    } catch {
      setLookupError('查詢失敗，請直接手動填寫客戶資料');
    } finally {
      setLookupLoading(false);
    }
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setForm(prev => ({
      ...prev,
      client_id: String(c.id),
      client_name: c.clientName || '',
      client_phone: c.mobile || '',
      client_card: c.clientCard || '',
    }));
    setLookupResults([]);
    setLookupKeyword('');
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setForm(prev => ({ ...prev, client_id: '', client_name: '', client_phone: '', client_card: '' }));
  };

  const addRelation = () => {
    if (!pendingRelation || !pendingReason.trim()) return;
    setRelations(prev => [...prev, {
      employee_id: pendingRelation.id,
      employee_name: pendingRelation.name,
      employee_app_number: pendingRelation.app_number || '',
      employee_store: pendingRelation.store_name || '',
      relation_reason: pendingReason.trim(),
    }]);
    setPendingRelation(null);
    setPendingReason('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim() && !reporterIsInternal) {
      setError('請填寫客戶姓名');
      return;
    }
    if (reporterIsInternal && !reporterEmployee) {
      setError('請選擇回報者（內部人員）');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: any = {
        ...form,
        assigned_employee_id: assignedEmployee?.id || '',
        created_by: user?.name,
        // 回報者為內部人員
        reporter_is_internal: reporterIsInternal,
        reporter_employee_id: reporterEmployee?.id || null,
        reporter_employee_name: reporterEmployee?.name || null,
        reporter_app_number: reporterEmployee?.app_number || null,
        // LINE 推波通知（建立時）
        line_notify_assignee: lineNotifyAssignee,
        line_notify_assignee_msg: lineNotifyAssignee ? (lineNotifyAssigneeMsg.trim() || undefined) : undefined,
        line_notify_reporter: lineNotifyReporter,
        line_notify_reporter_msg: lineNotifyReporter ? (lineNotifyReporterMsg.trim() || undefined) : undefined,
      };

      // 若回報者是內部人員，覆蓋客戶姓名
      if (reporterIsInternal && reporterEmployee) {
        payload.client_name = reporterEmployee.name;
        payload.client_phone = payload.client_phone || '';
      }

      const res = await feedbackApi.create(payload);

      // 建立關聯者
      for (const rel of relations) {
        try {
          await feedbackApi.addRelation(res.data.id, { ...rel, created_by: user?.name });
        } catch {}
      }

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

        {/* ── 客戶資料 ─────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">客戶資料</h3>
            {/* 回報者為內部人員切換 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reporterIsInternal}
                onChange={e => {
                  setReporterIsInternal(e.target.checked);
                  if (!e.target.checked) setReporterEmployee(null);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">回報者為內部人員</span>
            </label>
          </div>

          {/* 內部人員搜尋 */}
          {reporterIsInternal ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">選擇回報的內部人員 <span className="text-red-500">*</span></label>
              <EmployeeSearch
                employees={employees}
                value={reporterEmployee}
                onChange={setReporterEmployee}
                placeholder="輸入姓名或門市搜尋內部人員..."
              />
              {reporterEmployee && (
                <p className="text-xs text-purple-500">
                  ✓ 此回報會標記為「內部人員回報」，供 AI 分析時區分。
                  {reporterEmployee.app_number && '完成時可自動發送 LINE 通知。'}
                </p>
              )}
              {/* 仍可填電話 */}
              <div className="pt-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話（可選）</label>
                <input
                  type="text"
                  value={form.client_phone}
                  onChange={e => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          ) : (
            <>
              {/* 外部客戶查詢 */}
              {selectedCustomer ? (
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
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="flex rounded border overflow-hidden shrink-0">
                      {SEARCH_MODES.map(m => (
                        <button key={m.value} type="button"
                          onClick={() => { setSearchMode(m.value as any); setLookupKeyword(''); setLookupResults([]); setLookupError(''); }}
                          className={`px-3 py-2 text-sm ${searchMode === m.value ? 'bg-[#8b6f4e] text-white' : 'bg-white text-gray-600 hover:bg-[#f9f6f2]'}`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder={searchMode === 'mobile' ? '輸入電話...' : searchMode === 'name' ? '輸入姓名...' : searchMode === 'client_card' ? '輸入卡號...' : '輸入ID...'}
                      value={lookupKeyword}
                      onChange={e => setLookupKeyword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    <button type="button" onClick={handleLookup} disabled={lookupLoading}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm shrink-0">
                      {lookupLoading ? '查詢中...' : '查詢'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">💡 查詢前需先執行「客戶資料同步」（管理員功能）</p>
                  {lookupError && <p className="text-red-500 text-sm">{lookupError}</p>}
                  {lookupResults.length > 0 && (
                    <div className="border rounded divide-y max-h-56 overflow-y-auto">
                      {lookupResults.map(c => (
                        <button key={c.id} type="button" onClick={() => selectCustomer(c)}
                          className="w-full px-4 py-3 text-left hover:bg-[#f5f0eb] flex justify-between items-center gap-2">
                          <div>
                            <span className="font-medium">{c.clientName}</span>
                            {c.mobile && <span className="text-gray-500 text-sm ml-2">{c.mobile}</span>}
                            {c.lastUnitId && <span className="text-xs text-[#8b6f4e] ml-2">最後到訪：{getUnitLabel(c.lastUnitId)}</span>}
                          </div>
                          {c.clientCard && <span className="text-xs text-gray-400 shrink-0">#{c.clientCard}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客戶姓名 <span className="text-red-500">*</span></label>
                  <input type="text" value={form.client_name}
                    onChange={e => setForm({ ...form, client_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded" placeholder="可手動輸入" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電話號碼</label>
                  <input type="text" value={form.client_phone}
                    onChange={e => setForm({ ...form, client_phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">會員卡號</label>
                  <input type="text" value={form.client_card}
                    onChange={e => setForm({ ...form, client_card: e.target.value })}
                    className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── 回報資訊 ─────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">回報資訊</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">回報類型</label>
              <select value={form.feedback_type} onChange={e => setForm({ ...form, feedback_type: e.target.value })}
                className="w-full px-3 py-2 border rounded">
                <option value="suggestion">建議</option>
                <option value="complaint">投訴</option>
                <option value="praise">稱讚</option>
                <option value="inquiry">詢問</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">回報來源</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border rounded">
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
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded">
                <option value="">選擇類別</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">緊急度</label>
              <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}
                className="w-full px-3 py-2 border rounded">
                <option value="normal">普通</option>
                <option value="urgent">緊急</option>
                <option value="urgent_plus">特急</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">回報內容</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              rows={4} className="w-full px-3 py-2 border rounded" placeholder="請輸入客戶回報的詳細內容..." />
          </div>
        </div>

        {/* ── 指派與通知 ─────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">指派與通知</h3>

          {/* 指派員工 — 快速搜尋 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">指派負責人員</label>
            <EmployeeSearch
              employees={employees}
              value={assignedEmployee}
              onChange={setAssignedEmployee}
              placeholder="輸入姓名或門市搜尋..."
            />
            {assignedEmployee && (
              <p className="text-xs text-[#8b6f4e] mt-1">✓ 指派後將自動發送 LINE 通知（含案件連結）給負責人員</p>
            )}
          </div>

          {/* LINE 推波通知（左手系統） */}
          <div className="border rounded p-3 space-y-3 bg-[#f5f0eb]">
            <p className="text-xs font-semibold text-[#8b6f4e]">📲 LEFT 手系統 LINE 推波通知</p>

            {/* 通知指派人員 */}
            {assignedEmployee ? (
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={lineNotifyAssignee}
                    onChange={e => {
                      setLineNotifyAssignee(e.target.checked);
                      if (e.target.checked && !lineNotifyAssigneeMsg) {
                        setLineNotifyAssigneeMsg(
                          `您好 ${assignedEmployee.name}，您有一筆新的客戶回報已指派給您，請盡速查看處理。`
                        );
                      }
                    }}
                    className="w-4 h-4 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium text-[#8b6f4e]">通知指派人員</span>
                    <span className="text-gray-500 ml-1">— {assignedEmployee.name}（{assignedEmployee.store_name || '—'}）</span>
                  </span>
                </label>
                {lineNotifyAssignee && (
                  <textarea
                    value={lineNotifyAssigneeMsg}
                    onChange={e => setLineNotifyAssigneeMsg(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded text-sm bg-white"
                    placeholder="推波訊息內容（系統會自動附上案件連結）"
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">請先選擇指派人員，才能發送 LINE 通知</p>
            )}

            {/* 通知回報者（內部人員） */}
            {reporterIsInternal && reporterEmployee?.app_number ? (
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={lineNotifyReporter}
                    onChange={e => {
                      setLineNotifyReporter(e.target.checked);
                      if (e.target.checked && !lineNotifyReporterMsg) {
                        setLineNotifyReporterMsg(
                          `您好 ${reporterEmployee.name}，您的回報已收到，我們將盡快為您處理並跟進，感謝您的回饋！`
                        );
                      }
                    }}
                    className="w-4 h-4 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium text-purple-700">通知回報者（內部人員）</span>
                    <span className="text-gray-500 ml-1">— {reporterEmployee.name}</span>
                  </span>
                </label>
                {lineNotifyReporter && (
                  <textarea
                    value={lineNotifyReporterMsg}
                    onChange={e => setLineNotifyReporterMsg(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded text-sm bg-white"
                    placeholder="推波訊息內容（系統會自動附上案件連結）"
                  />
                )}
              </div>
            ) : reporterIsInternal ? (
              <p className="text-xs text-orange-500">⚠ 選擇的回報者沒有 app_number，無法發送 LINE 通知</p>
            ) : null}
          </div>

          {/* 通知客戶（SMS） */}
          <div className="border rounded p-3 space-y-2 bg-[#f9f6f2]">
            <p className="text-xs font-medium text-gray-600">📱 SMS 通知</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.send_sms}
                onChange={e => setForm({ ...form, send_sms: e.target.checked })}
                className="w-4 h-4 mt-0.5" />
              <span className="text-sm text-gray-700">
                <span className="font-medium">建立時發送 SMS</span>
                {form.client_phone
                  ? ` — 通知客戶（${form.client_phone}）已收到回報`
                  : ' — 請先填入客戶電話'}
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.notify_on_complete}
                onChange={e => setForm({ ...form, notify_on_complete: e.target.checked })}
                className="w-4 h-4 mt-0.5" />
              <span className="text-sm text-gray-700">
                <span className="font-medium">結案時自動通知</span>
                {reporterIsInternal && reporterEmployee?.app_number
                  ? ' — 結案時自動發送 LINE 給回報者'
                  : form.client_phone
                    ? ' — 結案時自動發送 SMS 給客戶'
                    : ' — 結案時自動通知（請先填入電話）'}
              </span>
            </label>
          </div>
        </div>

        {/* ── 關聯者 ─────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">關聯者 <span className="text-gray-400 text-sm font-normal">（選填）</span></h3>

          {relations.length > 0 && (
            <div className="space-y-2">
              {relations.map((rel, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                  <div>
                    <span className="font-medium text-sm">{rel.employee_name}</span>
                    {rel.employee_store && <span className="text-xs text-gray-400 ml-2">({rel.employee_store})</span>}
                    <span className="text-xs text-gray-500 ml-2">— {rel.relation_reason}</span>
                  </div>
                  <button type="button" onClick={() => setRelations(prev => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-400 hover:text-red-600">移除</button>
                </div>
              ))}
            </div>
          )}

          <div className="border rounded p-3 space-y-2 bg-[#f9f6f2]">
            <p className="text-xs text-gray-500 font-medium">新增關聯者</p>
            <EmployeeSearch
              employees={employees}
              value={pendingRelation}
              onChange={setPendingRelation}
              placeholder="輸入姓名或門市搜尋員工..."
            />
            {pendingRelation && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="關聯原因（必填）"
                  value={pendingReason}
                  onChange={e => setPendingReason(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRelation())}
                  className="flex-1 px-2 py-1.5 border rounded text-sm"
                />
                <button type="button" onClick={addRelation} disabled={!pendingReason.trim()}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-40 shrink-0">
                  + 新增
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded disabled:opacity-50">
            {loading ? '建立中...' : '建立回報'}
          </button>
          <button type="button" onClick={() => navigate('/feedbacks')}
            className="px-6 py-2 border rounded text-gray-600 hover:bg-[#f9f6f2]">
            取消
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewFeedbackPage;
