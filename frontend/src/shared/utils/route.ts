export const PATHS = {
    home: "/",
    mindmap: {
        list: "/mindmaps",
        create: "/mindmaps/create",
        detail: "/mindmaps/:mindmap_id",
    },
    episode_archive: "/episode_archive",
    self_diagnoses: {
        list: "/self_diagnoses",
        detail: "/self_diagnoses/:self_diagnosis_id",
        start: "/self_diagnoses/start",
        question: "/self_diagnoses/:job_id",
        question_result: "/self_diagnoses/:job_id",
    },
    diagnoses: {
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
        detail: (mindmapId: number | string) => PATHS.mindmap.detail.replace(":mindmap_id", String(mindmapId)),
    },

    episode_archive: () => PATHS.episode_archive,

    self_diagnosis: {
        list: () => PATHS.self_diagnoses.list,
        start: () => PATHS.self_diagnoses.start,
        detail: (selfDiagnosisId: number | string) =>
            PATHS.self_diagnoses.detail.replace(":self_diagnosis_id", String(selfDiagnosisId)),
        question: (jobId: number | string) => PATHS.self_diagnoses.question.replace(":job_id", String(jobId)),
        question_result: (jobId: number | string) =>
            PATHS.self_diagnoses.question_result.replace(":job_id", String(jobId)),
    },

    diagnoses: {
        applyExisting: (diagnosisId: number | string) =>
            PATHS.diagnoses.applyExisting.replace(":diagnosisId", String(diagnosisId)),
        applyNew: (diagnosisId: number | string) =>
            PATHS.diagnoses.applyNew.replace(":diagnosisId", String(diagnosisId)),
    },

    login: () => PATHS.login,
    landing: () => PATHS.landing,
};
