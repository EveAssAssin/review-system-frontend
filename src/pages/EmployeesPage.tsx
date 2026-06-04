import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../services/api';
import type { Employee } from '../types';

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagSaving, setFlagSaving] = useState<string | null>(null);

  // 篩選條件
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeOpen, setStoreOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [showResigned, setShowResigned] = useState(false);

  const storeBoxRef = useRef<HTMLDivElement>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeesApi.search({ limit: 500 });
      setEmployees(res.data.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 點擊外部關閉門市下拉
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (storeBoxRef.current && !storeBoxRef.current.contains(e.target as Node)) setStoreOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // 門市/部門 顯示值
  const deptKey = (e: Employee) => e.store_name || e.department || '未分類';

  // 門市/部門 選項（去重、排序）
  const storeOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => set.add(deptKey(e)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [employees]);

  // 職稱 選項
  const titleOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.jobtitle) set.add(e.jobtitle);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [employees]);

  const filteredStoreOptions = storeOptions.filter((s) =>
    s.toLowerCase().includes(storeSearch.trim().toLowerCase())
  );

  const toggleStore = (s: string) => {
    setSelectedStores((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  // 套用篩選：留空＝不限制（以工號/姓名等關鍵字查詢時，不會被空篩選卡住）
  const matches = (e: Employee) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const hit =
        e.name?.toLowerCase().includes(q) ||
        e.erpid?.toLowerCase().includes(q) ||
        e.app_number?.toLowerCase().includes(q) ||
        e.store_name?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (selectedStores.length > 0 && !selectedStores.includes(deptKey(e))) return false;
    if (selectedTitle && e.jobtitle !== selectedTitle) return false;
    return true;
  };

  const filtered = employees.filter(matches);
  const activeList = filtered.filter((e) => e.is_active !== false);
  const resignedList = filtered.filter((e) => e.is_active === false);

  const rosterCount = employees.filter((e) => e.needs_service_evaluation).length;

  // 切換「是否納入服務評鑑名單」
  const toggleServiceEval = async (emp: Employee) => {
    const next = !emp.needs_service_evaluation;
    setFlagSaving(emp.id);
    try {
      await employeesApi.setServiceEvalFlag(emp.id, next);
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, needs_service_evaluation: next } : e))
      );
    } catch (error) {
      console.error('Failed to update service-eval flag:', error);
      alert('更新評鑑名單失敗，請稍後再試');
    } finally {
      setFlagSaving(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStores([]);
    setSelectedTitle('');
    setStoreSearch('');
  };

  const renderRow = (emp: Employee, muted = false) => (
    <tr key={emp.id} className={muted ? 'bg-gray-50 text-gray-500' : 'hover:bg-[#f9f6f2]'}>
      <td className="px-4 py-3 font-medium">
        {emp.name}
        {muted && (
          <span className="ml-2 text-xs text-gray-500 border border-gray-300 rounded px-1.5 py-0.5">離職</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-600">{emp.erpid}</td>
      <td className="px-4 py-3 text-gray-600">{emp.store_name || emp.department || '-'}</td>
      <td className="px-4 py-3 text-gray-600">{emp.jobtitle || '-'}</td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => toggleServiceEval(emp)}
          disabled={flagSaving === emp.id}
          title="是否納入每月服務評鑑名單"
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 align-middle"
          style={{ backgroundColor: emp.needs_service_evaluation ? '#8b6f4e' : '#d1cabf' }}
        >
          <span
            className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
            style={{
              transform: emp.needs_service_evaluation ? 'translateX(24px)' : 'translateX(4px)',
            }}
          />
        </button>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-green-600 font-medium">{emp.positive_count}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-red-600 font-medium">{emp.negative_count}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-[#8b6f4e] font-medium">{emp.total_reviews}</span>
      </td>
      <td className="px-4 py-3">
        <Link to={`/employees/${emp.id}`} className="text-[#8b6f4e] hover:underline">
          查看
        </Link>
      </td>
    </tr>
  );

  const tableHead = (
    <thead className="bg-[#f9f6f2]">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">員工編號</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">門市/部門</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">職稱</th>
        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">需評鑑</th>
        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">正評</th>
        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">負評</th>
        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">總計</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">員工列表</h2>

      {/* 篩選列 */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 關鍵字 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">關鍵字</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="姓名 / ERP / APP 編號"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* 門市/部門（多選 + 可搜尋） */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              門市/部門 <span className="text-gray-400">（可搜尋・多選）</span>
            </label>
            <div className="relative" ref={storeBoxRef}>
              <button
                type="button"
                onClick={() => setStoreOpen((o) => !o)}
                className="w-full px-3 py-2 border rounded text-left flex justify-between items-center bg-white"
              >
                <span className={selectedStores.length ? 'text-gray-700' : 'text-gray-400'}>
                  {selectedStores.length ? `已選 ${selectedStores.length} 個門市/部門` : '請選擇'}
                </span>
                <span className="text-gray-400">▾</span>
              </button>
              {storeOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg">
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="搜尋門市/部門..."
                    className="w-full px-3 py-2 border-b outline-none text-sm"
                    autoFocus
                  />
                  <div className="max-h-56 overflow-auto">
                    {filteredStoreOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">無符合項目</div>
                    ) : (
                      filteredStoreOptions.map((s) => (
                        <label
                          key={s}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStores.includes(s)}
                            onChange={() => toggleStore(s)}
                          />
                          <span>{s}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 職稱 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">職稱</label>
            <select
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded bg-white"
            >
              <option value="">請選擇（全部職稱）</option>
              {titleOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 已套用條件 */}
        {(selectedStores.length > 0 || selectedTitle) && (
          <div className="flex flex-wrap gap-2 items-center">
            {selectedStores.map((s) => (
              <span
                key={s}
                className="text-xs bg-[#efe9e1] text-[#6b5640] px-2 py-1 rounded inline-flex items-center gap-1"
              >
                {s}
                <button onClick={() => toggleStore(s)} aria-label="移除">
                  ✕
                </button>
              </span>
            ))}
            {selectedTitle && (
              <span className="text-xs bg-[#efe9e1] text-[#6b5640] px-2 py-1 rounded inline-flex items-center gap-1">
                {selectedTitle}
                <button onClick={() => setSelectedTitle('')} aria-label="移除">
                  ✕
                </button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs text-gray-500 hover:underline">
              清除全部
            </button>
          </div>
        )}

        {/* 統計 + 離職開關 */}
        <div className="pt-2 border-t flex items-center justify-between text-sm text-gray-500">
          <span>
            在職 <span className="text-gray-700 font-medium">{activeList.length}</span> 人
            {showResigned && (
              <>
                {' '}
                · 離職 <span className="text-gray-700 font-medium">{resignedList.length}</span> 人
              </>
            )}{' '}
            · 服務評鑑名單 <span className="text-[#8b6f4e] font-medium">{rosterCount}</span> 人
          </span>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            顯示離職人員
            <input
              type="checkbox"
              checked={showResigned}
              onChange={(e) => setShowResigned(e.target.checked)}
            />
          </label>
        </div>
      </div>

      {/* 在職人員 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-2 bg-[#f1ece4] text-[#6b5640] text-sm font-medium">
          在職人員 · {activeList.length} 人
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : activeList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">沒有符合條件的在職員工</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {tableHead}
              <tbody className="divide-y">{activeList.map((emp) => renderRow(emp))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* 離職人員（預設隱藏） */}
      {showResigned && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium">
            離職人員 · {resignedList.length} 人
          </div>
          {resignedList.length === 0 ? (
            <div className="p-8 text-center text-gray-400">沒有符合條件的離職員工</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                {tableHead}
                <tbody className="divide-y">{resignedList.map((emp) => renderRow(emp, true))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
