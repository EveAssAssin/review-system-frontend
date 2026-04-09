import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceRecordsApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  complaint: '投訴', suggestion: '建議', inquiry: '詢問', maintenance: '維修', other: '其他',
};
const HANDLING_METHOD_LABELS: Record<string, string> = {
  phone: '電話', in_store: '到店', online: '線上', other: '其他',
};
const STATUS_LABELS: Record<string, string> = {
  open: '處理中', resolved: '已處理', closed: '已結案',
};
const LOG_TYPE_LABELS: Record<string, string> = {
  note: '備註', status_change: '狀態變更', system: '系統',
};

const ServiceRecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // 新增備註
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // 標記處理完成
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveDetail, setResolveDetail] = useState('');
  const [resolvingLoading, setResolvingLoading] = useState(false);

  // 結案
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeNote, setCloseNote] = useState('');
  const [closingLoading, setClosingLoading] = useState(false);

  // 關聯者
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [newRelation, setNewRelation] = useState({
    employee_id: '', employee_name: '', employee_app_number: '', employee_store: '', relation_reason: '',
  });
  const [addingRelation, setAddingRelation] = useState(false);

  const fetchRecord = async () => {
    if (!id) return;
    try {
      const res = await serviceRecordsApi.getById(id);
      setRecord(res.data);
    } catch {
      navigate('/service-records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
    employeesApi.search({ limit: 500 }).then(res => setEmployees(res.data.data || [])).catch(() => {});
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    setAddingNote(true);
    try {
      await serviceRecordsApi.addLog(id, { content: newNote, log_type: 'note', created_by: user?.name });
      setNewNote('');
      fetchRecord();
    } finally {
      setAddingNote(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveDetail.trim() || !id) return;
    setResolvingLoading(true);
    try {
      await serviceRecordsApi.resolve(id, { resolve_detail: resolveDetail, resolver_name: user?.name || '未知' });
      setShowResolveForm(false);
      setResolveDetail('');
      fetchRecord();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失敗');
    } finally {
      setResolvingLoading(false);
    }
  };

  const handleClose = async () => {
    if (!closeNote.trim() || !id) return;
    setClosingLoading(true);
    try {
      await serviceRecordsApi.closeCase(id, { close_note: closeNote, closer_name: user?.name || '未知' });
      setShowCloseForm(false);
      setCloseNote('');
      fetchRecord();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失敗');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleAddRelation = async () => {
    if (!newRelation.employee_name.trim() || !newRelation.relation_reason.trim() || !id) return;
    setAddingRelation(true);
    try {
      await serviceRecordsApi.addRelation(id, { ...newRelation, created_by: user?.name });
      setNewRelation({ employee_id: '', employee_name: '', employee_app_number: '', employee_store: '', relation_reason: '' });
      setShowRelationForm(false);
      fetchRecord();
    } finally {
      setAddingRelation(false);
    }
  };

  const handleRemoveRelation = async (relationId: string) => {
    if (!id || !confirm('確定移除此關聯者？')) return;
    try {
      await serviceRecordsApi.removeRelation(id, relationId, user?.name);
      fetchRecord();
    } catch {}
  };

  const handleDelete = async () => {
    if (!id || !confirm('確定刪除此客服紀錄？')) return;
    try {
      await serviceRecordsApi.delete(id);
      navigate('/service-records');
    } catch {}
  };

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;
  if (!record) return null;

  const getStatusColor = (s: string) => {
    if (s === 'open') return 'bg-blue-100 text-blue-800';
    if (s === 'resolved') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/service-records')} className="text-gray-500 hover:text-gray-700">
            ← 返回
          </button>
          <h2 className="text-2xl font-bold">客服紀錄詳情</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(record.status)}`}>
            {STATUS_LABELS[record.status]}
          </span>
          <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600">刪除</button>
        </div>
      </div>

      {/* 客戶資料 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4">客戶資料</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">類型：</span>
            <span>{record.customer_type === 'member' ? '會員' : '陌生客'}</span>
          </div>
          <div>
            <span className="text-gray-500">姓名：</span>
            <span className="font-medium">{record.customer_name || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">電話：</span>
            <span>{record.customer_mobile || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">會員卡號：</span>
            <span>{record.customer_card || '—'}</span>
          </div>
          {record.customer_store && (
            <div>
              <span className="text-gray-500">所屬門市：</span>
              <span>{record.customer_store}</span>
            </div>
          )}
        </div>
      </div>

      {/* 客服資訊 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h3 className="font-semibold text-gray-700 mb-2">客服資訊</h3>
        <div className="flex gap-4 flex-wrap text-sm">
          <div>
            <span className="text-gray-500">服務類型：</span>
            <span className="font-medium">{SERVICE_TYPE_LABELS[record.service_type] || record.service_type}</span>
          </div>
          <div>
            <span className="text-gray-500">處理方式：</span>
            <span>{HANDLING_METHOD_LABELS[record.handling_method] || record.handling_method}</span>
          </div>
          <div>
            <span className="text-gray-500">建立時間：</span>
            <span>{new Date(record.created_at).toLocaleString('zh-TW')}</span>
          </div>
        </div>
        <div>
          <p className="text-gray-500 text-sm mb-1">客服內容</p>
          <p className="bg-gray-50 rounded p-3 text-gray-800 whitespace-pre-wrap">{record.content}</p>
        </div>
        {record.handling_detail && (
          <div>
            <p className="text-gray-500 text-sm mb-1">處理方式說明</p>
            <p className="bg-gray-50 rounded p-3 text-gray-800 whitespace-pre-wrap">{record.handling_detail}</p>
          </div>
        )}

        {/* 建立者 */}
        <div className="border-t pt-3 mt-3 text-sm">
          <span className="text-gray-500">建立者：</span>
          <span className="font-medium">{record.creator_name}</span>
          {record.creator_store && <span className="text-gray-400 ml-2">({record.creator_store})</span>}
          {record.creator_app_number && <span className="text-gray-400 ml-2">#{record.creator_app_number}</span>}
        </div>

        {/* 交辦者 */}
        {record.assignee_name && (
          <div className="text-sm">
            <span className="text-gray-500">交辦給：</span>
            <span className="font-medium">{record.assignee_name}</span>
            {record.assignee_store && <span className="text-gray-400 ml-2">({record.assignee_store})</span>}
            {record.assigned_at && (
              <span className="text-gray-400 ml-2">
                {new Date(record.assigned_at).toLocaleString('zh-TW')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 關聯者 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">關聯者</h3>
          {record.status !== 'closed' && (
            <button
              onClick={() => setShowRelationForm(!showRelationForm)}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              + 新增關聯者
            </button>
          )}
        </div>

        {record.relations?.length === 0 && (
          <p className="text-gray-400 text-sm">尚無關聯者</p>
        )}

        {record.relations?.map((rel: any) => (
          <div key={rel.id} className="flex items-start justify-between bg-gray-50 rounded p-3">
            <div>
              <span className="font-medium text-sm">{rel.employee_name}</span>
              {rel.employee_app_number && <span className="text-xs text-gray-400 ml-2">#{rel.employee_app_number}</span>}
              {rel.employee_store && <span className="text-xs text-gray-400 ml-2">({rel.employee_store})</span>}
              <p className="text-xs text-gray-500 mt-0.5">關聯原因：{rel.relation_reason}</p>
              <p className="text-xs text-gray-400">{new Date(rel.created_at).toLocaleString('zh-TW')}</p>
            </div>
            {record.status !== 'closed' && (
              <button
                onClick={() => handleRemoveRelation(rel.id)}
                className="text-xs text-red-400 hover:text-red-600 ml-4 shrink-0"
              >
                移除
              </button>
            )}
          </div>
        ))}

        {showRelationForm && (
          <div className="border rounded p-3 space-y-2 bg-blue-50">
            <p className="text-xs font-medium text-gray-600">新增關聯者</p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newRelation.employee_id}
                onChange={e => {
                  const emp = employees.find(em => em.id === e.target.value);
                  if (emp) {
                    setNewRelation(prev => ({
                      ...prev,
                      employee_id: emp.id,
                      employee_name: emp.name,
                      employee_app_number: emp.app_number || '',
                      employee_store: emp.store_name || '',
                    }));
                  }
                }}
                className="px-2 py-1.5 border rounded text-sm"
              >
                <option value="">選擇員工</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{emp.store_name ? ` (${emp.store_name})` : ''}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="關聯原因（必填）"
                value={newRelation.relation_reason}
                onChange={e => setNewRelation(prev => ({ ...prev, relation_reason: e.target.value }))}
                className="px-2 py-1.5 border rounded text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddRelation}
                disabled={addingRelation || !newRelation.employee_name || !newRelation.relation_reason}
                className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-40"
              >
                {addingRelation ? '新增中...' : '確定新增'}
              </button>
              <button
                onClick={() => { setShowRelationForm(false); setNewRelation({ employee_id: '', employee_name: '', employee_app_number: '', employee_store: '', relation_reason: '' }); }}
                className="px-3 py-1.5 border rounded text-sm text-gray-600"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 流程操作 */}
      {record.status !== 'closed' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">流程操作</h3>

          {/* 標記處理完成（open 狀態） */}
          {record.status === 'open' && (
            <div>
              {!showResolveForm ? (
                <button
                  onClick={() => setShowResolveForm(true)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                >
                  ✓ 標記處理完成
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">處理完成說明（必填）</p>
                  <textarea
                    value={resolveDetail}
                    onChange={e => setResolveDetail(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="請說明如何處理此案件..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleResolve}
                      disabled={resolvingLoading || !resolveDetail.trim()}
                      className="px-4 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-40"
                    >
                      {resolvingLoading ? '處理中...' : '確定完成'}
                    </button>
                    <button onClick={() => setShowResolveForm(false)} className="px-4 py-2 border rounded text-sm text-gray-600">取消</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 處理完成詳情顯示 */}
          {record.status === 'resolved' && record.resolve_detail && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
              <p className="font-medium text-green-800 mb-1">已標記處理完成</p>
              <p className="text-green-700">處理說明：{record.resolve_detail}</p>
              <p className="text-green-600 text-xs mt-1">
                {record.resolved_by}｜{record.resolved_at ? new Date(record.resolved_at).toLocaleString('zh-TW') : ''}
              </p>
            </div>
          )}

          {/* 結案（resolved 狀態） */}
          {record.status === 'resolved' && (
            <div>
              {!showCloseForm ? (
                <button
                  onClick={() => setShowCloseForm(true)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                >
                  結案
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">結案說明（必填）</p>
                  <textarea
                    value={closeNote}
                    onChange={e => setCloseNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="請填寫結案說明..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleClose}
                      disabled={closingLoading || !closeNote.trim()}
                      className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-40"
                    >
                      {closingLoading ? '結案中...' : '確定結案'}
                    </button>
                    <button onClick={() => setShowCloseForm(false)} className="px-4 py-2 border rounded text-sm text-gray-600">取消</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 已結案摘要 */}
      {record.status === 'closed' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-3 text-sm">
          <p className="font-semibold text-gray-700">結案資訊</p>
          {record.resolve_detail && (
            <div>
              <span className="text-gray-500">處理說明：</span>
              <span>{record.resolve_detail}</span>
              <span className="text-gray-400 ml-2">— {record.resolved_by}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">結案說明：</span>
            <span>{record.close_note}</span>
            <span className="text-gray-400 ml-2">— {record.closed_by}</span>
          </div>
          {record.closed_at && (
            <div className="text-gray-400 text-xs">結案時間：{new Date(record.closed_at).toLocaleString('zh-TW')}</div>
          )}
        </div>
      )}

      {/* 新增備註 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h3 className="font-semibold text-gray-700">新增備註</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            placeholder="新增備註或處理說明..."
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !newNote.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-40"
          >
            {addingNote ? '新增中...' : '新增'}
          </button>
        </div>
      </div>

      {/* 處理日誌 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h3 className="font-semibold text-gray-700">處理紀錄</h3>
        {(!record.logs || record.logs.length === 0) ? (
          <p className="text-gray-400 text-sm">尚無處理紀錄</p>
        ) : (
          <div className="space-y-2">
            {record.logs.map((log: any) => (
              <div key={log.id} className={`flex gap-3 text-sm ${log.log_type === 'system' ? 'opacity-60' : ''}`}>
                <div className="text-gray-400 text-xs pt-0.5 shrink-0 w-32">
                  {new Date(log.created_at).toLocaleString('zh-TW')}
                </div>
                <div className="flex-1">
                  {log.log_type !== 'note' && (
                    <span className="text-xs bg-gray-100 text-gray-500 rounded px-1 py-0.5 mr-2">
                      {LOG_TYPE_LABELS[log.log_type] || log.log_type}
                    </span>
                  )}
                  <span className="text-gray-700 whitespace-pre-wrap">{log.content}</span>
                  {log.created_by && log.created_by !== 'system' && (
                    <span className="text-gray-400 ml-2">— {log.created_by}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRecordDetailPage;
