import React, { useEffect, useState, useCallback } from 'react';
import { serviceEvaluationApi, settingsApi } from '../services/api';
import type { ServiceEvalScoringSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import type { ServiceEvaluation, ServiceEvaluationOverviewRow } from '../types';

// ── 評分公式（與後端 service-evaluation.service.ts computeScore 一致）──
const EVAL = { REVIEW_RATE_MAX: 60, PROCESS_MAX: 20, PHONE_MAX: 20, DEDUCT: 5, NEW_PASS: 90 };

function computeScore(e: {
  glasses_count: number;
  website_review_count: number;
  negative_review_count: number;
  google_low_star_count: number;
  service_process_score: number;
  phone_survey_score: number;
}) {
  const reviewRate = e.glasses_count > 0 ? (e.website_review_count / e.glasses_count) * 100 : 0;
  const reviewRateScore = Math.min(EVAL.REVIEW_RATE_MAX, Math.max(0, reviewRate));
  const processScore = Math.min(EVAL.PROCESS_MAX, Math.max(0, e.service_process_score || 0));
  const phoneScore = Math.min(EVAL.PHONE_MAX, Math.max(0, e.phone_survey_score || 0));
  const deduction = (Math.max(0, e.google_low_star_count || 0) + Math.max(0, e.negative_review_count || 0)) * EVAL.DEDUCT;
  const total = Math.min(100, Math.max(0, Math.round(reviewRateScore + processScore + phoneScore - deduction)));
  return {
    review_rate: Math.round(reviewRate * 10) / 10,
    review_rate_score: Math.round(reviewRateScore * 10) / 10,
    process_score: processScore,
    phone_score: phoneScore,
    deduction,
    total,
  };
}

const scoreColor = (total: number) =>
  total >= 80 ? '#16a34a' : total >= 60 ? '#8b6f4e' : total >= 40 ? '#d97706' : '#dc2626';

// 取得目前年月 YYYY-MM
const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const ServiceEvaluationPage: React.FC = () => {
  const { user } = useAuth();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [rows, setRows] = useState<ServiceEvaluationOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceEvaluation | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [savingProcessId, setSavingProcessId] = useState<string | null>(null);
  const [phoneSurveyFor, setPhoneSurveyFor] = useState<ServiceEvaluation | null>(null);

  const handleInlineProcessSave = async (id: string, value: number) => {
    setSavingProcessId(id);
    try {
      await serviceEvaluationApi.update(id, { service_process_score: value });
      await serviceEvaluationApi.recalc(id);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || '儲存失敗');
    } finally {
      setSavingProcessId(null);
    }
  }; // employee_id 建立中
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    updated: { employee_name: string; erpid: string; glasses_count: number }[];
    evaluations_without_orders: string[];
    order_names_without_evaluation: { sale_op_id: string; employee_name: string; customers: number }[];
    total_order_customers: number;
  } | null>(null);
  const [reviewSyncing, setReviewSyncing] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [locking, setLocking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await serviceEvaluationApi.overview(yearMonth);
      setRows(res.data);
    } catch (err) {
      console.error('載入服務評鑑失敗:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (employeeId: string) => {
    setCreatingFor(employeeId);
    try {
      const res = await serviceEvaluationApi.create({ employee_id: employeeId, year_month: yearMonth }, user?.name);
      await load();
      setEditing(res.data); // 建立後直接開編輯
    } catch (err: any) {
      alert(err?.response?.data?.message || '建立失敗');
    } finally {
      setCreatingFor(null);
    }
  };

  const handleSyncGlasses = async () => {
    if (!confirm(`確定要同步 ${yearMonth} 的配鏡數？\n會從 E0123 抓取整月主力眼鏡訂單（約需 30~60 秒），依 erpid 比對更新各人員配鏡數。`)) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await serviceEvaluationApi.syncGlasses(yearMonth);
      setSyncResult(res.data);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || '同步失敗，請稍後再試');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncWebsiteReviews = async () => {
    if (!confirm(`確定要同步 ${yearMonth} 的官網新增評價量？\n會以「次月快照 - 本月快照」推算增量；當月則用即時 API。`)) return;
    setReviewSyncing(true);
    setReviewMsg(null);
    try {
      const res = await serviceEvaluationApi.syncWebsiteReviews(yearMonth);
      const d = res.data;
      let msg = `官網評價量同步完成（終值來源：${d.end_source === 'live' ? '即時 API' : '次月快照'}）。成功更新 ${d.updated.length} 位。`;
      if (d.missing_start_snapshot.length > 0) msg += ` ⚠️ 缺本月快照：${d.missing_start_snapshot.join('、')}。`;
      if (d.missing_end_value.length > 0) msg += ` ⚠️ 缺次月快照：${d.missing_end_value.join('、')}。`;
      setReviewMsg(msg);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || '同步失敗');
    } finally {
      setReviewSyncing(false);
    }
  };

  const handleTakeSnapshot = async () => {
    if (!confirm('確定要立即執行官網評價快照？\n會撈所有在職人員目前的官網評價累計數（約需 30~60 秒）。\n系統每月 1 號會自動快照，這裡是手動補拍/初始化用。')) return;
    setSnapshotting(true);
    setReviewMsg(null);
    try {
      const res = await serviceEvaluationApi.takeSnapshot();
      const d = res.data;
      setReviewMsg(`快照完成（${d.snapshot_ym}）：${d.employee_count} 位人員、共 ${d.total_reviews} 則評價。`);
    } catch (err: any) {
      alert(err?.response?.data?.message || '快照失敗');
    } finally {
      setSnapshotting(false);
    }
  };

  const handleOpenMonth = async () => {
    if (!confirm(`確定要開啟 ${yearMonth} 的評鑑？\n會為「評鑑名單」內、尚未建立評鑑的人員自動建立評鑑。`)) return;
    setOpening(true);
    try {
      const res = await serviceEvaluationApi.openMonth(yearMonth, user?.name);
      const d = res.data;
      setReviewMsg(`已開啟 ${d.year_month} 評鑑：名單 ${d.roster_count} 人，新建 ${d.created} 筆，略過 ${d.skipped} 筆。`);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || '開啟失敗');
    } finally {
      setOpening(false);
    }
  };

  const [syncMarketMsg, setSyncMarketMsg] = useState<string | null>(null);
  const handleSyncMarket = async () => {
    if (!confirm(`要同步 ${yearMonth} 整月的市場部電訪審核結果嗎？`)) return;
    try {
      const res = await serviceEvaluationApi.syncMarketAudits(yearMonth);
      const r = res.data;
      setSyncMarketMsg(`市場部同步：抓 ${r.fetched} 筆、對到員工 ${r.matched}、更新 ${r.updated} 筆評鑑；找不到員工 ${r.missing?.length || 0} 人${r.missing?.length ? '：' + r.missing.join('、') : ''}`);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || '市場部同步失敗');
    }
  };

  const handleLockToggle = async () => {
    const isLocked = rows.some(r => r.evaluation?.is_locked);
    const action = isLocked ? '解鎖' : '鎖定';
    const extra = isLocked ? '\n解鎖後即可再次編輯。' : '\n鎖定後該月分數即定案、不能再修改（仍可再解鎖）。';
    if (!confirm(`確定要${action} ${yearMonth} 的所有評鑑？${extra}`)) return;
    setLocking(true);
    try {
      if (isLocked) {
        const res = await serviceEvaluationApi.unlockMonth(yearMonth);
        setReviewMsg(`已解鎖 ${yearMonth}：${res.data.unlocked} 筆。`);
      } else {
        const res = await serviceEvaluationApi.lockMonth(yearMonth, user?.name);
        setReviewMsg(`已鎖定 ${yearMonth}：${res.data.locked} 筆，分數已定案保存。`);
      }
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || `${action}失敗`);
    } finally {
      setLocking(false);
    }
  };

  const evaluatedCount = rows.filter(r => r.evaluation).length;
  const monthLocked = rows.some(r => r.evaluation?.is_locked);
  const avgScore = evaluatedCount > 0
    ? Math.round(rows.filter(r => r.evaluation).reduce((sum, r) => sum + (r.evaluation!.score?.total || 0), 0) / evaluatedCount)
    : 0;

  return (
    <div className="space-y-6">
      <ScoringSettingsPanel isSuperAdmin={user?.role === 'super_admin'} />
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold">服務評鑑</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">評鑑月份</label>
          <input
            type="month"
            value={yearMonth}
            onChange={e => setYearMonth(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <button
            onClick={handleSyncGlasses}
            disabled={syncing}
            className="px-4 py-2 text-sm text-white rounded disabled:opacity-50"
            style={{ backgroundColor: '#5b7fad' }}>
            {syncing ? '同步中...（約 30~60 秒）' : '🔄 同步配鏡數'}
          </button>
          <button
            onClick={handleSyncWebsiteReviews}
            disabled={reviewSyncing}
            className="px-4 py-2 text-sm text-white rounded disabled:opacity-50"
            style={{ backgroundColor: '#5b7fad' }}>
            {reviewSyncing ? '同步中...' : '🔄 同步官網評價量'}
          </button>
          <button
            onClick={handleTakeSnapshot}
            disabled={snapshotting}
            className="px-4 py-2 text-sm border rounded disabled:opacity-50"
            title="系統每月 1 號自動快照，這裡是手動補拍/初始化用">
            {snapshotting ? '快照中...' : '📸 立即快照'}
          </button>
          <button
            onClick={handleOpenMonth}
            disabled={opening}
            className="px-4 py-2 text-sm text-white rounded disabled:opacity-50"
            style={{ backgroundColor: '#8b6f4e' }}>
            {opening ? '開啟中...' : '＋ 開啟本月評鑑'}
          </button>
          <button
            onClick={handleSyncMarket}
            className="px-3 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-700 text-white"
            title="同步市場部電訪審核（第三項 30 分）"
          >
            🛒 同步市場部
          </button>
          <button
            onClick={handleLockToggle}
            disabled={locking}
            className="px-4 py-2 text-sm border rounded disabled:opacity-50"
            style={monthLocked ? { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' } : {}}>
            {locking ? '處理中...' : monthLocked ? '🔓 解鎖本月' : '🔒 鎖定本月'}
          </button>
        </div>
      </div>

      {/* 官網評價量同步訊息 */}
      {reviewMsg && (
        <div className="bg-white rounded-lg shadow p-4 text-sm flex items-start justify-between gap-3">
          <span className="text-gray-700">{reviewMsg}</span>
          <button onClick={() => setReviewMsg(null)} className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0">關閉 ✕</button>
        </div>
      )}

        {syncMarketMsg && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded flex items-start justify-between text-sm text-amber-900">
            <div className="whitespace-pre-wrap flex-1 mr-3">{syncMarketMsg}</div>
            <button onClick={() => setSyncMarketMsg(null)} className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0">關閉 ✕</button>
          </div>
        )}

      {/* 同步結果 */}
      {syncResult && (
        <div className="bg-white rounded-lg shadow p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#8b6f4e]">配鏡數同步結果</span>
            <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600 text-xs">關閉 ✕</button>
          </div>
          <div className="text-gray-600">
            E0123 整月主力眼鏡共 <strong>{syncResult.total_order_customers}</strong> 張；
            成功更新 <strong className="text-green-600">{syncResult.updated.length}</strong> 位人員的配鏡數。
          </div>
          {syncResult.evaluations_without_orders.length > 0 && (
            <div className="text-orange-600 text-xs">
              ⚠️ 有評鑑但訂單對不到（erpid 無主力眼鏡訂單）：
              {syncResult.evaluations_without_orders.join('、')}
            </div>
          )}
          {syncResult.order_names_without_evaluation.length > 0 && (
            <div className="text-gray-500 text-xs">
              ℹ️ 有主力眼鏡訂單但尚未建立評鑑：
              {syncResult.order_names_without_evaluation
                .map(o => `${o.employee_name || '(未填名)'}[${o.sale_op_id}]×${o.customers}`)
                .join('、')}
            </div>
          )}
        </div>
      )}

      {/* 統計卡 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-[#8b6f4e]">{rows.length}</div>
          <div className="text-gray-500 text-sm">評鑑名單</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold text-green-600">{evaluatedCount}</div>
          <div className="text-gray-500 text-sm">已評鑑</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-2xl font-bold" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
          <div className="text-gray-500 text-sm">平均分數</div>
        </div>
      </div>

      {/* 公式說明 */}
      <div className="bg-[#faf9f6] border rounded-lg p-3 text-xs text-gray-600" style={{ borderColor: '#ede8e2' }}>
        <span className="font-semibold">評分公式：</span>
        人員評論率（官網評價數 ÷ 配鏡數 × 100，1%=1分，上限 60）
        ＋ 服務流程分數（上限 20）＋ 電訪好評數（上限 20）
        － google 2星以下 ×5 － 評價負評 ×5　＝　總分（0~100）
      </div>

      {monthLocked && (
        <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
          🔒 {yearMonth} 評鑑已鎖定（月結算定案），分數已保存。需修改請按上方「🔓 解鎖本月」。
        </div>
      )}

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            尚無評鑑名單。請到「員工列表」把要評鑑的人員「需評鑑」開關打開，再回此頁按「開啟本月評鑑」。
          </div>
        ) : (
          <table className="w-full min-w-[820px]">
            <thead className="bg-[#f9f6f2]">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">員工</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">配鏡數</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">評論率</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">服務流程</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">電訪好評</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">扣分</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">總分(舊)</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">新公式</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(row => {
                const ev = row.evaluation;
                const sc = ev?.score;
                return (
                  <tr key={row.employee.id} className="hover:bg-[#f9f6f2]">
                    <td className="px-3 py-3">
                      <div className="font-medium">{row.employee.name}</div>
                      <div className="text-xs text-gray-400">{row.employee.store_name || row.employee.department || '-'}</div>
                    </td>
                    {ev ? (
                      <>
                        <td className="px-3 py-3 text-center text-sm">{ev.glasses_count}</td>
                        <td
                          className="px-3 py-3 text-center text-sm cursor-help"
                          title={`本月新增 ${ev.website_review_count} 則 / 累計 ${ev.cumulative_review_count ?? 0} 則`}
                        >
                          {sc?.review_rate}%
                          <div className="text-xs text-gray-400">
                            {ev.website_review_count}/{ev.cumulative_review_count ?? 0}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm">
                          {ev.is_locked ? (
                            ev.service_process_score
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={EVAL.PROCESS_MAX}
                              step={1}
                              defaultValue={ev.service_process_score}
                              disabled={savingProcessId === ev.id}
                              onBlur={(e) => {
                                const v = Math.max(0, Math.min(EVAL.PROCESS_MAX, Number(e.currentTarget.value) || 0));
                                if (v !== ev.service_process_score) handleInlineProcessSave(ev.id, v);
                                else e.currentTarget.value = String(ev.service_process_score);
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
                              className="w-16 text-center border rounded px-1 py-0.5 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#8b6f4e]"
                              title={`0~${EVAL.PROCESS_MAX} 分，按 Enter 或失焦自動存檔`}
                            />
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-sm">
                          <button
                            type="button"
                            onClick={() => setPhoneSurveyFor(ev)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#f5f0eb] focus:outline-none"
                            title="點擊上傳錄音 / 編輯分數"
                          >
                            <span className="font-medium">{ev.phone_survey_score}</span>
                            {ev.phone_survey_audio_url ? (
                              <span className="text-xs" title="已上傳錄音">🎧</span>
                            ) : (
                              <span className="text-xs text-gray-400" title="尚未上傳錄音">📁</span>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-red-600">
                          -{sc?.deduction}
                          <div className="text-xs text-gray-400">低星{ev.google_low_star_count}/負評{ev.negative_review_count}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-lg font-bold" style={{ color: scoreColor(sc?.total || 0) }}>
                            {sc?.total}
                          </span>
                          {ev.is_locked && <span title="已鎖定" className="ml-1">🔒</span>}
                        </td>
                        <td className="px-3 py-3 text-center" title={`截圖 ${sc?.new_screenshot_score ?? 0} / 負評處理 ${sc?.new_negative_score ?? 0} / 市場部 ${sc?.new_market_score ?? 0}`}>
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-bold" style={{ color: (sc?.new_total || 0) >= EVAL.NEW_PASS ? '#16a34a' : '#dc2626' }}>
                              {sc?.new_total ?? 0}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 ${sc?.new_passed ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {sc?.new_passed ? '✓ 通過' : '✗ 未通過'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setEditing(ev)}
                            className="text-[#8b6f4e] hover:underline text-sm">
                            {ev.is_locked ? '檢視' : '編輯'}
                          </button>
                        </td>
                      </>
                    ) : (
                      <td colSpan={8} className="px-3 py-3 text-center">
                        <span className="text-gray-400 text-sm mr-3">尚未評鑑</span>
                        <button
                          onClick={() => handleCreate(row.employee.id)}
                          disabled={creatingFor === row.employee.id}
                          className="px-3 py-1 text-sm text-white rounded disabled:opacity-50"
                          style={{ backgroundColor: '#8b6f4e' }}>
                          {creatingFor === row.employee.id ? '建立中...' : '建立評鑑'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EvaluationEditModal
          evaluation={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {phoneSurveyFor && (
        <PhoneSurveyModal
          evaluation={phoneSurveyFor}
          onClose={() => setPhoneSurveyFor(null)}
          onSaved={() => { setPhoneSurveyFor(null); load(); }}
        />
      )}
    </div>
  );
};

// ── 編輯 Modal ───────────────────────────────────────────
interface EditModalProps {
  evaluation: ServiceEvaluation;
  onClose: () => void;
  onSaved: () => void;
}

const EvaluationEditModal: React.FC<EditModalProps> = ({ evaluation, onClose, onSaved }) => {
  const [form, setForm] = useState({
    glasses_count: evaluation.glasses_count,
    website_review_count: evaluation.website_review_count,
    negative_review_count: evaluation.negative_review_count,
    google_low_star_count: evaluation.google_low_star_count,
    service_process_score: evaluation.service_process_score,
    phone_survey_score: evaluation.phone_survey_score,
    note: evaluation.note || '',
  });
  const [saving, setSaving] = useState(false);
  const [recalcing, setRecalcing] = useState(false);

  const sc = computeScore(form);
  const locked = !!evaluation.is_locked;

  const numField = (key: keyof typeof form, value: string) => {
    const n = value === '' ? 0 : parseInt(value, 10);
    setForm(f => ({ ...f, [key]: isNaN(n) ? 0 : Math.max(0, n) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await serviceEvaluationApi.update(evaluation.id, form);
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalc = async () => {
    setRecalcing(true);
    try {
      const res = await serviceEvaluationApi.recalc(evaluation.id);
      const d = res.data as ServiceEvaluation;
      setForm(f => ({
        ...f,
        website_review_count: d.website_review_count,
        negative_review_count: d.negative_review_count,
        glasses_count: d.glasses_count,
        google_low_star_count: d.google_low_star_count,
      }));
    } catch (err: any) {
      alert(err?.response?.data?.message || '重新計算失敗');
    } finally {
      setRecalcing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此評鑑？')) return;
    setSaving(true);
    try {
      await serviceEvaluationApi.remove(evaluation.id);
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || '刪除失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">服務評鑑</h2>
              <div className="text-sm text-gray-500">
                {evaluation.employees?.name} · {evaluation.year_month}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          {/* 總分預覽 */}
          <div className="rounded-lg p-4 mb-4 text-center" style={{ backgroundColor: '#faf9f6', border: '1px solid #ede8e2' }}>
            <div className="text-xs text-gray-500 mb-1">即時總分</div>
            <div className="text-4xl font-bold" style={{ color: scoreColor(sc.total) }}>{sc.total}</div>
            <div className="text-xs text-gray-500 mt-2">
              評論率 {sc.review_rate_score} ＋ 流程 {sc.process_score} ＋ 電訪 {sc.phone_score} － 扣分 {sc.deduction}
            </div>
          </div>

          {locked && (
            <div className="rounded-lg p-3 mb-4 text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              🔒 此評鑑已於月結算時鎖定，所有欄位唯讀。需修改請先在列表上方「🔓 解鎖本月」。
            </div>
          )}

          <div className="space-y-3">
            {/* 配鏡數 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配鏡數 <span className="text-xs text-gray-400">（外部 API；目前可手動填）</span>
              </label>
              <input type="number" min={0} value={form.glasses_count}
                onChange={e => numField('glasses_count', e.target.value)}
                disabled={locked}
                className="w-full px-3 py-2 border rounded" />
            </div>

            {/* 官網新增評價量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                官網新增評價量 <span className="text-xs text-gray-400">（自動帶入，可覆寫）</span>
              </label>
              <input type="number" min={0} value={form.website_review_count}
                onChange={e => numField('website_review_count', e.target.value)}
                disabled={locked}
                className="w-full px-3 py-2 border rounded" />
            </div>

            {/* 評價紀錄負評數 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                評價紀錄負評數 <span className="text-xs text-gray-400">（自動帶入，可覆寫；每筆 -5）</span>
              </label>
              <input type="number" min={0} value={form.negative_review_count}
                onChange={e => numField('negative_review_count', e.target.value)}
                disabled={locked}
                className="w-full px-3 py-2 border rounded" />
            </div>

            {/* google 2星以下 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                google 2星以下評價數 <span className="text-xs text-gray-400">（Google API；目前可手動填；每筆 -5）</span>
              </label>
              <input type="number" min={0} value={form.google_low_star_count}
                onChange={e => numField('google_low_star_count', e.target.value)}
                disabled={locked}
                className="w-full px-3 py-2 border rounded" />
            </div>

            {/* 服務流程分數 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                服務流程分數 <span className="text-xs text-gray-400">（公關部填，0~20）</span>
              </label>
              <input type="number" min={0} max={20} value={form.service_process_score}
                onChange={e => numField('service_process_score', e.target.value)}
                disabled={locked}
                className="w-full px-3 py-2 border rounded" />
            </div>

            {/* 電訪好評數 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                電訪好評數 <span className="text-xs text-gray-400">（公關部填，0~20）</span>
              </label>
              <input type="number" min={0} max={20} value={form.phone_survey_score}
                onChange={e => numField('phone_survey_score', e.target.value)}
                disabled={locked}
                className="w-full px-3 py-2 border rounded" />
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
              <textarea rows={2} disabled={locked} value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2 border rounded text-sm" placeholder="選填..." />
            </div>
          </div>

          {locked ? (
            <div className="flex items-center justify-end mt-5">
              <button onClick={onClose} className="px-4 py-2 border rounded text-sm">關閉</button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-5">
              <div className="flex gap-2">
                <button onClick={handleRecalc} disabled={recalcing}
                  className="px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
                  {recalcing ? '計算中...' : '🔄 重新計算自動值'}
                </button>
                <button onClick={handleDelete} disabled={saving}
                  className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50">
                  刪除
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 border rounded text-sm">取消</button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 text-white rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#8b6f4e' }}>
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ── 電訪好評 Modal ───────────────────────────────────────────
interface PhoneSurveyModalProps {
  evaluation: ServiceEvaluation;
  onClose: () => void;
  onSaved: () => void;
}

const PhoneSurveyModal: React.FC<PhoneSurveyModalProps> = ({ evaluation, onClose, onSaved }) => {
  const [row, setRow] = useState<any>({
    phone_survey_audio_url: evaluation.phone_survey_audio_url,
    phone_survey_audio_name: evaluation.phone_survey_audio_name,
    phone_survey_audio_uploaded_at: evaluation.phone_survey_audio_uploaded_at,
    phone_survey_transcript: evaluation.phone_survey_transcript,
    phone_survey_transcript_status: evaluation.phone_survey_transcript_status || 'idle',
    phone_survey_transcript_error: evaluation.phone_survey_transcript_error,
  });
  const [score, setScore] = useState<number>(evaluation.phone_survey_score || 0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  const isLocked = !!evaluation.is_locked;
  const status = row.phone_survey_transcript_status as 'idle' | 'transcribing' | 'done' | 'failed';
  const hasAudio = !!row.phone_survey_audio_url;
  const canSaveScore = hasAudio; // 「必須有錄音才能存分數」這條規則
  const transcribing = status === 'transcribing';

  // 輪詢轉錄狀態
  useEffect(() => {
    if (!transcribing) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await serviceEvaluationApi.getPhoneSurveyAudio(evaluation.id);
        if (stopped) return;
        setRow(res.data);
      } catch {
        /* 短暫網路錯誤忽略 */
      }
    };
    const t = setInterval(tick, 3000);
    return () => { stopped = true; clearInterval(t); };
  }, [transcribing, evaluation.id]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) {
      setErr(`不是音檔（${f.type || '未知'}）`);
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setErr(`檔案 ${(f.size / 1048576).toFixed(1)}MB 超過 50MB`);
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const res = await serviceEvaluationApi.uploadPhoneSurveyAudio(evaluation.id, f);
      setRow(res.data);
    } catch (ex: any) {
      setErr(ex?.response?.data?.message || '上傳失敗');
    } finally {
      setUploading(false);
      e.target.value = ''; // reset
    }
  };

  const onDeleteAudio = async () => {
    if (!confirm('確定要刪除這段錄音？\n刪除後分數會自動歸 0。')) return;
    setDeleting(true);
    setErr(null);
    try {
      await serviceEvaluationApi.deletePhoneSurveyAudio(evaluation.id);
      setRow({
        phone_survey_audio_url: null,
        phone_survey_audio_name: null,
        phone_survey_audio_uploaded_at: null,
        phone_survey_transcript: null,
        phone_survey_transcript_status: 'idle',
        phone_survey_transcript_error: null,
      });
      setScore(0);
    } catch (ex: any) {
      setErr(ex?.response?.data?.message || '刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  const onSaveScore = async () => {
    if (!canSaveScore && score > 0) {
      setErr('沒有錄音不能存分數');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await serviceEvaluationApi.update(evaluation.id, { phone_survey_score: score });
      await serviceEvaluationApi.recalc(evaluation.id);
      onSaved();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold">電訪好評 — {evaluation.employees?.name || '員工'}</div>
            <div className="text-xs text-gray-500">{evaluation.year_month}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {err && (
            <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">{err}</div>
          )}

          {/* Step 1: 錄音 */}
          <section>
            <div className="text-sm font-medium mb-2">① 電訪錄音</div>
            {!hasAudio ? (
              <div>
                <label className={`inline-block px-3 py-1.5 text-sm rounded cursor-pointer text-white ${uploading || isLocked ? 'bg-gray-400' : 'bg-[#8b6f4e] hover:bg-[#7a6040]'}`}>
                  {uploading ? '上傳中…' : '選擇錄音檔'}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={onFile}
                    disabled={uploading || isLocked}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">支援 mp3 / wav / m4a / webm / ogg；上限 50MB；上傳後會背景跑文字稿（Whisper + Claude）。</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm flex items-center gap-2">
                  <span className="text-gray-500">📎</span>
                  <span className="break-all">{row.phone_survey_audio_name || '錄音檔'}</span>
                </div>
                <audio src={row.phone_survey_audio_url} controls className="w-full" />
                <div className="flex gap-2">
                  <label className={`text-xs px-2 py-1 rounded border cursor-pointer ${uploading || isLocked ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                    重新上傳
                    <input type="file" accept="audio/*" className="hidden" onChange={onFile} disabled={uploading || isLocked} />
                  </label>
                  {!isLocked && (
                    <button
                      onClick={onDeleteAudio}
                      disabled={deleting}
                      className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? '刪除中…' : '刪除錄音'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Step 2: 文字稿 */}
          {hasAudio && (
            <section>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                ② 文字稿（電訪者 / 客戶）
                {status === 'transcribing' && (
                  <span className="text-xs text-amber-600">⏳ 轉錄中… (Whisper + Claude，約需 30~90 秒)</span>
                )}
                {status === 'done' && (
                  <span className="text-xs text-green-600">✓ 完成</span>
                )}
                {status === 'failed' && (
                  <span className="text-xs text-red-600">✗ 失敗</span>
                )}
              </div>
              {status === 'failed' && row.phone_survey_transcript_error && (
                <div className="px-3 py-2 rounded bg-red-50 text-red-700 text-xs border border-red-200 mb-2">
                  {row.phone_survey_transcript_error}
                </div>
              )}
              {status === 'done' && row.phone_survey_transcript && (
                <div>
                  <pre className="text-sm whitespace-pre-wrap bg-[#faf8f5] border border-[#e8ddd0] rounded p-3 max-h-72 overflow-y-auto">
                    {row.phone_survey_transcript}
                  </pre>
                  <button
                    onClick={() => setShowRawText(v => !v)}
                    className="text-xs text-gray-500 hover:underline mt-1"
                  >
                    {showRawText ? '收起說明' : '看不到電訪者/客戶標籤？'}
                  </button>
                  {showRawText && (
                    <p className="text-xs text-gray-500 mt-1">
                      講者標籤是用 Claude 從內容判斷的（非聲紋）。若 Anthropic API key 沒設定或回應失敗，會 fallback 為純文字稿。
                    </p>
                  )}
                </div>
              )}
              {status === 'transcribing' && (
                <div className="text-sm text-gray-500 italic">背景處理中，這個 modal 可以關閉，文字稿完成後重開查看即可。</div>
              )}
            </section>
          )}

          {/* Step 3: 分數 */}
          <section>
            <div className="text-sm font-medium mb-2">③ 電訪好評分數（0 ~ {EVAL.PHONE_MAX}）</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={EVAL.PHONE_MAX}
                value={score}
                onChange={(e) => setScore(Math.max(0, Math.min(EVAL.PHONE_MAX, Number(e.target.value) || 0)))}
                disabled={!canSaveScore || isLocked}
                className="w-24 border rounded px-2 py-1 disabled:bg-gray-100"
              />
              <span className="text-xs text-gray-500">
                {!canSaveScore && '⚠️ 沒上傳錄音不能存分數'}
                {canSaveScore && status === 'transcribing' && '（仍可先存分數，不必等文字稿）'}
              </span>
            </div>
          </section>
        </div>

        <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded border hover:bg-white">取消</button>
          {!isLocked && (
            <button
              onClick={onSaveScore}
              disabled={saving || (!canSaveScore && score > 0)}
              className="px-3 py-1.5 text-sm rounded text-white disabled:opacity-50"
              style={{ backgroundColor: '#8b6f4e' }}
            >
              {saving ? '儲存中…' : '存檔'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// ── 算分模式設定面板（super_admin 才看得到變更按鈕）─────────
const ScoringSettingsPanel: React.FC<{ isSuperAdmin: boolean }> = ({ isSuperAdmin }) => {
  const [settings, setSettings] = useState<ServiceEvalScoringSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.getScoringSettings()
      .then(res => setSettings(res.data))
      .catch(() => setErr('讀取設定失敗'));
  }, []);

  const update = async (patch: Partial<ServiceEvalScoringSettings>) => {
    if (!isSuperAdmin) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await settingsApi.updateScoringSettings(patch);
      setSettings(res.data);
    } catch (ex: any) {
      setErr(ex?.response?.data?.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="bg-[#faf8f5] border border-[#e8ddd0] rounded-lg p-4">
      <div className="text-sm font-semibold mb-2" style={{ color: '#3d2b1f' }}>
        算分模式設定 {!isSuperAdmin && <span className="text-xs text-gray-400 ml-2">（只有 super_admin 能變更）</span>}
      </div>
      {err && <div className="text-xs text-red-600 mb-2">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 計分模式 */}
        <div>
          <div className="text-xs text-gray-600 mb-1">人員評論率計分模式</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update({ scoring_mode: 'legacy' })}
              disabled={!isSuperAdmin || saving || settings.scoring_mode === 'legacy'}
              className={`flex-1 px-3 py-2 text-sm rounded border ${settings.scoring_mode === 'legacy' ? 'bg-[#8b6f4e] text-white border-[#8b6f4e]' : 'bg-white hover:bg-gray-50'} ${!isSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
              title="(官網新增評價 ÷ 配鏡數) × 100，上限 60 分"
            >
              舊公式（評論率，上限 60 分）
            </button>
            <button
              type="button"
              onClick={() => update({ scoring_mode: 'screenshot' })}
              disabled={!isSuperAdmin || saving || settings.scoring_mode === 'screenshot'}
              className={`flex-1 px-3 py-2 text-sm rounded border ${settings.scoring_mode === 'screenshot' ? 'bg-[#8b6f4e] text-white border-[#8b6f4e]' : 'bg-white hover:bg-gray-50'} ${!isSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
              title="員工自上傳 Google Map 評論截圖，達 20 則得 40 分"
            >
              新公式（截圖，20 則→40 分）
            </button>
          </div>
        </div>

        {/* Level 3 開關 */}
        <div>
          <div className="text-xs text-gray-600 mb-1">內容相似度比對（Level 3）</div>
          <button
            type="button"
            onClick={() => update({ level3_dedupe: !settings.level3_dedupe })}
            disabled={!isSuperAdmin || saving}
            className={`w-full px-3 py-2 text-sm rounded border ${settings.level3_dedupe ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-600'} ${!isSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
            title="比對截圖內容相似度，> 90% 視為可能重複（軟警告，不阻擋）"
          >
            {settings.level3_dedupe ? '✓ 啟用中' : '○ 已關閉'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceEvaluationPage;
