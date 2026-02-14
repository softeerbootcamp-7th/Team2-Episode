import { useSyncExternalStore } from "react";

import CollaboratorsManager from "@/features/mindmap/shared_mindmap/utils/CollaboratorsManager";

export function useCursors(manager: CollaboratorsManager) {
    return useSyncExternalStore(manager.subscribe, manager.getCursorsSnapshot);
}
