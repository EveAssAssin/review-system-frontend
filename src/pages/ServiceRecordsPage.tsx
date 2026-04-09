import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { serviceRecordsApi } from '../services/api';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  complaint: '投訴',
  suggestion: '建議',
  inquiry: '詢問',
  maintenance: '維修',
  other: '其他',
};

const HANDLING_METHOD_LABELS: Record<string, string> = {
  phone: '電話',
  in_store: '到店',
  online: '線上',
  other: '其他',
};

const STATUS_LABELS: Record<string, string> = {
  open: '處理中',
  resolved: '已處理',
  closed: '已結案',
};

const ServiceRecordsPage: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    service_type: '',
    keyword: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (filters.status) params.status = filters.status;
      if (filters.service_type) params.service_type = filters.service_type;
      if (filters.keyword) params.keyword = filters.keyword;

      const [listRes, statsRes] = await Promise.all([
        serviceRecordsApi.search(params),
        serviceRecordsApi.getStats(),
      ]);
      setRecords(listRes.data.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch service records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint': return 'bg-red-100 text-red-800';
      case 'suggestion': return 'bg-blue-100 text-blue-800';
      case 'inquiry': return 'bg-purple-100 text-purple-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">客服紀錄</h2>
        <Link
          to="/service-records/new"
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          新增客服紀錄
        </Link>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-gray-800">{stats.total || 0}</div>
            <div className="text-sm text-gray-500 mt-1">總計</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{stats.open || 0}</div>
            <div className="text-sm text-gray-500 mt-1">處理中</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{stats.resolved || 0}</div>
            <div className="text-sm text-gray-500 mt-1">已處理</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-gray-400">{stats.closed || 0}</div>
            <div className="text-sm text-gray-500 mt-1">已結案</div>
          </div>
        </div>
      )}

      {/* 篩選 */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="搜尋客戶姓名、電話、內容..."
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          className="px-3 py-2 border rounded flex-1 min-w-40"
        />
        <select
          value={filters.service_type}
          onChange={(e) => setFilters({ ...filters, service_type: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有類型</option>
          <option value="complaint">投訴</option>
          <option value="suggestion">建議</option>
          <option value="inquiry">詢問</option>
          <option value="maintenance">維修</option>
          <option value="other">其他</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">所有狀態</option>
          <option value="open">處理中</option>
          <option value="resolved">已處理</option>
          <option value="closed">已結案</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">沒有客服紀錄</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客戶</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">類型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">處理方式</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">狀態</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">建立者</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">交辦給</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">建立時間</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {rec.customer_name || '陌生客'}
                    </div>
                    {rec.customer_mobile && (
                      <div className="text-xs text-gray-400">{rec.customer_mobile}</div>
                    )}
                    {rec.customer_type === 'member' && rec.customer_card && (
                      <div className="text-xs text-blue-400">會員 {rec.customer_card}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getTypeColor(rec.service_type)}`}>
                      {SERVICE_TYPE_LABELS[rec.service_type] || rec.service_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {HANDLING_METHOD_LABELS[rec.handling_method] || rec.handling_method}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(rec.status)}`}>
                      {STATUS_LABELS[rec.status] || rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-700">{rec.creator_name}</div>
                    {rec.creator_store && (
                      <div className="text-xs text-gray-400">{rec.creator_store}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {rec.assignee_name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(rec.created_at).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/service-records/${rec.id}`}
                      className="text-blue-500 hover:underline text-sm"
                    >
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ServiceRecordsPage;
