/**
 * 공간 관련
 */
export type Point = {
    x: number;  //노드 정중아 world 좌표
    y: number;
    id: string;
};

export type Rect = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

export type ViewportTransform = {
    // 카메라 설정 값
    x: number;
    y: number;
    scale: number;
};
