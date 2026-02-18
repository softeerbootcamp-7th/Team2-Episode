import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useMindmapActions, useMindmapNode, useMindmapNodeLock } from "@/features/mindmap/hooks/useMindmapStoreState";
import { Node } from "@/features/mindmap/node/components/node/Node";
import { NodeId } from "@/features/mindmap/types/node";

const FIXED_WIDTH = 200;
const FIXED_HEIGHT = 80; // 내용이 길어질 수 있으므로 약간 여유 있게 설정

function NodeItem({ nodeId, measure = true }: { nodeId: NodeId; measure?: boolean }) {
    const nodeData = useMindmapNode(nodeId);
    const { updateNodeSize, unlockNode } = useMindmapActions();

    const lock = useMindmapNodeLock(nodeId);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const contentRef = useRef<HTMLDivElement>(null);

    // nodeData가 없으면 렌더링하지 않음
    if (!nodeData) return null;

    const { x, y, width, height, contents } = nodeData;
    const isRoot = nodeData.type === "root";

    // const w = width || 200;
    // const h = height || 60;

    const w = isRoot ? 160 : FIXED_WIDTH;
    const h = isRoot ? 60 : FIXED_HEIGHT;

    const { addNodeDirection } = nodeData;

    const locked = lock.locked && !isRoot;
    const lockedByMe = locked && lock.lockedByMe;
    const lockedByOther = locked && !lock.lockedByMe;

    const [draft, setDraft] = useState<string>(contents ?? "");
    const pendingContentsRef = useRef<string | null>(null);
    const rafIdRef = useRef<number | null>(null);

    // 브로드캐스트 실행 (Raf 취소 포함)
    const flushBroadcast = useCallback(
        (value?: string) => {
            const next = value ?? pendingContentsRef.current ?? draft;
            pendingContentsRef.current = null;
            if (rafIdRef.current != null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            // updateNodeContents(nodeId, next);
        },
        [draft, nodeId],
    );

    // 브로드캐스트 스케줄링 (Throttling with rAF)
    const scheduleBroadcast = useCallback(
        (value: string) => {
            pendingContentsRef.current = value;
            if (rafIdRef.current != null) return;
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                const v = pendingContentsRef.current;
                if (v == null) return;
                pendingContentsRef.current = null;
                // updateNodeContents(nodeId, v);
            });
        },
        [nodeId],
    );

    useEffect(() => {
        if (!isRoot && (nodeData.width !== w || nodeData.height !== h)) {
            updateNodeSize(nodeId, w, h);
        }
    }, [nodeId, w, h, nodeData.width, nodeData.height, updateNodeSize, isRoot]);

    // 컴포넌트 언마운트 시 raf 정리
    useEffect(() => {
        return () => {
            if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
        };
    }, []);

    const initialContentsRef = useRef<string>("");
    const prevLockedByMeRef = useRef<boolean>(false);

    // 편집 모드 진입(lock 획득) 시 초기값 저장
    useEffect(() => {
        if (lockedByMe && !prevLockedByMeRef.current) {
            initialContentsRef.current = contents ?? "";
            setDraft(contents ?? "");
        }
        prevLockedByMeRef.current = lockedByMe;
    }, [lockedByMe, contents]);

    // 내가 편집 중이 아닐 때만 원격 업데이트를 draft에 반영
    useEffect(() => {
        if (!lockedByMe) setDraft(contents ?? "");
    }, [contents, lockedByMe]);

    // ✅ lock 획득(=편집 모드 진입) 시 포커스 처리
    useEffect(() => {
        if (!lockedByMe) return;

        // 포커스 로직을 rAF로 감싸서 렌더링 직후 실행 보장
        const rId = requestAnimationFrame(() => {
            textareaRef.current?.focus();
            const el = textareaRef.current;
            if (el) {
                const end = el.value.length;
                try {
                    el.setSelectionRange(end, end);
                } catch {
                    // ignore inputs that don't support selection
                }
            }
        });

        return () => cancelAnimationFrame(rId);
    }, [lockedByMe]);

    const exitEdit = useCallback(() => {
        if (lockedByMe) unlockNode();
    }, [lockedByMe, unlockNode]);

    // // ✅ Resize 측정 로직
    // // contents lock이어도 이동/레이아웃은 되므로 resize 측정은 계속 허용
    // useEffect(() => {
    //     if (!measure) return;
    //     if (!contentRef.current || !nodeData) return;
    //     // ✅ 편집자가 아닌 다른 클라이언트는 resize 명령을 보내지 않음(실시간 타이핑 시 폭주 방지)
    //     if (lockedByOther) return;

    //     const rect = contentRef.current.getBoundingClientRect();
    //     const svg = contentRef.current.closest("svg") as SVGSVGElement | null;
    //     if (!svg) return;

    //     const svgRect = svg.getBoundingClientRect();
    //     const viewBox = svg.viewBox.baseVal;

    //     const scaleX = svgRect.width / viewBox.width;
    //     const scaleY = svgRect.height / viewBox.height;

    //     const worldWidth = rect.width / scaleX;
    //     const worldHeight = rect.height / scaleY;

    //     // ✅ 변동이 거의 없으면 불필요한 RESIZE+layout 방지
    //     const curW = nodeData.width || 200;
    //     const curH = nodeData.height || 60;
    //     if (Math.abs(worldWidth - curW) < 0.5 && Math.abs(worldHeight - curH) < 0.5) return;

    //     updateNodeSize(nodeId, worldWidth, worldHeight);
    // }, [
    //     measure,
    //     nodeData?.data?.contents, // 내용이 바뀌면 크기가 변하므로 의존성 유지
    //     nodeId,
    //     updateNodeSize,
    //     lockedByOther,
    //     nodeData.width,
    //     nodeData.height,
    // ]);

    const lockLabel = locked && lock.info ? `🔒 ${lock.info?.user.name}` : null;
    const lockColor = locked && lock.info ? lock.info?.user.color : "#999";

    return (
        <foreignObject
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            style={{ width: w, height: h }} // CSS로도 한 번 더 고정
            data-node-id={nodeId}
            className="overflow-visible"
        >
            <div ref={contentRef} className="w-full h-full flex items-center justify-center">
                <div className="relative inline-block">
                    {/* ✅ 잠금 표시 */}
                    {locked && lockLabel && (
                        <div
                            className=" px-2 py-1 text-11 text-primary pointer-events-none select-none shadow"
                            style={{ backgroundColor: lockColor, opacity: 0.95 }}
                            title={lockedByMe ? "내가 잠금" : `${lock.info?.user.name}님이 잠금`}
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
                            data-action="select"
                            size={"sm"}
                            color={"violet"}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                padding: "4px 8px",
                                boxSizing: "border-box",
                            }}
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

                                        const native = e.nativeEvent as KeyboardEvent;
                                        const isComposing = (native as any)?.isComposing === true;

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
                                            flushBroadcast();
                                            exitEdit();
                                            (e.currentTarget as HTMLTextAreaElement).blur();
                                        }
                                    }}
                                    onBlur={() => {
                                        flushBroadcast();
                                        exitEdit();
                                    }}
                                />
                            ) : (
                                contents || "하위 내용"
                            )}
                        </Node.Content>
                    </Node>
                </div>
            </div>
        </foreignObject>
    );
}

export default memo(NodeItem);
