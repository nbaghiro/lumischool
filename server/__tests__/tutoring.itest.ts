import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { closeApp } from "../db/client";
import { prepare } from "../db/__tests__/test-db";
import { Browser, local, startFamily } from "./browser";
const reason = await prepare();
after(closeApp);
describe("family-owned tutoring sessions", { skip: reason ?? false }, () => {
    it("persists, resumes, deduplicates, rejects stale turns and isolates families", async () => {
        const { config, outbox } = local();
        const a = new Browser(config),
            b = new Browser(config);
        await startFamily(a, outbox, { email: "tutor-a@example.test", name: "A", family: "A" });
        await startFamily(b, outbox, { email: "tutor-b@example.test", name: "B", family: "B" });
        const id = randomUUID();
        const start = await a.call("POST", "/api/tutoring/start", {
            body: { id, material: "making-ten", preferences: {} },
        });
        assert.equal(start.status, 200);
        assert.equal((await b.call("GET", `/api/tutoring/${id}`)).status, 404);
        const command = { operationId: randomUUID(), expectedRevision: 0, action: "continue" };
        const next = await a.call("POST", `/api/tutoring/${id}/turn`, { body: command });
        assert.equal(next.status, 200);
        assert.deepEqual(
            (await a.call("POST", `/api/tutoring/${id}/turn`, { body: command })).body,
            next.body,
        );
        assert.deepEqual((await a.call("GET", `/api/tutoring/${id}`)).body, next.body);
        assert.equal(
            (
                await a.call("POST", `/api/tutoring/${id}/turn`, {
                    body: { ...command, operationId: randomUUID() },
                })
            ).status,
            409,
        );
        assert.equal(
            (
                await a.call("POST", `/api/tutoring/${id}/turn`, {
                    body: { ...command, action: "answer" },
                })
            ).status,
            409,
        );
        assert.equal((await new Browser(config).call("GET", `/api/tutoring/${id}`)).status, 401);
    });
});
