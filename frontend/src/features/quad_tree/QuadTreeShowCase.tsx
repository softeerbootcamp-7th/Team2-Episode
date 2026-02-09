import React, { useEffect, useMemo, useRef, useState } from "react";

import QuadTree from "@/features/quad_tree/utils/QuadTree";

import { Point } from "./types/point";
import { Rect } from "./types/rect";

const CANVAS_SIZE = 600;
const SEARCH_RADIUS = 60;

// 시각화용 색상 설정
const DEPTH_COLORS = ["#475569", "#6366f1", "#a855f7", "#ec4899", "#ef4444"];
const SEARCH_COLOR = "#22c55e";
const RANGE_BOX_COLOR = "rgba(34, 197, 94, 0.15)";

export const QuadTreeShowcase = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [points, setPoints] = useState<Point[]>([]);
    const [mousePos, setMousePos] = useState<Point | null>(null);
    const [draggingPoint, setDraggingPoint] = useState<Point | null>(null);
    const [nearbyPoints, setNearbyPoints] = useState<Point[]>([]);

    // 1. QuadTree 인스턴스 생성 (데이터 변화 시 재구축)
    const { tree, rebuildCount, bounds } = useMemo(() => {
        const bounds: Rect = { minX: 0, maxX: CANVAS_SIZE, minY: 0, maxY: CANVAS_SIZE };
        const tree = new QuadTree(bounds, 4);
        let rebuilds = 0;
        let prevBounds = tree.getBounds();

        points.forEach((p) => {
            tree.insert(p);
            const nextBounds = tree.getBounds();
            if (!rectEquals(prevBounds, nextBounds)) {
                rebuilds += 1;
                prevBounds = nextBounds;
            }
        });

        return { tree, rebuildCount: rebuilds, bounds: tree.getBounds() };
    }, [points]);

    // 탐색 범위 계산
    const searchRange = useMemo(() => {
        if (!mousePos) return null;
        return {
            minX: mousePos.x - SEARCH_RADIUS,
            maxX: mousePos.x + SEARCH_RADIUS,
            minY: mousePos.y - SEARCH_RADIUS,
            maxY: mousePos.y + SEARCH_RADIUS,
        };
    }, [mousePos]);

    // 2. 마우스 핸들러
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const currentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setMousePos(currentPos);

        // 드래그 중 로직
        if (draggingPoint) {
            setPoints((prev) => prev.map((p) => (p === draggingPoint ? currentPos : p)));
            setDraggingPoint(currentPos);
        }

        // 실시간 근처 노드 탐색
        if (searchRange) {
            setNearbyPoints(tree.getPointsInRange(searchRange));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!mousePos) return;

        // 우클릭 삭제 (tryMerge 시각화 확인용)
        if (e.button === 2) {
            const range = {
                minX: mousePos.x - 10,
                maxX: mousePos.x + 10,
                minY: mousePos.y - 10,
                maxY: mousePos.y + 10,
            };
            const targets = tree.getPointsInRange(range);
            if (targets.length > 0) {
                setPoints((prev) => prev.filter((p) => p !== targets[0]));
            }
            return;
        }

        // 좌클릭: 드래그 시작 또는 점 추가
        const range = { minX: mousePos.x - 10, maxX: mousePos.x + 10, minY: mousePos.y - 10, maxY: mousePos.y + 10 };
        const targets = tree.getPointsInRange(range);

        if (targets.length > 0) {
            setDraggingPoint(targets[0] ?? null);
        } else {
            setPoints((prev) => [...prev, mousePos]);
        }
    };

    const handleMouseUp = () => setDraggingPoint(null);

    // 3. 캔버스 렌더링 루프
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // A. 쿼드트리 전체 격자 시각화 (깊이별 색상)
        const allBounds = collectQuadBounds(tree);
        allBounds.forEach(({ rect, depth }) => {
            const color = DEPTH_COLORS[depth % DEPTH_COLORS.length] ?? "#475569";
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(0.5, 2 - depth * 0.4);
            ctx.strokeRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);

            // 영역 면적 칠하기 (매우 투명하게)
            ctx.fillStyle = `${color}08`;
            ctx.fillRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);
        });

        // B. 현재 쿼드트리 전체 경계 (rebuild 시각화)
        const currentBounds = tree.getBounds();
        ctx.strokeStyle = "rgba(79, 70, 229, 0.4)";
        ctx.setLineDash([10, 5]);
        ctx.lineWidth = 2;
        ctx.strokeRect(
            currentBounds.minX,
            currentBounds.minY,
            currentBounds.maxX - currentBounds.minX,
            currentBounds.maxY - currentBounds.minY,
        );
        ctx.setLineDash([]);

        // C. 모든 점 그리기 (드래그/인접 상태에 따라 색상 변경)
        points.forEach((p) => {
            const isDragging = draggingPoint === p;
            const isNearby = nearbyPoints.includes(p);

            ctx.fillStyle = isDragging ? "#fbbf24" : isNearby ? "#22c55e" : "#64748b";
            ctx.shadowBlur = isDragging || isNearby ? 12 : 0;
            ctx.shadowColor = ctx.fillStyle;

            ctx.beginPath();
            ctx.arc(p.x, p.y, isDragging ? 6 : 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // D. 마우스 탐색 범위 (돋보기 박스)
        if (searchRange && mousePos) {
            ctx.strokeStyle = SEARCH_COLOR;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(searchRange.minX, searchRange.minY, SEARCH_RADIUS * 2, SEARCH_RADIUS * 2);
            ctx.fillStyle = RANGE_BOX_COLOR;
            ctx.fillRect(searchRange.minX, searchRange.minY, SEARCH_RADIUS * 2, SEARCH_RADIUS * 2);
            ctx.setLineDash([]);
        }
    }, [tree, mousePos, draggingPoint, nearbyPoints, searchRange]);

    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;
    const innerBounds = {
        minX: bounds.minX + boundsWidth * 0.05,
        maxX: bounds.maxX - boundsWidth * 0.05,
        minY: bounds.minY + boundsHeight * 0.05,
        maxY: bounds.maxY - boundsHeight * 0.05,
    };

    const handleAddNearBoundary = () => {
        const x = innerBounds.maxX + 2;
        const y = innerBounds.maxY + 2;
        setPoints((prev) => [...prev, { x, y }]);
    };

    return (
        <div className="flex flex-col items-center p-8 bg-slate-950 text-white rounded-2xl shadow-2xl">
            <h2 className="text-3xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                QUADTREE VISUALIZER
            </h2>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-widest text-slate-400">
                <div>Rebuilds: {rebuildCount}</div>
                <div>
                    Bounds: {Math.round(boundsWidth)} x {Math.round(boundsHeight)}
                </div>
                <button
                    type="button"
                    onClick={handleAddNearBoundary}
                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                >
                    Add edge point
                </button>
            </div>
            <div className="flex gap-4 mb-6 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-600 rounded-full" /> Root
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" /> Level 1
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" /> Level 2
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" /> Visited
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
                className="border-2 border-slate-800 bg-black cursor-crosshair rounded-xl shadow-inner"
            />

            <div className="mt-6 grid grid-cols-2 gap-8 text-xs font-medium text-slate-400">
                <p>LEFT CLICK : ADD / DRAG</p>
                <p>RIGHT CLICK : DELETE</p>
            </div>
        </div>
    );
};

const rectEquals = (a: Rect, b: Rect) =>
    a.minX === b.minX && a.maxX === b.maxX && a.minY === b.minY && a.maxY === b.maxY;

const collectQuadBounds = (tree: QuadTree, depth = 0, acc: { rect: Rect; depth: number }[] = []) => {
    acc.push({ rect: tree.getBounds(), depth });
    const children = (tree as unknown as { children?: Record<string, QuadTree> }).children;

    if (children) {
        Object.values(children).forEach((child) => collectQuadBounds(child, depth + 1, acc));
    }

    return acc;
};
