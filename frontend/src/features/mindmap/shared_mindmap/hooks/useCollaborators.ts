import { useSyncExternalStore } from "react";

import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorManager";

// hooks/useCollaborators.ts (기존)
export function useCollaborators(manager: CollaboratorsManager) {
    // collaboratorsCache 참조가 바뀔 때만 리렌더링 발생
    return useSyncExternalStore(manager.subscribe, manager.getCollaboratorsSnapshot);
}
