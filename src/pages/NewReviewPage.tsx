import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewsApi, employeesApi } from '../services/api';
import { Employee } from '../types';

const NewReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    source: 'phone',
    review_type: 'negative',
    urgency: 'normal',
    event_date: '',
    content: '',
    requires_response: true,
    response_deadline_hours: 48,
  });

  // 載入全部員工
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeesApi.search({ limit: 500 });
        setAllEmployees(res.data.data);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // 搜尋過濾
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees([]);
      setShowDropdown(false);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = allEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.erpid.toLowerCase().includes(query) ||
        emp.store_name?.toLowerCase().includes(query)
    ).slice(0, 10);
    setFilteredEmployees(filtered);
    setShowDropdown(filtered.length > 0);
  }, [searchQuery, allEmployees]);

  const handleSelectEmployee = (emp: Employee) => {
    setForm({ ...form, employee_id: emp.id });
    setSearchQuery(emp.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) {
      alert('請選擇員工');
      return;
    }

    setLoading(true);
    try {
      await reviewsApi.create(form);
      alert('評價已建立');
      navigate('/reviews');
    } catch (error: any) {
      alert(error.response?.data?.message || '建立失敗');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = allEmployees.find(e => e.id === form.employee_id);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">新增評價</h2>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* 選擇員工 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            員工 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (form.employee_id) {
                setForm({ ...form, employee_id: '' });
              }
            }}
            onFocus={() => {
              if (filteredEmployees.length > 0) setShowDropdown(true);
            }}
            placeholder="輸入員工姓名、編號或門市搜尋"
            className="w-full px-3 py-2 border rounded"
          />
          {showDropdown && filteredEmployees.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
              {filteredEmployees.map((emp) => (
                <li
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                >
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-sm text-gray-500">
                    {emp.erpid} - {emp.store_name || emp.department}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {selectedEmployee && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm flex justify-between items-center">
              <span>已選擇：{selectedEmployee.name} ({selectedEmployee.erpid}) - {selectedEmployee.store_name || selectedEmployee.department}</span>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, employee_id: '' });
                  setSearchQuery('');
                }}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 來源 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">來源</label>
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="google_map">Google MAP</option>
            <option value="facebook">Facebook</option>
            <option value="phone">電話客服</option>
            <option value="app">APP 客服</option>
            <option value="other">其他</option>
          </select>
        </div>

        {/* 類型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">評價類型</label>
          <div className="flex gap-4">
            {['positive', 'negative', 'other'].map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="radio"
                  name="review_type"
                  value={type}
                  checked={form.review_type === type}
                  onChange={(e) => setForm({ ...form, review_type: e.target.value })}
                  className="mr-2"
                />
                {type === 'positive' ? '正評' : type === 'negative' ? '負評' : '其他'}
              </label>
            ))}
          </div>
        </div>

        {/* 緊急程度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">緊急程度</label>
          <select
            value={form.urgency}
            onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="normal">普通</option>
            <option value="urgent">緊急</option>
            <option value="urgent_plus">特急</option>
          </select>
        </div>

        {/* 事件日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">事件日期</label>
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {/* 內容說明 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">內容說明</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border rounded"
            placeholder="請輸入評價內容或客訴說明..."
          />
        </div>

        {/* 需要回覆 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="requires_response"
            checked={form.requires_response}
            onChange={(e) => setForm({ ...form, requires_response: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="requires_response" className="text-sm text-gray-700">
            需要員工回覆
          </label>
        </div>

        {/* 回覆期限 */}
        {form.requires_response && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              回覆期限（小時）
            </label>
            <input
              type="number"
              value={form.response_deadline_hours}
              onChange={(e) => setForm({ ...form, response_deadline_hours: parseInt(e.target.value) })}
              className="w-32 px-3 py-2 border rounded"
            />
          </div>
        )}

        {/* 按鈕 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? '建立中...' : '建立評價'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/reviews')}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewReviewPage;
