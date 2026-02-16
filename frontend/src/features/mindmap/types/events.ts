import { NodeDirection, NodeId } from "@/features/mindmap/types/node";

/** * 정해진 규칙이 있는 정적 이벤트들
 */
type StaticEvents = {
    // 1. 입력 신호
    RAW_MOUSE_DOWN: React.MouseEvent | MouseEvent;
    RAW_MOUSE_MOVE: React.MouseEvent | MouseEvent;
    RAW_MOUSE_UP: React.MouseEvent | MouseEvent;
    RAW_WHEEL: React.WheelEvent | WheelEvent;
    RAW_KEYDOWN: KeyboardEvent;
    NODE_DELETE: KeyboardEvent;

    // 2. [추가] 노드 관련 상호작용
    // 어떤 노드가 클릭되었는지 ID와 이벤트 객체를 함께 전달
    NODE_CLICK: { nodeId: NodeId; event: React.MouseEvent | MouseEvent };
    NODE_SELECT: { nodeId: NodeId | null }; // 노드 선택 해제는 null

    // 3. 매니저 명령
    VIEWPORT_PAN: { dx: number; dy: number };
    VIEWPORT_ZOOM: { delta: number; clientX: number; clientY: number };
    NODE_MOVE_REQUEST: { targetId: NodeId; movingId: NodeId; direction: NodeDirection };
    VIEWPORT_RESET: undefined;

    // 4. 상태 알림
    RENDER_UPDATE: undefined;
    INTERACTION_FRAME: undefined;
    DRAG_SESSION: undefined;

    // 5. 에러
    NODE_DELETE_ERROR: string;
};

/** *
 * 정적 이벤트는 고유 타입을 유지하고,
 * 그 외의 문자열(NodeId)은 '신호 전용(unknown/undefined)'으로 처리합니다.
 */
export type MindMapEvents = StaticEvents & {
    [nodeId: string]: unknown;
};
