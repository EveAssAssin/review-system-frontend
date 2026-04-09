import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [appNumber, setAppNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlAppNumber = searchParams.get('app_number');
    if (urlAppNumber) {
      setAppNumber(urlAppNumber);
      setError('自動登入失敗，請確認會員編號後重新登入');
    }
  }, [searchParams]);

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
