import React, { useEffect, useState, useCallback, useRef } from 'react';
import { washApi, uploadsApi } from '../services/api';
import type { WashTask, WashUpload } from '../types';

interface WashSectionProps {
  reviewId: string;
  reviewClosed: boolean;
  isPrAdmin: boolean;
  currentUserName?: string;
  /** 父層 ReviewDetailPage 在洗評狀態變動時需要更新（例如收到通知扣分減半時也想刷新評價） */
  onChange?: () => void;
  /** 父層需要知道是否要顯示「人員未洗評價結案」按鈕 */
  onWashFailedExposed?: (canFailedClose: boolean) => void;
}

const formatRemain = (deadline: string): string => {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return '已過期';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (d > 0) return `${d} 天 ${h} 時 ${m} 分`;
  if (h > 0) return `${h} 時 ${m} 分 ${sec} 秒`;
  if (m > 0) return `${m} 分 ${sec} 秒`;
  return `${sec} 秒`;
};

const WashSection: React.FC<WashSectionProps> = ({
  reviewId,
  reviewClosed,
  isPrAdmin,
  currentUserName,
  onChange,
  onWashFailedExposed,
}) => {
  const [task, setTask] = useState<WashTask | null>(null);
  const [uploads, setUploads] = useState<WashUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // 強制重繪倒數
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null); // slot index being rejected
  const [createForm, setCreateForm] = useState({ required_count: 3, deadline: '' });
  const [extendDeadline, setExtendDeadline] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await washApi.get(reviewId);
      setTask(res.data.task);
      setUploads(res.data.uploads);
    } catch (err) {
      console.error('載入洗評任務失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    load();
  }, [load]);

  // 倒數每秒刷新顯示
  useEffect(() => {
    if (!task || task.status !== 'in_progress') return;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [task]);

  // 通知父層是否可顯示「人員未洗評價結案」按鈕：task 存在 + 過期 + 未完成
  useEffect(() => {
    if (!onWashFailedExposed) return;
    const canFailed =
      !!task &&
      task.status !== 'completed' &&
      (task.status === 'failed' || new Date(task.deadline).getTime() < Date.now());
    onWashFailedExposed(canFailed);
  }, [task, tick, onWashFailedExposed]);

  const isExpired = !!task && new Date(task.deadline).getTime() < Date.now();
  const approvedCount = uploads.filter(u => u.status === 'approved').length;

  const handleCreate = async () => {
    if (!createForm.required_count || createForm.required_count < 1) {
      alert('請輸入需要的張數');
      return;
    }
    if (!createForm.deadline) {
      alert('請選擇最晚完成時間');
      return;
    }
    setBusy(true);
    try {
      await washApi.create(reviewId, {
        required_count: createForm.required_count,
        deadline: new Date(createForm.deadline).toISOString(),
      }, currentUserName);
      setShowCreateModal(false);
      setCreateForm({ required_count: 3, deadline: '' });
      await load();
      onChange?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || '建立失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleExtend = async () => {
    if (!extendDeadline) { alert('請選擇延長後的時間'); return; }
    setBusy(true);
    try {
      await washApi.updateDeadline(reviewId, new Date(extendDeadline).toISOString());
      setShowExtendModal(false);
      setExtendDeadline('');
      await load();
      onChange?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || '延長失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (slotIndex: number) => {
    setBusy(true);
    try {
      await washApi.approve(reviewId, slotIndex, currentUserName);
      await load();
      onChange?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || '審核失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (showRejectModal === null) return;
    setBusy(true);
    try {
      await washApi.reject(reviewId, showRejectModal, rejectReason, currentUserName);
      setShowRejectModal(null);
      setRejectReason('');
      await load();
      onChange?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || '審核失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleEmployeeUpload = async (slotIndex: number, file: File) => {
    if (!file) return;
    setBusy(true);
    try {
      // 1) 先上傳檔案到 supabase storage
      // 注意：要用 uploadForWash（任何登入者都可），不是 uploadForReview（公關專用）
      const uploadRes = await uploadsApi.uploadForWash(reviewId, [file]);
      const items = (uploadRes.data?.attachments || uploadRes.data) as any[];
      const url = (items[0] as any)?.file_url || (items[0] as any)?.url;
      if (!url) throw new Error('上傳後沒有取得 URL');
      // 2) 把 URL 綁到對應 slot
      await washApi.uploadImage(reviewId, slotIndex, url, currentUserName);
      await load();
      onChange?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || '上傳失敗');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="border-t pt-4">
        <div className="text-sm text-gray-400">洗評論：載入中...</div>
      </div>
    );
  }

  // 沒有 task：公關可建立、員工不顯示（沒被要求洗評論）
  if (!task) {
    if (!isPrAdmin || reviewClosed) return null;
    return (
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold" style={{ color: '#8b6f4e' }}>🧹 洗評論</div>
            <div className="text-xs text-gray-500 mt-1">若評價無法處理，可請人員協助請消費者建立正評以沖淡負評</div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm text-white rounded hover:opacity-80"
            style={{ backgroundColor: '#8b6f4e' }}>
            要求洗評論
          </button>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">要求洗評論</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">需要洗幾則正評？</label>
                  <input
                    type="number"
                    min={1}
                    value={createForm.required_count}
                    onChange={e => setCreateForm({ ...createForm, required_count: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最晚完成時間</label>
                  <input
                    type="datetime-local"
                    value={createForm.deadline}
                    onChange={e => setCreateForm({ ...createForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded">取消</button>
                <button onClick={handleCreate} disabled={busy} className="px-4 py-2 text-white rounded disabled:opacity-50" style={{ backgroundColor: '#8b6f4e' }}>
                  {busy ? '送出中...' : '送出'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 有 task → 顯示倒數 + 進度 + slots
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed' || (isExpired && !isCompleted);
  const headerColor = isCompleted ? '#16a34a' : isFailed ? '#dc2626' : '#8b6f4e';

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2" style={{ color: headerColor }}>
          🧹 洗評論
          {isCompleted && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">已完成 · 扣分減半</span>}
          {isFailed && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">已失敗 / 過期</span>}
          {!isCompleted && !isFailed && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f0eb', color: '#8b6f4e' }}>進行中</span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          已過審 {approvedCount} / {task.required_count}
        </div>
      </div>

      {/* 倒數 / 截止 / 公關延期按鈕 */}
      <div className="bg-[#faf9f6] border rounded-lg p-3 mb-3 flex items-center justify-between flex-wrap gap-2"
        style={{ borderColor: '#ede8e2' }}>
        <div className="text-sm">
          {!isCompleted && (
            <>
              <span className="text-gray-500">最晚完成：</span>
              <span className="font-medium">{new Date(task.deadline).toLocaleString('zh-TW', { hour12: false })}</span>
              <span className="ml-3 text-gray-500">剩餘：</span>
              <span className="font-mono font-semibold" style={{ color: isExpired ? '#dc2626' : '#8b6f4e' }}>
                {formatRemain(task.deadline)}
              </span>
            </>
          )}
          {isCompleted && task.completed_at && (
            <span className="text-green-600">完成於 {new Date(task.completed_at).toLocaleString('zh-TW', { hour12: false })}</span>
          )}
        </div>
        {isPrAdmin && !isCompleted && !reviewClosed && (
          <button
            onClick={() => { setExtendDeadline(task.deadline.slice(0, 16)); setShowExtendModal(true); }}
            className="text-xs px-3 py-1 border rounded hover:bg-gray-50">
            ⏰ 延長期限
          </button>
        )}
      </div>

      {/* slot 格子 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {uploads.map(slot => {
          const isApproved = slot.status === 'approved';
          const isUploaded = slot.status === 'uploaded';
          const isRejected = slot.status === 'rejected';
          // 上傳開放給「所有有權限看到此頁的人」（不再限 isMyReview）
          // 例如店長協助員工拍洗評論的照片、其他同事幫忙都可以
          // 審核（合格/不合格）仍只限公關部
          const canUpload = !isCompleted && !reviewClosed && !isExpired && (slot.status === 'pending' || isRejected);

          return (
            <div key={slot.id} className="border rounded-lg overflow-hidden bg-white" style={{ borderColor: isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#ede8e2' }}>
              {/* 圖片 / 預設 */}
              <div className="aspect-square bg-gray-50 flex items-center justify-center text-3xl text-gray-300 relative">
                {slot.image_url ? (
                  <img src={slot.image_url} alt={`slot-${slot.slot_index}`} className="w-full h-full object-cover" />
                ) : (
                  <span>＋</span>
                )}
                {isApproved && (
                  <div className="absolute top-1 right-1 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✓</div>
                )}
                {isRejected && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✗</div>
                )}
                {isUploaded && (
                  <div className="absolute top-1 right-1 bg-yellow-500 text-white rounded-full px-2 py-0.5 text-[10px]">待審</div>
                )}
              </div>

              <div className="p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">第 {slot.slot_index + 1} 張</span>
                  {slot.status === 'pending' && <span className="text-gray-400">待上傳</span>}
                  {isUploaded && <span className="text-yellow-600 font-medium">待公關審核</span>}
                  {isApproved && <span className="text-green-600 font-medium">合格</span>}
                  {isRejected && <span className="text-red-600 font-medium">不合格</span>}
                </div>

                {isRejected && slot.reject_reason && (
                  <div className="text-red-500 text-[11px] line-clamp-2" title={slot.reject_reason}>
                    原因：{slot.reject_reason}
                  </div>
                )}

                {/* 上傳/重傳按鈕（所有權限皆可上傳） */}
                {canUpload && (
                  <>
                    <input
                      ref={el => { fileInputs.current[slot.slot_index] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleEmployeeUpload(slot.slot_index, file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      disabled={busy}
                      onClick={() => fileInputs.current[slot.slot_index]?.click()}
                      className="w-full py-1 text-xs text-white rounded disabled:opacity-50"
                      style={{ backgroundColor: '#5b7fad' }}>
                      {isRejected ? '🔄 重新上傳' : '📷 上傳照片'}
                    </button>
                  </>
                )}

                {/* 公關：合格 / 不合格 */}
                {isPrAdmin && isUploaded && !reviewClosed && (
                  <div className="flex gap-1">
                    <button
                      disabled={busy}
                      onClick={() => handleApprove(slot.slot_index)}
                      className="flex-1 py-1 text-xs bg-green-600 text-white rounded disabled:opacity-50">
                      合格
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => { setShowRejectModal(slot.slot_index); setRejectReason(''); }}
                      className="flex-1 py-1 text-xs bg-red-500 text-white rounded disabled:opacity-50">
                      不合格
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 延長 deadline modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">延長洗評論期限</h2>
            <input
              type="datetime-local"
              value={extendDeadline}
              onChange={e => setExtendDeadline(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowExtendModal(false)} className="px-4 py-2 border rounded">取消</button>
              <button onClick={handleExtend} disabled={busy} className="px-4 py-2 text-white rounded disabled:opacity-50" style={{ backgroundColor: '#8b6f4e' }}>
                {busy ? '處理中...' : '確認延長'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* reject modal */}
      {showRejectModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">標記不合格</h2>
            <p className="text-sm text-gray-600 mb-3">標記後此格照片將被清除，員工會收到 LINE 通知並可重新上傳。</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
              placeholder="不合格原因（會推播給員工，可空白）..."
            />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowRejectModal(null)} className="px-4 py-2 border rounded">取消</button>
              <button onClick={handleReject} disabled={busy} className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50">
                {busy ? '處理中...' : '確認不合格'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WashSection;
