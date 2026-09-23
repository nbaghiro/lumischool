// A browser for the server's tests: a cookie jar, the page's Origin, and calls straight into the app
// function with no network, so row-level security is exercised through the app role as in use.

import { withFamily } from "../db/client";
import { issue } from "../db/keys";
import { app, configFrom, type Config } from "../http";
import type { Email } from "../email";

export const ORIGIN = "http://localhost:5173";

/** A local configuration whose email transport keeps what it would have printed. */
export function local(): { config: Config; outbox: Email[] } {
    const base = configFrom({ LUMISCHOOL_ENV: "local" });
    if ("problem" in base) throw new Error(base.problem);
    const outbox: Email[] = [];
    return {
        config: {
            ...base,
            send: async (email) => {
                outbox.push(email);
            },
        },
        outbox,
    };
}

export interface Answer {
    status: number;
    body: unknown;
    cookies: string[];
}

export class Browser {
    readonly jar = new Map<string, string>();
    readonly handle: ReturnType<typeof app>;
    readonly ip: string;

    constructor(config: Config, ip = "203.0.113.7") {
        this.handle = app(config);
        this.ip = ip;
    }

    async call(
        method: "GET" | "POST",
        path: string,
        opts: { body?: unknown; origin?: string | null; type?: string; kid?: string } = {},
    ): Promise<Answer> {
        const headers = new Headers();
        if (opts.kid !== undefined) headers.set("x-kid-session", opts.kid);
        const origin = opts.origin === undefined ? ORIGIN : opts.origin;
        if (origin) headers.set("origin", origin);
        if (this.jar.size)
            headers.set(
                "cookie",
                [...this.jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; "),
            );
        if (method === "POST") headers.set("content-type", opts.type ?? "application/json");
        const init: RequestInit =
            method === "POST"
                ? { method, headers, body: JSON.stringify(opts.body ?? {}) }
                : { method, headers };
        const res = await this.handle(new Request(`http://127.0.0.1:8501${path}`, init), this.ip);
        const cookies = res.headers.getSetCookie();
        for (const c of cookies) {
            const [pair = ""] = c.split(";");
            const at = pair.indexOf("=");
            const name = pair.slice(0, at);
            const value = decodeURIComponent(pair.slice(at + 1));
            if (/Max-Age=0\b/.test(c)) this.jar.delete(name);
            else this.jar.set(name, value);
        }
        const text = await res.text();
        const parsed: unknown = text ? JSON.parse(text) : null;
        return { status: res.status, body: parsed, cookies };
    }
}

/** A value inside an answer, by its path; undefined when the path is not there. */
export function at(v: unknown, ...path: (string | number)[]): unknown {
    let here: unknown = v;
    for (const step of path) {
        if (typeof here !== "object" || here === null) return undefined;
        here = Reflect.get(here, step);
    }
    return here;
}

export function text(v: unknown, what = "a string"): string {
    if (typeof v !== "string") throw new Error(`expected ${what}, got ${JSON.stringify(v)}`);
    return v;
}

export function items(v: unknown, what = "a list"): unknown[] {
    if (!Array.isArray(v)) throw new Error(`expected ${what}, got ${JSON.stringify(v)}`);
    return v;
}

/** The code the console transport would have printed for an address. */
export function codeFor(outbox: Email[], email: string): string {
    const sent = outbox.filter((e) => e.to === email).at(-1);
    const m = sent?.text.match(/Your code is (\d{4}) (\d{4})/);
    if (!m) throw new Error(`no code was sent to ${email}`);
    return `${m[1]}${m[2]}`;
}

/** Flow 1 in two requests: the start page's answers, then the code. */
export async function startFamily(
    b: Browser,
    outbox: Email[],
    who: { email: string; name: string; family: string; timeZone?: string },
): Promise<{ family: string; user: string; session: string }> {
    const start = {
        name: who.name,
        family: who.family,
        timeZone: who.timeZone ?? "America/Denver",
    };
    const asked = await b.call("POST", "/api/auth/email/start", {
        body: { email: who.email, start },
    });
    if (asked.status !== 202) throw new Error(`start answered ${asked.status}`);
    const verified = await b.call("POST", "/api/auth/email/verify", {
        body: { code: codeFor(outbox, who.email) },
    });
    if (verified.status !== 200)
        throw new Error(`verify answered ${JSON.stringify(verified.body)}`);
    return {
        family: text(at(verified.body, "me", "family", "id")),
        user: text(at(verified.body, "me", "user", "id")),
        session: text(at(verified.body, "me", "session", "id")),
    };
}

/** Flow 2 in two requests, for a login in one family: the address, then the code it was sent. */
export async function signIn(b: Browser, outbox: Email[], email: string): Promise<Answer> {
    const asked = await b.call("POST", "/api/auth/email/start", { body: { email } });
    if (asked.status !== 202) throw new Error(`start answered ${asked.status}`);
    return b.call("POST", "/api/auth/email/verify", { body: { code: codeFor(outbox, email) } });
}

/** Flow 4: a kid, with consent to the current notice. */
export async function addKid(b: Browser, name: string, grade: number): Promise<string> {
    const added = await b.call("POST", "/api/kids", {
        body: { name, grade, consent: { notice: "2026-09-weekly" } },
    });
    return text(at(added.body, "kid", "id"), `a kid, got ${JSON.stringify(added.body)}`);
}

/**
 * A session for a person put straight into a browser's jar, for a test that needs a second browser
 * signed in without spending a code, which the limits allow once a minute an address.
 */
export async function sessionInto(b: Browser, family: string, user: string): Promise<string> {
    const { credential, id } = await withFamily({ family, user }, (tx) =>
        issue(tx, family, { kind: "session", user_id: user, name: "A test browser" }),
    );
    b.jar.set("ls_session", credential);
    return id;
}

/** Flow 5: the browser's session opens a children's view for these kids, and the browser holds it. */
export async function openView(b: Browser, kids: readonly string[]): Promise<Answer> {
    return b.call("POST", "/api/kid-sessions", { body: { kids } });
}
