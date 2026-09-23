// The seams between the pages and the API (.docs/api.md), with a fetch that answers in the test. What
// matters most is the first test: signed out, the client asks the network nothing.

import assert from "node:assert/strict";
import { test } from "node:test";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => memory.set(k, String(v)),
        removeItem: (k: string) => memory.delete(k),
        clear: () => memory.clear(),
    },
});

interface Call {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: unknown;
}
let calls: Call[] = [];
let answer: (c: Call) => { status: number; body?: unknown } = () => ({
    status: 404,
    body: { error: "not-found" },
});

const answering = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const c: Call = {
        method: init?.method ?? "GET",
        path: typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
        headers: Object.fromEntries(new Headers(init?.headers)),
        body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null,
    };
    calls.push(c);
    const a = answer(c);
    return new Response(a.status === 204 ? null : JSON.stringify(a.body ?? {}), {
        status: a.status,
        headers: { "content-type": "application/json" },
    });
};
globalThis.fetch = answering;

const api = await import("../api");

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** A field of a request's JSON body, or undefined. */
const bodyField = (c: Call | undefined, name: string): unknown =>
    isRecord(c?.body) ? c.body[name] : undefined;

const FAMILY = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Harlow",
    time_zone: "America/Denver",
};
const ROSIE = {
    id: "21111111-1111-4111-8111-111111111111",
    family_id: FAMILY.id,
    name: "Rosie",
    grade: 1,
    settings: { picture: "hedgehog", guide: "firefly" },
};
const LEO = {
    id: "31111111-1111-4111-8111-111111111111",
    family_id: FAMILY.id,
    name: "Leo",
    grade: 3,
    settings: { picture: "owl", guide: "snail" },
};
const ME = {
    user: {
        id: "51111111-1111-4111-8111-111111111111",
        email: "anna@example.com",
        name: "Anna",
        settings: {},
    },
    family: FAMILY,
    members: [
        {
            id: "61111111-1111-4111-8111-111111111111",
            user_id: "51111111-1111-4111-8111-111111111111",
            family_id: FAMILY.id,
            kid_id: null,
            from_day: null,
            to_day: null,
            ended_at: null,
        },
    ],
    families: [{ family_id: FAMILY.id, name: "Harlow", kid_id: null }],
    session: {
        id: "81111111-1111-4111-8111-111111111111",
        kind: "session",
        created_at: "2026-09-13T15:00:00.000Z",
    },
};

test("signed out, the client asks the network nothing and every reader answers null", async () => {
    memory.clear();
    calls = [];
    assert.equal(api.signedIn(), null);
    assert.equal(await api.me(), null);
    assert.equal(await api.familyRows(), null);
    assert.equal(await api.events(), null);
    assert.deepEqual(calls, [], "a signed-out page made a request");
});

test("a code is asked for with a JSON body, and each way verifying can go comes back as its own shape", async () => {
    memory.clear();
    calls = [];
    answer = (c) =>
        c.path === "/api/auth/email/start"
            ? { status: 202, body: {} }
            : { status: 400, body: { error: "wrong-code", attemptsLeft: 3 } };
    assert.equal(await api.startEmail("anna@example.com"), true);
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.headers["content-type"], "application/json");
    assert.deepEqual(calls[0]?.body, { email: "anna@example.com", tab: true });
    assert.deepEqual(await api.verifyCode("11111111"), {
        error: "wrong-code",
        status: 400,
        attemptsLeft: 3,
    });
    answer = () => ({ status: 410, body: { error: "expired" } });
    assert.deepEqual(await api.verifyCode("22222222"), { error: "expired", status: 410 });
    answer = () => ({ status: 429, body: { error: "rate-limited", retryAfter: 720 } });
    assert.deepEqual(await api.startEmail("anna@example.com"), {
        error: "rate-limited",
        status: 429,
        retryAfter: 720,
    });
    answer = () => ({
        status: 200,
        body: { choose: [{ family_id: FAMILY.id, name: "Harlow", kid_id: null }] },
    });
    assert.deepEqual(await api.verifyCode("33333333"), {
        choose: [{ family_id: FAMILY.id, name: "Harlow", kid_id: null }],
    });
    answer = () => ({ status: 200, body: { start: true } });
    assert.deepEqual(await api.verifyCode("44444444"), { start: true });
    assert.equal(api.signedIn(), null, "choosing or starting is not signed in yet");
});

test("starting a family carries its answers on the code", async () => {
    calls = [];
    answer = () => ({ status: 202, body: {} });
    const start = { name: "Sam", family: "Okafor", timeZone: "Europe/London" };
    assert.equal(await api.startEmail("sam@example.com", { start }), true);
    assert.deepEqual(calls[0]?.body, { email: "sam@example.com", start, tab: true });
});

