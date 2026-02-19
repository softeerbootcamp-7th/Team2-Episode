import {
    AwarenessLike,
    Collaborator,
    CollaboratorCursor,
    CollaboratorCursorsInfo,
    CollaboratorInfo,
    Collaborators,
    CursorPos,
    LockInfo,
    LocksInfo,
    LockState,
} from "@/features/mindmap/types/mindmap_collaboration";
import type { NodeId } from "@/features/mindmap/types/node";

type Deps = {
    awareness: AwarenessLike;

    getCanvasRect: () => DOMRect | null;
    screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };

    commitPresence: (next: Collaborators) => void;
    commitCursors: (next: CollaboratorCursorsInfo) => void;
    commitLocks: (next: LocksInfo) => void;
};

function isInsideRect(rect: DOMRect, x: number, y: number) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function shallowEqualParticipants(a: Collaborator[], b: Collaborator[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const A = a[i]!;
        const B = b[i]!;
        if (
            A.clientId !== B.clientId ||
            A.isSelf !== B.isSelf ||
            A.user.id !== B.user.id ||
            A.user.name !== B.user.name ||
            A.user.color !== B.user.color
        ) {
            return false;
        }
    }
    return true;
}

function shallowEqualCursors(a: CollaboratorCursor[], b: CollaboratorCursor[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const A = a[i]!;
        const B = b[i]!;
        if (
            A.clientId !== B.clientId ||
            A.cursor.x !== B.cursor.x ||
            A.cursor.y !== B.cursor.y ||
            A.user.id !== B.user.id ||
            A.user.name !== B.user.name ||
            A.user.color !== B.user.color
        ) {
            return false;
        }
    }
    return true;
}

function sameLockInfo(a: LockInfo, b: LockInfo) {
    return (
        a.nodeId === b.nodeId &&
        a.clientId === b.clientId &&
        a.timestamp === b.timestamp &&
        a.user.id === b.user.id &&
        a.user.name === b.user.name &&
        a.user.color === b.user.color
    );
}

function shallowEqualLocks(a: LocksInfo, b: LocksInfo) {
    if (a === b) return true;
    if (a.enabled !== b.enabled) return false;
    if (a.selfClientId !== b.selfClientId) return false;
    if (a.selfLockedNodeId !== b.selfLockedNodeId) return false;

    if (a.byNodeId.size !== b.byNodeId.size) return false;
    for (const [nodeId, infoA] of a.byNodeId.entries()) {
        const infoB = b.byNodeId.get(nodeId);
        if (!infoB) return false;
        if (!sameLockInfo(infoA, infoB)) return false;
    }
    return true;
}

/**
 * - awareness에 local user + cursor + lock 상태를 세팅
 * - remote states 변화 감지 -> participants/cursors/locks를 분리해서 store에 반영
 * - cursor update는 rAF로 throttle
 */
export class CollaborationManager {
    private deps: Deps;
    private localUser: CollaboratorInfo;

    private disposed = false;

    private lastPresence: Collaborators = { enabled: true, selfClientId: null, participants: [] };
    private lastCursors: CollaboratorCursorsInfo = { enabled: true, selfClientId: null, cursors: [] };
    private lastLocks: LocksInfo = {
        enabled: true,
        selfClientId: null,
        selfLockedNodeId: null,
        byNodeId: new Map(),
    };

    // cursor throttle
    private pendingCursor: CursorPos | null = null;
    private cursorRaf: number | null = null;

    private onAwarenessChange = (_evt: unknown) => {
        this.syncFromAwareness();
    };

    constructor(deps: Deps, user: CollaboratorInfo) {
        this.deps = deps;
        this.localUser = user;

        this.ensureLocalState();
        this.deps.awareness.setLocalStateField("user", this.localUser);
        this.deps.awareness.setLocalStateField("cursor", null);
        this.deps.awareness.setLocalStateField("lock", null);

        this.deps.awareness.on("change", this.onAwarenessChange);

        this.syncFromAwareness();
    }

    destroy() {
        if (this.disposed) return;
        this.disposed = true;

        try {
            this.deps.awareness.setLocalStateField("cursor", null);
            this.deps.awareness.setLocalStateField("lock", null);
        } catch {
            // ignore
        }

        try {
            this.deps.awareness.off("change", this.onAwarenessChange);
        } catch {
            // ignore
        }

        if (this.cursorRaf) {
            cancelAnimationFrame(this.cursorRaf);
            this.cursorRaf = null;
        }
    }

    handlePointerMove(clientX: number, clientY: number) {
        const rect = this.deps.getCanvasRect();
        if (!rect) return;

        if (!isInsideRect(rect, clientX, clientY)) {
            this.clearCursor();
            return;
        }

        const world = this.deps.screenToWorld(clientX, clientY);
        this.setCursor(world);
    }

