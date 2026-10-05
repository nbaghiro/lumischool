// The app's credential (.docs/mobile.md, "The server's part"): sign-in that answers in the body, the
// bearer and device headers on adult and kid routes, the hand-off to a web view, and the build header.

import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { deviceName } from "../auth";
import { closeApp, open, withFamily, type Store } from "../db/client";
import { issue, parseCredential } from "../db/keys";
import { prepare, truncate } from "../db/__tests__/test-db";
import type { Email } from "../email";
import { app, type Config } from "../http";
import { addKid, at, Browser, codeFor, local, startFamily, text } from "./browser";

await prepare();
const owner: Store = open();

after(async () => {
    await closeApp();
    await owner.close();
});

interface Answer {
    status: number;
    body: unknown;
    cookies: string[];
    headers: Headers;
}

/** The app's side of the wire: no Origin, no cookie jar, and only the headers a test gives it. */
class Phone {
    readonly handle: ReturnType<typeof app>;
    session: string | null = null;
    device: string | null = null;

    readonly ip = "198.51.100.4";

    constructor(config: Config) {
        this.handle = app(config);
    }

    async call(
        method: "GET" | "POST",
        path: string,
        opts: { body?: unknown; headers?: Record<string, string>; signedIn?: boolean } = {},
    ): Promise<Answer> {
        const headers = new Headers(opts.headers);
        headers.set("user-agent", "lumischoolApp/1.0 (iPhone; iOS 19.0)");
        if (opts.signedIn !== false) {
            if (this.session) headers.set("authorization", `Bearer ${this.session}`);
            if (this.device) headers.set("x-lumi-device", this.device);
        }
        if (method === "POST") headers.set("content-type", "application/json");
        const res = await this.handle(
            new Request(`http://127.0.0.1:8501${path}`, {
                method,
                headers,
                ...(method === "POST" ? { body: JSON.stringify(opts.body ?? {}) } : {}),
            }),
            this.ip,
        );
        const raw = await res.text();
        const body: unknown = raw ? JSON.parse(raw) : null;
        return {
            status: res.status,
            body,
            cookies: res.headers.getSetCookie(),
            headers: res.headers,
        };
    }

    /** Flow 2 from the app: the address, then the code, both answered in the body. */
    async signIn(outbox: Email[], email: string): Promise<Answer> {
        const asked = await this.call("POST", "/api/auth/email/start", {
            body: { email, tab: true, device: true },
            signedIn: false,
        });
        assert.equal(asked.status, 202, JSON.stringify(asked.body));
        assert.deepEqual(asked.cookies, []);
        const verified = await this.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email), device: true },
            headers: {
                "x-sign-in-challenge": text(at(asked.body, "challenge")),
                ...(this.device ? { "x-lumi-device": this.device } : {}),
            },
            signedIn: false,
        });
        if (verified.status === 200 && at(verified.body, "native") !== undefined) {
            this.session = text(at(verified.body, "native", "session"));
            this.device = text(at(verified.body, "native", "device"));
        }
        return verified;
    }
}

describe("deviceName", () => {
    it("names the app by the phone it runs on", () => {
        assert.equal(
            deviceName("lumischoolApp/1.0 (iPhone; iOS 19.0)"),
            "the lumischool app on an iPhone",
        );
        assert.equal(
            deviceName("lumischoolApp/1.0 (iPad; iPadOS 19.0)"),
            "the lumischool app on an iPad",
        );
        assert.equal(
            deviceName("Mozilla/5.0 (Linux; Android 15) lumischoolApp/1.0"),
            "the lumischool app on an Android phone",
        );
        assert.equal(deviceName("lumischoolApp/1.0"), "the lumischool app");
    });
});

