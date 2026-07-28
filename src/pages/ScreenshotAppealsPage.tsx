import { useEffect, useState } from 'react';
import { reviewScreenshotsApi } from '../services/api';

interface AppealRow {
  id: string;
  employee_id: string;
  year_month: string;
  image_url?: string | null;
  appeal_status: 'pending' | 'approved' | 'denied';
  appeal_reason?: string | null;
  appeal_submitted_at?: string | null;
  appeal_handled_by?: string | null;
  appeal_handled_at?: string | null;
  appeal_handled_note?: string | null;
  reject_reason?: string | null;
  collision_context?: any;
  reviewer_name?: string | null;
  content?: string | null;
  employees?: { id: string; name: string; store_name?: string; department?: string; app_number?: string };
}

interface AppealDetail {
  current: any;
  collided: any;
}

export default function ScreenshotAppealsPage() {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'denied' | 'all'>('pending');
  const [list, setList] = useState<AppealRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDetail, setOpenDetail] = useState<AppealDetail | null>(null);
  const [handlingNote, setHandlingNote] = useState('');
  const [handling, setHandling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await reviewScreenshotsApi.listAppeals(filter === 'all' ? undefined : filter);
      setList(res.data || []);
    } catch (e: any) {
      window.alert(e?.response?.data?.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const openDetailFor = async (row: AppealRow) => {
    try {
      const res = await reviewScreenshotsApi.getAppealDetail(row.id);
      setOpenDetail(res.data);
      setHandlingNote('');
    } catch (e: any) {
      window.alert(e?.response?.data?.message || '載入詳情失敗');
    }
  };

  const decide = async (decision: 'approved' | 'denied') => {
    if (!openDetail) return;
    if (!handlingNote.trim() && !confirm(`不填備註直接${decision === 'approved' ? '批准' : '拒絕'}申訴？`)) return;
    setHandling(true);
    try {
      await reviewScreenshotsApi.handleAppeal(openDetail.current.id, decision, handlingNote.trim() || undefined);
      window.alert(decision === 'approved' ? '✅ 已批准，員工截圖已強制通過' : '❌ 已拒絕申訴，維持原判定');
      setOpenDetail(null);
      await load();
    } catch (e: any) {
      window.alert(e?.response?.data?.message || '處理失敗');
    } finally {
      setHandling(false);
    }
  };

  const pendingCount = list.filter(r => r.appeal_status === 'pending').length;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">🙋 截圖申訴審核</h1>
        <div className="flex items-center gap-2">
          {(['pending', 'approved', 'denied', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded ${filter === f ? 'text-white' : 'text-gray-600 border'}`}
              style={filter === f ? { backgroundColor: '#8b6f4e' } : {}}
            >
              {f === 'pending' ? `🆕 待審核${filter === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}`
                : f === 'approved' ? '✅ 已批准'
                : f === 'denied' ? '❌ 已拒絕' : '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3 mb-4 text-xs text-gray-600">
        員工被 pHash 拒絕後可送申訴。點下方列表可展開對照頁面，看兩張截圖的完整資訊 + EXIF + AI 抽取內容，決定放行或維持拒絕。
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">載入中...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
          {filter === 'pending' ? '🎉 目前沒有待審核的申訴' : '無資料'}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(r => (
            <div key={r.id} className="bg-white rounded-lg shadow p-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50"
              style={{ borderLeft: `4px solid ${r.appeal_status === 'pending' ? '#f59e0b' : r.appeal_status === 'approved' ? '#16a34a' : '#9ca3af'}` }}
              onClick={() => openDetailFor(r)}>
              {r.image_url && <img src={r.image_url} alt="" className="w-14 h-14 rounded object-cover border flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold">{r.employees?.name || '-'}</span>
                  <span className="text-xs text-gray-500">{r.employees?.store_name || r.employees?.department}</span>
                  <span className="text-xs text-gray-400">· {r.year_month}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded"
                    style={r.appeal_status === 'pending' ? { backgroundColor: '#fef3c7', color: '#92400e' }
                      : r.appeal_status === 'approved' ? { backgroundColor: '#d1fae5', color: '#065f46' }
                      : { backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                    {r.appeal_status === 'pending' ? '待審核' : r.appeal_status === 'approved' ? '已批准' : '已拒絕'}
                  </span>
                </div>
                {r.collision_context?.employee_name && (
                  <div className="text-xs text-gray-500">
                    ⚡ 撞到「{r.collision_context.employee_name}
                    {r.collision_context.store_name ? '·' + r.collision_context.store_name : ''}」的上傳
                  </div>
                )}
                {r.appeal_reason && (
                  <div className="text-xs text-gray-700 mt-1 line-clamp-2 italic">「{r.appeal_reason}」</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  送出於 {r.appeal_submitted_at ? new Date(r.appeal_submitted_at).toLocaleString('zh-TW') : '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {openDetail && (
        <AppealDetailModal
          detail={openDetail}
          onClose={() => setOpenDetail(null)}
          handling={handling}
          note={handlingNote}
          setNote={setHandlingNote}
          onDecide={decide}
        />
      )}
    </div>
  );
}

const AppealDetailModal: React.FC<{
  detail: AppealDetail;
  onClose: () => void;
  handling: boolean;
  note: string;
  setNote: (v: string) => void;
  onDecide: (d: 'approved' | 'denied') => void;
}> = ({ detail, onClose, handling, note, setNote, onDecide }) => {
  const cur = detail.current;
  const col = detail.collided;
  const isPending = cur.appeal_status === 'pending';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <div className="font-bold text-lg">🔍 申訴對照比較</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 申訴理由 */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3">
            <div className="text-sm font-semibold text-blue-900 mb-1">🙋 員工申訴理由</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{cur.appeal_reason || '(未填理由)'}</div>
            <div className="text-xs text-gray-500 mt-2">
              申訴者：{cur.employees?.name} · {cur.employees?.store_name || cur.employees?.department} ·
              送出於 {cur.appeal_submitted_at ? new Date(cur.appeal_submitted_at).toLocaleString('zh-TW') : '-'}
            </div>
          </div>

          {/* 兩張截圖並排 */}
          <div className="grid grid-cols-2 gap-4">
            <ScreenshotColumn title="🙋 申訴這張（員工的）" data={cur} isCurrent={true} />
            <ScreenshotColumn title="⚡ 撞到那張（先傳的）" data={col} isCurrent={false} />
          </div>

          {/* EXIF timestamp comparison highlighted */}
          {cur.collision_context && (
            <div className="rounded-lg bg-gray-50 border p-3 text-sm">
              <div className="font-semibold text-gray-700 mb-2">⏰ EXIF 拍攝時間對照</div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="text-gray-500 pr-2">申訴這張：</td>
                    <td>{cur.collision_context.this_exif_timestamp ? new Date(cur.collision_context.this_exif_timestamp).toLocaleString('zh-TW') : '（無 EXIF 時間戳）'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 pr-2">撞到那張：</td>
                    <td>{cur.collision_context.matched_exif_timestamp ? new Date(cur.collision_context.matched_exif_timestamp).toLocaleString('zh-TW') : '（無 EXIF 時間戳）'}</td>
                  </tr>
                  {cur.collision_context.time_diff_seconds != null && (
                    <tr>
                      <td className="text-gray-500 pr-2">時間差：</td>
                      <td className="font-semibold">{cur.collision_context.time_diff_seconds} 秒</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-gray-500 pr-2">pHash 差異：</td>
                    <td>{cur.collision_context.distance}/64</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 text-xs text-gray-500">
                💡 EXIF 時間可以佐證誰真的先拍。但要注意：有些截圖 App 或傳訊工具會剝掉 EXIF。
              </div>
            </div>
          )}

          {/* 已審過的顯示結果 */}
          {!isPending && (
            <div className="rounded-lg bg-gray-100 p-3 text-sm">
              <div className="font-semibold">
                {cur.appeal_status === 'approved' ? '✅ 已批准（強制放行）' : '❌ 已拒絕申訴（維持原判）'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {cur.appeal_handled_by || '-'} · {cur.appeal_handled_at ? new Date(cur.appeal_handled_at).toLocaleString('zh-TW') : '-'}
              </div>
              {cur.appeal_handled_note && (
                <div className="text-sm mt-2 whitespace-pre-wrap">📝 {cur.appeal_handled_note}</div>
              )}
            </div>
          )}
        </div>

        {/* 決定 */}
        {isPending && (
          <div className="px-5 py-4 border-t bg-gray-50 sticky bottom-0">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="審核備註（會顯示給員工看，選填但強烈建議）"
              className="w-full px-3 py-2 border rounded text-sm mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => onDecide('denied')}
                disabled={handling}
                className="px-4 py-2 text-sm border rounded text-gray-700 disabled:opacity-50"
              >❌ 拒絕申訴（維持原判）</button>
              <button
                onClick={() => onDecide('approved')}
                disabled={handling}
                className="px-4 py-2 text-sm text-white rounded disabled:opacity-50"
                style={{ backgroundColor: '#16a34a' }}
              >✅ 批准申訴（強制通過）</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ScreenshotColumn: React.FC<{ title: string; data: any; isCurrent: boolean }> = ({ title, data, isCurrent }) => {
  if (!data) {
    return (
      <div className="border-2 border-dashed rounded-lg p-3 text-center text-gray-400 text-sm">
        {title}<br />（資料已被清除或不存在）
      </div>
    );
  }
  const emp = data.employees;
  return (
    <div className={`border-2 rounded-lg p-3 ${isCurrent ? 'border-blue-300 bg-blue-50/30' : 'border-amber-300 bg-amber-50/30'}`}>
      <div className={`text-sm font-bold mb-2 ${isCurrent ? 'text-blue-900' : 'text-amber-900'}`}>{title}</div>
      {data.image_url ? (
        <a href={data.image_url} target="_blank" rel="noopener noreferrer">
          <img src={data.image_url} alt="" className="w-full h-48 object-contain rounded border bg-white" />
        </a>
      ) : (
        <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
          {data.image_purged_at ? '圖已過期清除' : '無圖'}
        </div>
      )}
      <table className="w-full text-xs mt-2">
        <tbody>
          {emp && (
            <tr>
              <td className="text-gray-500 pr-2 whitespace-nowrap">上傳者：</td>
              <td className="font-medium">{emp.name} · {emp.store_name || emp.department}</td>
            </tr>
          )}
          {data.reviewer_name && (
            <tr>
              <td className="text-gray-500 pr-2 whitespace-nowrap">評論者：</td>
              <td>{data.reviewer_name}</td>
            </tr>
          )}
          {data.star_count != null && (
            <tr>
              <td className="text-gray-500 pr-2 whitespace-nowrap">星數：</td>
              <td>{'★'.repeat(data.star_count)}{'☆'.repeat(5 - data.star_count)}</td>
            </tr>
          )}
          {data.posted_relative_time && (
            <tr>
              <td className="text-gray-500 pr-2 whitespace-nowrap">發布時間：</td>
              <td>{data.posted_relative_time}</td>
            </tr>
          )}
          <tr>
            <td className="text-gray-500 pr-2 whitespace-nowrap">上傳時間：</td>
            <td>{data.created_at ? new Date(data.created_at).toLocaleString('zh-TW') : (data.uploaded_at ? new Date(data.uploaded_at).toLocaleString('zh-TW') : '-')}</td>
          </tr>
          {data.image_exif?.Software && (
            <tr>
              <td className="text-gray-500 pr-2 whitespace-nowrap">手機：</td>
              <td>{data.image_exif.Software}</td>
            </tr>
          )}
          {data.status && (
            <tr>
              <td className="text-gray-500 pr-2 whitespace-nowrap">目前狀態：</td>
              <td>
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={data.status === 'verified' ? { backgroundColor: '#d1fae5', color: '#065f46' }
                    : data.status === 'rejected' ? { backgroundColor: '#fecaca', color: '#991b1b' }
                    : { backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                  {data.status}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {data.content && (
        <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
          <div className="text-gray-400 text-xs mb-0.5">評論內容：</div>
          {data.content}
        </div>
      )}
      {data.review_content && (
        <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
          <div className="text-gray-400 text-xs mb-0.5">評論內容：</div>
          {data.review_content}
        </div>
      )}
    </div>
  );
};
