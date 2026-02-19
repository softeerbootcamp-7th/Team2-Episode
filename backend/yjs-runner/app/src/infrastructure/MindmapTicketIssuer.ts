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
    private readonly ttlSeconds: number;
    private readonly issuer = "episode";

    constructor(secret: string, ttlSeconds?: number) {
        if (!secret) {
            throw new Error(`JWT secret is missing.`);
        }

        this.secret = secret;
        this.ttlSeconds = ttlSeconds ?? 30;
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
