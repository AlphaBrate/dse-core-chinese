import React from "react";

const AIServiceHint: React.FC = () => {
	return (
		<div className={`${localStorage.user_api_key && !localStorage.modelID ? "hidden" : ""} border fixed flex flex-row items-center justify-center gap-2 bottom-5 left-5 right-5 w-fit z-[99] px-4 py-2 max-w-[50] rounded-xl backdrop-blur-[50px] bg-amber-500/10 dark:bg-amber-900/10 border-amber-500/30 text-amber-500 font-bold`}>
			<i className="fas fa-plug text-3xl"></i>
			<div className=" flex flex-col justify-start items-start">
				<div
					className={`${
						localStorage.user_api_key ? "hidden" : ""
					}`}
				>
					<span>
						你尚未設置 AI 服務的 API 密鑰，AI 服務暫時不可用。
					</span>
					<br />
				</div>
				<div
					className={`${
						localStorage.modelID ? "" : "hidden"
					}`}
				>
					<span>
						AI 服務正在使用你設置的 {localStorage.modelID} 模型。
					</span>
					<br />
				</div>
			</div>
		</div>
	);
};

export default AIServiceHint;
