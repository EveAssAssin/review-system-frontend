import React, { useEffect, useState, useCallback } from 'react';
import { demeritApi } from '../api/demerit';
import { useAuth } from '../contexts/AuthContext';

interface SummaryRow {
  target_app_number: string;
  target_employee_id?: number;
  employee_name?: string;
  category_id: string;
  category_name: string;
  threshold: number;
  category_is_active: boolean;
  total_points: number;
  record_count: number;
  threshold_reached: boolean;
  last_recorded_at: string;
}

interface PersonCard {
  app_number: string;
  name: string;
  totalPoints: number;
  reachedCount: number;
  rows: SummaryRow[];
}

const DemeritSummaryPage: React.FC = () => {
  const { employee, canManageReviews } = useAuth();
  const [allRows, setAllRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 部員只看自己；主管看全員
      const appNumber = canManageReviews ? undefined : employee?.app_number;
      const res = await demeritApi.getSummary(appNumber);
      setAllRows(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [canManageReviews, employee]);

  useEffect(() => { load(); }, [load]);

  // 依人員聚合
  const persons: PersonCard[] = React.useMemo(() => {
    const map = new Map<string, PersonCard>();
    for (const row of allRows) {
      const key = row.target_app_number;
      if (!map.has(key)) {
        map.set(key, {
          app_number: key,
          name: row.employee_name || key,
          totalPoints: 0,
          reachedCount: 0,
          rows: [],
        });
      }
      const card = map.get(key)!;
      card.totalPoints += row.total_points;
      if (row.threshold_reached) card.reachedCount += 1;
      card.rows.push(row);
    }
    // 排序：總分高者在前
    return Array.from(map.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [allRows]);

  // 搜尋過濾
  const filtered = keyword.trim()
    ? persons.filter(p =>
        p.name.includes(keyword) || p.app_number.includes(keyword)
      )
    : persons;

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">扣分總表</h2>
        {canManageReviews && (
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜尋姓名或編號..."
            className="px-3 py-2 border rounded-lg text-sm w-52"
          />
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {keyword ? '查無符合人員' : '目前沒有任何扣分紀錄'}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(person => (
            <div key={person.app_number} className="bg-white rounded-xl shadow overflow-hidden">
              {/* 人員標題列 */}
              <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ backgroundColor: '#f5f0eb' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: '#8b6f4e', color: '#fff' }}
                  >
                    {(person.name?.[0] || '?')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{person.name}</p>
                    <p className="text-xs text-gray-500">編號：{person.app_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">
                    累計 <span className="text-red-600 text-lg">{person.totalPoints}</span> 分
                  </span>
                  {person.reachedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      {person.reachedCount} 項達標
                    </span>
                  )}
                </div>
              </div>

              {/* 品項明細 */}
              <div className="divide-y text-sm">
                {person.rows.map(row => {
                  const pct = Math.min(100, Math.round((row.total_points / row.threshold) * 100));
                  return (
                    <div key={row.category_id} className="px-4 py-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{row.category_name}</span>
                          {!row.category_is_active && (
                            <span className="text-xs text-gray-400">（已停用）</span>
                          )}
                          {row.threshold_reached && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                              達標
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{row.total_points} / {row.threshold} 次</span>
                          <span>最近：{formatDate(row.last_recorded_at)}</span>
                        </div>
                      </div>
                      {/* 進度條 */}
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: row.threshold_reached ? '#ef4444' : '#f97316',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DemeritSummaryPage;
