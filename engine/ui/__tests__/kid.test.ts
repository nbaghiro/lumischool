// The child's view's queue against a fake API that keeps what it is sent, as the real one does, by
// the event's id. What matters most: answers recorded with no network all arrive once it is back, in
// chunks the API accepts, in the order they were made, and nothing the API refuses can hold up the rest.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Draft } from "../../answer";
import * as kid from "../kid";

const ROSIE = "22222222-2222-4222-8222-222222222222";
const LEO = "33333333-3333-4333-8333-333333333333";

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** What the fake API holds, and what it was asked. */
const api = {
    offline: false,
    /** Successful chunks before the network goes away. */
    landingsLeft: Number.POSITIVE_INFINITY,
    /** Store the next chunk, then lose the answer on the way back. */
    loseNextAnswer: false,
    /** An id the API refuses, as it refuses an event the caller may not write. */
    refuse: new Set<string>(),
    /** Store the next chunk, then answer without the ids, as a fault of ours would. */
    answerBare: false,
    session: true,
    stored: [] as { kid: string; id: string; body: Record<string, unknown> }[],
    chunks: [] as number[],
    left: 0,
    added: 0,
};

const json = (status: number, body?: unknown): Response =>
    new Response(status === 204 ? null : JSON.stringify(body ?? {}), {
        status,
        headers: { "content-type": "application/json" },
    });

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const path = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (api.offline) throw new TypeError("Failed to fetch");
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    if (!api.session) return json(401, { error: "no-kid-session" });
    const events = /^\/api\/kid\/([^/]+)\/events$/.exec(path);
    if (events && init?.method === "POST") {
        const batch =
            isRecord(body) && Array.isArray(body.events) ? (body.events as unknown[]) : [];
        if (batch.length > 50 || (typeof init.body === "string" && init.body.length > 1024 * 1024))
            return json(413, { error: "too-large" });
        const at = batch.findIndex((e) => isRecord(e) && api.refuse.has(String(e.id)));
        if (at >= 0) return json(403, { error: "not-allowed", at });
        if (api.landingsLeft <= 0) throw new TypeError("Failed to fetch");
        api.landingsLeft -= 1;
        api.chunks.push(batch.length);
        for (const e of batch) {
            if (!isRecord(e) || api.stored.some((s) => s.id === e.id)) continue;
            api.stored.push({
                kid: decodeURIComponent(events[1] ?? ""),
                id: String(e.id),
                body: e,
            });
        }
        if (api.loseNextAnswer) {
            api.loseNextAnswer = false;
            throw new TypeError("Failed to fetch");
        }
        if (api.answerBare) {
            api.answerBare = false;
            return json(200, {});
        }
        return json(200, { ids: batch.map((e) => (isRecord(e) ? e.id : null)) });
    }
    if (path === "/api/kid/leave" && init?.method === "POST") {
        api.left += 1;
        return isRecord(body) && body.pin === "2468"
            ? json(204)
            : json(400, { error: "wrong-pin", attemptsLeft: 4 });
    }
    if (path === "/api/kid/tab") return json(200, { credential: "family.key.secret" });
    if (path === "/api/kid")
        return json(200, {
            family: { name: "Harlow", time_zone: "America/Denver" },
            kids: [{ id: ROSIE, family_id: "f", name: "Rosie", grade: 1, settings: {} }],
            others: [{ id: LEO, name: "Leo" }],
            pin: true,
        });
    if (path === "/api/kid/add" && init?.method === "POST") {
        api.added += 1;
        return isRecord(body) && body.pin === "2468" && body.kid === LEO
            ? json(204)
            : json(400, { error: "wrong-pin", attemptsLeft: 4 });
    }
    return json(404, { error: "not-found" });
};

// The client waits between tries with timers, which a test would leave running; it tries again here
// only when asked.
kid.useLater(() => () => undefined);

let sending: kid.Sending = { unsent: 0, offline: false, ended: false };
kid.watch((s) => {
    sending = s;
});

const doing = (lesson = "g1-making-ten"): kid.Doing => ({
    kind: "sitting-began",
    data: { sitting: crypto.randomUUID(), lesson, lessonHash: "h", pack: "p", mode: "screen" },
});

async function recorded(kidId: string, n: number): Promise<Draft[]> {
    const out: Draft[] = [];
    for (let i = 0; i < n; i += 10) {
        const r = await kid.record(
            kidId,
            Array.from({ length: Math.min(10, n - i) }, () => doing()),
        );
        if (!Array.isArray(r)) throw new Error(r.problem);
        out.push(...r);
    }
    return out;
}

