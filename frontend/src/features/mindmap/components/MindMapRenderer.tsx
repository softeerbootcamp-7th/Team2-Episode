import DropIndicator from "@/features/mindmap/components/DropIndicator";
import EdgeLayer from "@/features/mindmap/components/EdgeLayer";
import InteractionLayer from "@/features/mindmap/components/InteractionLayer";
import { useMindMapCore, useMindMapVersion } from "@/features/mindmap/hooks/useMindmapContext";
import NodeItem from "@/features/mindmap/node/components/node/NodeItem";

/**
 * 마인드맵의 모든 시각적 요소를 통합 관리
 *  MindmapCore가 관리하는 트리의 데이터(nodeMap)를 읽어서, 실제 SVG 요소(노드와 선)로 변환
 */
export default function MindMapRenderer() {
    const mindmap = useMindMapCore(); // 현재 트리에 어떤 노드들이 있는지 인터랙션 실시간 관찰
    const version = useMindMapVersion(); //version 업데이트 시 Renderer 다시 그리기

    // 전체 마인드맵, 상태 가져오기
    const status = mindmap.getInteractionStatus();
    const { baseNode, dragSubtreeIds } = status;
    const nodeMap = mindmap.tree.nodes;

    const allNodes = Array.from(nodeMap.values());
    // MindMapRenderer 내부
    const staticNodes = allNodes.filter((n) => !dragSubtreeIds?.has(n.id) && n.type !== "root");
    const shadowNodes = allNodes.filter((n) => dragSubtreeIds?.has(n.id) && n.type !== "root");
    return (
        <g className="mindmap-render-root" data-version={version}>
            {/* 정적 노드 그룹 */}
            <g className="static-layer">
                <EdgeLayer nodeMap={nodeMap} filterNode={staticNodes} />
                {staticNodes.map((node) => (
                    <NodeItem key={`${node.id}-${version}`} nodeId={node.id} />
                ))}
            </g>

            {/* 섀도우 노드 덩어리 */}
            <g className="shadow-fragment opacity-20">
                <EdgeLayer nodeMap={nodeMap} filterNode={shadowNodes} />
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
