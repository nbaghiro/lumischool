// What the API packs on the way out: the family's reads are repetitive JSON and the calendar reads a
// year of them, so a long answer goes packed to a caller that takes it packed, and a short one does
// not, since under about a packet the headers cost more than the packing saves.

import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, it } from "node:test";
import { squeezed } from "../http";

const pair = (accept?: string): { req: IncomingMessage; res: ServerResponse } => {
    const req = new IncomingMessage(new Socket());
    if (accept !== undefined) req.headers["accept-encoding"] = accept;
    return { req, res: new ServerResponse(req) };
};

/** A body shaped as the events read is: the same keys over and over. */
const events = (n: number): Buffer =>
    Buffer.from(
        JSON.stringify({
            events: Array.from({ length: n }, (_, i) => ({
                id: `00000000-0000-4000-8000-00000000${String(i).padStart(4, "0")}`,
                kind: "sitting-began",
                at: "2026-09-17T09:00:00.000Z",
                data: { sitting: "s", lesson: "g1-how-long-how-heavy", mode: "paper" },
            })),
        }),
    );

describe("what the API packs", () => {
    it("packs a long answer for a caller that takes it packed, and says so in the headers", async () => {
        const body = events(400);
        const { req, res } = pair("gzip, deflate, br");
        const out = await squeezed(body, req, res);
        assert.ok(out.length < body.length / 4, `${out.length} of ${body.length} is not a saving`);
        assert.equal(res.getHeader("content-encoding"), "gzip");
        assert.equal(res.getHeader("content-length"), String(out.length));
        assert.match(String(res.getHeader("vary")), /Accept-Encoding/);
    });

    it("keeps whatever the answer already varies by", async () => {
        const { req, res } = pair("gzip");
        res.setHeader("vary", "Origin");
        await squeezed(events(400), req, res);
        assert.equal(res.getHeader("vary"), "Origin, Accept-Encoding");
    });

    it("leaves a short answer as it is", async () => {
        const body = Buffer.from(JSON.stringify({ ok: true }));
        const { req, res } = pair("gzip");
        const out = await squeezed(body, req, res);
        assert.equal(out, body);
        assert.equal(res.getHeader("content-encoding"), undefined);
    });

    it("leaves every answer as it is for a caller that asks for no packing", async () => {
        const body = events(400);
        for (const accept of [undefined, "identity"]) {
            const { req, res } = pair(accept);
            const out = await squeezed(body, req, res);
            assert.equal(out, body);
            assert.equal(res.getHeader("content-encoding"), undefined);
        }
    });

    it("leaves an answer that is packed already", async () => {
        const body = events(400);
        const { req, res } = pair("gzip");
        res.setHeader("content-encoding", "br");
        const out = await squeezed(body, req, res);
        assert.equal(out, body);
        assert.equal(res.getHeader("content-encoding"), "br");
    });
});
