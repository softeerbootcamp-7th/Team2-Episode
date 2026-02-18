import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

type JwtClaims = {
	typ: "ws-mindmap";
	mindmapId: string;
	iat: number;
	exp: number;
};

export class MindmapTicketIssuer {
	private readonly secret: string;
	private readonly issuer: string;
	private readonly ttlSeconds: number;

	constructor(opts: { secret: string; issuer?: string; ttlSeconds?: number }) {
		if (!opts.secret) {
			throw new Error(`JWT secret is missing.`);
		}

		this.secret = opts.secret;
		this.issuer = opts.issuer ?? "episode";
		this.ttlSeconds = opts.ttlSeconds ?? 30;
	}

	issue(mindmapId: string): string {
		if (!mindmapId || mindmapId.trim().length === 0) {
			throw new Error("mindmapId is required");
		}

		const now = Math.floor(Date.now() / 1000);

		const payload: JwtClaims = {
			typ: "ws-mindmap",
			mindmapId,
			iat: now,
			exp: now + this.ttlSeconds,
		};

		return jwt.sign(payload, this.secret, {
			algorithm: "HS256",
			issuer: this.issuer,
			subject: "0",
			jwtid: randomUUID(),
			noTimestamp: true,
		});
	}
}
