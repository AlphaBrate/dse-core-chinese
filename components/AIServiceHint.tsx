
import React from 'react';

interface hintText {
  onConfigure: () => void;
}

const AIServiceHint: React.FC<hintText> = ({ onConfigure }) => {
  return (
    <div className={`${localStorage.user_api_key ? "hidden" : ""} border flex justify-center items-center gap-2 fixed bottom-5 left-5 right-5 w-fit z-[99] px-4 py-2 max-w-[50] rounded-xl backdrop-blur-[50px] bg-amber-500/10 dark:bg-amber-900/10 border-amber-500/30 text-amber-500 font-bold`}>
        <i className="fas fa-plug text-3xl"></i>
        <span>你尚未設置 AI 服務的 API 密鑰，AI 服務暫時不可用。</span>
        <br />
    </div>
  );
};

export default AIServiceHint;
