import React from "react";

import { useCursors } from "@/features/mindmap/shared_mindmap/hooks/useCursors";
import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorsManager";

const COLOR_MAP = [
    { color: "blue", text: "text-cursor-blue", bg: "bg-cursor-blue" },
    { color: "pink", text: "text-cursor-pink", bg: "bg-cursor-pink" },
    { color: "green", text: "text-cursor-green", bg: "bg-cursor-green" },
    { color: "purple", text: "text-cursor-purple", bg: "bg-cursor-purple" },
    { color: "orange", text: "text-cursor-orange", bg: "bg-cursor-orange" },
];

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

type Props = {
    manager: CollaboratorsManager;
    pan: { x: number; y: number };
    scale: number;
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
                    scale={scale}
                />
            ))}
        </div>
    );
}

const OtherUserCursor = React.memo(
    ({
        point,
        name,
        pan,
        scale,
    }: {
        point: { x: number; y: number };
        name: string;
        pan: { x: number; y: number };
        scale: number;
    }) => {
        const color = React.useMemo(() => getColorFromName(name), [name]);

        const screenX = point.x * scale + pan.x;
        const screenY = point.y * scale + pan.y;

        return (
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `translate(${screenX}px, ${screenY}px)`,
                    transition: "transform 120ms linear",
                    pointerEvents: "none",
                    zIndex: 9999,
                    willChange: "transform",
                }}
            >
                <div className={color.text}>
                    <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: "translate(-2px, -2px)" }}>
                        <path
                            stroke="white"
                            fill="currentColor"
                            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L11.7841 12.3673H5.65376Z"
                        />
                    </svg>
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
    },
);

OtherUserCursor.displayName = "OtherUserCursor";
