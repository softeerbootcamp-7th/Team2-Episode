import { PerfectCursor } from "perfect-cursors";
import React, { useLayoutEffect, useRef, useState } from "react";

import { useCursors } from "@/features/mindmap/shared_mindmap/hooks/useCursors";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorManager";

// --- [Sub Component] 개별 커서 (Perfect Cursor 적용) ---
const COLOR_MAP = [
    { color: "blue", text: "text-cursor-blue", bg: "bg-cursor-blue" },
    { color: "pink", text: "text-cursor-pink", bg: "bg-cursor-pink" },
    { color: "green", text: "text-cursor-green", bg: "bg-cursor-green" },
    { color: "purple", text: "text-cursor-purple", bg: "bg-cursor-purple" },
    { color: "orange", text: "text-cursor-orange", bg: "bg-cursor-orange" },
];

// 간단하고 안정적인 32bit 해시 (FNV-1a)
function hashString(str: string): number {
    let hash = 0x811c9dc5;

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }

    return hash;
}

function getColorFromName(name: string) {
    const hash = hashString(name);
    const index = hash % COLOR_MAP.length;

    return COLOR_MAP[index]!;
}
// --- [Main Component] Overlay ---
type Props = {
    manager: CollaboratorsManager;
    pan: { x: number; y: number };
    scale: number; // scale 추가
};

export function CursorOverlay({ manager, pan, scale }: Props) {
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
                zIndex: 10,
            }}
        >
            {Array.from(cursors.entries()).map(([userId, cursor]) => (
                <OtherUserCursor
                    key={userId}
                    point={{ x: cursor.x, y: cursor.y }}
                    name={cursor.name}
                    pan={pan}
                    scale={scale} // scale 전달
                />
            ))}
        </div>
    );
}

// --- [Sub Component] 개별 커서 ---
const OtherUserCursor = ({
    point,
    name,
    pan,
    scale, // scale 파라미터 추가
}: {
    point: { x: number; y: number };
    name: string;
    pan: { x: number; y: number };
    scale: number;
}) => {
    const rCursor = useRef<HTMLDivElement>(null);
    const color = React.useMemo(() => getColorFromName(name), [name]);

    const [pc] = useState(
        () =>
            new PerfectCursor((p) => {
                if (rCursor.current) {
                    // 계산된 최종 화면 좌표로 이동
                    rCursor.current.style.setProperty("transform", `translate(${p[0]}px, ${p[1]}px)`);
                }
            }),
    );

    useLayoutEffect(() => {
        // [핵심 로직]
        // 1. World 좌표(point)에 현재 배율(scale)을 곱합니다.
        // 2. 그 결과에 Pan 값을 더해 최종 화면(Screen) 위치를 구합니다.
        const screenX = point.x * scale + pan.x;
        const screenY = point.y * scale + pan.y;

        pc.addPoint([screenX, screenY]);
    }, [point, pc, pan, scale]); // scale이 바뀔 때도 위치를 재계산해야 함

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
                pointerEvents: "none",
                zIndex: 9999,
                willChange: "transform",
            }}
        >
            {/* 커서 아이콘: 스타일은 className이나 style로 적용 */}
            <div className={color.text}>
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: "translate(-2px, -2px)" }}>
                    <path
                        stroke="white"
                        fill="currentColor"
                        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L11.7841 12.3673H5.65376Z"
                    />
                </svg>
                {/* 유저 이름 라벨 */}
                <div
                    className={color.bg}
                    style={{
                        position: "absolute",
                        top: 15,
                        left: 10,
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
        </div>
    );
};