test("a sign-in leaves a hint, and a session the API has ended forgets it", async () => {
    memory.clear();
    answer = () => ({ status: 200, body: { me: ME } });
    const r = await api.verifyCode("12345678");
    assert.ok("me" in r && r.me.family.name === "Harlow");
    assert.deepEqual(api.signedIn(), {
        email: "anna@example.com",
        name: "Anna",
        family: "Harlow",
    });
    answer = (c) =>
        c.path === "/api/me"
            ? { status: 200, body: ME }
            : { status: 404, body: { error: "not-found" } };
    assert.equal((await api.me())?.user.name, "Anna");
    answer = () => ({ status: 401, body: { error: "signed-out" } });
    assert.equal(await api.me(), null);
    assert.equal(api.signedIn(), null);
});

test("a screen served for a session cookie asks who is signed in even with no hint, and hears why not", async () => {
    memory.clear();
    calls = [];
    answer = () => ({ status: 401, body: { error: "signed-out" } });
    assert.equal(await api.me(), null);
    assert.equal(calls.length, 0, "with no hint, a plain look asks nothing");
    assert.deepEqual(await api.me({ ask: true }), { error: "signed-out", status: 401 });
    assert.equal(calls[0]?.path, "/api/me");
    answer = () => ({ status: 200, body: ME });
    const m = await api.me({ ask: true });
    assert.ok(!("error" in m) && m.user.email === ME.user.email);
    assert.ok(api.signedIn(), "a session found by asking leaves the hint for the next page");
    answer = () => ({ status: 401, body: { error: "signed-out" } });
    await api.me({ ask: true });
    assert.equal(api.signedIn(), null, "and a session the API refuses forgets it");
    globalThis.fetch = async () => {
        throw new TypeError("network down");
    };
    assert.deepEqual(await api.me({ ask: true }), { error: "offline", status: 0 });
    globalThis.fetch = answering;
});

test("the family's rows are asked for even with no hint when a screen was served for a session cookie", async () => {
    memory.clear();
    calls = [];
    answer = () => ({
        status: 200,
        body: { family: FAMILY, kids: [ROSIE, LEO], members: ME.members, users: [], pin: true },
    });
    assert.equal(await api.familyRows(), null);
    assert.equal(calls.length, 0, "with no hint, a plain look asks nothing");
    const view = await api.familyRows({ ask: true });
    assert.ok(!("error" in view) && view.kids.map((k) => k.name).join() === "Rosie,Leo");
    assert.ok(!("error" in view) && view.pin, "whether the family has a PIN comes with its rows");
    assert.equal(calls[0]?.path, "/api/family");
    answer = () => ({ status: 200, body: { family: FAMILY } });
    const half = await api.familyRows({ ask: true });
    assert.ok("error" in half && half.error === "server", "a body without its rows is no family");
    answer = () => ({ status: 401, body: { error: "signed-out" } });
    assert.deepEqual(await api.familyRows({ ask: true }), { error: "signed-out", status: 401 });
    globalThis.fetch = async () => {
        throw new TypeError("network down");
    };
    assert.deepEqual(await api.familyRows({ ask: true }), { error: "offline", status: 0 });
    globalThis.fetch = answering;
});

test("signing out forgets the sign-in only once the API has said the session is over", async () => {
    memory.clear();
    answer = () => ({ status: 200, body: { me: ME } });
    await api.verifyCode("12345678");
    assert.ok(api.signedIn());
    globalThis.fetch = async () => {
        throw new TypeError("network down");
    };
    assert.deepEqual(await api.signOut(), { error: "offline", status: 0 });
    assert.ok(api.signedIn(), "a sign-out that never arrived keeps the hint");
    globalThis.fetch = answering;
    answer = () => ({ status: 500, body: { error: "server" } });
    assert.deepEqual(await api.signOut(), { error: "server", status: 500 });
    assert.ok(api.signedIn(), "and so does one the API could not carry out");
    answer = () => ({ status: 204 });
    assert.equal(await api.signOut(), true);
    assert.equal(api.signedIn(), null);
    answer = () => ({ status: 200, body: { me: ME } });
    await api.verifyCode("12345678");
    answer = () => ({ status: 401, body: { error: "signed-out" } });
    assert.equal(await api.signOut(), true, "a session that had already ended is signed out");
    assert.equal(api.signedIn(), null);
});

