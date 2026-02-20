export const PATHS = {
    home: "/",
    mindmap: {
        list: "/mindmaps",
        create: "/mindmaps/create",
        detail: "/mindmaps/:mindmapId",
    },
    episode_archive: "/episode_archive",
    login: "/login",
    // landing: "/landing",
} as const;

export const linkTo = {
    home: () => PATHS.home,

    mindmap: {
        list: () => PATHS.mindmap.list,
        create: () => PATHS.mindmap.create,
        detail: (mindmapId: number | string) => PATHS.mindmap.detail.replace(":mindmapId", String(mindmapId)),
    },

    episode_archive: () => PATHS.episode_archive,

    login: () => PATHS.login,
    // landing: () => PATHS.landing,
};
