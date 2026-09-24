import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { closeApp, open, withFamily } from "../db/client";
import { deleteFamily } from "../db/events";
import { prepare } from "../db/__tests__/test-db";
import type { GameAttempt } from "../../engine/answer";
import { Browser, local, startFamily, addKid, at } from "./browser";
const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});
describe("parent QA game attempts", { skip: reason ?? false }, () => {
    it("requires explicit owned children, binds the family and makes offline resends idempotent", async () => {
        const { config, outbox } = local();
        const a = new Browser(config),
            b = new Browser(config);
        const one = await startFamily(a, outbox, {
            email: "game-a@example.test",
            name: "A",
            family: "A",
        });
        const two = await startFamily(b, outbox, {
            email: "game-b@example.test",
            name: "B",
            family: "B",
        });
        try {
            const kid = await addKid(a, "A", 1),
                other = await addKid(b, "B", 1);
            const attempt: GameAttempt = {
                id: randomUUID(),
                challenge: {
                    id: "jugs:test",
                    game: "jugs",
                    phase: 0,
                    seed: 1,
                    source: "generated",
                    generatorVersion: "1",
                    rulesVersion: "1",
                    configuration: { capacities: [3, 5], target: 4 },
                    difficulty: { version: "1", band: 1, reasoning: 1, motor: 0, content: 1 },
                    validation: { method: "search", version: "1" },
                },
                startedAt: "2026-09-23T10:00:00.000Z",
                completedAt: "2026-09-23T10:00:10.000Z",
                outcome: "completed",
                moves: 6,
                assistance: 0,
                retries: 0,
                activeMs: 10000,
                input: "keyboard",
                reducedMotion: false,
                objectives: { completed: 1, total: 1 },
            };
            const draft = {
                id: attempt.id,
                kid_id: kid,
                kind: "game-attempted",
                at: attempt.completedAt,
                data: attempt,
            };
            const send = (body: unknown) => a.call("POST", "/api/events", { body });
            assert.equal((await send({ events: [{ ...draft, kid_id: null }] })).status, 400);
            assert.equal((await send({ events: [{ ...draft, kid_id: other }] })).status, 403);
            assert.equal(
                (await send({ events: [draft], expected_family_id: two.family })).status,
                403,
            );
            assert.equal((await send({ events: [draft], expected_user_id: two.user })).status, 403);
            const saved = await send({ events: [draft], expected_family_id: one.family });
            assert.equal(saved.status, 200);
            assert.deepEqual(
                (await send({ events: [draft], expected_family_id: one.family })).body,
                saved.body,
            );
            const log = await a.call("GET", `/api/events?kid=${kid}&kinds=game-attempted`);
            assert.equal(log.status, 200);
            assert.equal(
                Array.isArray(at(log.body, "events")) && at(log.body, "events", "length"),
                1,
            );
            assert.equal(
                (await b.call("GET", `/api/events?kid=${kid}&kinds=game-attempted`)).status,
                404,
            );
        } finally {
            await withFamily({ family: one.family, user: one.user }, (tx) =>
                deleteFamily(tx, one.family),
            );
            await withFamily({ family: two.family, user: two.user }, (tx) =>
                deleteFamily(tx, two.family),
            );
        }
    });
});
