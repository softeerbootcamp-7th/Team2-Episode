export type MindmapType = "ALL" | "PUBLIC" | "PRIVATE";

export const MINDMAP_TABS: { id: MindmapType; label: string }[] = [
    { id: "ALL", label: "전체" },
    { id: "PRIVATE", label: "개인 마인드맵" },
    { id: "PUBLIC", label: "팀 마인드맵" },
] as const;

export type MindmapTabId = (typeof MINDMAP_TABS)[number]["id"];

export type MindmapItem = {
    mindmapId: string;
    mindmapName: string;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean;
};

export type ActivityCategory = "INTERN" | "STUDY" | "CLUB" | "PROJECT" | "VOLUNTEER" | "PARTTIME" | "CONTEST" | "ETC";

export const ACTIVITY_CATEGORIES: ReadonlyArray<{ id: ActivityCategory; label: string; emoji: string }> = [
    { id: "INTERN", label: "인턴", emoji: "💼" },
    { id: "STUDY", label: "학업", emoji: "📚" },
    { id: "CLUB", label: "동아리", emoji: "🎯" },
    { id: "PROJECT", label: "프로젝트", emoji: "🚀" },
    { id: "PARTTIME", label: "아르바이트", emoji: "💰" },
    { id: "VOLUNTEER", label: "봉사활동", emoji: "🍀" },
    { id: "CONTEST", label: "공모전", emoji: "🏆" },
    { id: "ETC", label: "기타", emoji: "✨" },
];
