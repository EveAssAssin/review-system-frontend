import { useEffect, useMemo, useState } from 'react';
import { googlePlacesApi } from '../services/api';

interface StoreSync {
  id: string;
  name: string;
  store_code?: string;
  region?: string;
  google_place_id?: string | null;
  google_place_name?: string | null;
  google_place_address?: string | null;
  google_rating?: number | null;
  google_user_rating_count?: number | null;
  google_reviews_last_synced_at?: string | null;
  google_reviews_last_error?: string | null;
  whitelist_count?: number;
}

interface Candidate {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
}

export default function GooglePlacesPage() {
  const [stores, setStores] = useState<StoreSync[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pickingStore, setPickingStore] = useState<StoreSync | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);

  // 篩選 state
  const [only6Digits, setOnly6Digits] = useState(true); // 預設只顯示 6 位數代號的正式門市
  const [hideConfigured, setHideConfigured] = useState(false); // 隱藏已設定的
  const [filterText, setFilterText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await googlePlacesApi.listStores();
      setStores(res.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // 篩選後的清單
  const filteredStores = useMemo(() => {
    const kw = filterText.trim().toLowerCase();
    return stores.filter(s => {
      if (only6Digits && !/^\d{6}$/.test(s.store_code || '')) return false;
      if (hideConfigured && s.google_place_id) return false;
      if (kw) {
        const hay = `${s.name} ${s.store_code || ''} ${s.region || ''}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [stores, only6Digits, hideConfigured, filterText]);

  const openPicker = (s: StoreSync) => {
    setPickingStore(s);
    setQuery(`LOHAS 樂活眼鏡 ${s.name}`);
    setCandidates([]);
  };

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setErr(null);
    try {
      const res = await googlePlacesApi.search(query);
      setCandidates(res.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || '搜尋失敗');
    } finally {
      setSearching(false);
    }
  };

  const pickCandidate = async (placeId: string) => {
    if (!pickingStore) return;
    try {
      await googlePlacesApi.setPlaceId(pickingStore.id, placeId);
      setPickingStore(null);
      setCandidates([]);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || '設定失敗');
    }
  };

  const syncOne = async (s: StoreSync) => {
    try {
      const res = await googlePlacesApi.syncStore(s.id);
      const r = res.data;
      alert(r.ok ? `✓ 同步完成，抓到 ${r.count} 則` : `✗ 同步失敗：${r.error}`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || '同步失敗');
    }
  };

  const syncAll = async () => {
    if (!confirm('要同步所有已設定 place_id 的門市嗎？（約 20 間、需要 10 秒）')) return;
    setSyncing(true);
    try {
      const res = await googlePlacesApi.syncAll();
      const r = res.data;
      alert(`同步完成：${r.synced_stores}/${r.total_stores} 間、共 ${r.total_reviews} 則、錯誤 ${r.errors} 間`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || '同步失敗');
    } finally {
      setSyncing(false);
    }
  };

  const clearPlaceId = async (s: StoreSync) => {
    if (!confirm(`確定清除「${s.name}」的 Google place_id？（既有白名單也會刪掉）`)) return;
    try {
      await googlePlacesApi.clearPlaceId(s.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || '清除失敗');
    }
  };

  const setCount = stores.filter(s => s.google_place_id).length; // 頂部按鈕：全部有 place_id 的
  const totalAllCount = stores.length;                            // 頂部按鈕：全部
  const totalCount = filteredStores.length;                       // 篩選後的計數（列表用）
  const hiddenCount = totalAllCount - totalCount;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">🌐 Google 官方評論對照設定</h1>
        <button
          onClick={syncAll}
          disabled={syncing}
          className="px-4 py-2 text-white rounded disabled:opacity-50"
          style={{ backgroundColor: '#8b6f4e' }}
        >
          {syncing ? '同步中...' : `🔄 立即全部同步 (${setCount}/${totalAllCount})`}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 text-xs text-gray-600 leading-relaxed">
        <div className="font-semibold text-gray-700 mb-1">📖 使用說明</div>
        點各門市右邊「設定 Google」按鈕，用店名+地址搜尋，選正確的一筆 → 立即抓官方最新 5 則評論當白名單。
        排程每天 <strong>4 次</strong>（08:00 / 12:00 / 18:00 / 21:00 台灣時間）自動同步。員工上傳截圖時系統會自動比對，
        找不到官方對照就在異常報表加訊號（不擋上傳，因為官方 API 只給最新 5 則，員工的評論可能已被擠出）。
      </div>

      {/* 篩選 UI */}
      <div className="bg-white rounded-lg shadow p-3 mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="🔍 搜尋門市名 / 代號 / 區域..."
          className="flex-1 min-w-[200px] px-3 py-1.5 border rounded text-sm"
        />
        <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={only6Digits}
            onChange={e => setOnly6Digits(e.target.checked)}
            className="w-4 h-4"
          />
          <span>只看 6 位數代號（正式門市）</span>
        </label>
        <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={hideConfigured}
            onChange={e => setHideConfigured(e.target.checked)}
            className="w-4 h-4"
          />
          <span>只看未設定</span>
        </label>
        <div className="text-xs text-gray-500 ml-auto">
          顯示 {totalCount} 間
          {hiddenCount > 0 && <span className="text-gray-400"> · 隱藏 {hiddenCount} 間</span>}
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {err}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">載入中...</div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
          {stores.length === 0 ? '沒有門市資料' : '目前篩選條件下沒有門市，試著解開「只看 6 位數代號」或清除搜尋'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStores.map(s => (
            <StoreRow key={s.id} store={s} onPick={openPicker} onSync={syncOne} onClear={clearPlaceId} />
          ))}
        </div>
      )}

      {pickingStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                為「{pickingStore.name}」設定 Google Place
              </h2>
              <button onClick={() => setPickingStore(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="例：LOHAS 樂活眼鏡 竹北店"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={search}
                disabled={searching}
                className="px-4 py-2 text-white rounded disabled:opacity-50"
                style={{ backgroundColor: '#5b7fad' }}
              >
                {searching ? '搜尋中...' : '🔍 搜尋'}
              </button>
            </div>

            {candidates.length === 0 && !searching && (
              <div className="text-center text-gray-400 text-sm py-6">
                輸入店名 + 城市後按搜尋，選取正確的門市
              </div>
            )}

            <div className="space-y-2">
              {candidates.map(c => (
                <div key={c.id} className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => c.id && pickCandidate(c.id)}>
                  <div className="font-medium">{c.displayName?.text || '(無名)'}</div>
                  <div className="text-xs text-gray-500">{c.formattedAddress || '-'}</div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">place_id: {c.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StoreRow: React.FC<{
  store: StoreSync;
  onPick: (s: StoreSync) => void;
  onSync: (s: StoreSync) => void;
  onClear: (s: StoreSync) => void;
}> = ({ store, onPick, onSync, onClear }) => {
  const linked = !!store.google_place_id;
  const hasError = !!store.google_reviews_last_error;
  return (
    <div className="bg-white rounded-lg shadow p-3 flex items-center gap-3"
      style={{ borderLeft: `4px solid ${hasError ? '#dc2626' : linked ? '#10b981' : '#9ca3af'}` }}>
      <div className="flex-1 min-w-0">
        <div className="font-semibold flex items-baseline gap-2">
          {store.name}
          {store.store_code && <span className="text-xs text-gray-400">#{store.store_code}</span>}
          {store.region && <span className="text-xs text-gray-400">{store.region}</span>}
        </div>
        {linked ? (
          <div className="text-xs text-gray-500 mt-0.5">
            {store.google_place_name} · ⭐ {store.google_rating ?? '-'} ({store.google_user_rating_count ?? 0} 則)
            {store.whitelist_count != null && (
              <span className="ml-2 text-blue-600">白名單: {store.whitelist_count} 則</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 mt-0.5">尚未設定 Google 對照</div>
        )}
        {store.google_place_address && (
          <div className="text-xs text-gray-400 truncate">{store.google_place_address}</div>
        )}
        {hasError && (
          <div className="text-xs text-red-600 mt-1">❌ {store.google_reviews_last_error}</div>
        )}
        {linked && store.google_reviews_last_synced_at && (
          <div className="text-xs text-gray-400">
            上次同步：{new Date(store.google_reviews_last_synced_at).toLocaleString('zh-TW')}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {linked ? (
          <>
            <button
              onClick={() => onSync(store)}
              className="px-3 py-1 text-xs text-white rounded whitespace-nowrap"
              style={{ backgroundColor: '#5b7fad' }}
            >
              🔄 立即同步
            </button>
            <button
              onClick={() => onPick(store)}
              className="px-3 py-1 text-xs border rounded whitespace-nowrap"
            >
              🔧 重設
            </button>
            <button
              onClick={() => onClear(store)}
              className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded whitespace-nowrap"
            >
              ✕ 清除
            </button>
          </>
        ) : (
          <button
            onClick={() => onPick(store)}
            className="px-3 py-1 text-xs text-white rounded whitespace-nowrap"
            style={{ backgroundColor: '#8b6f4e' }}
          >
            設定 Google
          </button>
        )}
      </div>
    </div>
  );
};
