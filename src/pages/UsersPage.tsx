import { useEffect, useState } from 'react';
import { authApi, syncApi } from '../services/api';

type Role = 'super_admin' | 'pr_admin' | 'user';

interface UserRecord {
  id: string;
  name: string;
  erpid: string;
  role: Role;
  is_active: boolean;
  last_login_at?: string;
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: '超級管理員',
  pr_admin: '公關部管理員',
  user: '一般員工',
};

const ROLE_COLORS: Record<Role, string> = {
  super_admin: 'bg-red-100 text-red-700 border-red-200',
  pr_admin: 'bg-amber-100 text-amber-700 border-amber-200',
  user: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>('user');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ store_employees: number; backend_employees: number; missing_employees: number; total: number } | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; total: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      const data: UserRecord[] = res.data;
      data.sort((a, b) => {
        const order: Record<string, number> = { super_admin: 0, pr_admin: 1, user: 2 };
        if (order[a.role] !== order[b.role]) return (order[a.role] ?? 3) - (order[b.role] ?? 3);
        return a.name.localeCompare(b.name, 'zh-Hant');
      });
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncApi.syncAll();
      setSyncResult(res.data);
      // 同步完成後重新拉使用者清單
      await fetchUsers();
      setSuccessMsg('左手人員資料同步完成');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e: any) {
      console.error(e);
      alert('同步失敗：' + (e?.response?.data?.message || '請稍後再試'));
    } finally {
      setSyncing(false);
    }
  }

  async function handleBulkCreate() {
    if (!confirm('將從員工資料庫批次建立所有尚未建立帳號的員工，預設角色為「一般員工」。確定繼續？')) return;
    setBulkCreating(true);
    setBulkResult(null);
    try {
      const res = await authApi.bulkCreateFromEmployees();
      setBulkResult(res.data);
      await fetchUsers();
      setSuccessMsg(`成功預建 ${res.data.created} 位員工帳號`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e: any) {
      console.error(e);
      alert('批次建立失敗：' + (e?.response?.data?.message || '請稍後再試'));
    } finally {
      setBulkCreating(false);
    }
  }

  function startEdit(user: UserRecord) {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditActive(user.is_active);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    try {
      await authApi.updateUser(userId, { role: editRole, is_active: editActive });
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, role: editRole, is_active: editActive } : u)
      );
      setEditingId(null);
      setSuccessMsg('權限已更新');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
      alert('更新失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.erpid.includes(searchTerm)
  );

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#5c4033' }}>使用者權限管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理員工的系統角色與帳號狀態</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="text-xs px-3 py-1.5 rounded-full font-medium border"
            style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e', borderColor: '#cdbea2' }}
          >
            共 {users.length} 位使用者
          </div>
          <button
            onClick={handleBulkCreate}
            disabled={bulkCreating || syncing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-amber-50 disabled:opacity-50"
            style={{ borderColor: '#cdbea2', color: '#8b6f4e' }}
            title="將 employees 資料庫中尚未建立帳號的員工全部預建為 user"
          >
            <span>{bulkCreating ? '⏳' : '👥'}</span>
            {bulkCreating ? '建立中...' : '預建所有使用者'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || bulkCreating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: syncing ? '#b39c86' : '#8b6f4e' }}
            title="從左手系統重新同步所有員工資料"
          >
            <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
            {syncing ? '同步中...' : '從左手同步人員'}
          </button>
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p className="font-semibold text-green-800 mb-2">✓ 左手同步完成</p>
          <div className="flex flex-wrap gap-4 text-green-700">
            <span>門市員工 <strong>{syncResult.store_employees}</strong> 人</span>
            <span>後勤人員 <strong>{syncResult.backend_employees}</strong> 人</span>
            <span>補撈遺漏 <strong>{syncResult.missing_employees}</strong> 人</span>
            <span className="font-semibold">共計 <strong>{syncResult.total}</strong> 人</span>
          </div>
        </div>
      )}

      {/* Bulk create result */}
      {bulkResult && (
        <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <p className="font-semibold text-blue-800 mb-2">✓ 預建完成</p>
          <div className="flex flex-wrap gap-4 text-blue-700">
            <span>新增帳號 <strong>{bulkResult.created}</strong> 人</span>
            <span>已存在跳過 <strong>{bulkResult.skipped}</strong> 人</span>
            <span className="font-semibold">員工總數 <strong>{bulkResult.total}</strong> 人</span>
          </div>
          <p className="text-blue-500 text-xs mt-2">所有新帳號預設為「一般員工」，可在下方名單調整權限</p>
        </div>
      )}

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
          <div key={role} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${ROLE_COLORS[role]}`}>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="搜尋姓名或員工編號..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none"
          style={{ borderColor: '#cdbea2' }}
        />
      </div>

      {/* Users table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">載入中...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#e8ddd4' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f5f0eb' }}>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">員工姓名</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">員工編號</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">目前角色</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">帳號狀態</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">最後登入</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">找不到符合的使用者</td>
                </tr>
              ) : filtered.map(user => (
                <tr
                  key={user.id}
                  className="transition-colors"
                  style={editingId === user.id ? { backgroundColor: '#faf7f4' } : {}}
                >
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: '#8b6f4e' }}>
                        {user.name.charAt(0)}
                      </div>
                      <span>{user.name}</span>
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-gray-400">(你)</span>
                      )}
                    </div>
                  </td>

                  {/* ERPID */}
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{user.erpid}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as Role)}
                        className="border rounded-lg px-2 py-1 text-sm focus:outline-none"
                        style={{ borderColor: '#cdbea2' }}
                      >
                        <option value="user">一般員工</option>
                        <option value="pr_admin">公關部管理員</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role as Role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {ROLE_LABELS[user.role as Role] || user.role}
                      </span>
                    )}
                  </td>

                  {/* Active */}
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={e => setEditActive(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-600">{editActive ? '啟用' : '停用'}</span>
                      </label>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {user.is_active ? '啟用中' : '已停用'}
                      </span>
                    )}
                  </td>

                  {/* Last login */}
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString('zh-TW', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(user.id)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#8b6f4e' }}
                        >
                          {saving ? '儲存中...' : '儲存'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      user.id !== currentUser?.id && (
                        <button
                          onClick={() => startEdit(user)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-amber-50"
                          style={{ borderColor: '#cdbea2', color: '#8b6f4e' }}
                        >
                          修改權限
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg p-4 text-sm space-y-1.5" style={{ backgroundColor: '#faf7f4', borderLeft: '3px solid #cdbea2' }}>
        <p className="font-semibold" style={{ color: '#8b6f4e' }}>角色說明</p>
        <p className="text-gray-600"><span className="font-medium">超級管理員</span>｜完整系統存取，可管理所有使用者角色</p>
        <p className="text-gray-600"><span className="font-medium">公關部管理員</span>｜可建立評價、指派案件、結案、查看分析</p>
        <p className="text-gray-600"><span className="font-medium">一般員工</span>｜僅可查看並更新自己被指派的案件</p>
      </div>
    </div>
  );
}
