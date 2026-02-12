import DropIndicator from "@/features/mindmap/components/DropIndicator";
import EdgeLayer from "@/features/mindmap/components/EdgeLayer";
import InteractionLayer from "@/features/mindmap/components/InteractionLayer";
import { useMindMapCore, useMindMapVersion } from "@/features/mindmap/hooks/useMindmapContext";
import { useViewportEvents } from "@/features/mindmap/hooks/useViewportEvents";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";

/** core 내부 엔진이 모두 초기화된 후 */
function MindMapInnerRenderer() {
    const mindmap = useMindMapCore();
    const version = useMindMapVersion();

    if (!mindmap) return null;
    useViewportEvents();

    // 전체 마인드맵 상태 가져오기
    const status = mindmap.getInteractionStatus();

    if (!status) return null;

    const { baseNode, dragSubtreeIds } = status;
    const nodeMap = mindmap.tree.nodes;

    const allNodes = Array.from(nodeMap.values());
    const staticNodes = allNodes.filter((n) => !dragSubtreeIds?.has(n.id));
    const shadowNodes = allNodes.filter((n) => dragSubtreeIds?.has(n.id));

    //TODO: EdegLayer color
    return (
        <g className="mindmap-render-root" data-version={version}>
            {/* 정적 노드 그룹 */}
            <g className="static-layer">
                <EdgeLayer nodeMap={nodeMap} filterNode={staticNodes} color="violet" />
                {staticNodes.map((node) => (
                    <NodeItem key={`${node.id}-${version}`} nodeId={node.id} />
                ))}
            </g>

            {/* 섀도우 노드 덩어리 */}
            <g className="shadow-fragment opacity-20">
                <EdgeLayer nodeMap={nodeMap} filterNode={shadowNodes} color="violet" />
                {shadowNodes.map((node) => (
                    <NodeItem key={`${node.id}-${version}`} nodeId={node.id} />
                ))}
            </g>

            {/* Ghost */}
            {baseNode?.targetId && baseNode?.direction && (
                <DropIndicator nodeMap={nodeMap} targetId={baseNode.targetId} direction={baseNode.direction} />
            )}

            {/* 레이어 4: Floating (마우스 추적 덩어리) */}
            <InteractionLayer status={status} nodeMap={nodeMap} />
        </g>
    );
}

export default function MindMapRenderer() {
    const mindmap = useMindMapCore();

    if (!mindmap || !mindmap.isReady) {
        console.log("Renderer: 엔진 초기화 대기 중...");
        return null;
    }

    // 엔진이 준비되었다면 실제 로직 컴포넌트를 반환
    return <MindMapInnerRenderer />;
}
