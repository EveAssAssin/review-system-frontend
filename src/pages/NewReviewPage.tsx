import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewsApi, employeesApi, categoriesApi, uploadsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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

interface Response {
  id: string;
  review_id: string;
  responder_type: 'employee' | 'reviewer';
  responder_name: string;
  content: string;
  created_at: string;
}

export default function NewReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // 建立後的對話區塊
  const [createdReviewId, setCreatedReviewId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const [form, setForm] = useState({
    category_id: '',
    source: 'google_map',
    review_type: 'negative',
    urgency: 'normal',
    event_date: new Date().toISOString().split('T')[0],
    content: '',
    immediate_response: '',
    initial_pr_message: '',
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

  // 載入對話紀錄（建立評價後使用）
  const loadResponses = async (reviewId: string) => {
    try {
      const res = await reviewsApi.getResponses(reviewId);
      setResponses(res.data);
    } catch (err) {
      console.error('載入對話失敗:', err);
    }
  };

  // 公關部回覆送出
  const handleReviewerResponse = async () => {
    if (!responseContent.trim()) {
      alert('請輸入回覆內容');
      return;
    }
    if (!createdReviewId) return;

    setSubmittingResponse(true);
    try {
      await reviewsApi.addReviewerResponse(createdReviewId, responseContent, user?.name || '公關部');
      if (responseFiles.length > 0) {
        await uploadsApi.uploadForResponse(createdReviewId, responseFiles, 'reviewer');
      }
      setShowResponseForm(false);
      setResponseContent('');
      setResponseFiles([]);
      loadResponses(createdReviewId);
    } catch (err) {
      console.error('回覆失敗:', err);
      alert('回覆失敗');
    } finally {
      setSubmittingResponse(false);
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
        immediate_response: form.immediate_response || undefined,
        initial_pr_message: form.initial_pr_message?.trim() || undefined,
        initial_pr_message_sender: form.initial_pr_message?.trim()
          ? (user?.name || '公關部')
          : undefined,
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

      // 不再導向；切換成「已建立」狀態，下方顯示對話區塊
      setCreatedReviewId(reviewId);
      loadResponses(reviewId);
      // 視覺提示捲到底
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
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
            <div className="mt-2 p-2 bg-[#f5f0eb] rounded text-sm">
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
              className="w-4 h-4 text-[#8b6f4e]"
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

        {/* 即時應急回覆 — 客服當下留言給客人 */}
        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">即時應急回覆</h3>
              <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>
                客服人員發現問題時，當下「留言給客人」的內容，讓客人知道公司已注意到這件事；此欄位反映客服在發評價當下的應急處理力
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>客服→客人</span>
          </div>
          <textarea
            value={form.immediate_response}
            onChange={(e) => setForm({ ...form, immediate_response: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none"
            style={{ borderColor: '#cdbea2' }}
            placeholder="例：王先生您好，我們已收到您的反映，公司已立即介入處理，會盡快與您聯繫並給您一個交代，感謝您讓我們有機會改善..."
          />
        </div>

        {/* 公關部首句指令 — 建立評價同時送給被評價者 */}
        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">公關部首句指令</h3>
              <p className="text-xs mt-0.5" style={{ color: '#5b7fad' }}>
                建立評價同時，自動以公關部身份對被評價者送出第一則對話，並併入 LINE 通知；員工會與評價同步收到
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ backgroundColor: '#e8eef5', color: '#5b7fad' }}>公關部→員工</span>
          </div>
          <textarea
            value={form.initial_pr_message}
            onChange={(e) => setForm({ ...form, initial_pr_message: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none"
            style={{ borderColor: '#b8c8dd' }}
            placeholder="例：這筆評價是怎麼回事，請查清楚並回覆我！"
          />
          <div className="text-xs text-gray-400">留空則不發送首句指令</div>
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
        {!createdReviewId ? (
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !selectedEmployee}
              className="flex-1 py-2 bg-[#8b6f4e] text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '建立中...' : '建立評價'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/reviews')}
              className="px-6 py-2 border rounded hover:bg-[#f9f6f2]"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
            ✓ 評價已建立，可在下方與被評價者對話
          </div>
        )}

        {/* 與被評價者對話（建立評價後出現，沿用 ReviewDetailPage 的留言架構） */}
        {createdReviewId && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold" style={{ color: '#5b7fad' }}>💬 與被評價者對話</div>
              <span className="text-xs text-gray-400">建立評價時自動發起</span>
            </div>
            <div className="rounded-lg p-3 space-y-3" style={{ backgroundColor: '#faf9f6', border: '1px solid #ede8e2' }}>
              {responses.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">尚無對話紀錄，可使用下方「公關部回覆」開始溝通</div>
              ) : (
                responses.map((resp) => {
                  const isEmployee = resp.responder_type === 'employee';
                  return (
                    <div key={resp.id} className={`flex ${isEmployee ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isEmployee ? 'bg-white text-gray-800' : 'text-white'}`}
                        style={isEmployee ? { border: '1px solid #ede8e2' } : { backgroundColor: '#8b6f4e' }}>
                        <div className={`flex items-center gap-2 mb-1 text-[11px] ${isEmployee ? 'text-gray-500' : 'text-white/80'}`}>
                          <span className="font-medium">
                            {isEmployee ? `👤 ${resp.responder_name || '員工'}` : `🏢 ${resp.responder_name || '公關部'}`}
                          </span>
                          <span>·</span>
                          <span>{new Date(resp.created_at).toLocaleString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">{resp.content}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowResponseForm(true)}
                className="px-4 py-2 bg-[#8b6f4e] text-white rounded hover:opacity-80 text-sm"
              >
                🏢 公關部回覆
              </button>
              <button
                type="button"
                onClick={() => loadResponses(createdReviewId)}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm text-gray-600"
              >
                🔄 重新載入
              </button>
              <button
                type="button"
                onClick={() => navigate(`/reviews/${createdReviewId}`)}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm text-gray-600"
              >
                查看詳情
              </button>
              <button
                type="button"
                onClick={() => navigate('/reviews')}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm text-gray-600"
              >
                完成並返回列表
              </button>
            </div>
          </div>
        )}
      </form>

      {/* 公關部回覆 Modal */}
      {showResponseForm && createdReviewId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">公關部回覆</h2>
            <textarea
              value={responseContent}
              onChange={(e) => setResponseContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded mb-4"
              placeholder="請輸入回覆內容..."
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">附件</label>
              <FileUpload onFilesSelected={setResponseFiles} maxFiles={5} maxSizeMB={50} />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowResponseForm(false); setResponseFiles([]); }}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleReviewerResponse}
                disabled={submittingResponse}
                className="px-4 py-2 bg-[#8b6f4e] text-white rounded disabled:opacity-50"
              >
                {submittingResponse ? '送出中...' : '送出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
