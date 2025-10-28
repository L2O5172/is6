
import React, { useState, useEffect, useCallback } from 'react';
import type { Profile } from './types';

// Constants from user-provided script
const LIFF_ID = "2008276630-bYNjwMx7";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxxMVosMx6u0rvfSShaepg-lZjnLkcImfGqQKczsiGL08P9vFtJpG0TbkXUZDRxMr34sw/exec";
const RESTAURANT_NAME = "無名牛排";
// --- 請將此處的網址替換為您實際的點餐系統網址 ---
const ORDERING_SYSTEM_URL = "https://your-ordering-system.com"; // <<<< 替換這裡

type Status = 'initializing' | 'ready' | 'submitting' | 'success' | 'error';

// --- Helper Components (defined outside App to prevent re-creation on re-renders) ---

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
);

interface StatusIndicatorProps {
  status: 'success' | 'error';
  title: string;
  message: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, title, message }) => {
  const isSuccess = status === 'success';
  return (
    <div className="text-center flex flex-col items-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isSuccess ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}>
          {isSuccess ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      </div>
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-gray-400">{message}</p>
    </div>
  );
};


// --- Main App Component ---

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>('initializing');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const initializeLiff = useCallback(async () => {
    setStatus('initializing');
    setError(null);
    try {
      if (!window.liff) {
        throw new Error("LIFF SDK not found.");
      }
      await window.liff.init({ liffId: LIFF_ID });

      if (!window.liff.isLoggedIn()) {
        window.liff.login();
        return; // login() redirects, so we don't need to do anything else
      }

      const userProfile = await window.liff.getProfile();
      setProfile(userProfile);
      setStatus('ready');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "發生未知錯誤";
      console.error("LIFF Initialization failed:", errorMessage);
      setError("LIFF 初始化失敗，請檢查您的網路連線或稍後再試。");
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    initializeLiff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!profile || !phoneNumber.trim()) return;
    setStatus('submitting');
    setError(null);

    const registrationTime = new Date().toLocaleString('sv-SE');

    const formData = new URLSearchParams();
    formData.append('source', 'liff');
    formData.append('userId', profile.userId);
    formData.append('displayName', profile.displayName);
    formData.append('pictureUrl', profile.pictureUrl || '');
    formData.append('registrationTime', registrationTime);
    formData.append('phoneNumber', phoneNumber.trim());


    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch (e) {
          // ignore if can't read body
        }
        throw new Error(`伺服器回應錯誤: ${response.statusText}. ${errorBody}`);
      }
      
      const resultText = await response.text();
      const result = JSON.parse(resultText);


      if (result.status === 'success') {
        setStatus('success');
      } else {
        throw new Error(result.message || "後端處理失敗。");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "發生未知錯誤";
      console.error("Submission failed:", errorMessage);
      setError(`綁定失敗：${errorMessage}`);
      setStatus('error');
    }
  };

  const handleClose = () => {
    window.liff.closeWindow();
  };
  
  const isSubmitDisabled = status === 'submitting' || !phoneNumber.trim();

  const renderContent = () => {
    switch (status) {
      case 'initializing':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <LoadingSpinner />
            <p className="text-lg">正在初始化應用程式...</p>
          </div>
        );
      
      case 'ready':
      case 'submitting':
        return (
          <div className="w-full max-w-sm mx-auto text-center">
            <h1 className="text-2xl font-bold text-amber-300 mb-2">歡迎加入 {RESTAURANT_NAME}</h1>
            <p className="text-gray-400 mb-8">請確認您的 LINE 資料並輸入手機號碼以完成綁定</p>
            {profile && (
              <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center shadow-lg mb-6">
                <img
                  src={profile.pictureUrl || `https://picsum.photos/seed/${profile.userId}/100`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full mb-4 border-4 border-gray-700"
                />
                <h2 className="text-2xl font-semibold text-white">{profile.displayName}</h2>
                <p className="text-xs text-gray-500 mt-2 break-all">{profile.userId}</p>
              </div>
            )}
            <div className="mb-8">
               <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2 text-left">手機號碼</label>
               <input
                type="tel"
                id="phone"
                name="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="請輸入您的手機號碼"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 focus:ring-amber-500 focus:border-amber-500 transition"
                required
               />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 shadow-lg"
            >
              {status === 'submitting' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>}
              <span>{status === 'submitting' ? '傳送資料中...' : '確認綁定'}</span>
            </button>
          </div>
        );

      case 'success':
        return (
          <div className="w-full max-w-sm mx-auto text-center">
            <StatusIndicator 
              status="success" 
              title="綁定成功！"
              message="感謝您完成綁定！點擊下方按鈕即可開始點餐。"
            />
            <a
              href={ORDERING_SYSTEM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg inline-block"
            >
              開始點餐
            </a>
            <button
              onClick={handleClose}
              className="mt-4 text-gray-400 hover:text-white transition-colors duration-300"
            >
              稍後再說 (關閉)
            </button>
          </div>
        );
      
      case 'error':
        return (
           <div className="w-full max-w-sm mx-auto">
            <StatusIndicator 
              status="error" 
              title="綁定失敗"
              message={error || '發生未知錯誤，請稍後再試。'}
            />
             <button
              onClick={initializeLiff}
              className="mt-8 w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg"
            >
              重試
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      {renderContent()}
    </div>
  );
};

export default App;
