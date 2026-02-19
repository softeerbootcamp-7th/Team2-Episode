export const USER_ENDPOINT = "/users";
export const USER_ME_ENDPOINT = `${USER_ENDPOINT}/me`;

export const mindmapEndpoints = {
    create: "/mindmaps",
    list: () => "/mindmaps",
    detail: (mindmapId: string) => `/mindmaps/${mindmapId}`,
    delete: (mindmapId: string) => `/mindmaps/${mindmapId}`,
    rename: (mindmapId: string) => `/mindmaps/${mindmapId}/name`,
    favorite: (mindmapId: string) => `/mindmaps/${mindmapId}/favorite`,

    node: (mindmapId: string, nodeId: string) => `/mindmaps/${mindmapId}/nodes/${nodeId}`,
} as const;

const EPISODE_BASE = "/episodes";
export const episodeEndpoints = {
    search: EPISODE_BASE,

    /** 2번: 마인드맵 내 에피소드 리스트 전체 조회 */
    list: (mindmapId: string) => `/mindmaps/${mindmapId}/episodes`,

    /** 3번: 에피소드 정보 상세 조회 (nodeId 기반) */
    detail: (nodeId: string) => `/episodes/${nodeId}`,

    /** 에피소드 전체 삭제 */
    delete: (nodeId: string) => `/episodes/${nodeId}`,

    /** 에피소드 STAR 부분 수정 */
    update: (nodeId: string) => `/episodes/${nodeId}/stars`,

    /** 에피소드 내용(STAR/태그) 초기화 */
    clear: (nodeId: string) => `/episodes/${nodeId}/stars/clear`,
} as const;
