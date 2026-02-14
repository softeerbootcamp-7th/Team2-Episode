export const mindmapKeys = {
    all: ["mindmaps"] as const,

    lists: () => [...mindmapKeys.all, "list"] as const,
    list: (filters: { type: string }) => [...mindmapKeys.lists(), { ...filters }] as const,

    details: () => [...mindmapKeys.all, "detail"] as const,
    detail: (id: string) => [...mindmapKeys.details(), id] as const,
};
