import * as Y from "yjs";

import SharedMindmapLayoutManager from "@/features/mindmap/shared_mindmap/utils/SharedMindmapLayoutManager";
import SharedTreeContainer, { TransactionOrigin } from "@/features/mindmap/shared_mindmap/utils/SharedTreeContainer";
import { NodeElement, NodeId } from "@/features/mindmap/types/mindmap";
import { MindmapRoomId } from "@/features/mindmap/types/mindmap_room";
import { EventBroker } from "@/utils/EventBroker";

export default class SharedMindMapController {
    public container: SharedTreeContainer;
    private layoutManager: SharedMindmapLayoutManager;

    constructor(doc: Y.Doc, broker: EventBroker<NodeId>, roomId: MindmapRoomId) {
        this.container = new SharedTreeContainer({ doc, broker, roomId });
        this.layoutManager = new SharedMindmapLayoutManager({ xGap: 140, yGap: 60 });

        this.container.onTransaction = (event, origin) => {
            this.handleTransaction(event, origin);
        };
    }

    private handleTransaction(event: Y.YMapEvent<NodeElement>, origin: TransactionOrigin) {
        if (origin === "layout") {
            return;
        }

        if (!event.transaction.local) {
            return;
        }

        if (origin === "user_action") {
            event.keysChanged.forEach((nodeId) => {
                this.layoutManager.invalidate(nodeId, this.container);
            });

            this.refreshLayout();
        }
    }

    private refreshLayout() {
        const updates = this.layoutManager.calculateLayout(this.container);

        if (updates.size > 0) {
            this.container.doc.transact(() => {
                updates.forEach((pos, nodeId) => {
                    this.container.updateNode(nodeId, { x: pos.x, y: pos.y }, "layout");
                });
            }, "layout");
        }
    }

    public addChildNode(parentId: NodeId) {
        const parent = this.container.safeGetNode(parentId);

        if (!parent) {
            console.error("Parent node not found");
            return;
        }

        this.container.appendChild({ parentNodeId: parentId }, "user_action");
    }

    public resetMindMap() {
        if (confirm("정말로 모든 내용을 삭제하고 초기화하시겠습니까?")) {
            this.container.clear("user_action");
        }
    }

    public deleteNode(nodeId: NodeId) {
        this.container.delete({ nodeId });
    }

    public updateNodeSize({ nodeId, width, height }: { nodeId: NodeId; width: number; height: number }) {
        this.container.updateNode(nodeId, { width, height }, "user_action");
    }

    public updateNodeContents(nodeId: NodeId, contents: string) {
        this.container.updateNode(nodeId, { data: { contents } }, "user_action");
    }

    // 지금 지원 안함
    public undo() {
        // this.container.undoManager.undo();
    }

    public redo() {
        // this.container.undoManager.redo();
    }
}
