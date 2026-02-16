import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { MissingRequiredKeys, UnknownRecord } from "@/shared/types/utility_type";

type StepContextMap = Record<string, Record<string, unknown>>;
type StepKey<SCM extends StepContextMap> = Extract<keyof SCM, string>;

export type FunnelItem<SCM extends StepContextMap, S extends StepKey<SCM> = StepKey<SCM>> = {
    step: S;
    context: SCM[S];
};

type FunnelSnapshot<SCM extends StepContextMap> = {
    item: FunnelItem<SCM>;
    depth: number;
    nextStep?: StepKey<SCM>;
};

export type FunnelContextPatch<To extends object, From extends object> = Partial<To> &
    Pick<To, MissingRequiredKeys<To, From>>;

type HistoryController<SCM extends StepContextMap, FromStep extends StepKey<SCM>> = {
    canGoBack: boolean;

    push: <ToStep extends StepKey<SCM>>(step: ToStep, patch: FunnelContextPatch<SCM[ToStep], SCM[FromStep]>) => void;

    setContext: (patch: Partial<SCM[FromStep]> | ((prev: SCM[FromStep]) => SCM[FromStep])) => void;

    back: () => void;
};

type FunnelController<SCM extends StepContextMap, Step extends StepKey<SCM>> = {
    step: Step;
    context: SCM[Step];
    history: HistoryController<SCM, Step>;
    exit: (url: string, options?: { replace?: boolean }) => void;
};

export type FunnelInstance<SCM extends StepContextMap> = {
    [S in StepKey<SCM>]: FunnelController<SCM, S>;
}[StepKey<SCM>];

type UseFunnelOptions<SCM extends StepContextMap, InitialStep extends StepKey<SCM>> = {
    id: string;
    initial: FunnelItem<SCM, InitialStep>;
};

const STATE_KEY = "__USE_FUNNEL__";

const isRecord = (v: unknown): v is UnknownRecord => typeof v === "object" && v !== null;

const isFunnelItemLike = (v: unknown): v is { step: string; context: UnknownRecord } => {
    if (!isRecord(v)) return false;
    if (typeof v.step !== "string") return false;
    if (!isRecord(v.context)) return false;
    return true;
};

/**
 * 거대한 타입 가드 연쇄로 FunnelSnapshot을 반환합니다.
 */
function getSnapshotFromHistory<SCM extends StepContextMap>(state: unknown, id: string): FunnelSnapshot<SCM> | null {
    // window.history.state as unknown이 record가 아닐 경우.
    if (!isRecord(state)) return null;

    // 만약 STATE_KEY가 record가 아닐 경우
    const all = state[STATE_KEY];
    if (!isRecord(all)) return null;

    // id에 해당하는 snap이 record가 아닐 경우
    const snap = all[id];
    if (!isRecord(snap)) return null;

    const item = snap.item;
    const depth = snap.depth;
    const nextStep = snap.nextStep;

    // item이 funnelItem이 아닐 경우
    if (!isFunnelItemLike(item)) return null;

    // depth가 올바른 타입이. 아닐 경우
    if (typeof depth !== "number" || !Number.isFinite(depth) || depth < 0) return null;

    if (nextStep !== undefined && typeof nextStep !== "string") return null;

    return {
        item: item as unknown as FunnelItem<SCM>,
        depth,
        nextStep: nextStep as StepKey<SCM> | undefined,
    };
}

function writeSnapshotToHistory<SCM extends StepContextMap>(
    id: string,
    snapshot: FunnelSnapshot<SCM>,
    mode: "push" | "replace",
) {
    if (typeof window === "undefined") return;

    const currentState = window.history.state as unknown;

    const base: UnknownRecord = isRecord(currentState) ? currentState : {};
    const prevAllRaw = base[STATE_KEY];
    const prevAll: UnknownRecord = isRecord(prevAllRaw) ? prevAllRaw : {};

    const nextState: UnknownRecord = {
        ...base,
        [STATE_KEY]: {
            ...prevAll,
            [id]: snapshot,
        },
    };

    if (mode === "push") window.history.pushState(nextState, "");
    else window.history.replaceState(nextState, "");
}

function mergeDefined(base: UnknownRecord, overlay: UnknownRecord): UnknownRecord {
    const out: UnknownRecord = { ...base };
    for (const key of Object.keys(overlay)) {
        const val = overlay[key];
        if (val !== undefined) out[key] = val;
    }
    return out;
}

type PendingForward<SCM extends StepContextMap> = {
    expectedStep: StepKey<SCM>;
    fromContext: UnknownRecord;
    patch: UnknownRecord;
};

