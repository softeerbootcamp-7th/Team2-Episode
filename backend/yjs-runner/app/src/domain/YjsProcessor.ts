import * as Y from "yjs";

export interface YjsProcessor {
	buildUpdatedSnapshot(
		baseSnapshot: Uint8Array,
		updates: Uint8Array[],
	): Uint8Array;

	getUpdatedYDocFromSnapshot(
		baseSnapshot: Uint8Array,
		updates: Uint8Array[],
	): Y.Doc;

	getSnapshotFromDoc(doc: Y.Doc): Uint8Array;
}

export class DefaultYjsProcessor implements YjsProcessor {
	buildUpdatedSnapshot(
		baseSnapshot: Uint8Array,
		updates: Uint8Array[],
	): Uint8Array {
		return Y.encodeStateAsUpdate(
			this.getUpdatedYDocFromSnapshot(baseSnapshot, updates),
		);
	}

	getUpdatedYDocFromSnapshot(
		baseSnapshot: Uint8Array,
		updates: Uint8Array[],
	): Y.Doc {
		let doc = new Y.Doc();

		if (baseSnapshot && baseSnapshot.length > 0) {
			try {
				Y.applyUpdate(doc, baseSnapshot);
			} catch (e) {
				console.error(
					"[YjsProcessor] 기존 base snapshot 데이터가 유효하지 않습니다.",
					e,
				);
				doc = new Y.Doc();
			}
		}

		for (const update of updates) {
			try {
				Y.applyUpdate(doc, update);
			} catch (e) {
				console.error("[YjsProcessor] 업데이트 패킷이 유효하지 않습니다.", e);
			}
		}

		return doc;
	}

	getSnapshotFromDoc(doc: Y.Doc): Uint8Array {
		try {
			return Y.encodeStateAsUpdate(doc);
		} catch (e) {
			console.error("[YjsProcessor] 유효하지 않은 YDoc 입니다.", e);
			throw e;
		}
	}
}
