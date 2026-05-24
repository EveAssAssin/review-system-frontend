import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [appNumber, setAppNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlAppNumber = searchParams.get('app_number');
    if (urlAppNumber) {
      setAppNumber(urlAppNumber);
      // 只有「尚未登入」又停在這個畫面，才代表自動登入真的失敗了。
      // 若使用者已登入（例如帶著有效 token 又點了 /login?app_number=xxx 的 LINE 連結），
      // 會由下方的 <Navigate> 直接導回首頁，不應顯示這個錯誤訊息。
      if (!user) {
        setError(`自動登入失敗：找不到會員編號「${urlAppNumber}」的有效員工，請確認後重新登入，或聯絡管理員觸發員工同步`);
      }
    }
  }, [searchParams, user]);

  // 已登入者不應停留在登入頁。
  // 例如：使用者已有有效登入狀態，又點了 LINE 的 /login?app_number=xxx 連結時，
  // AutoLogin 會因為「已登入」而略過自動登入流程、也不會清掉網址上的 app_number 參數，
  // 使這個畫面誤判成「自動登入失敗」並顯示錯誤。直接導回首頁即可。
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(appNumber);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登入失敗，請確認會員編號');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#f5f0eb' }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ backgroundColor: '#cdbea2' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15"
          style={{ backgroundColor: '#8b6f4e' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Brand header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-2xl font-bold shadow-md"
            style={{ backgroundColor: '#8b6f4e', color: '#ffffff' }}
          >
            樂
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#3d2b1f' }}>
            樂活眼鏡
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8b7355' }}>
            員工評價管理系統
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl shadow-lg p-8"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8ddd0' }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#3d2b1f' }}>
            登入系統
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#5c4033' }}
              >
                會員編號
              </label>
              <input
                type="text"
                value={appNumber}
                onChange={(e) => setAppNumber(e.target.value)}
                placeholder="請輸入您的會員編號"
                className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  border: '1px solid #cdbea2',
                  backgroundColor: '#faf8f5',
                  color: '#3d2b1f',
                }}
                required
              />
            </div>

            {error && (
              <div
                className="text-sm px-4 py-3 rounded-lg"
                style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all shadow-sm"
              style={{
                backgroundColor: loading ? '#cdbea2' : '#8b6f4e',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7a6040';
              }}
              onMouseLeave={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#8b6f4e';
              }}
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#cdbea2' }}>
          © 2026 樂活眼鏡 · 內部系統
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
