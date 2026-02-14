export const mindmapEndpoints = {
    create: "/mindmaps",
    list: () => "/mindmaps",
    detail: (mindmapId: string) => `/mindmaps/${mindmapId}`,
    delete: (mindmapId: string) => `/mindmaps/${mindmapId}`,
    rename: (mindmapId: string) => `/mindmaps/${mindmapId}/name`,
    favorite: (mindmapId: string) => `/mindmaps/${mindmapId}/favorite`,

    node: (mindmapId: string, nodeId: string) => `/mindmaps/${mindmapId}/nodes/${nodeId}`,
} as const;