export function useFunnel<SCM extends StepContextMap, InitialStep extends StepKey<SCM>>(
    options: UseFunnelOptions<SCM, InitialStep>,
): FunnelInstance<SCM> {
    const { id, initial } = options;

    const initialSnapshotRef = useRef<FunnelSnapshot<SCM>>({
        item: initial as FunnelItem<SCM>,
        depth: 0,
        nextStep: undefined,
    });

    const snapshotRef = useRef<FunnelSnapshot<SCM>>(initialSnapshotRef.current);
    const [snapshot, _setSnapshot] = useState<FunnelSnapshot<SCM>>(initialSnapshotRef.current);

    const pendingForwardRef = useRef<PendingForward<SCM> | null>(null);

    const setSnapshotLocal = useCallback((next: FunnelSnapshot<SCM>) => {
        snapshotRef.current = next;
        _setSnapshot(next);
    }, []);

    const syncSnapshot = useCallback(
        (next: FunnelSnapshot<SCM>, mode: "push" | "replace") => {
            setSnapshotLocal(next);
            writeSnapshotToHistory<SCM>(id, next, mode);
        },
        [id, setSnapshotLocal],
    );

    useEffect(() => {
        if (typeof window === "undefined") return;

        const restored = getSnapshotFromHistory<SCM>(window.history.state as unknown, id);

        if (restored) {
            setSnapshotLocal(restored);
            return;
        }

        writeSnapshotToHistory<SCM>(id, snapshotRef.current, "replace");
    }, [id, setSnapshotLocal]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handler = (event: PopStateEvent) => {
            const restored = getSnapshotFromHistory<SCM>(event.state as unknown, id);
            if (!restored) return;

            const pending = pendingForwardRef.current;

            if (pending && restored.item.step === pending.expectedStep) {
                pendingForwardRef.current = null;

                const baseCtx = restored.item.context as unknown as UnknownRecord;

                const merged = mergeDefined(mergeDefined(baseCtx, pending.fromContext), pending.patch);

                syncSnapshot(
                    {
                        ...restored,
                        item: {
                            step: restored.item.step,
                            context: merged as unknown as (typeof restored.item)["context"],
                        } as FunnelItem<SCM>,
                    },
                    "replace",
                );
                return;
            }

            setSnapshotLocal(restored);
        };

        window.addEventListener("popstate", handler);
        return () => window.removeEventListener("popstate", handler);
    }, [id, setSnapshotLocal, syncSnapshot]);

    const currentItem = snapshot.item ?? initialSnapshotRef.current.item;

    const push = useCallback(
        <ToStep extends StepKey<SCM>>(step: ToStep, patch: FunnelContextPatch<SCM[ToStep], SCM[StepKey<SCM>]>) => {
            const cur = snapshotRef.current;
            const prevItem = cur.item ?? (initialSnapshotRef.current.item as FunnelItem<SCM>);

            // 1) 미래 step이 존재하고 동일 step이면 forward로 "복원"
            if (typeof window !== "undefined" && cur.nextStep === step) {
                pendingForwardRef.current = {
                    expectedStep: step,
                    fromContext: prevItem.context as unknown as UnknownRecord,
                    patch: (isRecord(patch) ? patch : {}) as UnknownRecord,
                };

                window.history.forward();
                return;
            }

            if (typeof window !== "undefined") {
                writeSnapshotToHistory<SCM>(id, { ...cur, nextStep: step }, "replace");
            }

            const nextContext = { ...prevItem.context, ...(patch ?? {}) } as SCM[ToStep];
            const nextItem: FunnelItem<SCM, ToStep> = { step, context: nextContext };

            syncSnapshot(
                {
                    item: nextItem as FunnelItem<SCM>,
                    depth: cur.depth + 1,
                    nextStep: undefined,
                },
                "push",
            );
        },
        [id, syncSnapshot],
    );

    const setContext = useCallback(
        (patchOrUpdater: Partial<SCM[StepKey<SCM>]> | ((prev: SCM[StepKey<SCM>]) => SCM[StepKey<SCM>])) => {
            const cur = snapshotRef.current;
            const prevItem = cur.item ?? (initialSnapshotRef.current.item as FunnelItem<SCM>);
            const prevCtx = prevItem.context as SCM[StepKey<SCM>];

            const nextCtx =
                typeof patchOrUpdater === "function"
                    ? patchOrUpdater(prevCtx)
                    : ({ ...prevCtx, ...(patchOrUpdater ?? {}) } as SCM[StepKey<SCM>]);

            syncSnapshot(
                {
                    ...cur,
                    item: { step: prevItem.step, context: nextCtx } as FunnelItem<SCM>,
                },
                "replace",
            );
        },
        [syncSnapshot],
    );

    const navigate = useNavigate();

    const back = useCallback(() => {
        if (typeof window === "undefined") return;
        window.history.back();
    }, []);

    const exit = useCallback(
        (url: string, options?: { replace?: boolean }) => {
            if (typeof window === "undefined") return;

            const depth = snapshotRef.current.depth;

            if (depth <= 0) {
                navigate(url, { replace: true });
                return;
            }

            const handleMoveComplete = () => {
                window.removeEventListener("popstate", handleMoveComplete);

                // 2. 실제로 포인터가 뒤로 밀린 시점에 목적지로 이동
                if (options?.replace) {
                    navigate(url, { replace: true });
                } else {
                    navigate(url);
                }
            };

            window.addEventListener("popstate", handleMoveComplete);

            window.history.go(-(depth + 1));
        },
        [navigate],
    );

    const history = useMemo(() => {
        return {
            canGoBack: snapshot.depth > 0,
            push,
            setContext,
            back,
        };
    }, [snapshot.depth, push, setContext, back]);

    return useMemo(() => {
        return {
            step: currentItem.step,
            context: currentItem.context,
            history,
            exit,
        } as FunnelInstance<SCM>;
    }, [currentItem.step, currentItem.context, history, exit]);
}
