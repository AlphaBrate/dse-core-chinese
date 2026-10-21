
import React, { useState } from 'react';

interface ActivationHintModalProps {
  onClose: () => void;
  onConfigure: () => void;
}

const ActivationHintModal: React.FC<ActivationHintModalProps> = ({ onClose, onConfigure }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleInternalClose = (callback: () => void) => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      callback();
    }, 500);
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md ${isExiting ? 'animate-out fade-out' : 'animate-in fade-in'} duration-500`}>
      <div className={`w-full max-w-md glass-card !p-10 text-center !rounded-[40px] shadow-2xl ${isExiting ? 'animate-out zoom-out' : 'animate-in zoom-in blur-in'} duration-700`}>
        <div className="w-20 h-20 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-500/20">
          <i className="fas fa-brain text-3xl"></i>
        </div>
        
        <h3 className="text-2xl font-black dark:text-white tracking-tight mb-4">AI 服務未配置</h3>
        
        <div className="space-y-4 text-coreMuted font-medium leading-relaxed mb-10 text-left">
          <p>
            你尚未配置 AI 服務。
          </p>
          <p className="text-sm">
            請點擊導航欄右上角的 <b>統計圖示</b>，進入 <b>「API 設置」</b> 填寫
            Base URL、模型與 API 密鑰（支援任何 OpenAI 相容服務）以啟用智能閱卷功能。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => handleInternalClose(onConfigure)}
            className="w-full py-4 bg-brandBlue text-white rounded-full font-bold shadow-lg shadow-brandBlue/20 hover:scale-[1.03] active:scale-95 transition-all duration-500 flex items-center justify-center gap-2"
          >
            <i className="fas fa-plus-circle text-xs"></i> 現在設置
          </button>
          
          <button 
            onClick={() => handleInternalClose(onClose)}
            className="w-full py-4 bg-transparent text-coreMuted font-bold hover:text-brandBlue transition-all duration-500"
          >
            我明白了，稍後設置
          </button>
        </div>
        
        <p className="mt-8 text-[10px] font-black text-coreMuted uppercase tracking-widest opacity-40">
          Status: Awaiting Manual Input
        </p>
      </div>
    </div>
  );
};

export default ActivationHintModal;
