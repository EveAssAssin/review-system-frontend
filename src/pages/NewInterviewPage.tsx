import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { interviewsApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  app_number?: string;
  store_name?: string;
  department?: string;
  is_active: boolean;
}

interface InterviewRecord {
  id: string;
  employee_id: string;
  month: string;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function NewInterviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [hasItems, setHasItems] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, recRes, itemRes] = await Promise.all([
        employeesApi.search({ is_active: true, limit: 1000 }),
        interviewsApi.listRecords({ month, limit: 1000 }),
        interviewsApi.listItems(month, false),
      ]);
      setEmployees(empRes.data.data);
      // listRecords 回的 record 結構：{ id, employee_id, month, employees: {...} }
      setRecords(recRes.data.data.map((r: any) => ({
        id: r.id,
        employee_id: r.employee_id,
        month: r.month,
      })));
      setHasItems((itemRes.data || []).length > 0);
    } catch (err) {
      console.error('載入失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  // employee_id -> record_id 對應表
  const recordMap = useMemo(() => {
    const m = new Map<string, string>();
    records.forEach(r => m.set(r.employee_id, r.id));
    return m;
  }, [records]);

  // 依門市 / 部門分組，並依搜尋過濾
  const groupedEmployees = useMemo(() => {
    const kw = search.trim().toLowerCase();
    const filtered = kw
      ? employees.filter(e =>
          e.name.toLowerCase().includes(kw) ||
          (e.store_name || '').toLowerCase().includes(kw) ||
          (e.department || '').toLowerCase().includes(kw) ||
          (e.app_number || '').includes(kw))
      : employees;

    const groups = new Map<string, Employee[]>();
    filtered.forEach(emp => {
      const key = emp.store_name || emp.department || '未分類';
      const arr = groups.get(key) || [];
      arr.push(emp);
      groups.set(key, arr);
    });

    // 排序：有門市名稱的先，其他部門後面
    return [...groups.entries()].sort(([a], [b]) => {
      const aIsStore = !!employees.find(e => e.store_name === a);
      const bIsStore = !!employees.find(e => e.store_name === b);
      if (aIsStore && !bIsStore) return -1;
      if (!aIsStore && bIsStore) return 1;
      return a.localeCompare(b);
    });
  }, [employees, search]);

  const handlePick = async (emp: Employee) => {
    const existingId = recordMap.get(emp.id);
    if (existingId) {
      // 已有：直接進入詳情編輯
      navigate(`/interviews/${existingId}`);
      return;
    }
    // 沒有：建立新紀錄後進入詳情編輯
    if (!hasItems) {
      alert(`${month} 尚未建立題目，請先到「題目管理」建立`);
      return;
    }
    setCreating(emp.id);
    try {
      const res = await interviewsApi.createRecord(
        { employee_id: emp.id, month, interviewer_name: user?.name || '' },
        user?.name,
      );
      navigate(`/interviews/${res.data.id}?edit=1`);
    } catch (err: any) {
      // race condition：剛剛被別人建了 → 重抓並導向
      if (err.response?.status === 400 && err.response?.data?.message?.includes('已有訪談紀錄')) {
        await load();
        const refreshed = recordMap.get(emp.id);
        if (refreshed) {
          navigate(`/interviews/${refreshed}`);
          return;
        }
      }
      alert(err.response?.data?.message || '建立失敗');
    } finally {
      setCreating(null);
    }
  };

  const totalEmployees = employees.length;
  const interviewed = records.length;
  const interviewedRate = totalEmployees > 0
    ? Math.round((interviewed / totalEmployees) * 100)
    : 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">新增訪談紀錄</h1>
        <button onClick={() => navigate('/interviews')} className="text-gray-500 hover:text-gray-700 text-sm">
          ← 返回列表
        </button>
      </div>

      {/* 月份切換 + 統計 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700">訪談月份：</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          />
          <div className="text-sm text-gray-500">
            已訪 <span className="font-semibold text-[#8b6f4e]">{interviewed}</span>
            <span className="text-gray-400"> / </span>
            <span>{totalEmployees}</span> 人
            <span className="ml-2 text-xs text-gray-400">({interviewedRate}%)</span>
          </div>
          <div className="ml-auto">
            <input
              type="text"
              placeholder="搜尋 姓名 / 門市 / 部門 / APP 編號..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 border rounded text-sm w-64"
            />
          </div>
        </div>
        {!hasItems && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-700">
            ⚠️ {month} 尚未建立題目，請先到
            <Link to="/interviews/items" className="text-blue-600 hover:underline mx-1">題目管理</Link>
            建立後再開始訪談
          </div>
        )}
      </div>

      {/* 圖例 */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 px-2">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#8b6f4e' }} />
          未訪談（點擊新增）
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-300" />
          已訪談（點擊編輯）
        </span>
      </div>

      {/* 門市分組清單 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">載入中...</div>
      ) : groupedEmployees.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">無符合員工</div>
      ) : (
        <div className="space-y-4">
          {groupedEmployees.map(([groupName, emps]) => {
            const groupDone = emps.filter(e => recordMap.has(e.id)).length;
            const isStore = emps.some(e => e.store_name === groupName);
            return (
              <div key={groupName} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: '#faf7f4', borderBottom: '1px solid #ede8e2' }}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold" style={{ color: '#5c4033' }}>
                      {isStore ? '🏬' : '🏢'} {groupName}
                    </span>
                    <span className="text-xs text-gray-400">{emps.length} 人</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    已訪 {groupDone}/{emps.length}
                  </span>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {emps.map(emp => {
                    const hasRecord = recordMap.has(emp.id);
                    const isCreating = creating === emp.id;
                    return (
                      <button
                        key={emp.id}
                        onClick={() => handlePick(emp)}
                        disabled={isCreating}
                        title={hasRecord ? '已訪談，點擊可編輯' : '點擊新增訪談紀錄'}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                        style={hasRecord
                          ? { backgroundColor: '#e5e0d8', color: '#a89c8a', textDecoration: 'line-through' }
                          : { backgroundColor: '#8b6f4e', color: '#ffffff' }}
                      >
                        {isCreating ? '建立中...' : emp.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
