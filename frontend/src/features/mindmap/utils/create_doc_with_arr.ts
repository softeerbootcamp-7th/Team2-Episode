import * as Y from "yjs";

import { ROOT_NODE_ID, TreeModel } from "@/features/mindmap/core/TreeModel";
import { YjsAdapter } from "@/features/mindmap/core/YjsAdaptor";

/**
 * 마인드맵을 생성할 때 유저가 선택한 카테고리 또는 에피소드 목록으로 기본 ydoc 뼈대를 만들어 서버에 제공해야합니다.
 * 이 뼈대를 생성해주는 함수입니다.
 */
export const makeDocWithArr = ({ name, items, mindmapId }: { name: string; items: string[]; mindmapId: string }) => {
    const doc = new Y.Doc();
    const adaptor = new YjsAdapter({
        doc,
        roomId: mindmapId,
        rootContents: name,
    });
    const tree = new TreeModel(adaptor);

    items.forEach((item, i) => {
        const newNodeId = tree.attachTo({
            baseNodeId: ROOT_NODE_ID,
            direction: "child",
            addNodeDirection: i % 2 === 0 ? "right" : "left",
        });

        if (newNodeId) {
            tree.update(newNodeId, {
                contents: item,
            });
        }
    });

    return doc;
};
