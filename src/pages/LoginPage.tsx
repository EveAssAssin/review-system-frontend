import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [erpid, setErpid] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 從統一入口系統帶入的參數
  React.useEffect(() => {
    const erpidParam = searchParams.get('erpid');
    if (erpidParam) {
      setErpid(erpidParam);
      handleAutoLogin(erpidParam);
    }
  }, [searchParams]);

  const handleAutoLogin = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      await login(id);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!erpid.trim()) {
      setError('請輸入員工編號');
      return;
    }
    await handleAutoLogin(erpid.trim());
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">員工評價系統</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              員工編號 (ERP ID)
            </label>
            <input
              type="text"
              value={erpid}
              onChange={(e) => setErpid(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入員工編號"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 text-center">
          請從統一入口系統進入，或輸入員工編號登入
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
