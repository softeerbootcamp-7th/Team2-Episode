import WebSocket from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { MindmapTicketIssuer } from "./MindmapTicketIssuer";

const messageSync = 0;

export class WebsocketSyncClient {
	private readonly baseUrl: string;
	private readonly timeoutMs: number;
	private readonly ticketIssuer: MindmapTicketIssuer;

	constructor(
		ticketIssuer: MindmapTicketIssuer,
		baseUrl: string,
		timeoutMs?: number,
	) {
		this.baseUrl = baseUrl;
		this.timeoutMs = timeoutMs ?? 10_000;
		this.ticketIssuer = ticketIssuer;
	}

	async sync(doc: Y.Doc, roomId: string): Promise<Y.Doc> {
		const token = this.ticketIssuer.issue(roomId);

		const url = this.buildWsUrl(roomId, token);
		return this.syncOnce(doc, url);
	}

	private toUint8(msg: WebSocket.RawData): Uint8Array {
		if (Buffer.isBuffer(msg)) {
			return new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength);
		}
		if (msg instanceof ArrayBuffer) {
			return new Uint8Array(msg);
		}
		if (Array.isArray(msg)) {
			const b = Buffer.concat(msg);
			return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
		}
		throw new TypeError(`Unexpected ws message ${typeof msg}`);
	}

	private buildWsUrl(roomId: string, token?: string) {
		const qs = token ? `?token=${encodeURIComponent(token)}` : "";
		return `${this.baseUrl}/${encodeURIComponent(roomId)}${qs}`;
	}

	private syncOnce(doc: Y.Doc, url: string): Promise<Y.Doc> {
		return new Promise<Y.Doc>((resolve, reject) => {
			let settled = false;
			const ws = new WebSocket(url);
			const timer = setTimeout(() => {
				if (settled) return;
				settled = true;
				cleanup();
				try {
					ws.close();
				} catch {}
				reject(new Error(`Sync timeout`));
			}, this.timeoutMs);

			const cleanup = () => {
				clearTimeout(timer);
				ws.removeAllListeners();
				try {
					ws.close();
				} catch {}
			};

			ws.on("open", () => {
				const enc = encoding.createEncoder();
				encoding.writeVarUint(enc, messageSync);
				syncProtocol.writeSyncStep1(enc, doc);
				ws.send(encoding.toUint8Array(enc));
			});

			ws.on("message", (msg: WebSocket.RawData) => {
				try {
					const buf = this.toUint8(msg);

					const dec = decoding.createDecoder(buf);

					const outerType = decoding.readVarUint(dec);
					if (outerType !== messageSync) return;

					const innerType = decoding.readVarUint(dec);

					if (innerType === syncProtocol.messageYjsUpdate) return;

					if (innerType === syncProtocol.messageYjsSyncStep1) {
						const replyEnc = encoding.createEncoder();
						encoding.writeVarUint(replyEnc, messageSync);

						syncProtocol.readSyncStep1(dec, replyEnc, doc);

						if (encoding.length(replyEnc) > 1) {
							ws.send(encoding.toUint8Array(replyEnc));
						}
						return;
					}

					if (innerType === syncProtocol.messageYjsSyncStep2) {
						syncProtocol.readSyncStep2(dec, doc, null);

						if (!settled) {
							settled = true;
							cleanup();
							resolve(doc);
						}
						return;
					}
				} catch (e) {
					if (!settled) {
						settled = true;
						cleanup();
						reject(e instanceof Error ? e : new Error(String(e)));
					}
				}
			});

			ws.on("error", (err) => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(err);
			});

			ws.on("close", () => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(new Error(`Websocket closed before sync complete.`));
			});
		});
	}
}
