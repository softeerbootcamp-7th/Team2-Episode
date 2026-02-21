import { MindmapType } from "@/features/mindmap/types/mindmap";
export const PATHS = {
    home: "/",
    mindmap: {
        list: "/mindmaps",
        create: "/create/mindmaps/:mindmapType?",
        detail: "/mindmaps/:mindmapId",
    },
    episode_archive: "/episode_archive",
    login: "/login",
} as const;

export const linkTo = {
    home: () => PATHS.home,

    mindmap: {
        list: () => PATHS.mindmap.list,
        create: (type: MindmapType | "" = "") =>
            PATHS.mindmap.create.replace(type ? ":mindmapType?" : "/:mindmapType?", type),
        detail: (mindmapId: number | string) => PATHS.mindmap.detail.replace(":mindmapId", String(mindmapId)),
    },

    episode_archive: () => PATHS.episode_archive,

    login: () => PATHS.login,
};
