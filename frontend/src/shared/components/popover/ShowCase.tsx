import React from "react";
import Popover from "./Popover"; // Popover 컴포넌트 경로

const PopoverShowcase = () => {
    return (
        <div className="p-10 space-y-20 bg-gray-50 min-h-screen">
            <div>
                <h1 className="text-2xl font-bold mb-4">Popover Collision Test</h1>
                <p className="text-gray-600">
                    빨간 테두리 박스는 <code className="bg-gray-200 px-1">overflow-hidden</code> 설정이 되어 있습니다.
                </p>
            </div>

            {/* 1. 하단 공간 부족 테스트 (Bottom -> Top 전환 확인) */}
            <section>
                <h2 className="text-lg font-semibold mb-2">1. 하단 오버플로우 (Bottom → Top)</h2>
                <div className="relative w-full h-48 border-2 border-red-400 overflow-hidden bg-white flex items-end justify-center pb-4">
                    <Popover
                        primaryDirection="bottom"
                        contents={
                            <div className="w-40 h-24 bg-blue-500 text-white p-2 rounded shadow-xl">
                                내용물이 꽤 커서 아래로 갈 곳이 없어요!
                            </div>
                        }
                    >
                        <button className="px-4 py-2 bg-black text-white rounded">클릭 (Bottom 설정)</button>
                    </Popover>
                    <div className="absolute top-2 right-2 text-xs text-red-500 font-mono">
                        overflow-hidden container
                    </div>
                </div>
            </section>

            {/* 2. 상단/측면 공간 충분 테스트 (정상 동작 확인) */}
            <section>
                <h2 className="text-lg font-semibold mb-2">2. 공간 충분 (정상 출력)</h2>
                <div className="relative w-full h-64 border-2 border-green-400 overflow-hidden bg-white flex items-center justify-center">
                    <Popover
                        primaryDirection="right"
                        secondaryDirection="top"
                        contents={
                            <div className="w-32 h-20 bg-green-500 text-white p-2 rounded shadow-xl">충분한 공간!</div>
                        }
                    >
                        <button className="px-4 py-2 bg-gray-200 rounded">우측 열기 (정상)</button>
                    </Popover>
                </div>
            </section>

            {/* 3. 복합 테스트 (우측 하단 구석) */}
            <section>
                <h2 className="text-lg font-semibold mb-2">3. 구석 배치 테스트 (대각선 전환)</h2>
                <div className="relative w-full h-48 border-2 border-red-400 overflow-hidden bg-white">
                    <div className="absolute bottom-2 right-2">
                        <Popover
                            primaryDirection="bottom"
                            secondaryDirection="left"
                            contents={
                                <div className="w-48 h-20 bg-purple-500 text-white p-2 rounded shadow-xl">
                                    구석이라 위로 가야해요.
                                </div>
                            }
                        >
                            <button className="px-4 py-2 bg-purple-100 border border-purple-300 rounded text-purple-700">
                                Corner Button
                            </button>
                        </Popover>
                    </div>
                </div>
            </section>
            <section>
                <h2 className="text-lg font-semibold mb-2">3. 구석 배치 테스트 (대각선 전환)</h2>
                <div className="relative w-full h-48 border-2 border-red-400 overflow-hidden bg-white">
                    <div className="absolute top-2 left-2">
                        <Popover
                            primaryDirection="bottom"
                            secondaryDirection="left"
                            contents={
                                <div className="w-48 h-20 bg-purple-500 text-white p-2 rounded shadow-xl">
                                    구석이라 위로 가야해요.
                                </div>
                            }
                        >
                            <button className="px-4 py-2 bg-purple-100 border border-purple-300 rounded text-purple-700">
                                Corner Button
                            </button>
                        </Popover>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PopoverShowcase;
