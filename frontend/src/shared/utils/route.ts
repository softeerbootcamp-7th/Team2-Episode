export const PATHS = {
    home: "/",
    mindmap: {
        list: "/mindmaps",
        create: "/mindmaps/create",
        detail: "/mindmaps/:mindmapId",
    },
    episode_archive: "/episode_archive",
    self_diagnoses: {
        list: "/self_diagnoses",
        detail: "/self_diagnoses/:selfDiagnosisId",
        start: "/self_diagnoses/start",
        question: "/self_diagnoses/:jobId",
        question_result: "/self_diagnoses/:jobId",
        applyExisting: "/diagnoses/:diagnosisId/apply/existing",
        applyNew: "/diagnoses/:diagnosisId/apply/new",
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
        list: () => PATHS.self_diagnoses.list,
        start: () => PATHS.self_diagnoses.start,
        detail: (selfDiagnosisId: number | string) =>
            PATHS.self_diagnoses.detail.replace(":selfDiagnosisId", String(selfDiagnosisId)),
        question: (jobId: number | string) => PATHS.self_diagnoses.question.replace(":job_id", String(jobId)),
        question_result: (jobId: number | string) =>
            PATHS.self_diagnoses.question_result.replace(":job_id", String(jobId)),
        applyExisting: (diagnosisId: number | string) =>
            PATHS.self_diagnoses.applyExisting.replace(":diagnosisId", String(diagnosisId)),
        applyNew: (diagnosisId: number | string) =>
            PATHS.self_diagnoses.applyNew.replace(":diagnosisId", String(diagnosisId)),
    },

    login: () => PATHS.login,
    landing: () => PATHS.landing,
};
