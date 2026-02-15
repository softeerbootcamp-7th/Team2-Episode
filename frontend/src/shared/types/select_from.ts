/**
 * Extract는 자동완성이 지원이 안되므로 필요하다면 해당 타입으로 감싸 사용합니다.
 */
export type SelectFrom<T extends string, K extends T> = K;
