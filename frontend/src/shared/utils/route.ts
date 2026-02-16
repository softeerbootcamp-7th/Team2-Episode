export const PATHS = {
    home: "/",
    mindmap: {
        list: "/mindmaps",
        create: "/mindmaps/create",
        detail: "/mindmaps/:mindmapId",
    },
    episode_archive: "/episode_archive",
    self_diagnosis: {
        list: "/self_diagnoses",
        detail: "/self_diagnoses/:selfDiagnosisId",
    },
    login: "/login",
    landing: "/landing",
} as const;

export const linkTo = {
    home: () => PATHS.home,

    mindmap: {
        list: () => PATHS.mindmap.list,
        create: () => PATHS.mindmap.create,
        detail: (mindmapId: number | string) => PATHS.mindmap.detail.replace(":mindmapId", String(mindmapId)),
    },

    episode_archive: () => PATHS.episode_archive,

    self_diagnosis: {
        list: () => PATHS.self_diagnosis.list,
        detail: (selfDiagnosisId: number | string) =>
            PATHS.self_diagnosis.detail.replace(":selfDiagnosisId", String(selfDiagnosisId)),
    },

    login: () => PATHS.login,
    landing: () => PATHS.landing,
};
