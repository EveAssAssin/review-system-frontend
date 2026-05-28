import React, { useEffect, useState } from 'react';
import { serviceEvaluationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ServiceEvaluation } from '../types';

// 與後端 / ServiceEvaluationPage 一致
const EVAL = { REVIEW_RATE_MAX: 60, PROCESS_MAX: 20, PHONE_MAX: 20, DEDUCT: 5 };

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
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4 bg-[#fafafa]">
                    {/* 分數明細 */}
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
                        label="總分"
                        value={`${sc?.total ?? 0}`}
                        sub="0~100"
                        valueColor={scoreColor(sc?.total || 0)}
                        bold
                      />
                    </div>

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