describe("the app's credential", () => {
    const { config, outbox } = local();
    let family: string;
    let parentBrowser: Browser;

    beforeEach(async () => {
        await truncate(owner);
        parentBrowser = new Browser(config);
        family = (
            await startFamily(parentBrowser, outbox, {
                email: "parent@example.test",
                name: "Parent",
                family: "Family",
            })
        ).family;
    });

    it("signs in with credentials in the body and no cookies, and reuses a live device", async () => {
        const phone = new Phone(config);
        const first = await phone.signIn(outbox, "parent@example.test");
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.deepEqual(first.cookies, []);
        assert.equal(text(at(first.body, "me", "family", "id")), family);
        const device = phone.device;
        assert.ok(device);
        assert.equal(parseCredential(device)?.family, family);
        const sessions = await phone.call("GET", "/api/sessions");
        assert.equal(sessions.status, 200);
        assert.ok(JSON.stringify(sessions.body).includes("the lumischool app on an iPhone"));

        const again = await phone.signIn(outbox, "parent@example.test");
        assert.equal(again.status, 200);
        assert.equal(text(at(again.body, "native", "device")), device);
    });

    it("answers the family choice unchanged and completes it with choose", async () => {
        const phone = new Phone(config);
        const asked = await phone.call("POST", "/api/auth/email/start", {
            body: { email: "new@example.test", tab: true, device: true },
        });
        const challenge = text(at(asked.body, "challenge"));
        const verified = await phone.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, "new@example.test"), device: true },
            headers: { "x-sign-in-challenge": challenge },
        });
        assert.deepEqual([verified.status, verified.body], [200, { start: true }]);
        const chosen = await phone.call("POST", "/api/auth/email/choose", {
            body: {
                start: { name: "New", family: "New family", timeZone: "Europe/London" },
                device: true,
            },
            headers: { "x-sign-in-challenge": challenge },
        });
        assert.equal(chosen.status, 200, JSON.stringify(chosen.body));
        assert.deepEqual(chosen.cookies, []);
        assert.equal(typeof at(chosen.body, "native", "session"), "string");
        assert.equal(typeof at(chosen.body, "native", "device"), "string");
    });

    it("authenticates adult routes by bearer and device, with no Origin and no cookie", async () => {
        const phone = new Phone(config);
        await phone.signIn(outbox, "parent@example.test");
        const me = await phone.call("GET", "/api/me");
        assert.equal(me.status, 200);
        assert.deepEqual(me.cookies, []);
        const kid = await phone.call("POST", "/api/kids", {
            body: { name: "Maya", grade: 1, consent: { notice: "2026-09-weekly" } },
        });
        assert.equal(kid.status, 200, JSON.stringify(kid.body));
        assert.deepEqual(kid.cookies, []);
        const status = await phone.call("GET", "/api/auth/status");
        assert.deepEqual(status.body, { available: true, locked: false });
    });

    it("refuses a bearer that comes with a Cookie or a Sec-Fetch-Site", async () => {
        const phone = new Phone(config);
        await phone.signIn(outbox, "parent@example.test");
        const browserish: Record<string, string>[] = [
            { cookie: "other=1" },
            { "sec-fetch-site": "same-origin" },
        ];
        for (const headers of browserish) {
            const got = await phone.call("GET", "/api/me", { headers });
            assert.deepEqual([got.status, got.body], [403, { error: "origin" }]);
            const posted = await phone.call("POST", "/api/kids", { body: {}, headers });
            assert.equal(posted.status, 403);
        }
    });

    it("refuses a missing, wrong or revoked device", async () => {
        const phone = new Phone(config);
        await phone.signIn(outbox, "parent@example.test");
        const session = phone.session;
        const device = phone.device;
        assert.ok(session && device);
        const bare = await phone.call("GET", "/api/me", {
            signedIn: false,
            headers: { authorization: `Bearer ${session}` },
        });
        assert.deepEqual([bare.status, bare.body], [401, { error: "signed-out" }]);
        const other = await withFamily({ family }, (tx) => issue(tx, family, { kind: "browser" }));
        const wrong = await phone.call("GET", "/api/me", {
            signedIn: false,
            headers: { authorization: `Bearer ${session}`, "x-lumi-device": other.credential },
        });
        assert.equal(wrong.status, 401);
        await owner.raw`delete from keys where id = ${parseCredential(device)?.id ?? ""}`;
        assert.equal((await phone.call("GET", "/api/me")).status, 401);
        const malformed = await phone.call("GET", "/api/me", {
            signedIn: false,
            headers: { authorization: `Basic ${session}`, "x-lumi-device": device },
        });
        assert.equal(malformed.status, 401);
    });

    it("refuses device: true from a browser", async () => {
        const b = new Browser(config);
        await b.call("POST", "/api/auth/email/start", { body: { email: "parent@example.test" } });
        const withCookie = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, "parent@example.test"), device: true },
        });
        assert.deepEqual([withCookie.status, withCookie.body], [403, { error: "origin" }]);
        const fetched = await b.handle(
            new Request("http://127.0.0.1:8501/api/auth/email/start", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "sec-fetch-site": "same-origin",
                    origin: "http://localhost:5173",
                },
                body: JSON.stringify({ email: "parent@example.test", tab: true, device: true }),
            }),
            b.ip,
        );
        assert.equal(fetched.status, 403);
        const plain = await new Phone(config).call("POST", "/api/auth/email/start", {
            body: { email: "parent@example.test", tab: true },
        });
        assert.deepEqual([plain.status, plain.body], [403, { error: "origin" }]);
    });

    it("opens a child's view from the app, and refuses one without tab", async () => {
        const phone = new Phone(config);
        await phone.signIn(outbox, "parent@example.test");
        const maya = await addKid(parentBrowser, "Maya", 1);
        const refused = await phone.call("POST", "/api/kid-sessions", { body: { kids: [maya] } });
        assert.equal(refused.status, 400);
        const opened = await phone.call("POST", "/api/kid-sessions", {
            body: { kids: [maya], tab: true },
        });
        assert.equal(opened.status, 200, JSON.stringify(opened.body));
        assert.deepEqual(opened.cookies, []);
        const credential = text(at(opened.body, "credential"));
        const device = phone.device ?? "";
        const view = await phone.call("GET", "/api/kid", {
            signedIn: false,
            headers: { "x-kid-session": credential, "x-lumi-device": device },
        });
        assert.equal(view.status, 200, JSON.stringify(view.body));
        const noDevice = await phone.call("GET", "/api/kid", {
            signedIn: false,
            headers: { "x-kid-session": credential },
        });
        assert.equal(noDevice.status, 401);
    });

    it("hands the session to a web view as cookies, on a local path only", async () => {
        const phone = new Phone(config);
        await phone.signIn(outbox, "parent@example.test");
        const handed = await phone.call("GET", "/api/native/web?to=/explore/g1-test?x=1", {
            headers: { "sec-fetch-site": "none" },
        });
        assert.equal(handed.status, 303);
        assert.equal(handed.headers.get("location"), "/explore/g1-test?x=1");
        const set = new Map(
            handed.cookies.map((c) => {
                const [pair = ""] = c.split(";");
                const eq = pair.indexOf("=");
                return [pair.slice(0, eq), decodeURIComponent(pair.slice(eq + 1))];
            }),
        );
        assert.equal(set.get("ls_session"), phone.session);
        assert.equal(set.get("ls_browser"), phone.device);
        assert.ok(handed.cookies.every((c) => c.includes("HttpOnly")));

        const view = new Browser(config);
        for (const [k, v] of set) view.jar.set(k, v);
        assert.equal((await view.call("GET", "/api/me")).status, 200);

        for (const to of ["//evil.example", "/\\evil.example", "https://evil.example", ""]) {
            const away = await phone.call("GET", `/api/native/web?to=${encodeURIComponent(to)}`);
            assert.equal(away.headers.get("location"), "/");
        }
        const scripted = await phone.call("GET", "/api/native/web", {
            headers: { "sec-fetch-site": "same-origin" },
        });
        assert.equal(scripted.status, 403);
        const none = await phone.call("GET", "/api/native/web", { signedIn: false });
        assert.equal(none.status, 401);
        assert.deepEqual(none.cookies, []);
    });

    it("hands a child's view only the device cookie", async () => {
        const phone = new Phone(config);
        await phone.signIn(outbox, "parent@example.test");
        const maya = await addKid(parentBrowser, "Maya", 1);
        const opened = await phone.call("POST", "/api/kid-sessions", {
            body: { kids: [maya], tab: true },
        });
        const credential = text(at(opened.body, "credential"));
        const handed = await phone.call("GET", "/api/native/web", {
            signedIn: false,
            headers: { "x-kid-session": credential, "x-lumi-device": phone.device ?? "" },
        });
        assert.equal(handed.status, 303);
        assert.equal(handed.headers.get("location"), "/kids");
        assert.deepEqual(
            handed.cookies.map((c) => c.split("=")[0]),
            ["ls_browser"],
        );
        const stale = await phone.call("GET", "/api/native/web", {
            signedIn: false,
            headers: { "x-kid-session": "nope", "x-lumi-device": phone.device ?? "" },
        });
        assert.equal(stale.status, 401);
    });

    it("stamps every answer with the build and lets the app's headers through CORS", async () => {
        const phone = new Phone(config);
        for (const path of ["/api/nothing", "/api/me", "/api/native/web"]) {
            const got = await phone.call("GET", path);
            assert.equal(got.headers.get("x-lumi-build"), config.build);
        }
        const res = await phone.handle(
            new Request("http://127.0.0.1:8501/api/me", {
                method: "OPTIONS",
                headers: { origin: "http://localhost:5173" },
            }),
        );
        const allowed = res.headers.get("access-control-allow-headers") ?? "";
        assert.ok(allowed.includes("authorization") && allowed.includes("x-lumi-device"));
        assert.ok(res.headers.get("x-lumi-build"));
    });
});

