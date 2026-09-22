import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCAL_PEPPER } from "../db/keys";
import { codeEmail, consoleTransport } from "../email";
import { app, configFrom } from "../http";

const problemOf = (env: Record<string, string>): string => {
    const c = configFrom(env);
    return "problem" in c ? c.problem : "";
};

/** Every variable production refuses to start without. */
const PROD_ENV: Record<string, string> = {
    LUMISCHOOL_ENV: "production",
    APP_ORIGIN: "https://lumischool.example",
    AUTH_PEPPER: "a-production-only-pepper",
    RESEND_API_KEY: "re_test_key",
    RESEND_FROM: "code@lumischool.example",
};

/** `PROD_ENV`, with one required variable removed, for a case that checks its refusal. */
const prodMissing = (key: keyof typeof PROD_ENV): Record<string, string> => {
    const env = { ...PROD_ENV };
    delete env[key];
    return env;
};

describe("signing in", () => {
    it("has no route but the ones every person uses, and nothing for a demo even on this computer", async () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        const handle = app(c);
        const headers = { origin: "http://localhost:8500", "content-type": "application/json" };
        for (const [method, path] of [
            ["GET", "/api/demo"],
            ["POST", "/api/demo/sign-in"],
        ] as const) {
            const res = await handle(
                new Request(`http://127.0.0.1:8501${path}`, {
                    method,
                    headers,
                    ...(method === "POST"
                        ? { body: JSON.stringify({ email: "anna@example.com" }) }
                        : {}),
                }),
                "127.0.0.1",
            );
            assert.equal(res.status, 404, `${method} ${path}`);
        }
    });
});

describe("the fixed code", () => {
    it("is 12345678 in a local server unless AUTH_DEV_CODE names eight other digits", () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        assert.equal(c.devCode, "12345678");
        const own = configFrom({ LUMISCHOOL_ENV: "local", AUTH_DEV_CODE: "24682468" });
        assert.ok(!("problem" in own));
        assert.equal(own.devCode, "24682468");
        assert.match(problemOf({ LUMISCHOOL_ENV: "local", AUTH_DEV_CODE: "1234" }), /eight digits/);
    });

    it("refuses to start anywhere but local with AUTH_DEV_CODE set, an empty value included", () => {
        for (const value of ["12345678", ""]) {
            assert.match(
                problemOf({ LUMISCHOOL_ENV: "production", AUTH_DEV_CODE: value }),
                /AUTH_DEV_CODE is refused/,
            );
            assert.match(problemOf({ AUTH_DEV_CODE: value }), /AUTH_DEV_CODE is refused/);
        }
    });
});

describe("the server's environment", () => {
    it("will not start without a recognised LUMISCHOOL_ENV", () => {
        assert.match(problemOf({}), /LUMISCHOOL_ENV must be local or production/);
        assert.match(
            problemOf({ LUMISCHOOL_ENV: "staging" }),
            /LUMISCHOOL_ENV must be local or production/,
        );
    });

    it("keeps the fixed port unless one is given, and refuses one that is not a port", () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        assert.equal(c.port, 8501);
        assert.match(problemOf({ LUMISCHOOL_ENV: "local", API_PORT: "http" }), /API_PORT/);
    });

    it("refuses to listen locally on an address another computer can reach", () => {
        assert.match(
            problemOf({ LUMISCHOOL_ENV: "local", API_HOST: "0.0.0.0" }),
            /API_HOST must be a loopback address/,
        );
        assert.match(problemOf({ LUMISCHOOL_ENV: "local", API_HOST: "192.168.1.20" }), /loopback/);
        for (const host of ["127.0.0.1", "localhost", "::1"])
            assert.ok(
                !("problem" in configFrom({ LUMISCHOOL_ENV: "local", API_HOST: host })),
                host,
            );
    });
});

