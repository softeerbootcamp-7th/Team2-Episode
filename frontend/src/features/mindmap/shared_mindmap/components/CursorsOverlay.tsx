import { PerfectCursor } from "perfect-cursors";
import React, { useLayoutEffect, useRef, useState } from "react";

import { useCursors } from "@/features/mindmap/shared_mindmap/hooks/useCursors";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorManager";

// --- [Sub Component] 개별 커서 (Perfect Cursor 적용) ---
const OtherUserCursor = ({
    point,
    color,
    name,
    pan,
}: {
    point: { x: number; y: number }; // World 좌표
    color: string;
    name: string;
    pan: { x: number; y: number };
}) => {
    const rCursor = useRef<HTMLDivElement>(null);
    const [pc] = useState(
        () =>
            new PerfectCursor((point) => {
                // PerfectCursor가 계산해준 매 프레임의 좌표 (point)
                if (rCursor.current) {
                    // [중요] 여기서 Pan 값을 더해서 화면 좌표로 변환
                    // Hooks 안에서 pan 값을 실시간으로 참조하기 위해 ref나 closure 주의 필요
                    // 하지만 performant한 애니메이션을 위해 style 직접 수정
                    rCursor.current.style.setProperty("transform", `translate(${point[0]}px, ${point[1]}px)`);
                }
            }),
    );

    // 1. World 좌표가 업데이트되면 PerfectCursor에게 "여기로 가!"라고 알려줌
    useLayoutEffect(() => {
        // Pan은 CSS transform 단계에서 더해지므로, PC에는 World 좌표만 줌?
        // -> 아님. PC는 궤적 계산기임.
        // 화면에 그릴 때 (Pan + PC값)을 해야 함.
        // 하지만 PC 콜백 안에서 Pan state를 가져오기 까다로우므로,
        // PC에게는 [화면 좌표]를 줘버리는게 가장 부드러움.

        const screenX = point.x + pan.x;
        const screenY = point.y + pan.y;
        pc.addPoint([screenX, screenY]);
    }, [point, pc, pan]); // pan이 바뀌어도 목표 지점이 바뀌는 것이므로 addPoint

    // 2. 컴포넌트 언마운트 시 정리
    React.useEffect(() => {
        return () => pc.dispose();
    }, [pc]);

    return (
        <div
            ref={rCursor}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "12px",
                height: "12px",
                pointerEvents: "none",
                zIndex: 9999,
                // transition 제거! (PerfectCursor가 JS로 매 프레임 움직여줌)
                willChange: "transform",
            }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={color} style={{ transform: "translate(-2px, -2px)" }}>
                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L11.7841 12.3673H5.65376Z" />
            </svg>
            <div
                style={{
                    position: "absolute",
                    top: 15,
                    left: 10,
                    backgroundColor: color,
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    whiteSpace: "nowrap",
                }}
            >
                {name}
            </div>
        </div>
    );
};

// --- [Main Component] Overlay ---
type Props = {
    manager: CollaboratorsManager;
    pan: { x: number; y: number };
};

export function CursorOverlay({ manager, pan }: Props) {
    const cursors = useCursors(manager);

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                overflow: "hidden",
                zIndex: 9999,
            }}
        >
            {Array.from(cursors.entries()).map(([userId, cursor]) => (
                <OtherUserCursor
                    key={userId}
                    point={{ x: cursor.x, y: cursor.y }}
                    color={cursor.color}
                    name={cursor.name}
                    pan={pan}
                />
            ))}
        </div>
    );
}
