import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewsApi, employeesApi, categoriesApi, uploadsApi } from '../services/api';
import FileUpload from '../components/FileUpload';

interface Employee {
  id: string;
  name: string;
  app_number: string;
  store_name?: string;
  department?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function NewReviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  
  // 代理處理相關
  const [isProxy, setIsProxy] = useState(false);
  const [actualEmployeeSearch, setActualEmployeeSearch] = useState('');
  const [actualEmployees, setActualEmployees] = useState<Employee[]>([]);
  const [selectedActualEmployee, setSelectedActualEmployee] = useState<Employee | null>(null);

  const [form, setForm] = useState({
    category_id: '',
    source: 'google_map',
    review_type: 'negative',
    urgency: 'normal',
    event_date: new Date().toISOString().split('T')[0],
    content: '',
    requires_response: true,
    response_deadline_hours: 48,
  });

  // 載入分類
  useEffect(() => {
    categoriesApi.getAll().then(res => {
      setCategories(res.data);
    }).catch(err => {
      console.error('載入分類失敗:', err);
    });
  }, []);

  // 搜尋員工（處理人）
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

  // 搜尋實際當事人
  const searchActualEmployees = async (query: string) => {
    if (query.length < 2) {
      setActualEmployees([]);
      return;
    }
    try {
      const res = await employeesApi.search({ q: query, limit: 10 });
      setActualEmployees(res.data.data);
    } catch (err) {
      console.error('搜尋員工失敗:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      alert('請選擇處理人員');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        employee_id: selectedEmployee.id,
        is_proxy: isProxy,
        category_id: form.category_id || undefined,
        source: form.source,
        review_type: form.review_type,
        urgency: form.urgency,
        content: form.content,
        requires_response: form.requires_response,
        response_deadline_hours: form.response_deadline_hours,
      };

      if (form.event_date) {
        data.event_date = form.event_date;
      }

      if (isProxy && selectedActualEmployee) {
        data.actual_employee_id = selectedActualEmployee.id;
      }

      // 建立評價
      const reviewRes = await reviewsApi.create(data);
      const reviewId = reviewRes.data.id;

      // 上傳附件
      if (filesToUpload.length > 0) {
        await uploadsApi.uploadForReview(reviewId, filesToUpload);
      }

      alert('評價建立成功');
      navigate('/reviews');
    } catch (err: any) {
      console.error('建立評價失敗:', err);
      alert(err.response?.data?.message || '建立失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增評價</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        {/* 處理人員 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isProxy ? '代理處理人（店長/主管）' : '評價對象'}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="輸入姓名或會員編號搜尋..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchEmployees(e.target.value);
            }}
            className="w-full px-3 py-2 border rounded"
          />
          {employees.length > 0 && (
            <div className="mt-1 border rounded max-h-40 overflow-y-auto">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setSearchQuery(emp.name);
                    setEmployees([]);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {emp.name} - {emp.store_name || emp.department} ({emp.app_number})
                </div>
              ))}
            </div>
          )}
          {selectedEmployee && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
              已選擇：<strong>{selectedEmployee.name}</strong> ({selectedEmployee.store_name || selectedEmployee.department})
            </div>
          )}
        </div>

        {/* 代理處理勾選 */}
        <div className="border-t pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isProxy}
              onChange={(e) => {
                setIsProxy(e.target.checked);
                if (!e.target.checked) {
                  setSelectedActualEmployee(null);
                  setActualEmployeeSearch('');
                }
              }}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">
              此為代理處理（找不到當事人，由店長/主管代為處理）
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            勾選後，此評價會標記為「代理處理」，心理分析系統會以管理能力角度分析
          </p>
        </div>

        {/* 實際當事人 */}
        {isProxy && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              實際當事人
              <span className="ml-1 text-gray-400 font-normal text-xs">（選填，如已知）</span>
            </label>
            <input
              type="text"
              placeholder="輸入姓名或會員編號搜尋..."
              value={actualEmployeeSearch}
              onChange={(e) => {
                setActualEmployeeSearch(e.target.value);
                searchActualEmployees(e.target.value);
              }}
              className="w-full px-3 py-2 border rounded"
            />
            {actualEmployees.length > 0 && (
              <div className="mt-1 border rounded max-h-40 overflow-y-auto bg-white">
                {actualEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedActualEmployee(emp);
                      setActualEmployeeSearch(emp.name);
                      setActualEmployees([]);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {emp.name} - {emp.store_name || emp.department} ({emp.app_number})
                  </div>
                ))}
              </div>
            )}
            {selectedActualEmployee && (
              <div className="mt-2 p-2 bg-white rounded text-sm border">
                實際當事人：<strong>{selectedActualEmployee.name}</strong> ({selectedActualEmployee.store_name || selectedActualEmployee.department})
              </div>
            )}
          </div>
        )}

        {/* 評價分類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">評價分類</label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">-- 請選擇分類 --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* 評價來源 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">評價來源</label>
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

        {/* 評價類型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">評價類型</label>
          <div className="flex gap-4">
            {[
              { value: 'positive', label: '正評', color: 'green' },
              { value: 'negative', label: '負評', color: 'red' },
              { value: 'other', label: '其他', color: 'gray' },
            ].map((type) => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="review_type"
                  value={type.value}
                  checked={form.review_type === type.value}
                  onChange={(e) => setForm({ ...form, review_type: e.target.value })}
                  className="w-4 h-4"
                />
                <span className={`text-${type.color}-600 font-medium`}>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 急迫程度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">急迫程度</label>
          <select
            value={form.urgency}
            onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="normal">一般</option>
            <option value="urgent">緊急</option>
            <option value="urgent_plus">非常緊急</option>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">評價內容</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border rounded"
            placeholder="請輸入評價內容..."
          />
        </div>

        {/* 附件上傳 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">附件（圖片/影片）</label>
          <FileUpload
            onFilesSelected={setFilesToUpload}
            maxFiles={5}
            maxSizeMB={50}
          />
        </div>

        {/* 需要回覆 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requires_response}
              onChange={(e) => setForm({ ...form, requires_response: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">需要員工回覆</span>
          </label>
        </div>

        {/* 回覆期限 */}
        {form.requires_response && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">回覆期限（小時）</label>
            <select
              value={form.response_deadline_hours}
              onChange={(e) => setForm({ ...form, response_deadline_hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value={24}>24 小時</option>
              <option value={48}>48 小時</option>
              <option value={72}>72 小時</option>
              <option value={168}>7 天</option>
            </select>
          </div>
        )}

        {/* 提交按鈕 */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !selectedEmployee}
            className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '建立中...' : '建立評價'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/reviews')}
            className="px-6 py-2 border rounded hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
