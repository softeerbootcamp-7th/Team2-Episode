import * as Y from 'yjs';

export interface YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array;
}

export class DefaultYjsProcessor implements YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array {
        let doc = new Y.Doc();

        if (baseSnapshot && baseSnapshot.length > 0) {
            try {
                Y.applyUpdate(doc, baseSnapshot);
            } catch (e) {
                console.error('[YjsProcessor] 기존 base snapshot 데이터가 유효하지 않습니다.', e);
                doc = new Y.Doc();
            }
        }

        for (const update of updates) {
            try {
                Y.applyUpdate(doc, update);
            } catch (e) {
                console.error('[YjsProcessor] 업데이트 패킷이 유효하지 않습니다.', e);
            }
        }

        return Y.encodeStateAsUpdate(doc);
    }
}