beforeEach(async () => {
    Object.assign(api, {
        offline: false,
        landingsLeft: Number.POSITIVE_INFINITY,
        loseNextAnswer: false,
        answerBare: false,
        session: true,
    });
    api.refuse.clear();
    await kid.send();
    api.stored = [];
    api.chunks = [];
    api.left = 0;
    api.added = 0;
    assert.equal(sending.unsent, 0, "each case starts with nothing waiting");
});

test("puts one kid's waiting events in chunks of at most fifty and 512 KB, oldest first, and each kid's in chunks of their own", () => {
    const row = (kid_id: string, order: number, bytes = 100): kid.Queued => {
        const draft: Draft = {
            ...doing(),
            id: crypto.randomUUID(),
            kid_id,
            at: "2026-09-14T09:00:00.000Z",
        };
        return { id: draft.id, kid_id, draft, order, bytes };
    };
    const many = Array.from({ length: 120 }, (_, i) => row(ROSIE, 120 - i));
    assert.deepEqual(
        kid.chunksOf(many).map((c) => c.length),
        [50, 50, 20],
    );
    assert.deepEqual(
        kid
            .chunksOf(many)[0]
            ?.map((r) => r.order)
            .slice(0, 3),
        [1, 2, 3],
        "oldest first",
    );
    const big = [1, 2, 3].map((order) => row(ROSIE, order, 200 * 1024));
    assert.deepEqual(
        kid.chunksOf(big).map((c) => c.length),
        [2, 1],
    );
    const mixed = [row(LEO, 2), row(ROSIE, 1), row(ROSIE, 3)];
    assert.deepEqual(
        kid.chunksOf(mixed).map((c) => c.map((r) => [r.kid_id, r.order])),
        [
            [
                [ROSIE, 1],
                [ROSIE, 3],
            ],
            [[LEO, 2]],
        ],
    );
});

test("sends 510 answers recorded with no network once it is back, in chunks the API accepts, in the order they were made", async () => {
    api.offline = true;
    const drafts = await recorded(ROSIE, 510);
    await kid.send();
    assert.equal(sending.unsent, 510);
    assert.equal(sending.offline, true);
    assert.equal(api.stored.length, 0);

    api.offline = false;
    await kid.send();
    assert.equal(sending.unsent, 0);
    assert.equal(sending.offline, false);
    assert.deepEqual(api.chunks, [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 10]);
    assert.deepEqual(
        api.stored.map((s) => s.id),
        drafts.map((d) => d.id),
    );
    assert.ok(api.stored.every((s) => s.kid === ROSIE));
    assert.deepEqual(
        Object.keys(api.stored[0]?.body ?? {}).sort(),
        ["at", "data", "id", "kid_id", "kind"],
        "a draft carries no family, device, number or grown-up: the API stamps those",
    );
});

/** The window's online and offline events and the document's visibility, which `start` listens to and Node has none of. */
function fakeWindow(): { fire: (type: string) => void; restore: () => void } {
    const heard = new Map<string, () => void>();
    const had = {
        add: Object.getOwnPropertyDescriptor(globalThis, "addEventListener"),
        remove: Object.getOwnPropertyDescriptor(globalThis, "removeEventListener"),
        document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    };
    const define = (name: string, value: unknown) =>
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    define("addEventListener", (type: string, on: () => void) => heard.set(type, on));
    define("removeEventListener", (type: string) => heard.delete(type));
    define("document", {
        visibilityState: "visible",
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    });
    return {
        fire: (type) => heard.get(type)?.(),
        restore: () => {
            for (const [name, d] of [
                ["addEventListener", had.add],
                ["removeEventListener", had.remove],
                ["document", had.document],
            ] as const)
                if (d) Object.defineProperty(globalThis, name, d);
                else Reflect.deleteProperty(globalThis, name);
        },
    };
}

test("the note that the network is away stays up when a send begun as the page opened finds nothing waiting", async () => {
    const page = fakeWindow();
    const stop = kid.start();
    try {
        await kid.send();
        assert.equal(sending.offline, false);
        // the network goes while the page's first send is still reading the queue, which is empty
        page.fire("offline");
        await kid.send();
        assert.equal(sending.unsent, 0);
        assert.equal(
            sending.offline,
            true,
            "an empty queue took the note down with the network away",
        );
        page.fire("online");
        await kid.send();
        assert.equal(sending.offline, false, "and it comes down when the network is back");
    } finally {
        stop();
        page.restore();
    }
});

