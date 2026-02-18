import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

const messageSync = 0;
const messageAwareness = 1;

function toHex(u8: Uint8Array, limit = 64) {
    const n = Math.min(u8.length, limit);
    return Array.from(u8.slice(0, n))
            .map(b => b.toString(16).padStart(2, "0"))
            .join(" ")
        + (u8.length > limit ? ` ... (+${u8.length - limit} bytes)` : "");
}


export function applyYWebsocketFrame(doc: Y.Doc, frame: Uint8Array) {
    // ✅ 프레임 들어왔을 때 헤더/hex 찍기
    console.log(`[yws] frame len=${frame.length} hex=${toHex(frame, 80)}`);

    const dec = decoding.createDecoder(frame);
    const msgType = decoding.readVarUint(dec);

    if (msgType === messageSync) {
        console.log("[yws] msgType=sync");
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, messageSync);
        syncProtocol.readSyncMessage(dec, enc, doc, null);
        return;
    }

    if (msgType === messageAwareness) {
        console.log("[yws] msgType=awareness");
        return;
    }

    console.log(`[yws] msgType=unknown(${msgType})`);
}

export interface YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array;
}

function getRootTypes(doc: Y.Doc): Map<string, any> {
    const share = (doc as any).share as Map<string, any> | undefined;
    if (share && share.size > 0) return share;

    const roots = new Map<string, any>();
    const store = (doc as any).store;
    const clients: Map<number, any[]> | undefined = store?.clients;

    if (!clients) return roots;

    for (const structs of clients.values()) {
        for (const s of structs) {
            const name = s?.parentSub;
            if (!name || typeof name !== "string") continue;

            const t = s?.content?.type;
            if (t && !roots.has(name)) {
                try {
                    // ctor 기반 get (Y.Map/Y.Array/Y.Text/XmlFragment 등)
                    roots.set(name, (doc as any).get(name, t.constructor));
                } catch {
                    roots.set(name, t);
                }
            }
        }
    }

    return roots;
}

function dumpDoc(label: string, doc: Y.Doc) {
    const roots = getRootTypes(doc);

    const out: Record<string, any> = {};
    for (const [name, type] of roots) {
        if (type instanceof Y.Text) out[name] = type.toString();
        else if (type && typeof (type as any).toJSON === "function") out[name] = (type as any).toJSON();
        else out[name] = String(type);
    }

    console.log(`[Yjs] ${label} roots=${roots.size}`);
    console.log(JSON.stringify(out, null, 2));
}

export class DefaultYjsProcessor implements YjsProcessor {
    buildSnapshot(baseSnapshot: Uint8Array, updates: Uint8Array[]): Uint8Array {
        let doc = new Y.Doc();

        if (baseSnapshot?.length) {
            try {
                Y.applyUpdate(doc, baseSnapshot);
            } catch (e) {
                console.error("[YjsProcessor] base snapshot invalid", e);
                doc = new Y.Doc();
            }
        }

        dumpMindmap("after baseSnapshot", doc, "019c7083-6733-7340-9120-8601963fbb10");

        for (const update of updates) {
            console.log("apply update");
            try {
                applyYWebsocketFrame(doc, update);
            } catch (e) {
                console.error("[YjsProcessor] update invalid", e);
            }
        }

        dumpMindmap("after updates", doc, "019c7083-6733-7340-9120-8601963fbb10");

        return Y.encodeStateAsUpdate(doc);
    }
}

function dumpMindmap(label: string, doc: Y.Doc, mindmapId: string) {
    const share = (doc as any).share as Map<string, any> | undefined;
    const keys = share ? Array.from(share.keys()) : [];

    console.log(`[Yjs] ${label} rootKeys=${keys.length}`, keys);

    const out: Record<string, any> = {};

    for (const k of keys) {
        // 중요한 포인트: getMap/getArray/...로 "인스턴스화"시킨 뒤 toJSON
        // 대부분은 getMap이 맞는데, 타입이 다르면 fallback 처리
        try {
            const m = doc.getMap<any>(k);
            out[k] = m.toJSON();
            continue;
        } catch {
        }

        try {
            const a = doc.getArray<any>(k);
            out[k] = a.toJSON();
            continue;
        } catch {
        }

        try {
            const t = doc.getText(k);
            out[k] = t.toString();
            continue;
        } catch {
        }

        // 최후 fallback: share에 있는 타입 객체를 그대로 찍기
        const type = share?.get(k);
        out[k] = type && typeof type.toJSON === "function" ? type.toJSON() : String(type);
    }

    console.log(JSON.stringify(out, null, 2));
}
