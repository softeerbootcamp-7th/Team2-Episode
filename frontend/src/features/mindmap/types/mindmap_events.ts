import { NodeDirection, NodeId } from "@/features/mindmap/types/node";

type StaticEvents = {
    RAW_MOUSE_DOWN: React.MouseEvent | MouseEvent;
    RAW_MOUSE_MOVE: React.MouseEvent | MouseEvent;
    RAW_MOUSE_UP: React.MouseEvent | MouseEvent;
    RAW_WHEEL: React.WheelEvent | WheelEvent;
    RAW_KEYDOWN: KeyboardEvent;
    NODE_DELETE: KeyboardEvent;

    NODE_CLICK: { nodeId: NodeId; event: React.MouseEvent | MouseEvent };
    NODE_SELECT: { nodeId: NodeId | null };

    VIEWPORT_PAN: { dx: number; dy: number };
    VIEWPORT_ZOOM: { delta: number; clientX: number; clientY: number };
    NODE_MOVE_REQUEST: { targetId: NodeId; movingId: NodeId; direction: NodeDirection };

    RENDER_UPDATE: undefined;
    INTERACTION_FRAME: undefined;
    DRAG_SESSION: undefined;

    NODE_DELETE_ERROR: string;
};

export type MindMapEvents = StaticEvents & {
    [nodeId: string]: unknown;
};
