import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useMindmapActions, useMindmapNode, useMindmapNodeLock } from "@/features/mindmap/hooks/useMindmapStoreState";
import { Node } from "@/features/mindmap/node/components/node/Node";
import NodeCenter from "@/features/mindmap/node/components/node_center/NodeCenter";
import type { NodeId } from "@/features/mindmap/types/node";

function NodeItem({ nodeId, measure = true }: { nodeId: NodeId; measure?: boolean }) {
    const nodeData = useMindmapNode(nodeId);
    const { updateNodeSize, updateNodeContents, unlockNode } = useMindmapActions();

    const lock = useMindmapNodeLock(nodeId);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const contentRef = useRef<HTMLDivElement>(null);

    if (!nodeData) return null;

    const { x, y, width, height, data } = nodeData;
    const isRoot = nodeData.type === "root";

    const w = width || 200;
    const h = height || 60;

    const { addNodeDirection } = nodeData;

    const locked = lock.locked && !isRoot;
    const lockedByMe = locked && lock.lockedByMe;
    const lockedByOther = locked && !lock.lockedByMe;

    const [draft, setDraft] = useState<string>(data.contents ?? "");
    const pendingContentsRef = useRef<string | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const flushBroadcast = useCallback(
        (value?: string) => {
            const next = value ?? pendingContentsRef.current ?? draft;
            pendingContentsRef.current = null;
            if (rafIdRef.current != null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            updateNodeContents(nodeId, next);
        },
        [draft, nodeId, updateNodeContents],
    );

    const scheduleBroadcast = useCallback(
        (value: string) => {
            pendingContentsRef.current = value;
            if (rafIdRef.current != null) return;
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                const v = pendingContentsRef.current;
                if (v == null) return;
                pendingContentsRef.current = null;
                updateNodeContents(nodeId, v);
            });
        },
        [nodeId, updateNodeContents],
    );

    useEffect(() => {
        return () => {
            if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
        };
    }, []);

    const initialContentsRef = useRef<string>("");
    const prevLockedByMeRef = useRef<boolean>(false);

    useEffect(() => {
        if (lockedByMe && !prevLockedByMeRef.current) {
            initialContentsRef.current = data.contents ?? "";
            setDraft(data.contents ?? "");
        }
        prevLockedByMeRef.current = lockedByMe;
    }, [lockedByMe, data.contents]);

    useEffect(() => {
        if (!lockedByMe) setDraft(data.contents ?? "");
    }, [data.contents, lockedByMe]);

    useEffect(() => {
        if (!lockedByMe) return;

        const rId = requestAnimationFrame(() => {
            textareaRef.current?.focus();
            const el = textareaRef.current;
            if (el) {
                const end = el.value.length;
                try {
                    el.setSelectionRange(end, end);
                } catch {
                    // ignore
                }
            }
        });

        return () => cancelAnimationFrame(rId);
    }, [lockedByMe]);

    const commitDraft = useCallback(() => {
        const prev = data.contents ?? "";
        if (draft !== prev) {
            updateNodeContents(nodeId, draft);
        }
    }, [data.contents, draft, nodeId, updateNodeContents]);

    const exitEdit = useCallback(() => {
        if (lockedByMe) unlockNode();
    }, [lockedByMe, unlockNode]);

    useEffect(() => {
        if (!measure) return;
        if (!contentRef.current || !nodeData) return;
        if (lockedByOther) return;

        const rect = contentRef.current.getBoundingClientRect();
        const svg = contentRef.current.closest("svg") as SVGSVGElement | null;
        if (!svg) return;

        const svgRect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;

        const scaleX = svgRect.width / viewBox.width;
        const scaleY = svgRect.height / viewBox.height;

        const worldWidth = rect.width / scaleX;
        const worldHeight = rect.height / scaleY;

        const curW = nodeData.width || 200;
        const curH = nodeData.height || 60;
        if (Math.abs(worldWidth - curW) < 0.5 && Math.abs(worldHeight - curH) < 0.5) return;

        updateNodeSize(nodeId, worldWidth, worldHeight);
    }, [measure, nodeData?.data?.contents, nodeId, updateNodeSize, lockedByOther, nodeData.width, nodeData.height]);

    const lockLabel = locked && lock.info ? `🔒 ${lock.info?.user.name}` : null;
    const lockColor = locked && lock.info ? lock.info?.user.color : "#999";

    return (
        <foreignObject
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            data-node-id={nodeId}
            className="overflow-visible"
        >
            <div ref={contentRef} className="inline-block">
                <div className="relative inline-block">
                    {locked && lockLabel && (
                        <div
                            className="absolute -top-3 -right-3 px-2 py-1 rounded-full text-11 text-white pointer-events-none select-none shadow"
                            style={{ backgroundColor: lockColor, opacity: 0.95 }}
                            title={lockedByMe ? "내가 잠금" : `${lock.info?.user.name}님이 잠금`}
                        >
                            {lockLabel}
                            {lockedByMe ? " (나)" : ""}
                        </div>
                    )}

                    {isRoot ? (
                        <NodeCenter data-action="select" username={data.contents} />
                    ) : (
                        <Node>
                            <Node.AddNode
                                data-direction={addNodeDirection}
                                data-action="add-child"
                                direction={addNodeDirection}
                                color={"violet"}
                            />

                            <Node.Content
                                data-action="select"
                                size={"sm"}
                                color={"violet"}
                                onClick={() => {
                                    if (lockedByOther) {
                                        toast.error("잠금 상태라 내용 수정이 불가합니다");
                                        return;
                                    }
                                }}
                            >
                                {lockedByMe ? (
                                    <textarea
                                        ref={textareaRef}
                                        value={draft}
                                        placeholder="내용을 입력하세요"
                                        className="w-full h-full bg-transparent outline-none resize-none"
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setDraft(next);
                                            scheduleBroadcast(next);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();

                                            const native = e.nativeEvent;
                                            const isComposing = native?.isComposing === true;

                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                const original = initialContentsRef.current ?? "";
                                                setDraft(original);
                                                flushBroadcast(original);
                                                exitEdit();
                                                return;
                                            }

                                            if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                                                e.preventDefault();
                                                commitDraft();
                                                flushBroadcast();
                                                exitEdit();
                                                (e.currentTarget as HTMLTextAreaElement).blur();
                                            }
                                        }}
                                        onBlur={() => {
                                            commitDraft();
                                            flushBroadcast();
                                            exitEdit();
                                        }}
                                    />
                                ) : (
                                    data.contents || "빈 칸"
                                )}
                            </Node.Content>
                        </Node>
                    )}
                </div>
            </div>
        </foreignObject>
    );
}

export default memo(NodeItem);
