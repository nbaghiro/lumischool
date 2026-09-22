// The health check when the database cannot answer, which needs no database: the app role is pointed at
// a port that refuses, and at one that accepts and never replies.

import assert from "node:assert/strict";
import { createServer, type Socket } from "node:net";
import { after, describe, it } from "node:test";
import { closeApp } from "../db/client";
import { app, configFrom } from "../http";

process.env.DB_CONNECT_TIMEOUT = "1";

after(closeApp);

async function health(): Promise<{ status: number; body: unknown; ms: number }> {
    const c = configFrom({ LUMISCHOOL_ENV: "local" });
    assert.ok(!("problem" in c));
    const started = Date.now();
    const res = await app(c)(new Request("http://127.0.0.1:8501/api/health"));
    const body: unknown = await res.json();
    return { status: res.status, body, ms: Date.now() - started };
}

describe("the health check", () => {
    it("answers 503 when the database refuses the connection", async () => {
        // Port 1 on this computer has nothing listening, so the connection is refused at once.
        process.env.APP_DATABASE_URL = "postgres://lumischool_app:x@127.0.0.1:1/lumischool";
        try {
            const answer = await health();
            assert.equal(answer.status, 503);
            assert.deepEqual(answer.body, {
                error: "server",
                problem: "the database did not answer",
            });
        } finally {
            await closeApp();
        }
    });

    it("answers 503 within about a second when the database never replies", async () => {
        const sockets = new Set<Socket>();
        const silent = createServer((socket) => {
            sockets.add(socket);
            socket.on("close", () => sockets.delete(socket));
            // Read and drop what the pool sends, so the server sees the pool hang up.
            socket.resume();
        });
        await new Promise<void>((done) => {
            silent.listen(0, "127.0.0.1", done);
        });
        const address = silent.address();
        assert.ok(address !== null && typeof address === "object");
        process.env.APP_DATABASE_URL = `postgres://lumischool_app:x@127.0.0.1:${address.port}/lumischool`;
        try {
            const answer = await health();
            assert.equal(answer.status, 503);
            assert.ok(answer.ms < 1900, `answered in ${answer.ms} ms`);
        } finally {
            // Stop accepting first, since the pool connects again when its socket is destroyed, and a
            // connection accepted after that would keep the server, and the test, open for good.
            const closed = new Promise<void>((done) => {
                silent.close(() => done());
            });
            for (const socket of sockets) socket.destroy();
            await closeApp();
            for (const socket of sockets) socket.destroy();
            await closed;
        }
    });
});
