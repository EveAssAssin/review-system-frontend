import { useState, useEffect } from 'react';
import { authApi, employeesApi } from '../services/api';

type Role = 'super_admin' | 'pr_admin' | 'user';

interface User {
  id: string;
  erpid: string;
  name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

const roleLabels: Record<Role, string> = {
  super_admin: '系統管理員',
  pr_admin: '公關部',
  user: '一般人員',
};

const roleColors: Record<Role, string> = {
  super_admin: 'bg-red-100 text-red-800',
  pr_admin: 'bg-blue-100 text-blue-800',
  user: 'bg-gray-100 text-gray-800',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('pr_admin');
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('載入使用者失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchEmployees = async (query: string) => {
    if (query.length < 2) {
      setEmployees([]);
      return;
    }
    try {
      const res = await employeesApi.search({ q: query, limit: 10 });
      setEmployees(res.data.data);
    } catch (err) {
      console.error('搜尋員工失敗:', err);
    }
  };

  const handleAddUser = async () => {
    if (!selectedEmployee) return;
    try {
      await authApi.createUser({
        employee_id: selectedEmployee.id,
        erpid: selectedEmployee.erpid,
        name: selectedEmployee.name,
        role: selectedRole,
        is_active: true,
      });
      setShowAddModal(false);
      setSelectedEmployee(null);
      setEmployeeSearch('');
      loadUsers();
    } catch (err) {
      console.error('新增使用者失敗:', err);
      alert('新增失敗，該員工可能已有帳號');
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await authApi.updateUser(userId, { role: newRole });
      loadUsers();
    } catch (err) {
      console.error('更新權限失敗:', err);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`確定要刪除 ${userName} 的帳號嗎？`)) return;
    try {
      await authApi.deleteUser(userId);
      loadUsers();
    } catch (err) {
      console.error('刪除使用者失敗:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.includes(searchQuery) || u.erpid?.includes(searchQuery)
  );

  if (loading) {
    return <div className="p-6">載入中...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">使用者管理</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增使用者
        </button>
      </div>

      {/* 搜尋 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜尋姓名或 ERPID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border rounded-lg"
        />
      </div>

      {/* 使用者列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ERPID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.erpid}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    className={`px-2 py-1 rounded text-sm ${roleColors[user.role]}`}
                    disabled={user.role === 'super_admin'}
                  >
                    <option value="user">一般人員</option>
                    <option value="pr_admin">公關部</option>
                    <option value="super_admin" disabled>系統管理員</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.role !== 'super_admin' && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      刪除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新增使用者 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">新增使用者</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">搜尋員工</label>
              <input
                type="text"
                placeholder="輸入姓名或會員編號..."
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  searchEmployees(e.target.value);
                }}
                className="w-full px-4 py-2 border rounded-lg"
              />
              {employees.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setEmployeeSearch(emp.name);
                        setEmployees([]);
                      }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {emp.name} ({emp.app_number})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedEmployee && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p><strong>姓名：</strong>{selectedEmployee.name}</p>
                <p><strong>部門：</strong>{selectedEmployee.store_name || selectedEmployee.department}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">角色</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="user">一般人員</option>
                <option value="pr_admin">公關部</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedEmployee(null);
                  setEmployeeSearch('');
                }}
                className="px-4 py-2 border rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                disabled={!selectedEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
