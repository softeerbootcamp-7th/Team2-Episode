import { useEffect } from "react";
import { toast } from "sonner";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { MindmapRoomId } from "@/features/mindmap/types/mindmap_room";

type Props = {
    roomId: MindmapRoomId;
    doc: Y.Doc;
};

/**
 * 오프라인, 온라인 상황에서 indexeddb에 저장된 작업 내용을 불러와 doc에 반영합니다.
 */
export const useOfflineMindmap = ({ roomId, doc }: Props) => {
    useEffect(() => {
        const persistence = new IndexeddbPersistence(roomId, doc);

        const handleSynced = () => {
            toast.success("오프라인 상태에서 작업한 내용이 성공적으로 반영되었습니다.");
        };

        persistence.on("synced", handleSynced);

        return () => {
            persistence.off("synced", handleSynced);
            persistence.destroy();
        };
    }, [roomId, doc]);
};
