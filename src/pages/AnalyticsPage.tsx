import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '../services/api';

// ── 色票 ──────────────────────────────────────────────────────────────────
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

const TYPE_ZH: Record<string, string> = {
  complaint: '投訴', suggestion: '建議', inquiry: '詢問',
  maintenance: '維修', praise: '稱讚', other: '其他',
};
const STATUS_ZH: Record<string, string> = {
  pending: '待處理', processing: '處理中', open: '未結案',
  resolved: '已處理', responded: '已回覆', closed: '已結案',
};
const METHOD_ZH: Record<string, string> = {
  phone: '電話', in_store: '到店', online: '線上', other: '其他',
};

// ── 小工具 ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = 'text-gray-800' }: any) => (
  <div className="bg-white rounded-lg shadow p-4 text-center">
    <div className={`text-3xl font-bold ${color}`}>{value ?? '—'}</div>
    <div className="text-sm text-gray-500 mt-1">{label}</div>
  </div>
);

const Section = ({ title, children }: any) => (
  <div className="bg-white rounded-lg shadow p-6 space-y-4">
    <h3 className="font-semibold text-gray-700 text-lg border-b pb-2">{title}</h3>
    {children}
  </div>
);

const mapToChartData = (obj: Record<string, number>, labelMap?: Record<string, string>) =>
  Object.entries(obj || {}).map(([key, value]) => ({
    name: labelMap?.[key] || key,
    value,
  }));

// ── 主頁面 ────────────────────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setSuggestions('');
    setAiError('');
    try {
      const res = await analyticsApi.getSummary(from, to);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleAiAnalyze = async () => {
    if (!summary) return;
    setAiLoading(true);
    setAiError('');
    setSuggestions('');
    try {
      const res = await analyticsApi.getAiSuggestions(summary);
      setSuggestions(res.data.suggestions);
    } catch {
      setAiError('AI 分析失敗，請稍後再試');
    } finally {
      setAiLoading(false);
    }
  };

  const fb = summary?.feedbacks;
  const sr = summary?.service_records;
  const comb = summary?.combined;

  return (
    <div className="space-y-6">
      {/* 標題 + 日期篩選 */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <h2 className="text-2xl font-bold">客服分析</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">起始日期</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">結束日期</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="px-3 py-2 border rounded text-sm" />
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            {loading ? '載入中...' : '查詢'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-20 text-center text-gray-400">統計資料載入中...</div>
      )}

      {!loading && summary && (
        <>
          {/* 綜合統計卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="客戶回報總計" value={fb?.total} color="text-blue-600" />
            <StatCard label="客服紀錄總計" value={sr?.total} color="text-purple-600" />
            <StatCard label="未處理案件" value={comb?.total_unresolved} color="text-red-500" />
            <StatCard label="投訴率" value={`${comb?.complaint_rate_pct ?? 0}%`} color={comb?.complaint_rate_pct > 20 ? 'text-red-500' : 'text-green-600'} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="緊急待處理回報" value={fb?.urgent_pending} color={fb?.urgent_pending > 0 ? 'text-red-500' : 'text-gray-400'} />
            <StatCard label="客服平均解決時間" value={sr?.avg_resolution_hours ? `${sr.avg_resolution_hours}h` : '—'} />
            <StatCard label="投訴件數（回報）" value={fb?.by_type?.complaint ?? 0} color="text-orange-500" />
            <StatCard label="投訴件數（客服）" value={sr?.by_type?.complaint ?? 0} color="text-orange-500" />
          </div>

          {/* 每日趨勢折線圖 */}
          {comb?.by_day?.length > 0 && (
            <Section title="每日案件趨勢（客戶回報 + 客服紀錄合計）">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={comb.by_day}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="案件數" />
                </LineChart>
              </ResponsiveContainer>
            </Section>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* 客戶回報 - 類型分布 */}
            {fb?.by_type && Object.keys(fb.by_type).length > 0 && (
              <Section title="客戶回報 — 類型分布">
                <div className="flex gap-6 items-center">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={mapToChartData(fb.by_type, TYPE_ZH)} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false} fontSize={11}>
                        {mapToChartData(fb.by_type, TYPE_ZH).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 text-sm">
                    {mapToChartData(fb.by_type, TYPE_ZH).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{item.name}：{item.value} 筆</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* 客服紀錄 - 類型分布 */}
            {sr?.by_type && Object.keys(sr.by_type).length > 0 && (
              <Section title="客服紀錄 — 類型分布">
                <div className="flex gap-6 items-center">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={mapToChartData(sr.by_type, TYPE_ZH)} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false} fontSize={11}>
                        {mapToChartData(sr.by_type, TYPE_ZH).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 text-sm">
                    {mapToChartData(sr.by_type, TYPE_ZH).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{item.name}：{item.value} 筆</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* 客戶回報 - 狀態分布 */}
            {fb?.by_status && Object.keys(fb.by_status).length > 0 && (
              <Section title="客戶回報 — 狀態分布">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={mapToChartData(fb.by_status, STATUS_ZH)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="筆數" fill="#3B82F6" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {/* 客服紀錄 - 處理方式 */}
            {sr?.by_method && Object.keys(sr.by_method).length > 0 && (
              <Section title="客服紀錄 — 處理方式">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={mapToChartData(sr.by_method, METHOD_ZH)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="筆數" fill="#8B5CF6" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}
          </div>

          {/* 客服人員效率排行（回報建立者） */}
          {fb?.top_creators?.length > 0 && (
            <Section title="客戶回報建立者排行">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fb.top_creators.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="建立件數" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}

          {/* 客服紀錄建立者排行 */}
          {sr?.top_creators?.length > 0 && (
            <Section title="客服紀錄建立者排行（效率追蹤）">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sr.top_creators.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="建立件數" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}

          {/* AI 分析建議 */}
          <Section title="🤖 AI 客服優化建議">
            {!suggestions && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  點擊下方按鈕，AI 將根據本期數據自動生成改善建議。
                </p>
                <button
                  onClick={handleAiAnalyze}
                  disabled={aiLoading}
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {aiLoading ? '🤔 AI 分析中...' : '✨ 開始 AI 分析'}
                </button>
                {aiError && <p className="text-red-500 text-sm">{aiError}</p>}
              </div>
            )}

            {suggestions && (
              <div className="space-y-3">
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                    {suggestions}
                  </pre>
                </div>
                <button
                  onClick={handleAiAnalyze}
                  disabled={aiLoading}
                  className="px-4 py-1.5 border border-purple-300 text-purple-600 rounded text-sm hover:bg-purple-50 disabled:opacity-50"
                >
                  {aiLoading ? '重新分析中...' : '🔄 重新分析'}
                </button>
              </div>
            )}
          </Section>
        </>
      )}

      {!loading && !summary && (
        <div className="py-20 text-center text-gray-400">點擊「查詢」載入統計資料</div>
      )}
    </div>
  );
};

export default AnalyticsPage;
