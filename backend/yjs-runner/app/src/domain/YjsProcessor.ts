import * as Y from 'yjs';

export interface YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array;
}

export class DefaultYjsProcessor implements YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array {
        const doc = new Y.Doc();

        if (baseSnapshot && baseSnapshot.length > 0) {
            Y.applyUpdate(doc, baseSnapshot);
        }

        for (const update of updates) {
            try {
                Y.applyUpdate(doc, update);
            } catch (e) {
                console.error('[YjsProcessor] Failed to apply update', e);
            }
        }

        return Y.encodeStateAsUpdate(doc);
    }
}