describe("a child's sign-in from the app", () => {
    const { config, outbox } = local();
    let parent: Browser;

    beforeEach(async () => {
        await truncate(owner);
        parent = new Browser(config);
        await startFamily(parent, outbox, {
            email: "parent@example.test",
            name: "Parent",
            family: "Family",
        });
        const maya = await addKid(parent, "Maya", 1);
        assert.equal(
            (await parent.call("POST", "/api/family/pin", { body: { pin: "2468" } })).status,
            204,
        );
        assert.equal(
            (await parent.call("POST", "/api/kid-logins/pin", { body: { pin: "1357" } })).status,
            204,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/kid-logins", {
                    body: { kid: maya, username: "maya-star" },
                })
            ).status,
            204,
        );
    });

    const kidIn = (phone: Phone, username = "maya-star", pin = "1357") =>
        phone.call("POST", "/api/kid/sign-in", {
            body: { username, pin, device: true },
            signedIn: false,
            headers: phone.device ? { "x-lumi-device": phone.device } : {},
        });

    it("answers the credential and the device in the body, and kid routes take both headers", async () => {
        const phone = new Phone(config);
        const first = await kidIn(phone);
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.deepEqual(first.cookies, []);
        const credential = text(at(first.body, "credential"));
        phone.device = text(at(first.body, "native", "device"));
        const again = await kidIn(phone);
        assert.equal(text(at(again.body, "native", "device")), phone.device);
        const view = await phone.call("GET", "/api/kid", {
            signedIn: false,
            headers: { "x-kid-session": credential, "x-lumi-device": phone.device },
        });
        assert.equal(view.status, 200);
        assert.deepEqual(view.cookies, []);
    });

    it("counts the network budget by device, keeping it for a request without one", async () => {
        const family = text(at((await parent.call("GET", "/api/me")).body, "family", "id"));
        const device = async () =>
            (await withFamily({ family }, (tx) => issue(tx, family, { kind: "browser" })))
                .credential;
        const busy = new Phone(config);
        busy.device = await device();
        for (let i = 0; i < 20; i++) assert.equal((await kidIn(busy, `nobody-${i}`)).status, 400);
        assert.equal((await kidIn(busy)).status, 400, "the busy device has spent its budget");
        const sibling = new Phone(config);
        sibling.device = await device();
        assert.equal((await kidIn(sibling)).status, 200, "another device on the same network");
        const bare = new Phone(config);
        assert.equal((await kidIn(bare)).status, 200, "the network itself is still unspent");
    });
});