    clearCursor() {
        this.pendingCursor = null;
        this.scheduleCursorFlush();
    }

    setCursor(cursor: CursorPos) {
        this.pendingCursor = cursor;
        this.scheduleCursorFlush();
    }

    private scheduleCursorFlush() {
        if (this.cursorRaf) return;
        this.cursorRaf = requestAnimationFrame(() => {
            this.cursorRaf = null;
            this.flushCursor();
        });
    }

    private flushCursor() {
        this.ensureLocalState();
        this.deps.awareness.setLocalStateField("cursor", this.pendingCursor);
    }

    setLock(nodeId: NodeId | null): boolean {
        this.ensureLocalState();

        const awareness = this.deps.awareness;
        const selfId = awareness.clientID;

        if (nodeId) {
            const states = awareness.getStates();
            for (const [clientId, st] of states.entries()) {
                if (clientId === selfId) continue;

                const lock = st?.lock;
                if (lock && lock.nodeId === nodeId) {
                    return false;
                }
            }

            awareness.setLocalStateField("lock", { nodeId, at: Date.now() } satisfies Exclude<LockState, null>);

            return true;
        }

        awareness.setLocalStateField("lock", null);

        return true;
    }

    private ensureLocalState() {
        const local = this.deps.awareness.getLocalState();
        if (local == null) {
            this.deps.awareness.setLocalState({});
        }
    }

    private syncFromAwareness() {
        if (this.disposed) return;

        const awareness = this.deps.awareness;
        const selfId = awareness.clientID;
        const states = awareness.getStates();

        const participants: Collaborator[] = [];
        const cursors: CollaboratorCursor[] = [];

        const locksByNodeId = new Map<NodeId, LockInfo>();
        let desiredSelfLockNodeId: NodeId | null = null;
        let desiredSelfLockAt = 0;

        states.forEach((state, clientId) => {
            const user = state?.user;
            if (!user) return;

            const isSelf = clientId === selfId;

            participants.push({ clientId, user, isSelf });

            const cursor = state?.cursor;
            if (!isSelf && cursor && typeof cursor.x === "number" && typeof cursor.y === "number") {
                cursors.push({ clientId, user, cursor });
            }

            const lock = state?.lock;
            if (lock && lock.nodeId) {
                const ts = lock.at;
                if (isSelf) {
                    desiredSelfLockNodeId = lock.nodeId;
                    desiredSelfLockAt = ts;
                }

                const candidate: LockInfo = { nodeId: lock.nodeId, clientId, user, timestamp: ts };

                const prev = locksByNodeId.get(lock.nodeId);
                if (!prev) {
                    locksByNodeId.set(lock.nodeId, candidate);
                } else {
                    if (candidate.timestamp < prev.timestamp) locksByNodeId.set(lock.nodeId, candidate);
                    else if (candidate.timestamp === prev.timestamp && candidate.clientId < prev.clientId)
                        locksByNodeId.set(lock.nodeId, candidate);
                }
            }
        });

        let selfLockedNodeId: NodeId | null = null;
        if (desiredSelfLockNodeId) {
            const winner = locksByNodeId.get(desiredSelfLockNodeId);
            if (winner?.clientId === selfId) {
                selfLockedNodeId = desiredSelfLockNodeId;
            } else {
                if (desiredSelfLockAt > 0) {
                    try {
                        awareness.setLocalStateField("lock", null);
                    } catch {
                        // ignore
                    }
                }
            }
        }

        participants.sort((a, b) => {
            if (a.isSelf && !b.isSelf) return -1;
            if (!a.isSelf && b.isSelf) return 1;
            return a.user.name.localeCompare(b.user.name);
        });

        cursors.sort((a, b) => a.user.name.localeCompare(b.user.name));

        const nextPresence: Collaborators = { enabled: true, selfClientId: selfId, participants };
        const nextCursors: CollaboratorCursorsInfo = { enabled: true, selfClientId: selfId, cursors };

        const nextLocks: LocksInfo = {
            enabled: true,
            selfClientId: selfId,
            selfLockedNodeId,
            byNodeId: locksByNodeId,
        };

        if (
            this.lastPresence.selfClientId !== nextPresence.selfClientId ||
            !shallowEqualParticipants(this.lastPresence.participants, nextPresence.participants)
        ) {
            this.lastPresence = nextPresence;
            this.deps.commitPresence(nextPresence);
        }

        if (
            this.lastCursors.selfClientId !== nextCursors.selfClientId ||
            !shallowEqualCursors(this.lastCursors.cursors, nextCursors.cursors)
        ) {
            this.lastCursors = nextCursors;
            this.deps.commitCursors(nextCursors);
        }

        if (!shallowEqualLocks(this.lastLocks, nextLocks)) {
            this.lastLocks = nextLocks;
            this.deps.commitLocks(nextLocks);
        }
    }
}