test("an answer that lands takes the note down though the browser never said the network was back", async () => {
    const page = fakeWindow();
    const stop = kid.start();
    try {
        page.fire("offline");
        api.offline = true;
        await recorded(ROSIE, 3);
        assert.equal(sending.offline, true);
        // the network comes back with no online event, and the retry's answers land
        api.offline = false;
        await kid.send();
        assert.equal(sending.unsent, 0);
        assert.equal(sending.offline, false, "the note stayed up after the answers landed");
    } finally {
        stop();
        page.restore();
    }
});

test("keeps what has not landed when the network goes part way, and sends it when it is back", async () => {
    api.offline = true;
    await recorded(ROSIE, 120);
    api.offline = false;
    api.landingsLeft = 2;
    await kid.send();
    assert.equal(api.stored.length, 100, "two chunks landed");
    assert.equal(sending.unsent, 20, "and left the queue as they did");
    assert.equal(sending.offline, true);

    api.landingsLeft = Number.POSITIVE_INFINITY;
    await kid.send();
    assert.equal(api.stored.length, 120);
    assert.equal(sending.unsent, 0);
});

test("sends a chunk again when its answer was lost, and the API writes it once", async () => {
    api.offline = true;
    await recorded(LEO, 30);
    api.offline = false;
    api.loseNextAnswer = true;
    await kid.send();
    assert.equal(sending.unsent, 30, "a lost answer leaves the chunk waiting");
    await kid.send();
    assert.equal(sending.unsent, 0);
    assert.deepEqual(api.chunks, [30, 30]);
    assert.equal(api.stored.length, 30);
});

test("takes out of the queue the ids the API says it holds, and a chunk answered without them waits and goes again", async () => {
    api.offline = true;
    await recorded(ROSIE, 20);
    // The sends recording set off have to settle first, since a send asked for while one runs makes it go round again.
    await kid.send();
    api.offline = false;
    api.answerBare = true;
    await kid.send();
    assert.equal(sending.unsent, 20, "an answer that names no ids leaves the chunk waiting");
    assert.equal(api.stored.length, 20, "though the API did store it");
    await kid.send();
    assert.equal(sending.unsent, 0);
    assert.deepEqual(api.chunks, [20, 20]);
    assert.equal(api.stored.length, 20, "and it was written once");
});

test("drops an event the API refuses, and the rest of its chunk and the chunks behind it carry on", async () => {
    api.offline = true;
    const drafts = await recorded(ROSIE, 60);
    const refused = drafts[3]?.id ?? "";
    api.refuse.add(refused);
    api.offline = false;
    await kid.send();
    assert.equal(sending.unsent, 0);
    assert.equal(api.stored.length, 59);
    assert.ok(!api.stored.some((s) => s.id === refused));
});

test("refuses an event over 256 KB when it is recorded, and keeps nothing of it", async () => {
    api.offline = true;
    const r = await kid.record(ROSIE, [doing(), doing("x".repeat(300 * 1024))]);
    assert.ok(!Array.isArray(r) && /over/.test(r.problem));
    await kid.send();
    assert.equal(sending.unsent, 0);
});

test("clears what was waiting and says so when the kid session has ended", async () => {
    api.offline = true;
    await recorded(ROSIE, 3);
    api.offline = false;
    api.session = false;
    await kid.send();
    assert.equal(sending.unsent, 0);
    assert.equal(sending.ended, true);
    api.session = true;
    assert.ok(!("error" in (await kid.view())));
    assert.equal(sending.ended, false);
});

test("leaves the children's view with the PIN only once everything waiting has landed", async () => {
    api.offline = true;
    await recorded(ROSIE, 2);
    const offline = await kid.leave("2468");
    assert.ok(offline !== true && offline.error === "offline");
    assert.equal(api.left, 0, "the PIN is not sent while answers wait");

    api.offline = false;
    const wrong = await kid.leave("1111");
    assert.ok(wrong !== true && wrong.error === "wrong-pin" && wrong.attemptsLeft === 4);
    assert.equal(api.stored.length, 2, "what was waiting was sent before the PIN");

    assert.equal(await kid.leave("2468"), true);
    assert.equal(sending.ended, true);
});

test("adds another of the family's children to the view with the PIN, and the view then lists them", async () => {
    const view = await kid.view();
    assert.ok(!("error" in view));
    assert.deepEqual(view.others, [{ id: LEO, name: "Leo" }]);
    const wrong = await kid.add("1111", LEO);
    assert.ok(wrong !== true && wrong.error === "wrong-pin" && wrong.attemptsLeft === 4);
    assert.equal(await kid.add("2468", LEO), true);
    assert.equal(api.added, 2);
    assert.equal(sending.ended, false, "adding a child does not end the view");
});
