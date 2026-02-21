import { ActivityCategoryItem, MindmapType } from "@/features/mindmap/types/mindmap";
import { SelectFrom } from "@/shared/types/utility_type";

export type CreateMindmapFunnel = {
    TYPE: { mindmapType?: MindmapType };
    TEAM_DETAIL: { mindmapType: SelectFrom<MindmapType, "PUBLIC">; projectName?: string; episodes: string[] };
    CATEGORY: {
        mindmapType: SelectFrom<MindmapType, "PRIVATE">;
        categories?: ActivityCategoryItem[];
        projectName?: string;
        episodes?: string[];
    };
};
