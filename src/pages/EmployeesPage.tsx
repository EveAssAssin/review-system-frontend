import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../services/api';
import { Employee } from '../types';

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">員工列表</h2>

      {/* 搜尋 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋員工姓名、編號、門市或部門..."
          className="w-full px-3 py-2 border rounded"
        />
        <div className="mt-2 text-sm text-gray-500">
          共 {filteredEmployees.length} 筆 / 總計 {employees.length} 筆
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">員工編號</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">門市/部門</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">職稱</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">正評</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">負評</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">總計</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.erpid}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.store_name || emp.department || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.jobtitle || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-medium">{emp.positive_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-red-600 font-medium">{emp.negative_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-blue-600 font-medium">{emp.total_reviews}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="text-blue-500 hover:underline"
                      >
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
