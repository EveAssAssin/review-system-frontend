import React, { useEffect, useState } from 'react';
import { alertsApi } from '../services/api';
import { AlertRule, Manager } from '../types';

const AlertsPage: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    threshold: 3,
    period_days: 90,
    notify_employee: true,
    notify_managers: true,
    message_template: '',
  });

  const [managerForm, setManagerForm] = useState({
    name: '',
    line_uid: '',
    notification_enabled: true,
  });

  const fetchData = async () => {
    try {
      const [rulesRes, managersRes] = await Promise.all([
        alertsApi.getRules(),
        alertsApi.getManagers(),
      ]);
      setRules(rulesRes.data);
      setManagers(managersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 警示規則操作
  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await alertsApi.updateRule(editingRule.id, ruleForm);
      } else {
        await alertsApi.createRule(ruleForm);
      }
      setShowRuleModal(false);
      setEditingRule(null);
      resetRuleForm();
      fetchData();
    } catch (error) {
      alert('儲存失敗');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('確定要刪除此規則嗎？')) return;
    try {
      await alertsApi.deleteRule(id);
      fetchData();
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const openEditRule = (rule: AlertRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      threshold: rule.threshold,
      period_days: rule.period_days,
      notify_employee: rule.notify_employee,
      notify_managers: rule.notify_managers,
      message_template: rule.message_template || '',
    });
    setShowRuleModal(true);
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      description: '',
      threshold: 3,
      period_days: 90,
      notify_employee: true,
      notify_managers: true,
      message_template: '',
    });
  };

  // 主管操作
  const handleSaveManager = async () => {
    try {
      if (editingManager) {
        await alertsApi.updateManager(editingManager.id, managerForm);
      } else {
        await alertsApi.createManager(managerForm);
      }
      setShowManagerModal(false);
      setEditingManager(null);
      resetManagerForm();
      fetchData();
    } catch (error) {
      alert('儲存失敗');
    }
  };

  const handleDeleteManager = async (id: string) => {
    if (!confirm('確定要刪除此主管嗎？')) return;
    try {
      await alertsApi.deleteManager(id);
      fetchData();
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const openEditManager = (manager: Manager) => {
    setEditingManager(manager);
    setManagerForm({
      name: manager.name,
      line_uid: manager.line_uid || '',
      notification_enabled: manager.notification_enabled,
    });
    setShowManagerModal(true);
  };

  const resetManagerForm = () => {
    setManagerForm({
      name: '',
      line_uid: '',
      notification_enabled: true,
    });
  };

  if (loading) {
    return <div className="text-center py-8">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">警示設定</h2>

      {/* 警示規則 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">警示規則</h3>
          <button
            onClick={() => {
              resetRuleForm();
              setEditingRule(null);
              setShowRuleModal(true);
            }}
            className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded"
          >
            新增規則
          </button>
        </div>
        <div className="divide-y">
          {rules.length === 0 ? (
            <div className="p-6 text-center text-gray-500">尚無警示規則</div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="p-6 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.is_active ? '啟用' : '停用'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {rule.period_days} 天內累積 {rule.threshold} 則負評觸發警示
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditRule(rule)}
                    className="px-3 py-1 text-[#8b6f4e] hover:bg-[#f5f0eb] rounded"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 主管名單 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">主管名單</h3>
          <button
            onClick={() => {
              resetManagerForm();
              setEditingManager(null);
              setShowManagerModal(true);
            }}
            className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded"
          >
            新增主管
          </button>
        </div>
        <div className="divide-y">
          {managers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">尚無主管</div>
          ) : (
            managers.map((manager) => (
              <div key={manager.id} className="p-6 flex justify-between items-center">
                <div>
                  <span className="font-medium">{manager.name}</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${manager.notification_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {manager.notification_enabled ? '接收通知' : '不接收通知'}
                  </span>
                  {manager.line_uid && (
                    <span className="ml-2 text-sm text-gray-500">LINE: {manager.line_uid.slice(0, 10)}...</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditManager(manager)}
                    className="px-3 py-1 text-[#8b6f4e] hover:bg-[#f5f0eb] rounded"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDeleteManager(manager.id)}
                    className="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 規則 Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingRule ? '編輯規則' : '新增規則'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名稱</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">說明</label>
                <input
                  type="text"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">累積則數</label>
                  <input
                    type="number"
                    value={ruleForm.threshold}
                    onChange={(e) => setRuleForm({ ...ruleForm, threshold: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">期間（天）</label>
                  <input
                    type="number"
                    value={ruleForm.period_days}
                    onChange={(e) => setRuleForm({ ...ruleForm, period_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={ruleForm.notify_employee}
                    onChange={(e) => setRuleForm({ ...ruleForm, notify_employee: e.target.checked })}
                    className="mr-2"
                  />
                  通知員工本人
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={ruleForm.notify_managers}
                    onChange={(e) => setRuleForm({ ...ruleForm, notify_managers: e.target.checked })}
                    className="mr-2"
                  />
                  通知主管
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">通知訊息範本</label>
                <textarea
                  value={ruleForm.message_template}
                  onChange={(e) => setRuleForm({ ...ruleForm, message_template: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="可用變數：{{employee_name}}, {{period_days}}, {{count}}"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主管 Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingManager ? '編輯主管' : '新增主管'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">姓名</label>
                <input
                  type="text"
                  value={managerForm.name}
                  onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">LINE UID</label>
                <input
                  type="text"
                  value={managerForm.line_uid}
                  onChange={(e) => setManagerForm({ ...managerForm, line_uid: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={managerForm.notification_enabled}
                  onChange={(e) => setManagerForm({ ...managerForm, notification_enabled: e.target.checked })}
                  className="mr-2"
                />
                接收通知
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowManagerModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                取消
              </button>
              <button
                onClick={handleSaveManager}
                className="px-4 py-2 bg-[#8b6f4e] hover:bg-[#7a6040] text-white rounded"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
