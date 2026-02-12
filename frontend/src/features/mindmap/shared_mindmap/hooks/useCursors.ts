import { useSyncExternalStore } from "react";

import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorManager";

// hooks/useCursors.ts (신규)
export function useCursors(manager: CollaboratorsManager) {
    // cursorsCache 참조가 바뀔 때(마우스 움직일 때)마다 리렌더링 발생
    return useSyncExternalStore(manager.subscribe, manager.getCursorsSnapshot);
}
