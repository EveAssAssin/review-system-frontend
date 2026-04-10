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

  // SMS 客戶通知
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsMsg, setSmsMsg] = useState('');
  const [showSmsInput, setShowSmsInput] = useState(false);

  // LINE 員工通知
  const [lineNotifying, setLineNotifying] = useState(false);
  const [lineMsg, setLineMsg] = useState('');

  // 處理完成流程
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveDetail, setResolveDetail] = useState('');
  const [resolving, setResolving] = useState(false);

  // 結案流程
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closingNote, setClosingNote] = useState('');
  const [closing, setClosing] = useState(false);
  // 結案時推波（整合在結案表單內）
  const [closeNotify, setCloseNotify] = useState(false);
  const [closeNotifyMethod, setCloseNotifyMethod] = useState<'sms' | 'line'>('sms');
  const [closeNotifyMsg, setCloseNotifyMsg] = useState('');
  // 結案標籤
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 結案通知（手動補發）
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyMethod, setNotifyMethod] = useState<'sms' | 'line'>('sms');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState('');

  // 關聯者
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [relationSearch, setRelationSearch] = useState('');
  const [relationSearchResults, setRelationSearchResults] = useState<any[]>([]);
  const [selectedRelationEmp, setSelectedRelationEmp] = useState<any>(null);
  const [relationReason, setRelationReason] = useState('');
  const [addingRelation, setAddingRelation] = useState(false);
  const [relationMsg, setRelationMsg] = useState('');

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
      try {
        const tagsRes = await feedbackApi.getTags();
        setAvailableTags(tagsRes.data);
      } catch {}
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

  const handleSendSms = async () => {
    setSmsSending(true);
    setSmsMsg('');
    try {
      const res = await feedbackApi.sendSms(id!, {
        message: smsMessage.trim() || undefined,
        sender_name: user?.name,
      });
      if (res.data.success) {
        setSmsMsg('✓ SMS 已發送');
        setSmsMessage('');
        setShowSmsInput(false);
        await loadFeedback();
      } else {
        setSmsMsg(`✗ ${res.data.message}`);
      }
    } catch (err) {
      setSmsMsg('✗ 發送失敗，請稍後再試');
    } finally {
      setSmsSending(false);
      setTimeout(() => setSmsMsg(''), 4000);
    }
  };

  const handleNotifyEmployee = async () => {
    setLineNotifying(true);
    setLineMsg('');
    try {
      const res = await feedbackApi.notifyEmployee(id!);
      if (res.data.success) {
        setLineMsg('✓ LINE 通知已發送');
        await loadFeedback();
      } else {
        setLineMsg(`✗ ${res.data.message}`);
      }
    } catch (err) {
      setLineMsg('✗ 發送失敗，請稍後再試');
    } finally {
      setLineNotifying(false);
      setTimeout(() => setLineMsg(''), 4000);
    }
  };

  const handleResolve = async () => {
    if (!resolveDetail.trim()) return;
    setResolving(true);
    try {
      await feedbackApi.resolve(id!, { resolve_detail: resolveDetail, resolver_name: user?.name || '客服' });
      setResolveDetail('');
      setShowResolveForm(false);
      await loadFeedback();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失敗，請重試');
    } finally { setResolving(false); }
  };

  const handleCloseCase = async () => {
    if (!closingNote.trim()) return;
    setClosing(true);
    try {
      await feedbackApi.closeCase(id!, {
        close_note: closingNote,
        closer_name: user?.name || '客服',
        close_notify: closeNotify,
        close_notify_method: closeNotify ? closeNotifyMethod : undefined,
        close_notify_message: closeNotify && closeNotifyMsg.trim() ? closeNotifyMsg.trim() : undefined,
        close_tags: selectedTags,
      });
      setClosingNote('');
      setCloseNotify(false);
      setCloseNotifyMsg('');
      setShowCloseForm(false);
      setSelectedTags([]);
      await loadFeedback();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失敗，請重試');
    } finally { setClosing(false); }
  };

  const handleSendCloseNotify = async () => {
    if (!notifyMessage.trim()) return;
    setNotifying(true);
    setNotifyResult('');
    try {
      const res = await feedbackApi.sendCloseNotify(id!, {
        method: notifyMethod,
        message: notifyMessage,
        sender_name: user?.name || '客服',
      });
      if (res.data.success) {
        setNotifyResult('✓ 通知已發送');
        setShowNotifyForm(false);
        await loadFeedback();
      } else {
        setNotifyResult(`✗ ${res.data.message}`);
      }
    } catch {
      setNotifyResult('✗ 發送失敗，請重試');
    } finally {
      setNotifying(false);
      setTimeout(() => setNotifyResult(''), 4000);
    }
  };

  const handleRelationSearch = async (keyword: string) => {
    setRelationSearch(keyword);
    if (keyword.trim().length < 1) { setRelationSearchResults([]); return; }
    try {
      const res = await employeesApi.search({ keyword, limit: 10 });
      setRelationSearchResults(res.data.data || []);
    } catch { setRelationSearchResults([]); }
  };

  const handleAddRelation = async () => {
    if (!selectedRelationEmp || !relationReason.trim()) return;
    setAddingRelation(true);
    setRelationMsg('');
    try {
      await feedbackApi.addRelation(id!, {
        employee_id: String(selectedRelationEmp.id),
        employee_name: selectedRelationEmp.name,
        employee_app_number: selectedRelationEmp.app_number || undefined,
        employee_store: selectedRelationEmp.store_name || undefined,
        relation_reason: relationReason.trim(),
        created_by: user?.name,
      });
      setSelectedRelationEmp(null);
      setRelationReason('');
      setRelationSearch('');
      setRelationSearchResults([]);
      setShowRelationForm(false);
      setRelationMsg('✓ 關聯者已新增');
      await loadFeedback();
    } catch {
      setRelationMsg('✗ 新增失敗，請重試');
    } finally {
      setAddingRelation(false);
      setTimeout(() => setRelationMsg(''), 3000);
    }
  };

  const handleRemoveRelation = async (relationId: string) => {
    if (!confirm('確定要移除此關聯者？')) return;
    try {
      await feedbackApi.removeRelation(id!, relationId, user?.name);
      await loadFeedback();
    } catch {
      alert('移除失敗，請重試');
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
      case 'processing': return 'bg-[#e8ddd0] text-[#5c4033]';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint': return 'bg-red-100 text-red-800';
      case 'praise': return 'bg-green-100 text-green-800';
      case 'suggestion': return 'bg-[#e8ddd0] text-[#5c4033]';
      case 'inquiry': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;
  if (!feedback) return <div className="p-8 text-center text-gray-500">找不到此回報</div>;

  const defaultSmsText = `您好，我們已針對您的${TYPE_LABELS[feedback.feedback_type] || '回報'}進行處理，若有任何問題歡迎再次聯絡。 -樂活眼鏡`;

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
        <div className="grid grid-cols-2 gap-4 mb-4">
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

        {/* SMS 通知客戶 */}
        {feedback.client_phone && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">SMS 通知客戶</span>
                {feedback.customer_sms_sent ? (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    ✓ 已發送（{new Date(feedback.customer_sms_sent_at).toLocaleString('zh-TW')}）
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">尚未發送</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSmsInput(!showSmsInput)}
                className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded"
              >
                {feedback.customer_sms_sent ? '再次發送' : '發送 SMS'}
              </button>
            </div>

            {showSmsInput && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder={defaultSmsText}
                />
                <p className="text-xs text-gray-400">留空則使用預設訊息</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={smsSending}
                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                  >
                    {smsSending ? '發送中...' : '確認發送'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSmsInput(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {smsMsg && (
              <p className={`text-sm mt-2 ${smsMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                {smsMsg}
              </p>
            )}
          </div>
        )}
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
            <p className="text-gray-500">建立時間</p>
            <p>{new Date(feedback.created_at).toLocaleString('zh-TW')}</p>
          </div>
          <div>
            <p className="text-gray-500">建立人員</p>
            <p>{feedback.created_by || '-'}</p>
          </div>
        </div>
        {feedback.content && (
          <div>
            <p className="text-gray-500 text-sm mb-1">回報內容</p>
            <div className="bg-gray-50 rounded p-4 text-gray-700 whitespace-pre-wrap">
              {feedback.content}
            </div>
          </div>
        )}
        {feedback.immediate_response && (
          <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: '#f5f0eb', border: '1px solid #cdbea2' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#8b6f4e' }}>
              ⚡ 即時應急回覆
            </p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#3d2b1f' }}>
              {feedback.immediate_response}
            </p>
          </div>
        )}
        {feedback.close_note && (
          <div className="mt-4">
            <p className="text-gray-500 text-sm mb-1">結案備註</p>
            <div className="bg-gray-50 rounded p-3 text-gray-700">{feedback.close_note}</div>
            {feedback.close_tags && feedback.close_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {feedback.close_tags.map((tag: string) => {
                  const tagData = availableTags.find(t => t.name === tag);
                  return (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: tagData?.color || '#8b6f4e',
                        color: '#fff',
                      }}
                    >
                      #{tag}
                    </span>
                  );
                })}
              </div>
            )}
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
            className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded"
          >
            儲存更新
          </button>
          {updateMsg && (
            <span className={updateMsg === '已更新' ? 'text-green-600 text-sm' : 'text-red-500 text-sm'}>
              {updateMsg}
            </span>
          )}
        </div>

        {/* 負責人員 LINE 通知狀態 */}
        {feedback.assigned_employee_id && (
          <div className="border-t mt-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  負責人員：{feedback.employees?.name || '—'}
                  {feedback.employees?.store_name && (
                    <span className="text-gray-400 font-normal text-xs ml-1">
                      （{feedback.employees.store_name}）
                    </span>
                  )}
                </p>
                {feedback.employee_notified ? (
                  <p className="text-xs text-green-600 mt-0.5">
                    ✓ LINE 通知已發送（{new Date(feedback.employee_notified_at).toLocaleString('zh-TW')}）
                  </p>
                ) : (
                  <p className="text-xs text-yellow-600 mt-0.5">⚠ LINE 通知尚未發送</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleNotifyEmployee}
                disabled={lineNotifying}
                className="text-sm px-3 py-1.5 bg-[#f5f0eb]0 hover:bg-[#8b6f4e] text-white rounded disabled:opacity-50 whitespace-nowrap"
              >
                {lineNotifying ? '發送中...' : feedback.employee_notified ? '重新發送通知' : '發送 LINE 通知'}
              </button>
            </div>
            {lineMsg && (
              <p className={`text-sm mt-2 ${lineMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                {lineMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 交辦流程操作 */}
      {feedback.status !== 'closed' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">流程操作</h3>

          {/* 標記處理完成（processing → resolved） */}
          {(feedback.status === 'pending' || feedback.status === 'processing') && (
            <div className="mb-4">
              {!showResolveForm ? (
                <button
                  type="button"
                  onClick={() => setShowResolveForm(true)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                >
                  ✅ 標記處理完成
                </button>
              ) : (
                <div className="space-y-3 border rounded p-4 bg-green-50">
                  <p className="text-sm font-medium text-green-800">填寫處理完成細節</p>
                  <textarea
                    value={resolveDetail}
                    onChange={e => setResolveDetail(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="請說明處理過程與結果..."
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={resolving || !resolveDetail.trim()}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                    >
                      {resolving ? '送出中...' : '確認完成'}
                    </button>
                    <button type="button" onClick={() => setShowResolveForm(false)} className="text-sm text-gray-500">取消</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 已解決狀態顯示處理細節 */}
          {feedback.status === 'resolved' && feedback.resolve_detail && (
            <div className="mb-4 bg-green-50 rounded p-3">
              <p className="text-xs text-green-600 font-medium mb-1">
                ✅ {feedback.resolved_by} 於 {new Date(feedback.resolved_at).toLocaleString('zh-TW')} 標記處理完成
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.resolve_detail}</p>
            </div>
          )}

          {/* 結案（resolved → closed） */}
          {feedback.status === 'resolved' && (
            <div className="mb-4">
              {!showCloseForm ? (
                <button
                  type="button"
                  onClick={() => setShowCloseForm(true)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-sm"
                >
                  📋 填寫結案說明
                </button>
              ) : (
                <div className="space-y-3 border rounded p-4 bg-[#f9f6f2]">
                  <p className="text-sm font-medium text-gray-700">結案說明</p>
                  <textarea
                    value={closingNote}
                    onChange={e => setClosingNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="請填寫結案說明..."
                  />

                  {/* 結案標籤 */}
                  {availableTags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">結案標籤 <span className="text-xs text-gray-400 font-normal">（可複選）</span></p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => {
                          const isSelected = selectedTags.includes(tag.name);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => setSelectedTags(prev =>
                                isSelected ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                              )}
                              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                              style={{
                                backgroundColor: isSelected ? tag.color : '#fff',
                                borderColor: tag.color,
                                color: isSelected ? '#fff' : tag.color,
                              }}
                            >
                              # {tag.name}
                            </button>
                          );
                        })}
                      </div>
                      {selectedTags.length > 0 && (
                        <p className="text-xs" style={{ color: '#8b7355' }}>
                          已選：{selectedTags.map(t => `#${t}`).join('、')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 結案推波通知（整合在結案表單） */}
                  <div className="border rounded p-3 bg-white space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={closeNotify}
                        onChange={e => {
                          setCloseNotify(e.target.checked);
                          if (e.target.checked && !closeNotifyMsg) {
                            const defaultMsg = feedback.reporter_is_internal
                              ? `您好，您回報的案件已結案。\n\n結案說明：${closingNote || '（請先填寫）'}\n\n感謝您的回饋！`
                              : `您好，您的案件已結案，感謝您的寶貴意見。如有任何問題歡迎再次聯絡。 -樂活眼鏡`;
                            setCloseNotifyMsg(defaultMsg);
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">📤 同時發送結案通知</span>
                    </label>

                    {closeNotify && (
                      <div className="space-y-2 pl-6">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <input
                              type="radio"
                              checked={closeNotifyMethod === 'sms'}
                              onChange={() => {
                                setCloseNotifyMethod('sms');
                                setCloseNotifyMsg(
                                  `您好，您的案件已結案。\n\n${closingNote ? `結案說明：${closingNote}\n\n` : ''}感謝您的寶貴意見，如有任何問題歡迎再次聯絡。 -樂活眼鏡`
                                );
                              }}
                            />
                            簡訊（SMS）
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <input
                              type="radio"
                              checked={closeNotifyMethod === 'line'}
                              onChange={() => {
                                setCloseNotifyMethod('line');
                                const isInternal = feedback?.reporter_is_internal;
                                setCloseNotifyMsg(
                                  isInternal
                                    ? `您好，您回報的案件已結案。\n\n${closingNote ? `結案說明：${closingNote}\n\n` : ''}感謝您的回饋！`
                                    : `您好，您的案件已結案。\n\n${closingNote ? `結案說明：${closingNote}\n\n` : ''}感謝您的寶貴意見，如有任何問題歡迎再次聯絡。`
                                );
                              }}
                            />
                            LINE（左手系統）
                          </label>
                        </div>
                        <textarea
                          value={closeNotifyMsg}
                          onChange={e => setCloseNotifyMsg(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border rounded text-sm"
                          placeholder={closeNotifyMethod === 'sms' ? 'SMS 訊息內容...' : 'LINE 訊息內容（系統會自動附上案件連結）'}
                        />
                        <p className="text-xs text-gray-400">
                          {closeNotifyMethod === 'sms'
                            ? `📱 發送至：${feedback?.client_phone || '（尚無電話）'}`
                            : `📲 LINE 發送至：${feedback?.reporter_is_internal ? `${feedback?.reporter_app_number || '—'}（回報者）` : `卡號 ${feedback?.client_card || '—'}（客戶）`}`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCloseCase}
                      disabled={closing || !closingNote.trim()}
                      className="px-4 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded disabled:opacity-50"
                    >
                      {closing ? '結案中...' : closeNotify ? '確認結案並發送通知' : '確認結案'}
                    </button>
                    <button type="button" onClick={() => { setShowCloseForm(false); setCloseNotify(false); setCloseNotifyMsg(''); }} className="text-sm text-gray-500">取消</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 結案後推播通知 */}
      {feedback.status === 'closed' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">結案通知推播</h3>
            {feedback.close_notify_sent ? (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                ✓ 已發送（{feedback.close_notify_method?.toUpperCase()} · {new Date(feedback.close_notify_at).toLocaleString('zh-TW')}）
              </span>
            ) : (
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">尚未發送</span>
            )}
          </div>

          {!showNotifyForm ? (
            <button
              type="button"
              onClick={() => {
                const defaultMsg = `您好，您的案件（${feedback.close_note || '已處理完成'}）已結案，感謝您的回饋！如有任何問題請再次聯絡我們。 -樂活眼鏡`;
                setNotifyMessage(defaultMsg);
                setShowNotifyForm(true);
              }}
              className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded text-sm"
            >
              📤 {feedback.close_notify_sent ? '再次發送結案通知' : '發送結案通知'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3 items-center">
                <label className="text-sm font-medium text-gray-700">推播方式</label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    value="sms"
                    checked={notifyMethod === 'sms'}
                    onChange={() => setNotifyMethod('sms')}
                  />
                  <span className="text-sm">簡訊（SMS）</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    value="line"
                    checked={notifyMethod === 'line'}
                    onChange={() => setNotifyMethod('line')}
                  />
                  <span className="text-sm">LINE（左手系統）</span>
                </label>
              </div>
              <textarea
                value={notifyMessage}
                onChange={e => setNotifyMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendCloseNotify}
                  disabled={notifying || !notifyMessage.trim()}
                  className="px-4 py-1.5 bg-[#8b6f4e] hover:bg-[#7a6040] text-white text-sm rounded disabled:opacity-50"
                >
                  {notifying ? '發送中...' : '確認發送'}
                </button>
                <button type="button" onClick={() => setShowNotifyForm(false)} className="text-sm text-gray-500">取消</button>
              </div>
            </div>
          )}
          {notifyResult && (
            <p className={`text-sm mt-2 ${notifyResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {notifyResult}
            </p>
          )}
        </div>
      )}

      {/* 關聯者 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-700">
            關聯者
            <span className="text-gray-400 font-normal text-sm ml-2">
              ({(feedback.relations || []).length} 人)
            </span>
          </h3>
          <button
            type="button"
            onClick={() => { setShowRelationForm(!showRelationForm); setRelationMsg(''); }}
            className="text-sm px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded"
          >
            + 新增關聯者
          </button>
        </div>

        {/* 現有關聯者列表 */}
        {(feedback.relations || []).length === 0 ? (
          <p className="text-gray-400 text-sm mb-4">尚無關聯者</p>
        ) : (
          <div className="space-y-2 mb-4">
            {(feedback.relations || []).map((r: any) => (
              <div key={r.id} className="flex items-start justify-between bg-purple-50 rounded p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{r.employee_name}</span>
                    {r.employee_store && (
                      <span className="text-xs text-gray-400">({r.employee_store})</span>
                    )}
                    {r.employee_app_number && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        #{r.employee_app_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-purple-700 mt-1">
                    <span className="text-gray-500">關聯原因：</span>{r.relation_reason}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(r.created_at).toLocaleString('zh-TW')}
                    {r.created_by && ` · 由 ${r.created_by} 新增`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRelation(r.id)}
                  className="text-xs text-red-400 hover:text-red-600 ml-3 shrink-0"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 新增關聯者表單 */}
        {showRelationForm && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">搜尋員工</p>

            {/* 已選取的員工 */}
            {selectedRelationEmp ? (
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded p-2">
                <div>
                  <span className="font-medium">{selectedRelationEmp.name}</span>
                  {selectedRelationEmp.store_name && (
                    <span className="text-gray-500 text-sm ml-2">({selectedRelationEmp.store_name})</span>
                  )}
                  {selectedRelationEmp.app_number && (
                    <span className="text-xs text-gray-400 ml-2">#{selectedRelationEmp.app_number}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRelationEmp(null)}
                  className="text-xs text-gray-400 hover:text-red-400"
                >✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="輸入姓名搜尋員工..."
                  value={relationSearch}
                  onChange={e => handleRelationSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                {relationSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {relationSearchResults.map((emp: any) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedRelationEmp(emp);
                          setRelationSearch('');
                          setRelationSearchResults([]);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex justify-between"
                      >
                        <span>{emp.name}</span>
                        <span className="text-gray-400">{emp.store_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                關聯原因 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={relationReason}
                onChange={e => setRelationReason(e.target.value)}
                placeholder="例：負責門市主管、事件當時值班人員..."
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddRelation}
                disabled={addingRelation || !selectedRelationEmp || !relationReason.trim()}
                className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded disabled:opacity-50"
              >
                {addingRelation ? '新增中...' : '確認新增'}
              </button>
              <button
                type="button"
                onClick={() => { setShowRelationForm(false); setSelectedRelationEmp(null); setRelationReason(''); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >取消</button>
            </div>
          </div>
        )}

        {relationMsg && (
          <p className={`text-sm mt-2 ${relationMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
            {relationMsg}
          </p>
        )}
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
                  r.recorder_type === 'system' ? 'bg-gray-50 border-l-4 border-gray-300' : 'bg-[#f5f0eb] border-l-4 border-blue-400'
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
