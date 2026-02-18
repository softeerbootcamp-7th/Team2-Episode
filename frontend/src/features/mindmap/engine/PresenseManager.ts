// frontend/src/features/mindmap/engine/PresenseManager.ts

import type {
    AwarenessLike,
    CursorPoint,
    CursorsSlice,
    LockInfo,
    LocksSlice,
    LockState,
    Participant,
    PresenceSlice,
    PresenceUserProfile,
    RemoteCursor,
} from "@/features/mindmap/engine/types";
import type { NodeId } from "@/features/mindmap/types/node";

type Deps = {
    awareness: AwarenessLike;

    // cursor 계산용
    getCanvasRect: () => DOMRect | null;
    screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };

    // store commit
    commitPresence: (next: PresenceSlice) => void;
    commitCursors: (next: CursorsSlice) => void;
    commitLocks: (next: LocksSlice) => void;
};

function isInsideRect(rect: DOMRect, x: number, y: number) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function shallowEqualParticipants(a: Participant[], b: Participant[]) {
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

function shallowEqualCursors(a: RemoteCursor[], b: RemoteCursor[]) {
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

function shallowEqualLocks(a: LocksSlice, b: LocksSlice) {
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
 * ✅ 역할
 * - awareness에 local user + cursor + lock 상태를 세팅
 * - remote states 변화 감지 -> participants/cursors/locks를 분리해서 store에 반영
 * - cursor update는 rAF로 throttle
 */
export class PresenceManager {
    private deps: Deps;
    private localUser: PresenceUserProfile;

    private disposed = false;

    private lastPresence: PresenceSlice = { enabled: true, selfClientId: null, participants: [] };
    private lastCursors: CursorsSlice = { enabled: true, selfClientId: null, cursors: [] };
    private lastLocks: LocksSlice = {
        enabled: true,
        selfClientId: null,
        selfLockedNodeId: null,
        byNodeId: new Map(),
    };

    // cursor throttle
    private pendingCursor: CursorPoint | null = null;
    private cursorRaf: number | null = null;

    private onAwarenessChange = (_evt: unknown) => {
        this.syncFromAwareness();
    };

    constructor(deps: Deps, user: PresenceUserProfile) {
        this.deps = deps;
        this.localUser = user;

        // local state 보장 + user 설정
        this.ensureLocalState();
        this.deps.awareness.setLocalStateField("user", this.localUser);
        this.deps.awareness.setLocalStateField("cursor", null);
        this.deps.awareness.setLocalStateField("lock", null);

        // subscribe
        this.deps.awareness.on("change", this.onAwarenessChange);

        // initial sync
        this.syncFromAwareness();
    }

    destroy() {
        if (this.disposed) return;
        this.disposed = true;

        try {
            // ✅ 나갈 때 lock/cursor 제거 (선택이지만 권장)
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

    // ---- Cursor ----

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

    setCursor(cursor: CursorPoint) {
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

    // ---- Lock ----

    /**
     * ✅ lock 획득/해제 (awareness에 저장)
     * - nodeId가 있으면 lock
     * - null이면 unlock
     * - 이미 다른 사람이 잠근 nodeId면 false 반환
     */
    setLock(nodeId: NodeId | null): boolean {
        this.ensureLocalState();

        const awareness = this.deps.awareness;
        const selfId = awareness.clientID;

        if (nodeId) {
            // 다른 사람이 이미 lock 중인지 검사
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

    // ---- Sync ----

    private syncFromAwareness() {
        if (this.disposed) return;

        const awareness = this.deps.awareness;
        const selfId = awareness.clientID;
        const states = awareness.getStates();

        const participants: Participant[] = [];
        const cursors: RemoteCursor[] = [];

        // lock 후보 수집(충돌 해결 포함)
        const locksByNodeId = new Map<NodeId, LockInfo>();
        let desiredSelfLockNodeId: NodeId | null = null;
        let desiredSelfLockAt = 0;

        states.forEach((state, clientId) => {
            const user = state?.user;
            if (!user) return;

            console.log(user);

            const isSelf = clientId === selfId;

            participants.push({ clientId, user, isSelf });

            const cursor = state?.cursor;
            if (!isSelf && cursor && typeof cursor.x === "number" && typeof cursor.y === "number") {
                cursors.push({ clientId, user, cursor });
            }

            const lock = state?.lock;
            if (lock && lock.nodeId) {
                const ts = lock.at;
                // self가 원하는 lock 기록
                if (isSelf) {
                    desiredSelfLockNodeId = lock.nodeId;
                    desiredSelfLockAt = ts;
                }

                const candidate: LockInfo = { nodeId: lock.nodeId, clientId, user, timestamp: ts };

                const prev = locksByNodeId.get(lock.nodeId);
                if (!prev) {
                    locksByNodeId.set(lock.nodeId, candidate);
                } else {
                    // ✅ 충돌 해결: 먼저 잡은(at 작은) 사람이 승자, 동률이면 clientId 작은 사람이 승자
                    if (candidate.timestamp < prev.timestamp) locksByNodeId.set(lock.nodeId, candidate);
                    else if (candidate.timestamp === prev.timestamp && candidate.clientId < prev.clientId)
                        locksByNodeId.set(lock.nodeId, candidate);
                }
            }
        });

        // self lock winner check
        let selfLockedNodeId: NodeId | null = null;
        if (desiredSelfLockNodeId) {
            const winner = locksByNodeId.get(desiredSelfLockNodeId);
            if (winner?.clientId === selfId) {
                selfLockedNodeId = desiredSelfLockNodeId;
            } else {
                // 내가 lock을 잡았다고 생각하지만 경쟁에서 졌다면 local lock 해제
                if (desiredSelfLockAt > 0) {
                    try {
                        awareness.setLocalStateField("lock", null);
                    } catch {
                        // ignore
                    }
                }
            }
        }

        // stable order
        participants.sort((a, b) => {
            if (a.isSelf && !b.isSelf) return -1;
            if (!a.isSelf && b.isSelf) return 1;
            return a.user.name.localeCompare(b.user.name);
        });

        cursors.sort((a, b) => a.user.name.localeCompare(b.user.name));

        const nextPresence: PresenceSlice = { enabled: true, selfClientId: selfId, participants };
        const nextCursors: CursorsSlice = { enabled: true, selfClientId: selfId, cursors };

        const nextLocks: LocksSlice = {
            enabled: true,
            selfClientId: selfId,
            selfLockedNodeId,
            byNodeId: locksByNodeId,
        };

        // publish presence/cursors
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

        // publish locks
        if (!shallowEqualLocks(this.lastLocks, nextLocks)) {
            this.lastLocks = nextLocks;
            this.deps.commitLocks(nextLocks);
        }
    }
}
