import { useMemo } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import Mindmap from "@/features/mindmap/core/Mindmap";
import { useMindmapSession } from "@/features/mindmap/hooks/useMindmapSession";
import Spinner from "@/shared/components/spinner/Spinner";

// TODO: 커서 테스트용 컬러
const COLORS = ["#34a7ff", "#fd69b9", "#0ed038", "#7749ff", "#ff913c"];

export default function MindmapDetailPage() {
    const { mindmapId } = useParams<{ mindmapId: string }>();

    if (!mindmapId) {
        throw new Error("올바르지 않은 마인드맵 접근입니다.1");
    }

    const { user: userInfo } = useAuth();

    const user = useMemo(() => {
        if (!userInfo) return undefined;
        return {
            id: String(userInfo.userId),
            name: userInfo.nickname,
            color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        };
    }, [userInfo?.userId, userInfo?.nickname]);

    const { doc, provider, isSynced } = useMindmapSession({
        mindmapId,
        enableAwareness: true,
        userInfo,
    });

    const config = useMemo(
        () => ({
            layout: { xGap: 100, yGap: 20 },
            interaction: { dragThreshold: 5 },
        }),
        [],
    );

    if (!isSynced) {
        return (
            <div className="h-full w-full flex justify-center items-center">
                <Spinner contents={"서버에서 마인드맵 데이터를 불러오는 중입니다..."} />
            </div>
        );
    }

    return <Mindmap doc={doc} provider={provider} user={user} mindmapId={mindmapId} config={config} />;
}
