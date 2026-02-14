import * as Y from "yjs";

import SharedMindmapLayoutManager from "@/features/mindmap/shared_mindmap/utils/SharedMindmapLayoutManager";
import SharedTreeContainer from "@/features/mindmap/shared_mindmap/utils/SharedTreeContainer";
import { NodeElement, NodeId } from "@/features/mindmap/types/mindmap_node";
import { MindmapRoomId } from "@/features/mindmap/types/mindmap_room";
import { EventBroker } from "@/utils/EventBroker";

export default class SharedMindMapController {
    public container: SharedTreeContainer;
    private layoutManager: SharedMindmapLayoutManager;

    constructor(doc: Y.Doc, broker: EventBroker<NodeId>, roomId: MindmapRoomId) {
        this.container = new SharedTreeContainer({
            doc,
            broker,
            roomId,
            onTransaction: (event) => {
                this.handleTransaction(event);
            },
        });
        this.layoutManager = new SharedMindmapLayoutManager({ xGap: 300, yGap: 100 });
    }

    private handleTransaction(event: Y.YMapEvent<NodeElement>) {
        if (event.transaction.local) {
            return;
        }

        event.keysChanged.forEach((nodeId) => {
            this.layoutManager.invalidate(nodeId, this.container);
        });

        // this.refreshLayout();
    }

    private refreshLayout() {
        const updates = this.layoutManager.calculateLayout(this.container);

        this.container.updateNodes(updates);
    }

    public addChildNode(parentId: NodeId) {
        this.container.getDoc().transact(() => {
            const parent = this.container.safeGetNode(parentId);

            if (!parent) {
                console.error("Parent node not found");
                return;
            }

            this.container.appendChild({ parentNodeId: parentId });
            // this.refreshLayout();
        });
    }

    public resetMindMap() {
        this.container.getDoc().transact(() => {
            if (confirm("정말로 모든 내용을 삭제하고 초기화하시겠습니까?")) {
                this.container.clear();

                this.refreshLayout();
            }
        });
    }

    public deleteNode(nodeId: NodeId) {
        this.container.getDoc().transact(() => {
            this.container.delete({ nodeId });
        });
    }

    public updateNodeSize({ nodeId, width, height }: { nodeId: NodeId; width: number; height: number }) {
        this.container.getDoc().transact(() => {
            this.layoutManager.invalidate(nodeId, this.container);

            this.container.updateNode(nodeId, { width, height });

            this.refreshLayout();
        });
    }

    public updateNodeContents(nodeId: NodeId, contents: string) {
        this.container.getDoc().transact(() => {
            this.layoutManager.invalidate(nodeId, this.container);

            this.container.updateNode(nodeId, { data: { contents } });

            this.refreshLayout();
        });
    }

    // TODO: 이후 추가할예정. 지금 지원 안함
    public undo() {
        // this.container.undoManager.undo();
    }

    public redo() {
        // this.container.undoManager.redo();
    }
}
