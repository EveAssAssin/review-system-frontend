import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { googlePlacesApi } from '../services/api';

interface NegativeAlert {
  id: string;
  store_id?: string | null;
  google_place_id: string;
  fingerprint: string;
  reviewer_name?: string | null;
  reviewer_photo_url?: string | null;
  reviewer_profile_url?: string | null;
  rating: number;
  content?: string | null;
  publish_time?: string | null;
  relative_publish_time?: string | null;
  google_review_name?: string | null;
  status: 'new' | 'handled' | 'ignored';
  handled_by?: string | null;
  handled_at?: string | null;
  handled_note?: string | null;
  notified_at?: string | null;
  detected_at: string;
  stores?: { id: string; name: string; google_place_id?: string };
}

export default function GoogleAlertsPage() {
  const [filter, setFilter] = useState<'new' | 'handled' | 'ignored' | 'all'>('new');
  const [list, setList] = useState<NegativeAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const runTestPush = async () => {
    if (testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await googlePlacesApi.testNotify();
      setTestResult((r.data.ok ? '✅ ' : '⚠️ ') + (r.data.message || ''));
    } catch (e: any) {
      setTestResult('❌ 呼叫失敗：' + (e?.response?.data?.message || e?.message || String(e)));
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 15000);
    }
  };

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await googlePlacesApi.listNegativeAlerts(filter === 'all' ? undefined : filter);
      setList(res.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const handleAction = async (a: NegativeAlert, action: 'handled' | 'ignored') => {
    const note = action === 'handled'
      ? prompt('處理備註（選填）:', '') || undefined
      : prompt('忽略原因（選填）:', '') || undefined;
    try {
      await googlePlacesApi.handleNegativeAlert(a.id, action, note);
      await load();
    } catch (e: any) {
      window.alert(e?.response?.data?.message || '操作失敗');
    }
  };

  const newCount = list.filter(a => a.status === 'new').length;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">🚨 Google 負評告警</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={runTestPush}
            disabled={testing}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="送一則假告警給所有公關部，測試 LINE 推播通路"
          >
            {testing ? '推播中…' : '📣 測試推播'}
          </button>
          {(['new', 'handled', 'ignored', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded ${filter === f ? 'text-white' : 'text-gray-600 border'}`}
              style={filter === f ? { backgroundColor: '#8b6f4e' } : {}}
            >
              {f === 'new' ? `🆕 未處理${filter === 'new' && newCount > 0 ? ` (${newCount})` : ''}`
                : f === 'handled' ? '✅ 已處理'
                : f === 'ignored' ? '🙈 已忽略' : '全部'}
            </button>
          ))}
        </div>
      </div>

      {testResult && (
        <div className={`mb-3 rounded border text-sm px-3 py-2 ${
          testResult.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700'
          : testResult.startsWith('⚠️') ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-red-50 border-red-200 text-red-700'
        }`}>{testResult}</div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4 text-xs text-gray-600 leading-relaxed">
        <div className="font-semibold text-gray-700 mb-1">📖 說明</div>
        系統每 6 小時（08:00 / 12:00 / 18:00 / 21:00 台灣時間）自動抓一次各門市 Google Map 官方最新 5 則評論，
        發現 <strong>rating ≤ 2</strong> 的新負評會：
        <span className="mx-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700">📱 立即發 LINE 給公關部</span>
        <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">📋 建立此頁的 alert</span>
        。公關處理後標「已處理」或「已忽略」歸檔。
      </div>

      {err && (
        <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {err}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">載入中...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
          {filter === 'new' ? '🎉 目前沒有未處理的負評告警！' : '無資料'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(a => (
            <AlertCard key={a.id} alert={a} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}

const AlertCard: React.FC<{ alert: NegativeAlert; onAction: (a: NegativeAlert, action: 'handled' | 'ignored') => void }> = ({ alert, onAction }) => {
  const navigate = useNavigate();
  // 把這則 Google 負評畫成一張「仿 Google 深色評論卡」截圖
  const renderReviewScreenshot = (): string | null => {
    try {
      const W = 720; const padX = 28; const padTop = 24;
      const name = alert.reviewer_name || '匿名';
      const ratingN = Number(alert.rating) || 0;
      const relTime = alert.relative_publish_time || (alert.publish_time ? new Date(alert.publish_time).toLocaleDateString('zh-TW') : '');
      const content = alert.content || '';
      const probe = document.createElement('canvas').getContext('2d');
      if (!probe) return null;
      const contentFont = '16px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      probe.font = contentFont;
      const avatarX = padX, avatarR = 22, textX = padX + avatarR * 2 + 16;
      const maxW = W - textX - padX;
      const wrap = (text: string): string[] => {
        const out: string[] = [];
        for (const raw of String(text).split('\n')) {
          let line = '';
          for (const ch of raw) {
            if (probe.measureText(line + ch).width > maxW) { out.push(line); line = ch; }
            else line += ch;
          }
          out.push(line);
        }
        return out;
      };
      const lines = wrap(content);
      const headerH = 54; // name + subline + stars
      const H = padTop + headerH + 10 + lines.length * 26 + padTop;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d'); if (!ctx) return null;
      // 深色底
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle='#e0e0e0'; ctx.strokeRect(0.5,0.5,W-1,H-1);
      // 頭像圈
      const colors = ['#8ab4f8','#f28b82','#fdd663','#81c995','#c58af9','#78d9ec'];
      const col = colors[(name.charCodeAt(0) || 0) % colors.length];
      const cy = padTop + avatarR;
      ctx.beginPath(); ctx.arc(avatarX + avatarR, cy, avatarR, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      ctx.fillStyle = '#202124'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((name || '?').charAt(0), avatarX + avatarR, cy + 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      // 名字
      ctx.fillStyle = '#202124'; ctx.font = 'bold 16px "Noto Sans TC","Microsoft JhengHei",sans-serif';
      ctx.fillText(name, textX, padTop + 16);
      // 星星(金色)+相對時間
      let sx = textX; const sy = padTop + 42;
      ctx.font = '16px sans-serif';
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i < ratingN ? '#fbbc04' : '#dadce0'; ctx.fillText('\u2605', sx, sy); sx += 18; }
      if (relTime) { ctx.fillStyle = '#5f6368'; ctx.font = '13px "Noto Sans TC",sans-serif'; ctx.fillText('\u00b7 ' + relTime + '\uff08Google\uff09', sx + 6, sy); }
      // 內容
      ctx.fillStyle = '#3c4043'; ctx.font = contentFont;
      let y = padTop + headerH + 24;
      for (const ln of lines) { ctx.fillText(ln, textX, y); y += 26; }
      return canvas.toDataURL('image/png');
    } catch { return null; }
  };
  const goNewReview = () => {
    const shot = renderReviewScreenshot();
    navigate('/reviews/new', { state: { prefill: { content: alert.content || '', store_id: alert.store_id || null, store_name: alert.stores?.name || '', source: 'google_map', review_type: 'negative', screenshot: shot, screenshot_name: 'google_' + (alert.id || 'review') + '.png' } } });
  };
  const stars = '⭐'.repeat(alert.rating) + '☆'.repeat(5 - alert.rating);
  const isNew = alert.status === 'new';
  const bgColor = alert.rating === 1 ? '#fecaca' : '#fef3c7';
  const borderColor = alert.rating === 1 ? '#dc2626' : '#f59e0b';

  return (
    <div className="bg-white rounded-lg shadow p-4"
      style={{ borderLeft: `4px solid ${isNew ? borderColor : '#d1d5db'}` }}>
      <div className="flex items-start gap-3">
        {alert.reviewer_photo_url ? (
          <img src={alert.reviewer_photo_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
            {(alert.reviewer_name || '?').charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold">{alert.reviewer_name || '匿名'}</span>
            <span className="text-lg" style={{ color: alert.rating === 1 ? '#dc2626' : '#f59e0b' }}>
              {stars}
            </span>
            <span className="text-sm text-gray-500">{alert.rating} 星</span>
            {alert.relative_publish_time && (
              <span className="text-xs text-gray-400">· {alert.relative_publish_time}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
              style={{ backgroundColor: bgColor, color: borderColor }}>
              {alert.stores?.name || '未指定門市'}
            </span>
          </div>

          {alert.content && (
            <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap p-3 rounded"
              style={{ backgroundColor: '#faf9f6', border: '1px solid #ede8e2' }}>
              {alert.content}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            {alert.publish_time
              ? <span className="text-gray-600 font-medium">評論時間 {new Date(alert.publish_time).toLocaleString('zh-TW')}{alert.relative_publish_time ? `（Google：${alert.relative_publish_time}）` : ''}</span>
              : <span className="text-gray-600 font-medium">評論時間 {alert.relative_publish_time || '—'}</span>}
            <span>· 偵測於 {new Date(alert.detected_at).toLocaleString('zh-TW')}</span>
            {alert.notified_at && <span>· 已通知 LINE</span>}
            {alert.stores?.google_place_id && (
              <a
                href={`https://search.google.com/local/reviews?placeid=${alert.stores.google_place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >📍 到 Google Map 查看</a>
            )}
            {alert.reviewer_profile_url && (
              <a
                href={alert.reviewer_profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >👤 留言者 Google 頁面</a>
            )}
          </div>

          {alert.status !== 'new' && (
            <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
              <span className="font-medium">
                {alert.status === 'handled' ? '✅ 已處理' : '🙈 已忽略'}
              </span>
              {alert.handled_by && <span className="ml-2 text-gray-500">by {alert.handled_by}</span>}
              {alert.handled_at && <span className="ml-2 text-gray-500">
                {new Date(alert.handled_at).toLocaleString('zh-TW')}
              </span>}
              {alert.handled_note && <div className="mt-1 text-gray-600">備註：{alert.handled_note}</div>}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={goNewReview}
              className="px-3 py-1 text-xs text-white rounded"
              style={{ backgroundColor: '#7c3aed' }}
            >➕ 新增評價（自動帶入負評內容＋店長）</button>
          </div>
          {isNew && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => onAction(alert, 'handled')}
                className="px-3 py-1 text-xs text-white rounded"
                style={{ backgroundColor: '#16a34a' }}
              >✅ 標為已處理</button>
              <button
                onClick={() => onAction(alert, 'ignored')}
                className="px-3 py-1 text-xs border rounded text-gray-600"
              >🙈 忽略</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
