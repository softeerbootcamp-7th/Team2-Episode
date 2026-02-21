import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useMindmapActions, useMindmapNode, useMindmapNodeLock } from "@/features/mindmap/hooks/useMindmapStoreState";
import { Node } from "@/features/mindmap/node/components/node/Node";
import type { NodeId } from "@/features/mindmap/types/node";
import { cn } from "@/utils/cn";

const FIXED_WIDTH = 200;
const MIN_HEIGHT = 80;
const MAX_CONTENTS_LENGTH = 200;

// TODO: 컨트롤러의 actions이용하는 거로 변경
function NodeItem({ nodeId }: { nodeId: NodeId; measure?: boolean }) {
    const nodeData = useMindmapNode(nodeId);
    const { updateNodeSize, updateNodeContents, unlockNode } = useMindmapActions();

    const lock = useMindmapNodeLock(nodeId);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const lastSizeRef = useRef({ w: 0, h: 0 });

    useEffect(() => {
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const { width, height } = entry.contentRect;
            const newWidth = Math.round(width);
            const newHeight = Math.max(Math.round(height), MIN_HEIGHT);

            if (Math.abs(lastSizeRef.current.w - newWidth) > 1 || Math.abs(lastSizeRef.current.h - newHeight) > 1) {
                lastSizeRef.current = { w: newWidth, h: newHeight };

                requestAnimationFrame(() => {
                    updateNodeSize(nodeId, newWidth, newHeight);
                });
            }
        });

        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, [nodeId, updateNodeSize]);

    if (!nodeData) return null;

    const { x, y, contents, width: nodeW, height: nodeH } = nodeData;
    const isRoot = nodeData.type === "root";
    const { addNodeDirection } = nodeData;

    const locked = lock.locked && !isRoot;
    const lockedByMe = locked && lock.lockedByMe;
    const lockedByOther = locked && !lock.lockedByMe;

    const [draft, setDraft] = useState<string>(contents ?? "");
    const pendingContentsRef = useRef<string | null>(null);
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (lockedByMe) {
            setDraft(contents ?? "");
        }
    }, [contents, lockedByMe]);

    useEffect(() => {
        if (!lockedByMe) return;
        textareaRef.current?.focus();
    }, [lockedByMe]);

    useEffect(() => {
        if (lockedByMe && textareaRef.current) {
            textareaRef.current.focus();
            // [추가] 진입 시점에 텍스트 양에 따라 높이 즉시 계산
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [lockedByMe]);

    const lockLabel = locked && lock.info ? `🔒 ${lock.info?.user.name}` : null;
    const lockColor = locked && lock.info ? lock.info?.user.color : "#999";

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

    const commitDraft = useCallback(() => {
        if (draft !== (contents ?? "")) {
            updateNodeContents(nodeId, draft);
        }
    }, [contents, draft, nodeId, updateNodeContents]);

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

    const exitEdit = useCallback(() => {
        if (lockedByMe) unlockNode();
    }, [lockedByMe, unlockNode]);
    return (
        <foreignObject
            x={x - (nodeW || FIXED_WIDTH) / 2}
            y={y - (nodeH || MIN_HEIGHT) / 2}
            width={nodeW || FIXED_WIDTH}
            height={nodeH || MIN_HEIGHT}
            data-node-id={nodeId}
            className="overflow-visible transition-all duration-75"
        >
            <div
                ref={contentRef}
                className="inline-block"
                style={{
                    width: FIXED_WIDTH,
                    minHeight: MIN_HEIGHT,
                    boxSizing: "border-box",
                }}
            >
                <div className="relative w-full h-full">
                    {locked && lockLabel && (
                        <div
                            className="absolute -top-3 -right-3 z-10 px-2 py-1 rounded-full text-11 text-white pointer-events-none select-none shadow"
                            style={{ backgroundColor: lockColor, opacity: 0.95 }}
                        >
                            {lockLabel}
                            {lockedByMe ? " (나)" : ""}
                        </div>
                    )}

                    <Node>
                        <Node.AddNode
                            data-direction={addNodeDirection}
                            data-action="add-child"
                            direction={addNodeDirection}
                            color={"violet"}
                        />

                        <Node.Content
                            nodeId={nodeData.id}
                            data-action="select"
                            size={"sm"}
                            color={"violet"}
                            highlight={lockedByMe}
                            className={cn(
                                isRoot ? "bg-primary text-white" : "",
                                "min-h-20 h-auto p-4 flex items-center justify-center",
                            )}
                            onClick={() => {
                                if (lockedByOther) {
                                    toast.error("잠금 상태라 내용 수정이 불가합니다");
                                }
                            }}
                        >
                            {lockedByMe ? (
                                <textarea
                                    ref={textareaRef}
                                    value={draft}
                                    maxLength={MAX_CONTENTS_LENGTH} // 1. 네이티브 maxLength 속성 추가
                                    placeholder="내용을 입력하세요"
                                    className="w-full bg-transparent outline-none resize-none overflow-hidden text-center leading-normal"
                                    style={{
                                        height: "auto",
                                        minHeight: "1.5em", // 최소 한 줄 보장
                                        display: "block", // inline-block보다 정렬에 유리
                                    }}
                                    rows={1}
                                    onChange={(e) => {
                                        let next = e.target.value;

                                        if (next.length > MAX_CONTENTS_LENGTH) {
                                            next = next.slice(0, MAX_CONTENTS_LENGTH);
                                            toast.warning(`${MAX_CONTENTS_LENGTH}자까지만 입력 가능합니다.`);
                                        }

                                        setDraft(next);
                                        e.target.style.height = "auto";
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                        scheduleBroadcast(next);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            commitDraft();
                                            flushBroadcast();
                                            exitEdit();
                                        }
                                    }}
                                    onBlur={() => {
                                        commitDraft();
                                        flushBroadcast();
                                        exitEdit();
                                    }}
                                />
                            ) : (
                                <div
                                    className={`whitespace-pre-wrap break-all w-full text-center select-none ${!contents ? "text-gray-400" : "text-text-main1"}`}
                                >
                                    {contents || "빈 칸"}
                                </div>
                            )}
                        </Node.Content>
                    </Node>
                </div>
            </div>
        </foreignObject>
    );
}

export default memo(NodeItem);