describe("the production configuration", () => {
    it("starts with every required variable set: secure cookies and the one origin", () => {
        const c = configFrom(PROD_ENV);
        assert.ok(!("problem" in c));
        assert.equal(c.env, "production");
        assert.equal(c.secure, true);
        assert.deepEqual(c.origins, ["https://lumischool.example"]);
        assert.equal(c.devCode, null);
        assert.equal(c.pepper, "a-production-only-pepper");
        assert.equal(c.port, 8501);
        assert.equal(c.host, "0.0.0.0");
        assert.equal(c.ipHeader, "cf-connecting-ip");
    });

    it("reads PORT before API_PORT, since that is what Render injects", () => {
        const c = configFrom({ ...PROD_ENV, PORT: "10000", API_PORT: "9999" });
        assert.ok(!("problem" in c));
        assert.equal(c.port, 10000);
    });

    it("refuses to start with no APP_ORIGIN", () => {
        assert.match(problemOf(prodMissing("APP_ORIGIN")), /APP_ORIGIN/);
    });

    it("refuses an origin that is not https://", () => {
        assert.match(
            problemOf({ ...PROD_ENV, APP_ORIGIN: "http://lumischool.example" }),
            /APP_ORIGIN must be an https:\/\/ address/,
        );
    });

    it("refuses to start with no AUTH_PEPPER", () => {
        assert.match(problemOf(prodMissing("AUTH_PEPPER")), /AUTH_PEPPER/);
    });

    it("refuses the local pepper, rather than falling back to it as local does", () => {
        assert.match(problemOf({ ...PROD_ENV, AUTH_PEPPER: LOCAL_PEPPER }), /AUTH_PEPPER/);
    });

    it("refuses to start with no RESEND_API_KEY: the emailed code is the only way to sign in", () => {
        assert.match(problemOf(prodMissing("RESEND_API_KEY")), /RESEND_API_KEY/);
    });

    it("refuses to start with no RESEND_FROM", () => {
        assert.match(problemOf(prodMissing("RESEND_FROM")), /RESEND_FROM/);
    });

    it("still refuses AUTH_DEV_CODE outside local, even with every other variable set", () => {
        assert.match(
            problemOf({ ...PROD_ENV, AUTH_DEV_CODE: "12345678" }),
            /AUTH_DEV_CODE is refused/,
        );
    });
});

describe("the local routes", () => {
    it("answer only a request from a loopback socket to a loopback host, before any database is touched", async () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        const handle = app(c);
        const get = (url: string, ip: string | null) => handle(new Request(url), ip);
        assert.equal((await get("http://127.0.0.1:8501/api/dev/outbox", "127.0.0.1")).status, 200);
        assert.equal(
            (await get("http://localhost:8500/api/dev/outbox", "::ffff:127.0.0.1")).status,
            200,
        );
        assert.equal((await get("http://[::1]:8501/api/dev/outbox", "::1")).status, 200);
        for (const ip of ["192.168.1.20", "203.0.113.7", null]) {
            const res = await get("http://127.0.0.1:8501/api/dev/outbox", ip);
            assert.equal(res.status, 404, String(ip));
            const body: unknown = await res.json();
            assert.deepEqual(body, { error: "not-found" });
        }
        assert.equal(
            (await get("http://rebound.example:8501/api/dev/outbox", "127.0.0.1")).status,
            404,
            "a name elsewhere pointed at this computer",
        );
    });
});

describe("what another app on the host sends", () => {
    it("reads only this API's own cookies, so a malformed one belonging to another app fails nothing", async () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        const handle = app(c);
        const cookie = "theme=100%; other=%zz";
        const outbox = await handle(
            new Request("http://127.0.0.1:8501/api/dev/outbox", { headers: { cookie } }),
            "127.0.0.1",
        );
        assert.equal(outbox.status, 200);
        const me = await handle(
            new Request("http://127.0.0.1:8501/api/me", {
                headers: { cookie: `${cookie}; ls_session=%E0%A4%A` },
            }),
        );
        assert.equal(me.status, 401, "a session cookie that does not decode is no session");
    });

    it("answers a path with a malformed escape with 404 and JSON", async () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        const res = await app(c)(new Request("http://127.0.0.1:8501/api/content/%E0%A4%A"));
        assert.equal(res.status, 404);
        const body: unknown = await res.json();
        assert.deepEqual(body, { error: "not-found" });
    });
});

describe("where the pages are locally", () => {
    it("accepts the one origin every app is served from and the scratchpad's pages", () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        assert.deepEqual(c.origins, ["http://localhost:8500", "http://localhost:5173"]);
    });

    it("refuses a state-changing request from an origin it does not know", async () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        const res = await app(c)(
            new Request("http://127.0.0.1:8501/api/auth/email/start", {
                method: "POST",
                headers: { origin: "http://localhost:8599", "content-type": "application/json" },
                body: JSON.stringify({ email: "a@example.com" }),
            }),
        );
        assert.equal(res.status, 403);
    });
});

describe("the local outbox", () => {
    it("lists what the console transport printed, newest first, without a database", async () => {
        const c = configFrom({ LUMISCHOOL_ENV: "local" });
        assert.ok(!("problem" in c));
        await consoleTransport(codeEmail("first@example.com", "11112222"));
        await consoleTransport(codeEmail("second@example.com", "33334444"));
        const res = await app(c)(new Request("http://127.0.0.1:8501/api/dev/outbox"), "127.0.0.1");
        assert.equal(res.status, 200);
        const body: unknown = await res.json();
        assert.ok(typeof body === "object" && body !== null && "emails" in body);
        assert.ok(Array.isArray(body.emails));
        const newest: unknown = body.emails[0];
        assert.ok(
            typeof newest === "object" && newest !== null && "to" in newest && "subject" in newest,
        );
        assert.equal(newest.to, "second@example.com");
        assert.equal(newest.subject, "Your lumischool code is 3333 4444");
    });
});