test("an API that cannot be reached is offline, and a proxy's own error page is not mistaken for one of ours", async () => {
    globalThis.fetch = async () => {
        throw new TypeError("fetch failed");
    };
    assert.deepEqual(await api.endKidSessions(), { error: "offline", status: 0 });
    globalThis.fetch = async () => new Response("<html>bad gateway</html>", { status: 502 });
    assert.deepEqual(await api.endKidSessions(), { error: "offline", status: 502 });
    globalThis.fetch = answering;
    answer = () => ({ status: 404, body: { error: "not-found" } });
    assert.deepEqual(await api.endKidSessions(), { error: "not-found", status: 404 });
});

test("a kid is added with the notice the parent was shown, and a changed notice comes back to be shown", async () => {
    calls = [];
    answer = () => ({ status: 200, body: { kid: ROSIE } });
    const added = await api.addKid({ name: "Rosie", grade: 1, notice: "2026-09" });
    assert.ok(!("error" in added) && added.kid.name === "Rosie");
    assert.deepEqual(calls[0]?.body, { name: "Rosie", grade: 1, consent: { notice: "2026-09" } });
    answer = () => ({ status: 409, body: { error: "notice-changed", notice: "2027-01" } });
    assert.deepEqual(await api.addKid({ name: "Rosie", grade: 1, notice: "2026-09" }), {
        error: "notice-changed",
        status: 409,
        notice: "2027-01",
    });
});

test("appends under a session send drafts, and read back what the server stored", async () => {
    memory.clear();
    answer = () => ({ status: 200, body: { me: ME } });
    await api.verifyCode("12345678");
    const stored = {
        id: "c1111111-1111-4111-8111-111111111111",
        family_id: FAMILY.id,
        kid_id: ROSIE.id,
        kind: "plan-changed",
        data: { op: { op: "shift", from: "2026-09-14", weeks: 1 } },
        actor: ME.user.id,
        device: ME.session.id,
        seq: 7,
        at: "2026-09-13T16:00:00.000Z",
    };
    calls = [];
    answer = () => ({ status: 200, body: { events: [stored] } });
    const r = await api.append([
        {
            id: stored.id,
            kid_id: ROSIE.id,
            kind: "plan-changed",
            data: { op: { op: "shift", from: "2026-09-14", weeks: 1 } },
            at: stored.at,
        },
    ]);
    assert.ok(Array.isArray(r) && r[0]?.seq === 7);
    const sent = bodyField(calls[0], "events");
    assert.ok(Array.isArray(sent) && isRecord(sent[0]));
    assert.deepEqual(
        Object.keys(sent[0]).sort(),
        ["at", "data", "id", "kid_id", "kind"],
        "a draft names no family, actor, device or seq",
    );
    answer = () => ({
        status: 400,
        body: { error: "bad-envelope", at: 0, problem: "at must be an instant" },
    });
    assert.deepEqual(await api.append([]), {
        error: "bad-envelope",
        status: 400,
        at: 0,
        problem: "at must be an instant",
    });
});

test("opening a child tab keeps the shared parent sign-in", async () => {
    memory.set(
        "lumischool.signed-in",
        JSON.stringify({ email: ME.user.email, name: ME.user.name, family: FAMILY.name }),
    );
    calls = [];
    answer = () => ({ status: 200, body: { credential: "family.key.secret" } });
    assert.equal(await api.openKidSession([ROSIE.id, LEO.id]), true);
    assert.deepEqual(calls[0]?.body, { kids: [ROSIE.id, LEO.id], tab: true });
    assert.equal(calls[0]?.headers["content-type"], "application/json");
    assert.equal(api.signedIn()?.email, ME.user.email);
    assert.equal((await import("../kid-session")).kidCredential(), "family.key.secret");
});

test("setting a PIN can ask for a sign-in, and ending every view says how many closed", async () => {
    calls = [];
    answer = () => ({ status: 403, body: { error: "fresh-sign-in" } });
    assert.deepEqual(await api.setPin("2468"), { error: "fresh-sign-in", status: 403 });
    assert.deepEqual(calls[0]?.body, { pin: "2468" });
    calls = [];
    answer = () => ({ status: 200, body: { ended: 2 } });
    assert.deepEqual(await api.endKidSessions(), { ended: 2 });
    assert.deepEqual(calls[0]?.path, "/api/kid-sessions/end-all");
});

test("the outbox is read only where it exists", async () => {
    answer = () => ({ status: 404, body: { error: "not-found" } });
    assert.equal(await api.outbox(), null);
    const email = {
        to: "a@example.com",
        subject: "Your lumischool code is 1234 5678",
        text: "…",
        at: "2026-09-13T16:00:00.000Z",
    };
    answer = () => ({ status: 200, body: { emails: [email] } });
    assert.deepEqual(await api.outbox(), { emails: [email] });
});
