/**
 * 덕타이핑
 * mouseEvent, touchEvent 등을 한번에 쓸 수 있는 PointerEvent를 필요한 메서드만 추린 PointerLikeEvent
 */
export type PointerLikeEvent = {
    clientX: number;
    clientY: number;
    button?: number;
    buttons?: number;
    target?: EventTarget | null;

    preventDefault?: () => void;
    stopPropagation?: () => void;
};

export type KeyLikeEvent = {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    code?: string; // 물리적 키 코드
    target: EventTarget | null;

    preventDefault?: () => void;
};

export type WheelLikeEvent = {
    deltaY: number;
    clientX: number;
    clientY: number;

    preventDefault?: () => void;
};
