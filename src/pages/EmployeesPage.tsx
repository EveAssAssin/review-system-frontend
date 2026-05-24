import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../services/api';
import { Employee } from '../types';

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [flagSaving, setFlagSaving] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeesApi.search({ limit: 500 });
      setEmployees(res.data.data);
      setFilteredEmployees(res.data.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEmployees(
        employees.filter(
          (emp) =>
            emp.name.toLowerCase().includes(query) ||
            emp.erpid.toLowerCase().includes(query) ||
            emp.store_name?.toLowerCase().includes(query) ||
            emp.department?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, employees]);

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

  const rosterCount = employees.filter((e) => e.needs_service_evaluation).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">員工列表</h2>

      {/* 搜尋 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋姓名 / ERP / APP 編號 / 門市 / 部門..."
          className="w-full px-3 py-2 border rounded"
        />
        <div className="mt-2 text-sm text-gray-500">
          共 {filteredEmployees.length} 筆 / 總計 {employees.length} 筆 ·{' '}
          <span className="text-[#8b6f4e] font-medium">服務評鑑名單 {rosterCount} 人</span>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">沒有員工資料</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
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
              <tbody className="divide-y">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#f9f6f2]">
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
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
                            transform: emp.needs_service_evaluation
                              ? 'translateX(24px)'
                              : 'translateX(4px)',
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesPage;
