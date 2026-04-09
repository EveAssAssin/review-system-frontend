import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { feedbackApi, feedbackCategoriesApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TYPE_LABELS: Record<string, string> = {
  suggestion: '建議', complaint: '投訴', praise: '稱讚', inquiry: '詢問', other: '其他',
};
const STATUS_LABELS: Record<string, string> = {
  pending: '待處理', processing: '處理中', resolved: '已解決', closed: '已結案',
};
const URGENCY_LABELS: Record<string, string> = {
  urgent_plus: '特急', urgent: '緊急', normal: '普通',
};
const SOURCE_LABELS: Record<string, string> = {
  phone: '電話', walk_in: '到店', line: 'LINE', app: 'APP', web: '網路', other: '其他',
};

const FeedbackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [feedback, setFeedback] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 狀態/指派 更新
  const [editStatus, setEditStatus] = useState('');
  const [editUrgency, setEditUrgency] = useState('');
  const [editAssigned, setEditAssigned] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');

  // 處理紀錄
  const [newRecord, setNewRecord] = useState('');
  const [addingRecord, setAddingRecord] = useState(false);

  const loadFeedback = async () => {
    try {
      const res = await feedbackApi.getById(id!);
      setFeedback(res.data);
      setEditStatus(res.data.status);
      setEditUrgency(res.data.urgency);
      setEditAssigned(res.data.assigned_employee_id || '');
      setEditCategory(res.data.category_id || '');
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      await loadFeedback();
      try {
        const [catsRes, empsRes] = await Promise.all([
          feedbackCategoriesApi.getAll(),
          employeesApi.search({ limit: 500 }),
        ]);
        setCategories(catsRes.data);
        setEmployees(empsRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadAll();
  }, [id]);

  const handleUpdate = async () => {
    try {
      await feedbackApi.update(id!, {
        status: editStatus,
        urgency: editUrgency,
        assigned_employee_id: editAssigned || null,
        category_id: editCategory || null,
        close_note: editStatus === 'closed' ? closeNote : undefined,
        updater_name: user?.name,
      });
      setUpdateMsg('已更新');
      await loadFeedback();
      setTimeout(() => setUpdateMsg(''), 2000);
    } catch (err) {
      setUpdateMsg('更新失敗');
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.trim()) return;
    setAddingRecord(true);
    try {
      await feedbackApi.addRecord(id!, {
        content: newRecord,
        recorder_name: user?.name,
        recorder_type: 'staff',
      });
      setNewRecord('');
      await loadFeedback();
    } catch (err) {
      console.error('Failed to add record:', err);
    } finally {
      setAddingRecord(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此回報嗎？')) return;
    try {
      await feedbackApi.delete(id!);
      navigate('/feedbacks');
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint': return 'bg-red-100 text-red-800';
      case 'praise': return 'bg-green-100 text-green-800';
      case 'suggestion': return 'bg-blue-100 text-blue-800';
      case 'inquiry': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;
  if (!feedback) return <div className="p-8 text-center text-gray-500">找不到此回報</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/feedbacks')} className="text-gray-500 hover:text-gray-700">
            ← 返回
          </button>
          <h2 className="text-2xl font-bold">客戶回報詳情</h2>
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-1 text-sm text-red-500 border border-red-300 hover:bg-red-50 rounded"
        >
          刪除
        </button>
      </div>

      {/* 客戶資訊 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">客戶資訊</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">客戶姓名</p>
            <p className="font-medium text-lg">{feedback.client_name}</p>
          </div>
          {feedback.client_phone && (
            <div>
              <p className="text-xs text-gray-500">電話</p>
              <p className="font-medium">{feedback.client_phone}</p>
            </div>
          )}
          {feedback.client_card && (
            <div>
              <p className="text-xs text-gray-500">會員卡號</p>
              <p className="font-medium">{feedback.client_card}</p>
            </div>
          )}
          {feedback.client_id && (
            <div>
              <p className="text-xs text-gray-500">客戶ID</p>
              <p className="font-medium text-gray-600">{feedback.client_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* 回報資訊 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">回報資訊</h3>
        <div className="flex gap-3 mb-4 flex-wrap">
          <span className={`px-3 py-1 text-sm rounded ${getTypeColor(feedback.feedback_type)}`}>
            {TYPE_LABELS[feedback.feedback_type] || feedback.feedback_type}
          </span>
          <span className={`px-3 py-1 text-sm rounded ${getStatusColor(feedback.status)}`}>
            {STATUS_LABELS[feedback.status] || feedback.status}
          </span>
          {feedback.urgency !== 'normal' && (
            <span className={`px-3 py-1 text-sm rounded font-medium ${
              feedback.urgency === 'urgent_plus' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'
            }`}>
              {URGENCY_LABELS[feedback.urgency]}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-500">來源</p>
            <p>{SOURCE_LABELS[feedback.source] || feedback.source}</p>
          </div>
          <div>
            <p className="text-gray-500">類別</p>
            <p>{feedback.feedback_categories?.name || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">負責人員</p>
            <p>{feedback.employees?.name || '-'}</p>
            {feedback.employees?.store_name && (
              <p className="text-xs text-gray-400">{feedback.employees.store_name}</p>
            )}
          </div>
          <div>
            <p className="text-gray-500">建立時間</p>
            <p>{new Date(feedback.created_at).toLocaleString('zh-TW')}</p>
          </div>
          {feedback.customer_sms_sent && (
            <div>
              <p className="text-gray-500">SMS 通知</p>
              <p className="text-green-600">✓ 已發送</p>
            </div>
          )}
        </div>
        {feedback.content && (
          <div>
            <p className="text-gray-500 text-sm mb-1">回報內容</p>
            <div className="bg-gray-50 rounded p-4 text-gray-700 whitespace-pre-wrap">
              {feedback.content}
            </div>
          </div>
        )}
        {feedback.close_note && (
          <div className="mt-4">
            <p className="text-gray-500 text-sm mb-1">結案備註</p>
            <div className="bg-gray-50 rounded p-3 text-gray-700">{feedback.close_note}</div>
          </div>
        )}
      </div>

      {/* 更新狀態/指派 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">更新回報</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <select
              value={editStatus}
              onChange={e => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="pending">待處理</option>
              <option value="processing">處理中</option>
              <option value="resolved">已解決</option>
              <option value="closed">已結案</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">緊急度</label>
            <select
              value={editUrgency}
              onChange={e => setEditUrgency(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="normal">普通</option>
              <option value="urgent">緊急</option>
              <option value="urgent_plus">特急</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
            <select
              value={editCategory}
              onChange={e => setEditCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">未分類</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">負責人員</label>
            <select
              value={editAssigned}
              onChange={e => setEditAssigned(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">不指派</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.store_name ? ` (${emp.store_name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {editStatus === 'closed' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">結案備註</label>
            <textarea
              value={closeNote}
              onChange={e => setCloseNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded"
              placeholder="請輸入結案說明..."
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            儲存更新
          </button>
          {updateMsg && (
            <span className={updateMsg === '已更新' ? 'text-green-600 text-sm' : 'text-red-500 text-sm'}>
              {updateMsg}
            </span>
          )}
        </div>
      </div>

      {/* 客服處理紀錄 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">
          客服處理紀錄
          <span className="text-gray-400 font-normal text-sm ml-2">
            ({(feedback.records || []).length} 筆)
          </span>
        </h3>

        <div className="space-y-3 mb-4">
          {(feedback.records || []).length === 0 ? (
            <p className="text-gray-400 text-sm">尚無處理紀錄</p>
          ) : (
            (feedback.records || []).map((r: any) => (
              <div
                key={r.id}
                className={`rounded p-3 ${
                  r.recorder_type === 'system' ? 'bg-gray-50 border-l-4 border-gray-300' : 'bg-blue-50 border-l-4 border-blue-400'
                }`}
              >
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{r.recorder_name || (r.recorder_type === 'system' ? '系統' : '客服')}</span>
                  <span>{new Date(r.created_at).toLocaleString('zh-TW')}</span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.content}</p>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4">
          <textarea
            value={newRecord}
            onChange={e => setNewRecord(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded mb-2"
            placeholder="輸入處理記錄..."
          />
          <button
            onClick={handleAddRecord}
            disabled={addingRecord || !newRecord.trim()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
          >
            {addingRecord ? '新增中...' : '新增紀錄'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetailPage;
