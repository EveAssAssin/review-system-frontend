import React, { useEffect, useRef, useState } from 'react';
import { serviceEvaluationApi, reviewScreenshotsApi, settingsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ServiceEvaluation, ReviewScreenshot } from '../types';

// 與後端 / ServiceEvaluationPage 一致
const EVAL = { REVIEW_RATE_MAX: 60, PROCESS_MAX: 20, PHONE_MAX: 20, DEDUCT: 5, SCREENSHOT_TARGET: 20, SCREENSHOT_BONUS: 40 };

function scoreColor(total: number): string {
  if (total >= 80) return '#16a34a';
  if (total >= 60) return '#ca8a04';
  return '#dc2626';
}

const MyServiceEvaluationPage: React.FC = () => {
  const { employee, isLoading } = useAuth();
  const [evals, setEvals] = useState<ServiceEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<'legacy' | 'screenshot'>('legacy');
  useEffect(() => {
    settingsApi.getScoringSettings().then(res => setScoringMode(res.data?.scoring_mode || 'legacy')).catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!employee?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await serviceEvaluationApi.byEmployee(employee.id);
        setEvals(res.data || []);
      } catch (e: any) {
        setErr(e?.response?.data?.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [employee, isLoading]);

  if (isLoading || loading) {
    return <div className="p-8 text-center text-gray-500">載入中...</div>;
  }

  if (!employee?.id) {
    return (
      <div className="p-8 text-center text-gray-500">
        無法取得你的員工資料，請重新登入或聯絡管理員。
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="px-4 py-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: '#3d2b1f' }}>我的服務評鑑</h1>
        <div className="text-xs text-gray-500">
          {employee.name}（{employee.store_name || employee.department || ''}）
        </div>
      </div>

      <div className="rounded-lg p-3 text-xs text-gray-600 bg-[#faf8f5] border border-[#e8ddd0]">
        <div className="font-medium mb-1">評分公式</div>
        人員評論率（官網評價數 ÷ 配鏡數 × 100，1%=1 分，上限 {EVAL.REVIEW_RATE_MAX}）
        ＋ 服務流程分數（上限 {EVAL.PROCESS_MAX}）
        ＋ 電訪好評數（上限 {EVAL.PHONE_MAX}）
        － google 2 星以下 ×{EVAL.DEDUCT}
        － 評價負評 ×{EVAL.DEDUCT}
        ＝ 總分（0~100）
      </div>

      {evals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          目前沒有你的服務評鑑紀錄。<br />
          <span className="text-xs">如果你的職務需要被評鑑，請聯絡公關部把你加入評鑑名單。</span>
        </div>
      ) : (
        <div className="space-y-3">
          {evals.map(ev => {
            const sc = ev.score;
            const isExpanded = expandedId === ev.id;
            return (
              <div
                key={ev.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#f9f6f2] text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-semibold" style={{ color: '#3d2b1f' }}>
                      {ev.year_month}
                    </div>
                    {ev.is_locked && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600" title="該月已結算鎖定">
                        🔒 已結算
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-5">
                    {scoringMode === 'legacy' ? (
                      <>
                        <div className="text-xs text-gray-500">
                          配鏡 <span className="text-gray-800 font-medium">{ev.glasses_count}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          評論 <span className="text-gray-800 font-medium">
                            {ev.website_review_count}/{ev.cumulative_review_count ?? 0}
                          </span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: scoreColor(sc?.total || 0) }}>
                          {sc?.total ?? 0}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-gray-500">
                          截圖 <span className="text-gray-800 font-medium">{ev.verified_screenshot_count ?? 0}/{EVAL.SCREENSHOT_TARGET}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          市場部 <span className="text-gray-800 font-medium">
                            {ev.market_audit_result == null ? '未審' : ev.market_audit_passed ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: sc?.new_passed ? '#16a34a' : '#dc2626' }}>
                          {sc?.new_total ?? 0}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${sc?.new_passed ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {sc?.new_passed ? '✓ 通過' : '✗ 未通過'}
                        </span>
                      </>
                    )}
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4 bg-[#fafafa]">
                    {/* 分數明細 — 依算分模式只顯示一邊 */}
                    {scoringMode === 'legacy' ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <Stat label="評論率" value={`${sc?.review_rate ?? 0}%`} sub={`${sc?.review_rate_score ?? 0} 分`} />
                      <Stat label="服務流程" value={`${ev.service_process_score} 分`} sub={`/ ${EVAL.PROCESS_MAX}`} />
                      <Stat label="電訪好評" value={`${ev.phone_survey_score} 分`} sub={`/ ${EVAL.PHONE_MAX}`} />
                      <Stat
                        label="扣分"
                        value={`-${sc?.deduction ?? 0}`}
                        sub={`低星 ${ev.google_low_star_count} / 負評 ${ev.negative_review_count}`}
                        valueColor="#dc2626"
                      />
                      <Stat
                        label="總分(舊公式)"
                        value={`${sc?.total ?? 0}`}
                        sub="0~100"
                        valueColor={scoreColor(sc?.total || 0)}
                        bold
                      />
                    </div>
                    ) : (
                    /* 新公式 */
                    <div className="bg-white border rounded p-3">
                      <div className="text-xs font-medium mb-2 text-gray-700">
                        新公式（截圖 40 + 負評處理 30 + 市場部 30 = 100，≥ 90 通過）
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <Stat
                          label="評論截圖"
                          value={`${sc?.new_screenshot_score ?? 0} 分`}
                          sub={`${ev.verified_screenshot_count ?? 0} / ${EVAL.SCREENSHOT_TARGET}`}
                          valueColor={(sc?.new_screenshot_score ?? 0) > 0 ? '#16a34a' : '#9ca3af'}
                        />
                        <Stat
                          label="負評處理"
                          value={`${sc?.new_negative_score ?? 0} 分`}
                          sub={ev.no_negative_or_washed ? '✓ 無負評或全洗完' : '尚未滿足'}
                          valueColor={(sc?.new_negative_score ?? 0) > 0 ? '#16a34a' : '#9ca3af'}
                        />
                        <Stat
                          label="市場部電訪"
                          value={`${sc?.new_market_score ?? 0} 分`}
                          sub={
                            ev.market_audit_result == null
                              ? '尚未審'
                              : ev.market_audit_passed
                              ? '✓ pass'
                              : '✗ fail'
                          }
                          valueColor={(sc?.new_market_score ?? 0) > 0 ? '#16a34a' : '#9ca3af'}
                        />
                        <Stat
                          label="新公式總分"
                          value={`${sc?.new_total ?? 0}`}
                          sub={sc?.new_passed ? '✓ 通過服務評鑑' : '✗ 未通過'}
                          valueColor={sc?.new_passed ? '#16a34a' : '#dc2626'}
                          bold
                        />
                      </div>
                      {ev.market_audit_note && (
                        <div className="text-xs text-gray-600 mt-2">
                          市場部備註：{ev.market_audit_note}
                          {ev.market_auditor_name && <span className="text-gray-400 ml-2">— {ev.market_auditor_name}</span>}
                        </div>
                      )}
                    </div>
                    )}

                    {ev.note && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">備註</div>
                        <div className="text-sm whitespace-pre-wrap bg-white p-2 rounded border">{ev.note}</div>
                      </div>
                    )}

                    {/* 電訪好評錄音 + 文字稿（唯讀） */}
                    {ev.phone_survey_audio_url ? (
                      <div>
                        <div className="text-sm font-medium mb-2">電訪好評錄音</div>
                        <audio src={ev.phone_survey_audio_url} controls className="w-full" />
                        {ev.phone_survey_transcript_status === 'transcribing' && (
                          <div className="text-xs text-amber-600 mt-2">⏳ 文字稿轉錄中…</div>
                        )}
                        {ev.phone_survey_transcript_status === 'failed' && (
                          <div className="text-xs text-red-600 mt-2">
                            ✗ 文字稿轉錄失敗：{ev.phone_survey_transcript_error || '原因未知'}
                          </div>
                        )}
                        {ev.phone_survey_transcript_status === 'done' && ev.phone_survey_transcript && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-500 mb-1">文字稿（電訪者 / 客戶）</div>
                            <pre className="text-sm whitespace-pre-wrap bg-white border border-[#e8ddd0] rounded p-3 max-h-72 overflow-y-auto">
                              {ev.phone_survey_transcript}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">本月尚未有電訪錄音。</div>
                    )}

                    <ReviewScreenshotSection
                      serviceEvalId={ev.id}
                      isLocked={!!ev.is_locked}
                      verifiedCount={ev.verified_screenshot_count ?? 0}
                    />

                    <div className="text-xs text-gray-400">
                      最後更新：{ev.updated_at ? new Date(ev.updated_at).toLocaleString('zh-TW') : '-'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 評論截圖 section（新公式核心）─────────────────────────
interface RSProps {
  serviceEvalId: string;
  isLocked: boolean;
  verifiedCount: number;
}

const ReviewScreenshotSection: React.FC<RSProps> = ({ serviceEvalId, isLocked, verifiedCount: initial }) => {
  const [list, setList] = useState<ReviewScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifiedCount, setVerifiedCount] = useState(initial);
  const [pickingFor, setPickingFor] = useState<ReviewScreenshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await reviewScreenshotsApi.listForEvaluation(serviceEvalId);
      const rows: ReviewScreenshot[] = res.data || [];
      setList(rows);
      setVerifiedCount(rows.filter(r => r.status === 'verified').length);
    } catch (e: any) {
      setErr(e?.response?.data?.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [serviceEvalId]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('請選擇圖片檔');
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const res = await reviewScreenshotsApi.upload(serviceEvalId, f);
      const newRow = res.data as ReviewScreenshot;
      // 如果是 awaiting_pick → 自動打開選擇器
      if (newRow.status === 'awaiting_pick') {
        setPickingFor(newRow);
      }
      await load();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message || ex?.message || '上傳失敗');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('確定刪除這筆截圖？')) return;
    try {
      await reviewScreenshotsApi.remove(id);
      await load();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message || '刪除失敗');
    }
  };

  const onPick = async (id: string, index: number) => {
    try {
      const res = await reviewScreenshotsApi.pick(id, index);
      setPickingFor(null);
      const newRow = res.data as ReviewScreenshot;
      // 如果是 verified / rejected 顯示對應狀態
      if (newRow.status === 'rejected') {
        alert(`已選擇，但被系統拒絕：${newRow.reject_reason}`);
      }
      await load();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message || '選擇失敗');
    }
  };

  const pct = Math.min(100, Math.round((verifiedCount / EVAL.SCREENSHOT_TARGET) * 100));

  return (
    <div>
      <div className="text-sm font-medium mb-2 flex items-center gap-2">
        評論截圖
        <span className="text-xs text-gray-500">
          （滿 {EVAL.SCREENSHOT_TARGET} 則得 {EVAL.SCREENSHOT_BONUS} 分；只能上傳 3 天內、不能重複）
        </span>
      </div>

      {/* 進度條 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: verifiedCount >= EVAL.SCREENSHOT_TARGET ? '#16a34a' : '#8b6f4e',
            }}
          />
        </div>
        <div className="text-sm font-medium w-20 text-right">
          <span style={{ color: verifiedCount >= EVAL.SCREENSHOT_TARGET ? '#16a34a' : '#3d2b1f' }}>
            {verifiedCount} / {EVAL.SCREENSHOT_TARGET}
          </span>
        </div>
      </div>

      {err && (
        <div className="text-xs px-3 py-2 mb-2 rounded bg-red-50 text-red-700 border border-red-200">{err}</div>
      )}

      {/* 威懾警語 */}
      {!isLocked && (
        <div className="mb-3 rounded-lg border p-3 text-xs leading-relaxed"
          style={{ backgroundColor: '#fef8ee', borderColor: '#f0d9a8', color: '#8b6f4e' }}>
          <div className="font-semibold mb-1">⚠️ 反造假警告</div>
          系統已啟用多重 AI 偵測：
          <span className="mx-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fff', border: '1px solid #f0d9a8' }}>圖片指紋比對</span>
          <span className="mx-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fff', border: '1px solid #f0d9a8' }}>AI 生成偵測</span>
          <span className="mx-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fff', border: '1px solid #f0d9a8' }}>公關實地抽查</span>
          。上傳合成、AI 生成或非本店真實評論的截圖，經查獲當月服務評鑑將直接視為不通過！
        </div>
      )}

      {/* 上傳按鈕 */}
      {!isLocked && (
        <div className="mb-3">
          <label className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded cursor-pointer text-white ${uploading ? 'bg-gray-400' : 'bg-[#8b6f4e] hover:bg-[#7a6040]'}`}>
            {uploading ? 'AI 解析中… (30~60 秒)' : '📷 上傳新截圖'}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
        </div>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="text-xs text-gray-400">載入中…</div>
      ) : list.length === 0 ? (
        <div className="text-xs text-gray-400">目前還沒上傳任何截圖。</div>
      ) : (
        <div className="space-y-2">
          {list.map(rs => (
            <ScreenshotRow
              key={rs.id}
              row={rs}
              isLocked={isLocked}
              onPick={() => setPickingFor(rs)}
              onDelete={() => onDelete(rs.id)}
            />
          ))}
        </div>
      )}

      {pickingFor && (
        <PickReviewModal
          row={pickingFor}
          onCancel={() => setPickingFor(null)}
          onPick={(index) => onPick(pickingFor.id, index)}
        />
      )}
    </div>
  );
};

const ScreenshotRow: React.FC<{
  row: ReviewScreenshot;
  isLocked: boolean;
  onPick: () => void;
  onDelete: () => void;
}> = ({ row, isLocked, onPick, onDelete }) => {
  const statusBadge = () => {
    switch (row.status) {
      case 'verified':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">✓ 通過</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">✗ 拒絕</span>;
      case 'awaiting_pick':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">⚠️ 請選一則</span>;
      case 'pending':
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">⏳ 處理中</span>;
      case 'needs_review':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">👁️ 待覆核</span>;
    }
  };

  return (
    <div className="bg-white border rounded p-3 text-sm">
      <div className="flex items-start gap-3">
        {row.image_url ? (
          <a href={row.image_url} target="_blank" rel="noopener noreferrer">
            <img src={row.image_url} alt="" className="w-16 h-16 object-cover rounded border" />
          </a>
        ) : (
          <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-400">
            {row.image_purged_at ? '圖已清' : '無圖'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadge()}
            {row.reviewer_name && (
              <span className="text-sm font-medium">{row.reviewer_name}</span>
            )}
            {row.star_count != null && (
              <span className="text-xs">{'★'.repeat(row.star_count)}{'☆'.repeat(5 - row.star_count)}</span>
            )}
            {row.posted_relative_time && (
              <span className="text-xs text-gray-400">{row.posted_relative_time}</span>
            )}
          </div>
          {row.content && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{row.content}</div>
          )}
          {row.status === 'rejected' && row.reject_reason && (
            <div className="text-xs text-red-600 mt-1">{row.reject_reason}</div>
          )}
          {row.warnings && row.warnings.length > 0 && (
            <div className="text-xs text-amber-700 mt-1 space-y-0.5">
              {row.warnings.map((w, i) => (
                <div key={i}>⚠️ {w.message}</div>
              ))}
            </div>
          )}

          {/* pHash 撞到的對照卡片 */}
          {row.collision_context && (
            <CollisionCard row={row} />
          )}
        </div>
        <div className="flex flex-col gap-1">
          {row.status === 'awaiting_pick' && !isLocked && (
            <button
              type="button"
              onClick={onPick}
              className="text-xs px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white"
            >
              選一則
            </button>
          )}
          {!isLocked && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
            >
              刪除
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * pHash 撞到時的對照卡片 — 讓員工看清楚這則評論已被誰搶先
 * 商業規則：一則評論全系統只算一次，先到先得
 * 支援申訴：員工可以點「我要申訴」由公關人工覆核
 */
const CollisionCard: React.FC<{ row: ReviewScreenshot }> = ({ row }) => {
  const cc = row.collision_context!;
  const status = row.status;
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 只在被拒絕時才顯示（有 collision_context 也代表被拒了）
  if (status !== 'rejected') return null;

  const submitAppeal = async () => {
    if (!appealReason.trim()) return;
    setSubmitting(true);
    try {
      await reviewScreenshotsApi.submitAppeal(row.id, appealReason.trim());
      window.alert('申訴已送出，公關部審核後會有通知。');
      setShowAppealModal(false);
      setAppealReason('');
      window.location.reload();
    } catch (e: any) {
      window.alert(e?.response?.data?.message || '送出失敗');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 rounded border p-2" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
      <div className="text-xs font-semibold mb-1.5" style={{ color: '#b91c1c' }}>
        ❌ 此則評論已被搶先使用（系統規則：一則評論全系統只算一次）
      </div>
      <div className="flex items-start gap-3">
        {cc.image_url && (
          <a href={cc.image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <img src={cc.image_url} alt="" className="w-14 h-14 object-cover rounded border" />
          </a>
        )}
        <div className="flex-1 min-w-0 text-xs">
          <div className="font-medium text-gray-700 mb-0.5">
            🎯 撞到這張圖（pHash 差 {cc.distance}/64）
          </div>
          {/* 手機：label / value 上下堆疊；桌機 sm+：兩欄水平對齊 */}
          <dl className="text-xs mt-1 space-y-1.5 sm:space-y-1">
            <div className="sm:flex sm:gap-2">
              <dt className="text-gray-400 sm:w-24 sm:flex-shrink-0">來源</dt>
              <dd className="text-gray-700">
                {cc.source === 'screenshot' ? '服務評鑑' : '洗評論'} · {cc.date ? new Date(cc.date).toLocaleDateString('zh-TW') : '-'}
              </dd>
            </div>
            {(cc.employee_name || cc.store_name) && (
              <div className="sm:flex sm:gap-2">
                <dt className="text-gray-400 sm:w-24 sm:flex-shrink-0">已由</dt>
                <dd className="text-gray-700 font-medium">
                  {cc.employee_name || '-'}{cc.store_name ? ` · ${cc.store_name}` : ''} 上傳
                </dd>
              </div>
            )}
            {cc.reviewer_name && (
              <div className="sm:flex sm:gap-2">
                <dt className="text-gray-400 sm:w-24 sm:flex-shrink-0">評論者</dt>
                <dd className="text-gray-700">{cc.reviewer_name}</dd>
              </div>
            )}
            {(cc.this_exif_timestamp || cc.matched_exif_timestamp) && (
              <div className="sm:flex sm:gap-2">
                <dt className="text-gray-400 sm:w-24 sm:flex-shrink-0">EXIF 拍攝時間</dt>
                <dd className="text-gray-500 space-y-0.5">
                  <div>你這張：{cc.this_exif_timestamp ? new Date(cc.this_exif_timestamp).toLocaleString('zh-TW') : '無'}</div>
                  <div>對方那張：{cc.matched_exif_timestamp ? new Date(cc.matched_exif_timestamp).toLocaleString('zh-TW') : '無'}</div>
                  {cc.time_diff_seconds != null && (
                    <div className="text-gray-500">差 {cc.time_diff_seconds} 秒</div>
                  )}
                </dd>
              </div>
            )}
            {cc.content_preview && (
              <div className="sm:flex sm:gap-2">
                <dt className="text-gray-400 sm:w-24 sm:flex-shrink-0">對方內容</dt>
                <dd className="text-gray-500 italic line-clamp-3">{cc.content_preview}</dd>
              </div>
            )}
          </dl>
          {/* 申訴狀態 / 按鈕 */}
          {row.appeal_status === 'pending' ? (
            <div className="mt-2 rounded bg-blue-50 border border-blue-200 px-2 py-1.5 text-xs text-blue-700">
              🙋 申訴中，等待公關部審核
              {row.appeal_submitted_at && <span className="ml-2 text-blue-500">於 {new Date(row.appeal_submitted_at).toLocaleString('zh-TW')}</span>}
              {row.appeal_reason && <div className="mt-1 text-gray-600 italic">你的理由：{row.appeal_reason}</div>}
            </div>
          ) : row.appeal_status === 'approved' ? (
            <div className="mt-2 rounded bg-green-50 border border-green-200 px-2 py-1.5 text-xs text-green-700">
              ✅ 申訴通過，公關已強制放行
              {row.appeal_handled_by && <span className="ml-2 text-green-600">by {row.appeal_handled_by}</span>}
              {row.appeal_handled_note && <div className="mt-1 text-gray-600">公關備註：{row.appeal_handled_note}</div>}
            </div>
          ) : row.appeal_status === 'denied' ? (
            <div className="mt-2 rounded bg-gray-50 border border-gray-200 px-2 py-1.5 text-xs text-gray-700">
              ❌ 申訴被駁回，維持原判定
              {row.appeal_handled_by && <span className="ml-2 text-gray-500">by {row.appeal_handled_by}</span>}
              {row.appeal_handled_note && <div className="mt-1 italic">公關備註：{row.appeal_handled_note}</div>}
              <button
                type="button"
                onClick={() => setShowAppealModal(true)}
                className="mt-1 text-xs text-red-600 hover:underline"
              >🙋 再次申訴</button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <div className="text-xs text-red-600 flex-1">
                💡 請上傳其他新的評論截圖。若你確認是這則你先拍的，可以申訴讓公關人工覆核。
              </div>
              <button
                type="button"
                onClick={() => setShowAppealModal(true)}
                className="text-xs px-3 py-1 rounded text-white flex-shrink-0"
                style={{ backgroundColor: '#5b7fad' }}
              >🙋 我要申訴</button>
            </div>
          )}
        </div>
      </div>

      {/* 申訴 Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">🙋 申訴：這則評論是我先拍的</div>
              <button onClick={() => setShowAppealModal(false)} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="text-sm text-gray-600">
                請說明為什麼你認為這則截圖應該通過。公關部會人工覆核，比對兩張截圖的 EXIF 時間、內容、上傳時間等。
              </div>
              <textarea
                value={appealReason}
                onChange={e => setAppealReason(e.target.value)}
                rows={5}
                placeholder="例：我當天早上 10:00 就在櫃檯看到這位客人留評，馬上截圖了。10:15 才傳到系統，但沒想到已被同事李美惠搶先傳過。這則確實是我先服務的客人。"
                className="w-full px-3 py-2 border rounded text-sm"
                maxLength={1000}
              />
              <div className="text-xs text-gray-400 text-right">{appealReason.length}/1000</div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAppealModal(false)}
                className="px-4 py-1.5 text-sm border rounded"
              >取消</button>
              <button
                type="button"
                onClick={submitAppeal}
                disabled={!appealReason.trim() || submitting}
                className="px-4 py-1.5 text-sm text-white rounded disabled:opacity-50"
                style={{ backgroundColor: '#5b7fad' }}
              >{submitting ? '送出中...' : '送出申訴'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PickReviewModal: React.FC<{
  row: ReviewScreenshot;
  onCancel: () => void;
  onPick: (index: number) => void;
}> = ({ row, onCancel, onPick }) => {
  const reviews = row.ai_raw_extraction?.reviews || [];
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">截圖中有 {reviews.length} 則評論，請選一則進入計分</div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {row.image_url && (
            <a href={row.image_url} target="_blank" rel="noopener noreferrer">
              <img src={row.image_url} alt="" className="max-h-48 rounded border" />
            </a>
          )}
          {reviews.map((r, i) => (
            <label
              key={i}
              className={`block border rounded p-3 cursor-pointer ${picked === i ? 'border-[#8b6f4e] bg-[#faf8f5]' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-start gap-2">
                <input type="radio" name="pick" checked={picked === i} onChange={() => setPicked(i)} className="mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {r.reviewer_name}
                    <span className="text-xs ml-2">{'★'.repeat(r.star_count)}{'☆'.repeat(5 - r.star_count)}</span>
                    <span className="text-xs text-gray-400 ml-2">{r.posted_relative_time}（{r.posted_days_ago} 天前）</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{r.content}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded border hover:bg-white">取消</button>
          <button
            onClick={() => picked !== null && onPick(picked)}
            disabled={picked === null}
            className="px-3 py-1.5 text-sm rounded text-white disabled:opacity-50"
            style={{ backgroundColor: '#8b6f4e' }}
          >
            選定
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  bold?: boolean;
}> = ({ label, value, sub, valueColor, bold }) => (
  <div className="bg-white rounded p-2 border">
    <div className="text-xs text-gray-500">{label}</div>
    <div
      className={`${bold ? 'text-xl font-bold' : 'text-base font-medium'} mt-0.5`}
      style={{ color: valueColor || '#3d2b1f' }}
    >
      {value}
    </div>
    {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
  </div>
);

export default MyServiceEvaluationPage;
