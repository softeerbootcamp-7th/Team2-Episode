import { throttle } from "lodash-es";
import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";

import { CursorMap, UserProfile } from "@/features/mindmap/shared_mindmap/types/collaborator";

export default class CollaboratorsManager {
    private awareness: Awareness;
    private localUser: UserProfile;

    private collaboratorsCache: UserProfile[] = [];
    private cursorsCache: CursorMap = new Map();

    constructor({ provider, userInfo }: { provider: WebsocketProvider; userInfo: UserProfile }) {
        this.awareness = provider.awareness;
        this.localUser = userInfo;

        this.setLocalState();

        if (typeof window !== "undefined") {
            window.addEventListener("beforeunload", () => this.destroy());
        }

        // 초기화
        this.processAwarenessData();
    }

    private setLocalState() {
        this.awareness.setLocalState({
            user: this.localUser,
            cursor: null,
        });
    }

    public updateCursor = throttle((x: number, y: number) => {
        this.awareness.setLocalStateField("cursor", { x, y });
    }, 80);

    private processAwarenessData() {
        const states = this.awareness.getStates();

        const newCollaborators: UserProfile[] = [];
        const newCursors: CursorMap = new Map();

        const isCollaboratorsChanged = false;

        states.forEach((state: any, clientId: number) => {
            if (!state.user) return;

            newCollaborators.push(state.user);

            if (clientId !== this.awareness.clientID && state.cursor) {
                newCursors.set(state.user.id, {
                    x: state.cursor.x,
                    y: state.cursor.y,
                    color: state.user.color,
                    name: state.user.name,
                });
            }
        });

        // [최적화 핵심 1] 유저 목록이 실제로 변했을 때만 캐시 교체 (깊은 비교 또는 길이/ID 비교)
        // 여기서는 간단히 JSON 문자열 비교 예시 (실제론 더 효율적인 비교 권장)
        newCollaborators.sort((a, b) => a.id.localeCompare(b.id)); // 순서 보장
        if (JSON.stringify(this.collaboratorsCache) !== JSON.stringify(newCollaborators)) {
            this.collaboratorsCache = newCollaborators;
        }

        this.cursorsCache = newCursors;
    }

    subscribe = (callback: () => void) => {
        const handler = () => {
            this.processAwarenessData();
            callback();
        };
        this.awareness.on("change", handler);
        return () => this.awareness.off("change", handler);
    };

    // 1. 유저 목록 스냅샷
    getCollaboratorsSnapshot = () => {
        return this.collaboratorsCache;
    };

    // 2. 커서 스냅샷
    getCursorsSnapshot = () => {
        return this.cursorsCache;
    };

    destroy() {
        this.updateCursor.cancel(); // throttle 취소
        this.awareness.setLocalState(null);
    }
}
