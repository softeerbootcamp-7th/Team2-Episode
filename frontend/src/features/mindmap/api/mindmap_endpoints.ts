export const mindmapEndpoints = {
    create: "/mindmaps",

    list: () => "/mindmaps",

    detail: (mindmapId: string) => `/mindmaps/${mindmapId}`,

    node: (mindmapId: string, nodeId: string) => `/mindmaps/${mindmapId}/nodes/${nodeId}`,
} as const;
