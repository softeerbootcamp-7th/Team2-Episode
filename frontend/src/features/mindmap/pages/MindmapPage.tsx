import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { useJoinMindmapSession } from "@/features/mindmap/shared_mindmap/hooks/useJoinMindmapSession";
import { useSharedMindmap } from "@/features/mindmap/shared_mindmap/hooks/useSharedMindmap";

const MindmapPage = () => {
    const { mindmapId } = useParams<{ mindmapId: string }>();

    const [token, setToken] = useState<string | null>(null);
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

    // 1. 세션 참여 API 호출
    const { mutate: joinSession } = useJoinMindmapSession();

    useEffect(() => {
        if (mindmapId && !token) {
            joinSession(mindmapId, {
                onSuccess: (data) => {
                    console.log("Joined session:", data);
                    setToken(data.token);
                    setSnapshotUrl(data.presignedUrl); // URL 저장
                },
            });
        }
    }, [mindmapId, joinSession, token]);

    // 2. 훅에 URL 전달 (내부에서 fetch -> apply -> connect 수행)
    const { controller, connectionStatus, isLoading } = useSharedMindmap({
        roomId: mindmapId || "",
        token: token,
        initialSnapshotUrl: snapshotUrl, // 전달
    });

    if (!mindmapId) return <div>잘못된 접근입니다.</div>;

    // 로딩 중 (API 호출 중이거나, 스냅샷 다운로드 중이거나, 소켓 연결 준비 중)
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>마인드맵 데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <div className="fixed top-4 right-4 z-50 bg-white p-2 rounded shadow">상태: {connectionStatus}</div>
            {/* 캔버스 렌더링 (controller 사용) */}
        </div>
    );
};

export default MindmapPage;
