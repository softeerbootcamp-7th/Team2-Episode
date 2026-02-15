export interface YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array;
}

export class DefaultYjsProcessor implements YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array {
        // todo: 새 스냅샷 생성 후 반환
        void updates;
        return new Uint8Array();
    }
}
