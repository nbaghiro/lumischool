import { isIP } from "node:net";
// The API server (.docs/api.md). The whole app is one function from a web `Request` to a `Response`,
// which the tests call in process, and `serve` puts it on Node's own http module. Every route is
// declared once, with the caller it accepts; the entry point finds that caller from its credential,
// inside the family the credential names, before the route's own work runs.

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { promisify } from "node:util";
import { gzip as gzipCb } from "node:zlib";
import type { ErrorCode, Problem } from "./api";
import { EVENT_KINDS, type EventKind } from "../engine/answer";
import {
    familyMembers,
    inviteParent,
    cancelParentInvitation,
    invitationPreview,
    acceptParentInvitation,
    endParentMembership,
    addKidWithConsent,
    addToKidView,
    adultFrom,
    askForCode,
    checkCode,
    chooseFamily,
    deviceName,
    endHeldKids,
    endKidView,
    endKidViews,
    endMySession,
    kidSessionFrom,
    kidSessionsFor,
    kidLoginsFor,
    setKidsPin,
    changeKidLogin,
    signInKid,
    mySessions,
    setMyPicture,
    updateAccountField,
    requestAccountEmail,
    confirmAccountEmail,
    KIDS_JOIN,
    leaveKidView,
    lockParent,
    unlockParent,
    me,
    openKidView,
    setFamilyPin,
    signOut,
    startOf,
    switchFamily,
    type Adult,
    type AuthConfig,
    type Declined,
    type KidSession,
    type Opened,
} from "./auth";
import { closeApp, ping, withFamily } from "./db/client";
import {
    EXPIRY,
    LOCAL_PEPPER,
    parseCredential,
    verify,
    issue,
    bindToBrowser,
    browserAllows,
} from "./db/keys";
import type { Key } from "./db/schema";
import { consoleTransport, outbox, resendTransport } from "./email";
import { COOKIES } from "./pages";
import {
    appendDrafts,
    appendKid,
    contentFor,
    contentForKid,
    contentList,
    eventsFor,
    familyView,
    grownRecord,
    kidFile,
    kidPack,
    kidRecord,
    kidState,
    kidView,
    packFile,
    packView,
    Refused,
    saveAuthored,
} from "./sync";
import { loadPack, watchPack, type Pack } from "./pack";
import { staticFrom } from "./static";
import { emailPreferences, changeLetters, unsubscribeRequest, webhookRequest } from "./letters";
import { listPaintings, loadPainting, savePainting, deletePainting } from "./painting";
import { mailPreviews } from "./mail-previews";

export interface Config extends AuthConfig {
    mailWebhookSecret?: string;
    /**
     * `local` runs on a developer's machine with the console transport and no real origin; `production`
     * is Render, behind Cloudflare, with Resend and a real one. Outside local a failed request is
     * logged by its route, a request id and its error code, never its message.
     */
    env: "local" | "production";
    host: string;
    port: number;
    /** The origins a state-changing request may come from, and the only ones CORS answers. */
    origins: string[];
    /** Cookie names with `__Host-` and `Secure`, which a browser only accepts over HTTPS. */
    secure: boolean;
    /** Where the line about a failed request goes: the terminal, or a test's list. */
    log: (line: string) => void;
    /** The pack the family's lessons are served from, or null when none is built, which the routes that need it say. */
    pack: Pack | null;
}

/**
 * Where the pages are locally (.docs/local.md): the one origin the root's dev server serves every app
 * from, and the scratchpad's dev server, whose prototype pages call the API too.
 */
const LOCAL = {
    app: "http://localhost:8500",
    // TODO: remove once no scratchpad page calls the API from its own dev server, which ends when
    // those pages have moved into apps/ and are served from the one origin.
    scratchpad: "http://localhost:5173",
};

/** A loopback address or name, as a socket, `API_HOST` or a URL's host gives it. */
function isLoopback(address: string): boolean {
    const bare = address.replace(/^\[(.*)\]$/, "$1").toLowerCase();
    return bare === "localhost" || bare === "::1" || /^(?:::ffff:)?127(?:\.\d{1,3}){3}$/.test(bare);
}

/** The code the code step also accepts locally unless `AUTH_DEV_CODE` names another. */
const DEV_CODE = "12345678";

const toStderr = (line: string): void => {
    process.stderr.write(`${line}\n`);
};

/** `configFrom`'s production branch: every var it needs and why the server refuses without one. */
function productionConfig(env: Record<string, string | undefined>): Config | { problem: string } {
    const origin = env.APP_ORIGIN;
    if (!origin || !origin.startsWith("https://"))
        return {
            problem: `APP_ORIGIN must be an https:// address in production, not "${origin ?? ""}"`,
        };
    const pepper = env.AUTH_PEPPER;
    if (!pepper)
        return {
            problem: "AUTH_PEPPER is required in production: it is never in the database",
        };
    if (pepper === LOCAL_PEPPER)
        return {
            problem:
                "AUTH_PEPPER must not be the local pepper in production, or a code hashed under one would match the other",
        };
    const key = env.RESEND_API_KEY;
    if (!key)
        return {
            problem:
                "RESEND_API_KEY is required in production: an emailed code is the only way to sign in, so a server that cannot send is worse than one that refuses to start",
        };
    const from = env.RESEND_FROM;
    if (!from) return { problem: "RESEND_FROM is required in production" };
    const port = Number(env.PORT ?? env.API_PORT ?? 8501);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        return { problem: `PORT must be a port number, not "${env.PORT ?? env.API_PORT}"` };
    return {
        env: "production",
        host: env.API_HOST || "0.0.0.0",
        port,
        origins: [origin],
        origin,
        mailWebhookSecret: env.RESEND_WEBHOOK_SECRET,
        pepper,
        send: resendTransport(key, from),
        devCode: null,
        secure: true,
        log: toStderr,
        pack: null,
    };
}

/**
 * The configuration from the environment, or why the server must not start. A fixed code is refused
 * outside `LUMISCHOOL_ENV=local` whatever else is set, since anyone who typed it could sign in.
 */
export function serviceConfigFrom(
    env: Record<string, string | undefined>,
): Config | { problem: string } {
    if (env.AUTH_DEV_CODE !== undefined && env.LUMISCHOOL_ENV !== "local")
        return {
            problem:
                "AUTH_DEV_CODE is refused unless LUMISCHOOL_ENV=local: anyone who typed it would sign in as whoever had asked for a code",
        };
    if (env.LUMISCHOOL_ENV === "production") return productionConfig(env);
    if (env.LUMISCHOOL_ENV !== "local")
        return {
            problem: `LUMISCHOOL_ENV must be local or production, not "${env.LUMISCHOOL_ENV ?? ""}"`,
        };
    const devCode = env.AUTH_DEV_CODE ?? DEV_CODE;
    if (!/^\d{8}$/.test(devCode))
        return { problem: `AUTH_DEV_CODE must be eight digits, not "${devCode}"` };
    const port = Number(env.API_PORT ?? 8501);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        return { problem: `API_PORT must be a port number, not "${env.API_PORT}"` };
    const host = env.API_HOST || "127.0.0.1";
    if (!isLoopback(host))
        return {
            problem: `API_HOST must be a loopback address in local, not "${host}": the local routes answer only on this computer`,
        };
    const app = env.APP_ORIGIN || LOCAL.app;
    return {
        env: "local",
        host,
        port,
        origins: [...new Set([app, LOCAL.scratchpad])],
        pepper: env.AUTH_PEPPER || LOCAL_PEPPER,
        send: consoleTransport,
        devCode,
        secure: false,
        log: toStderr,
        pack: null,
    };
}

/** HTTP ingress restrictions do not apply to the background mail job. */
export function configFrom(env: Record<string, string | undefined>): Config | { problem: string } {
    const config = serviceConfigFrom(env);
    if ("problem" in config || config.env === "local") return config;
    if (
        env.RENDER !== "true" ||
        env.RENDER_SERVICE_TYPE !== "web" ||
        !env.RENDER_SERVICE_ID ||
        !/^[a-z0-9-]+\.onrender\.com$/.test(env.RENDER_EXTERNAL_HOSTNAME ?? "")
    )
        return { problem: "Production requires Render's web-service environment markers" };
    return config;
}

type Method = "GET" | "POST";

interface Ctx {
    req: Request;
    url: URL;
    params: Record<string, string>;
    body: unknown;
    ip: string | null;
    cookies: Map<string, string>;
    device: string | null;
}

type Route =
    | {
          method: Method;
          path: string;
          who: "anyone" | "local";
          run: (c: Ctx) => Promise<Response>;
      }
    | {
          method: Method;
          path: string;
          who: "adult";
          run: (c: Ctx, adult: Adult) => Promise<Response>;
      }
    | {
          method: Method;
          path: string;
          who: "kid";
          run: (c: Ctx, kid: KidSession) => Promise<Response>;
      };

/** Headers every answer carries: nothing is cached, sniffed, framed or sent on as a referrer. */
const BASE_HEADERS: Record<string, string> = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
};

function json(status: number, body: unknown, headers: Headers = new Headers()): Response {
    for (const [k, v] of Object.entries(BASE_HEADERS)) headers.set(k, v);
    if (status === 204) return new Response(null, { status, headers });
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(body), { status, headers });
}

const problem = (status: number, error: ErrorCode, extra: Omit<Problem, "error"> = {}): Response =>
    json(status, { error, ...extra });

/**
 * A lesson's file from the pack, which a browser may keep for a year: it is named by its own hash, and
 * `private` keeps it in that browser alone, since the path was answered under a session.
 */
/** A file of the pack, kept by the browser for a year: its path carries the pack's digest, and a pack never changes. */
function packedFile(text: string): Response {
    const headers = new Headers();
    for (const [k, v] of Object.entries(BASE_HEADERS)) headers.set(k, v);
    headers.set("cache-control", "private, max-age=31536000, immutable");
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(text, { status: 200, headers });
}

const STATUS: Record<Declined["error"], number> = {
    "no-pending": 400,
    "wrong-code": 400,
    "bad-request": 400,
    expired: 410,
    "dead-code": 410,
    "not-found": 404,
};

function declined(d: Declined): Response {
    return "attemptsLeft" in d
        ? problem(STATUS[d.error], d.error, { attemptsLeft: d.attemptsLeft })
        : problem(STATUS[d.error], d.error);
}

/** The status of a refusal the kid-session and PIN routes answer with. */
const REFUSED: Record<"bad-request" | "not-allowed" | "fresh-sign-in" | "not-found", number> = {
    "bad-request": 400,
    "not-allowed": 403,
    "fresh-sign-in": 403,
    "not-found": 404,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

function field(body: unknown, name: string): unknown {
    return isRecord(body) ? body[name] : undefined;
}

function textField(body: unknown, name: string): string {
    const v = field(body, name);
    if (typeof v !== "string")
        throw new Refused(400, { error: "bad-request", problem: `${name} is text` });
    return v;
}

function decoded(value: string): string | null {
    try {
        return decodeURIComponent(value);
    } catch {
        return null;
    }
}

/**
 * Our own cookies from a `Cookie` header. Every other app on the host sends its cookies too, so any
 * other name is left unread and a value that does not decode is skipped.
 */
function cookiesOf(req: Request, wanted: readonly string[]): Map<string, string> {
    const out = new Map<string, string>();
    for (const part of (req.headers.get("cookie") ?? "").split(";")) {
        const at = part.indexOf("=");
        if (at <= 0) continue;
        const name = part.slice(0, at).trim();
        const value = wanted.includes(name) ? decoded(part.slice(at + 1).trim()) : null;
        if (value !== null) out.set(name, value);
    }
    return out;
}

/** The cookies, named as auth.md names them, and without the prefix where there is no HTTPS. */
function names(config: Config): {
    session: string;
    pending: string;
    kids: string;
    browser: string;
} {
    return config.secure ? COOKIES.secure : COOKIES.plain;
}

function cookie(config: Config, name: string, value: string, maxAge: number | null): string {
    const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
    if (config.secure) parts.push("Secure");
    if (maxAge !== null) parts.push(`Max-Age=${maxAge}`);
    return parts.join("; ");
}

const MINUTES_15 = 15 * 60;

/** Seconds from now until `ends`, as a cookie's `Max-Age`. */
const secondsUntil = (ends: Date, now: Date): number =>
    Math.max(0, Math.floor((ends.getTime() - now.getTime()) / 1000));

/**
 * A session cookie's `Max-Age` in seconds, as of a use now: until the key's own rule would end it if
 * it is not used again, which is thirty days and never past its ninetieth (server/db/keys.ts). A
 * shared session has none, so its cookie ends with the browser.
 */
function maxAgeOf(session: Pick<Key, "kind" | "created_at">): number | null {
    if (session.kind !== "session") return null;
    const now = new Date();
    return secondsUntil(
        EXPIRY.session({ created_at: session.created_at, seen_at: now.toISOString() }),
        now,
    );
}

/** A children's view cookie's `Max-Age`, as of a use now: until the first of its keys would end. */
function kidsMaxAge(keys: readonly Pick<Key, "created_at">[]): number {
    const now = new Date();
    const ends = keys.map((k) =>
        EXPIRY["kid-session"]({ created_at: k.created_at, seen_at: now.toISOString() }).getTime(),
    );
    return secondsUntil(new Date(Math.min(...ends)), now);
}

/** A session cookie for a new key, clearing the pending one. */
function signedIn(config: Config, opened: Opened): Response {
    const n = names(config);
    const headers = new Headers();
    headers.append(
        "set-cookie",
        cookie(config, n.session, opened.credential, maxAgeOf(opened.me.session)),
    );
    headers.append("set-cookie", cookie(config, n.pending, "", 0));
    return json(200, { me: opened.me }, headers);
}

const bool = (v: unknown): boolean => v === true;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_NAMES: ReadonlySet<string> = new Set(EVENT_KINDS);

function isEventKind(value: string): value is EventKind {
    return EVENT_NAMES.has(value);
}

/** The kinds and the family's days a read of the log is narrowed to, as the address gives them. */
function eventRange(c: Ctx): { from?: string; to?: string; kinds?: EventKind[]; lesson?: string } {
    const from = c.url.searchParams.get("from");
    const to = c.url.searchParams.get("to");
    if (
        (from !== null && !DAY.test(from)) ||
        (to !== null && !DAY.test(to)) ||
        (from && to && from > to)
    )
        throw new Refused(400, { error: "bad-request", problem: "from and to are days in order" });
    const rawKinds = c.url.searchParams.get("kinds");
    const requested = rawKinds === null ? null : rawKinds.split(",").filter(Boolean);
    if (requested !== null && (!requested.length || requested.some((kind) => !isEventKind(kind))))
        throw new Refused(400, { error: "bad-request", problem: "kinds are event kinds" });
    const kinds = requested?.filter(isEventKind);
    const lesson = c.url.searchParams.get("lesson");
    return {
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(kinds !== undefined ? { kinds } : {}),
        ...(lesson ? { lesson } : {}),
    };
}

/** How long the health check waits for the database, so it answers quickly whatever the database does. */
const HEALTH_WAIT = 1000;

async function databaseAnswers(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), HEALTH_WAIT);
    });
    try {
        return await Promise.race([
            ping().then(
                () => true,
                () => false,
            ),
            late,
        ]);
    } finally {
        clearTimeout(timer);
    }
}

function routes(config: Config): Route[] {
    const n = names(config);

    const bind = async (
        c: Ctx,
        res: Response,
        family: string,
        ids: string[],
    ): Promise<Response> => {
        let browser = c.cookies.get(n.browser) ?? null;
        const held = browser ? await verify(browser, ["browser"]) : null;
        if (!held || held === "put-away") {
            const made = await withFamily({ family }, (tx) =>
                issue(tx, family, { kind: "browser" }),
            );
            browser = made.credential;
        }
        if (browser) {
            await bindToBrowser(family, ids, browser);
            res.headers.append("set-cookie", cookie(config, n.browser, browser, 90 * 24 * 60 * 60));
        }
        return res;
    };
    const parentIn = async (c: Ctx, opened: Opened): Promise<Response> => {
        const res = await bind(c, signedIn(config, opened), opened.me.family.id, [
            opened.me.session.id,
        ]);
        // Legacy routing cookies must not send a fresh parent tab back into the kids app.
        if (c.cookies.has(n.kids)) res.headers.append("set-cookie", cookie(config, n.kids, "", 0));
        return res;
    };

    return [
        {
            method: "GET",
            path: "/api/members",
            who: "adult",
            run: async (_c, adult) => json(200, await familyMembers(adult)),
        },
        {
            method: "POST",
            path: "/api/members/invite",
            who: "adult",
            run: async (c, adult) => {
                await inviteParent(config, adult, field(c.body, "email"), c.ip);
                return json(200, {});
            },
        },
        {
            method: "POST",
            path: "/api/members/cancel",
            who: "adult",
            run: async (c, adult) => {
                await cancelParentInvitation(adult, textField(c.body, "id"));
                return json(200, {});
            },
        },
        {
            method: "POST",
            path: "/api/members/remove",
            who: "adult",
            run: async (c, adult) =>
                json(200, await endParentMembership(config, adult, textField(c.body, "user"))),
        },
        {
            method: "POST",
            path: "/api/invitations/preview",
            who: "anyone",
            run: async (c) => json(200, await invitationPreview(textField(c.body, "token"))),
        },
        {
            method: "POST",
            path: "/api/auth/email/invitation/accept",
            who: "anyone",
            run: async (c) => {
                const out = await acceptParentInvitation(
                    config,
                    {
                        token: textField(c.body, "token"),
                        code: textField(c.body, "code"),
                        name: textField(c.body, "name"),
                    },
                    c.req.headers.get("x-sign-in-challenge") ?? c.cookies.get(n.pending) ?? null,
                    c.device,
                    c.cookies.get(n.session) ?? null,
                );
                if ("error" in out) return declined(out);
                const response = await parentIn(c, out);
                return json(
                    200,
                    { me: out.me, notificationFailed: out.notificationFailed },
                    response.headers,
                );
            },
        },
        {
            method: "GET",
            path: "/api/paintings",
            who: "adult",
            run: async (c, adult) =>
                json(
                    200,
                    await listPaintings(
                        adult,
                        c.url.searchParams.get("kid_id"),
                        c.url.searchParams.get("before"),
                    ),
                ),
        },
        {
            method: "GET",
            path: "/api/paintings/:id",
            who: "adult",
            run: async (c, adult) => json(200, await loadPainting(adult, c.params.id)),
        },
        {
            method: "POST",
            path: "/api/paintings/save",
            who: "adult",
            run: async (c, adult) => json(200, await savePainting(adult, c.body)),
        },
        {
            method: "POST",
            path: "/api/paintings/delete",
            who: "adult",
            run: async (c, adult) =>
                json(
                    200,
                    await deletePainting(adult, field(c.body, "id"), field(c.body, "revision")),
                ),
        },
        {
            method: "GET",
            path: "/api/letters/preferences",
            who: "adult",
            run: async (_c, adult) => json(200, await emailPreferences(adult)),
        },
        {
            method: "POST",
            path: "/api/letters/preferences",
            who: "adult",
            run: async (c, adult) => {
                await changeLetters(adult, field(c.body, "mode"));
                return json(200, {});
            },
        },
        {
            method: "GET",
            path: "/api/dev/mail-previews",
            who: "local",
            run: async () => json(200, { emails: mailPreviews(config.origins[0] ?? LOCAL.app) }),
        },
        {
            method: "GET",
            path: "/api/health",
            who: "anyone",
            run: async () =>
                (await databaseAnswers())
                    ? json(200, { ok: true })
                    : problem(503, "server", { problem: "the database did not answer" }),
        },

        {
            method: "POST",
            path: "/api/auth/email/start",
            who: "anyone",
            run: async (c) => {
                const start = field(c.body, "start");
                const answers = start === undefined ? null : startOf(start);
                if (start !== undefined && !answers)
                    return problem(400, "bad-request", {
                        problem: "start is name, family and a real timeZone",
                    });
                const asked = await askForCode(
                    config,
                    {
                        email: textField(c.body, "email"),
                        shared: bool(field(c.body, "shared")),
                        start: answers,
                    },
                    c.ip,
                );
                if ("error" in asked)
                    return asked.error === "rate-limited"
                        ? problem(429, "rate-limited", { retryAfter: 60 })
                        : asked.error === "delivery-failed"
                          ? problem(503, "delivery-failed")
                          : problem(400, "bad-email");
                const headers = new Headers();
                headers.append("set-cookie", cookie(config, n.pending, asked.pending, MINUTES_15));
                return field(c.body, "tab") === true
                    ? json(202, { challenge: asked.pending })
                    : json(202, {}, headers);
            },
        },
        {
            method: "POST",
            path: "/api/auth/email/verify",
            who: "anyone",
            run: async (c) => {
                const out = await checkCode(
                    config,
                    c.req.headers.get("x-sign-in-challenge") ?? c.cookies.get(n.pending) ?? null,
                    textField(c.body, "code"),
                    c.device,
                    c.cookies.get(n.session) ?? null,
                );
                if ("error" in out) return declined(out);
                if ("credential" in out) return parentIn(c, out);
                return json(200, out);
            },
        },
        {
            method: "POST",
            path: "/api/auth/email/choose",
            who: "anyone",
            run: async (c) => {
                const family = field(c.body, "family_id");
                const start = startOf(field(c.body, "start"));
                const choice =
                    typeof family === "string" ? { family_id: family } : start ? { start } : null;
                if (!choice)
                    return problem(400, "bad-request", {
                        problem: "send family_id, or start with name, family and timeZone",
                    });
                const out = await chooseFamily(
                    c.req.headers.get("x-sign-in-challenge") ?? c.cookies.get(n.pending) ?? null,
                    choice,
                    c.device,
                    c.cookies.get(n.session) ?? null,
                );
                return "error" in out ? declined(out) : parentIn(c, out);
            },
        },
        {
            method: "POST",
            path: "/api/auth/switch",
            who: "adult",
            run: async (c, adult) => {
                const opened = await switchFamily(adult, textField(c.body, "family_id"), c.device);
                return opened ? parentIn(c, opened) : problem(404, "not-found");
            },
        },
        {
            method: "GET",
            path: "/api/auth/status",
            who: "anyone",
            run: async (c) => {
                const credential = c.cookies.get(n.session) ?? null;
                const parsed = credential ? parseCredential(credential) : null;
                if (
                    !parsed ||
                    !(await browserAllows(
                        parsed.family,
                        [parsed.id],
                        c.cookies.get(n.browser) ?? null,
                    ))
                )
                    return json(200, { available: false, locked: false });
                const adult = await adultFrom(credential);
                return json(200, { available: !!adult, locked: adult === "put-away" });
            },
        },
        {
            method: "POST",
            path: "/api/auth/lock",
            who: "adult",
            run: async (_c, adult) => {
                const out = await lockParent(adult);
                return out === true ? json(204, null) : problem(409, out.error);
            },
        },
        {
            method: "POST",
            path: "/api/auth/unlock",
            who: "anyone",
            run: async (c) => {
                const credential = c.cookies.get(n.session) ?? null;
                const parsed = credential ? parseCredential(credential) : null;
                if (
                    !parsed ||
                    !(await browserAllows(
                        parsed.family,
                        [parsed.id],
                        c.cookies.get(n.browser) ?? null,
                    ))
                )
                    return problem(401, "signed-out");
                const out = await unlockParent(config, credential, field(c.body, "pin"));
                return out === true
                    ? json(204, null)
                    : problem(
                          out.error === "signed-out"
                              ? 401
                              : out.error === "rate-limited"
                                ? 429
                                : 403,
                          out.error,
                          {
                              ...("retryAfter" in out ? { retryAfter: out.retryAfter } : {}),
                              ...("attemptsLeft" in out ? { attemptsLeft: out.attemptsLeft } : {}),
                          },
                      );
            },
        },
        {
            method: "POST",
            path: "/api/auth/sign-out",
            who: "adult",
            run: async (_c, adult) => {
                await signOut(adult);
                const headers = new Headers();
                headers.append("set-cookie", cookie(config, n.session, "", 0));
                return json(204, null, headers);
            },
        },
        {
            method: "GET",
            path: "/api/me",
            who: "adult",
            run: async (_c, adult) => json(200, await me(adult)),
        },

        {
            method: "GET",
            path: "/api/family",
            who: "adult",
            run: async (_c, adult) => json(200, await familyView(adult)),
        },
        {
            method: "POST",
            path: "/api/kids",
            who: "adult",
            run: async (c, adult) => {
                const grade = field(c.body, "grade");
                const out = await addKidWithConsent(adult, {
                    name: textField(c.body, "name"),
                    grade: typeof grade === "number" ? grade : -1,
                    notice: textField(field(c.body, "consent"), "notice"),
                });
                if ("kid" in out) return json(200, out);
                if (out.error === "notice")
                    return problem(409, "notice-changed", { notice: out.notice });
                return problem(out.error === "not-allowed" ? 403 : 400, out.error);
            },
        },
        {
            method: "GET",
            path: "/api/kids/:kid/record",
            who: "adult",
            run: async (c, adult) =>
                json(200, await grownRecord(adult, c.params.kid ?? "", config.pack)),
        },
        {
            method: "GET",
            path: "/api/events",
            who: "adult",
            run: async (c, adult) =>
                json(200, {
                    events: await eventsFor(adult, c.url.searchParams.get("kid"), eventRange(c)),
                }),
        },
        {
            method: "POST",
            path: "/api/events",
            who: "adult",
            run: async (c, adult) => json(200, { events: await appendDrafts(adult, c.body) }),
        },
        {
            method: "GET",
            path: "/api/content",
            who: "adult",
            run: async (c, adult) =>
                json(200, { content: await contentList(adult, c.url.searchParams.get("name")) }),
        },
        {
            method: "GET",
            path: "/api/content/:hash",
            who: "adult",
            run: async (c, adult) =>
                json(200, { content: await contentFor(adult, c.params.hash ?? "") }),
        },
        {
            method: "POST",
            path: "/api/content",
            who: "adult",
            run: async (c, adult) => json(200, await saveAuthored(adult, c.body)),
        },

        {
            method: "GET",
            path: "/api/kid-logins",
            who: "adult",
            run: async (_c, adult) => {
                const out = await kidLoginsFor(adult);
                return "error" in out ? problem(403, out.error) : json(200, out);
            },
        },
        {
            method: "POST",
            path: "/api/kid-logins/pin",
            who: "adult",
            run: async (c, adult) => {
                const out = await setKidsPin(config, adult, field(c.body, "pin"));
                return "error" in out
                    ? problem(REFUSED[out.error], out.error, { problem: out.problem })
                    : json(204, null);
            },
        },
        {
            method: "POST",
            path: "/api/kid-logins",
            who: "adult",
            run: async (c, adult) => {
                const out = await changeKidLogin(adult, {
                    kid: field(c.body, "kid"),
                    username: field(c.body, "username"),
                });
                return "error" in out
                    ? problem(REFUSED[out.error], out.error, { problem: out.problem })
                    : json(204, null);
            },
        },
        {
            method: "POST",
            path: "/api/kid/sign-in",
            who: "anyone",
            run: async (c) => {
                const out = await signInKid(
                    config,
                    { username: field(c.body, "username"), pin: field(c.body, "pin") },
                    c.ip,
                    c.device,
                );
                if (!out) return problem(400, "wrong-pin");
                const parsed = parseCredential(out.credential);
                if (!parsed) return problem(500, "server");
                return bind(c, json(200, out), parsed.family, [parsed.id]);
            },
        },
        {
            method: "GET",
            path: "/api/kid/tab",
            who: "kid",
            run: async (c) =>
                json(200, {
                    credential: c.req.headers.get("x-kid-session") ?? c.cookies.get(n.kids),
                }),
        },
        {
            method: "POST",
            path: "/api/kid/sign-out",
            who: "kid",
            run: async (c, kid) => {
                await endHeldKids(
                    c.req.headers.get("x-kid-session") ?? c.cookies.get(n.kids) ?? null,
                    kid.opener,
                );
                return json(204, null);
            },
        },
        {
            method: "GET",
            path: "/api/kid-sessions",
            who: "adult",
            run: async (_c, adult) => {
                const out = await kidSessionsFor(adult, _c.cookies.get(n.browser) ?? null);
                return "error" in out ? problem(403, out.error) : json(200, out);
            },
        },
        {
            method: "POST",
            path: "/api/kid-sessions",
            who: "adult",
            run: async (c, adult) => {
                const out = await openKidView(
                    adult,
                    field(c.body, "kids"),
                    c.device,
                    field(c.body, "tab") === true,
                );
                if ("error" in out)
                    return out.error === "no-consent"
                        ? problem(409, "no-consent", { kid: out.kid })
                        : problem(REFUSED[out.error], out.error);
                if (field(c.body, "tab") === true)
                    return bind(
                        c,
                        json(200, { credential: out.credential }),
                        adult.family.id,
                        out.credential.split(KIDS_JOIN).flatMap((x) => {
                            const p = parseCredential(x);
                            return p ? [p.id] : [];
                        }),
                    );
                // The browser gains the children's view and keeps the session's cookie, whose key is
                // now put away: every adult route refuses it until the PIN gives it back (flow 7).
                const headers = new Headers();
                const now = new Date().toISOString();
                headers.append(
                    "set-cookie",
                    cookie(config, n.kids, out.credential, kidsMaxAge([{ created_at: now }])),
                );
                return bind(
                    c,
                    json(204, null, headers),
                    adult.family.id,
                    out.credential.split(KIDS_JOIN).flatMap((x) => {
                        const parsed = parseCredential(x);
                        return parsed ? [parsed.id] : [];
                    }),
                );
            },
        },
        {
            method: "POST",
            path: "/api/kid-sessions/end",
            who: "adult",
            run: async (_c, adult) => {
                const out = await endKidView(adult, field(_c.body, "view"));
                return "error" in out ? problem(REFUSED[out.error], out.error) : json(204, null);
            },
        },
        {
            method: "POST",
            path: "/api/kid-sessions/end-all",
            who: "adult",
            run: async (_c, adult) => {
                const out = await endKidViews(adult);
                return "error" in out ? problem(REFUSED[out.error], out.error) : json(200, out);
            },
        },
        {
            method: "POST",
            path: "/api/me/details",
            who: "adult",
            run: async (c, adult) => {
                await updateAccountField(
                    adult,
                    field(c.body, "family"),
                    field(c.body, "field"),
                    field(c.body, "value"),
                );
                return json(204, null);
            },
        },
        {
            method: "POST",
            path: "/api/me/email/start",
            who: "adult",
            run: async (c, adult) =>
                json(202, await requestAccountEmail(config, adult, field(c.body, "email"), c.ip)),
        },
        {
            method: "POST",
            path: "/api/me/email/confirm",
            who: "adult",
            run: async (c, adult) => {
                await confirmAccountEmail(
                    config,
                    adult,
                    field(c.body, "challenge"),
                    field(c.body, "code"),
                );
                return json(204, null);
            },
        },
        {
            method: "POST",
            path: "/api/me/picture",
            who: "adult",
            run: async (c, adult) => {
                const out = await setMyPicture(adult, field(c.body, "picture"));
                return "error" in out ? problem(REFUSED[out.error], out.error) : json(204, null);
            },
        },
        {
            method: "GET",
            path: "/api/sessions",
            who: "adult",
            run: async (_c, adult) => json(200, await mySessions(adult)),
        },
        {
            method: "POST",
            path: "/api/sessions/end",
            who: "adult",
            run: async (c, adult) => {
                const out = await endMySession(adult, field(c.body, "id"));
                if ("error" in out) return problem(REFUSED[out.error], out.error);
                const headers = new Headers();
                // this browser's own session ended: its cookie goes with it, as a sign-out's does
                if (out.own) headers.append("set-cookie", cookie(config, n.session, "", 0));
                return json(204, null, headers);
            },
        },
        {
            method: "POST",
            path: "/api/family/pin",
            who: "adult",
            run: async (c, adult) => {
                const out = await setFamilyPin(config, adult, field(c.body, "pin"));
                return "error" in out
                    ? problem(REFUSED[out.error], out.error, { problem: out.problem })
                    : json(204, null);
            },
        },

        {
            method: "GET",
            path: "/api/pack",
            who: "adult",
            run: async () => json(200, packView(config.pack)),
        },
        {
            method: "GET",
            path: "/api/pack/:digest/lessons/:file",
            who: "adult",
            run: async (c) =>
                packedFile(
                    packFile(config.pack, c.params.digest ?? "", `lessons/${c.params.file ?? ""}`),
                ),
        },
        {
            method: "GET",
            path: "/api/pack/:digest/scenes/:file",
            who: "adult",
            run: async (c) =>
                packedFile(
                    packFile(config.pack, c.params.digest ?? "", `scenes/${c.params.file ?? ""}`),
                ),
        },

        {
            method: "GET",
            path: "/api/kid",
            who: "kid",
            run: async (_c, kid) => json(200, await kidView(kid)),
        },
        {
            method: "GET",
            path: "/api/kid/:kid/state",
            who: "kid",
            run: async (c, kid) =>
                json(
                    200,
                    await kidState(kid, c.params.kid ?? "", c.url.searchParams.get("lesson")),
                ),
        },
        {
            method: "GET",
            path: "/api/kid/:kid/record",
            who: "kid",
            run: async (c, kid) => json(200, await kidRecord(kid, c.params.kid ?? "", config.pack)),
        },
        {
            method: "GET",
            path: "/api/kid/:kid/pack",
            who: "kid",
            run: async (c, kid) => json(200, kidPack(kid, c.params.kid ?? "", config.pack)),
        },
        {
            method: "GET",
            path: "/api/kid/:kid/pack/:digest/lessons/:file",
            who: "kid",
            run: async (c, kid) =>
                packedFile(
                    kidFile(
                        kid,
                        c.params.kid ?? "",
                        config.pack,
                        c.params.digest ?? "",
                        `lessons/${c.params.file ?? ""}`,
                    ),
                ),
        },
        {
            method: "GET",
            path: "/api/kid/:kid/pack/:digest/scenes/:file",
            who: "kid",
            run: async (c, kid) =>
                packedFile(
                    kidFile(
                        kid,
                        c.params.kid ?? "",
                        config.pack,
                        c.params.digest ?? "",
                        `scenes/${c.params.file ?? ""}`,
                    ),
                ),
        },
        {
            method: "POST",
            path: "/api/kid/:kid/events",
            who: "kid",
            run: async (c, kid) => json(200, await appendKid(kid, c.params.kid ?? "", c.body)),
        },
        {
            method: "GET",
            path: "/api/kid/:kid/content/:hash",
            who: "kid",
            run: async (c, kid) =>
                json(200, {
                    content: await contentForKid(kid, c.params.kid ?? "", c.params.hash ?? ""),
                }),
        },
        {
            method: "POST",
            path: "/api/kid/add",
            who: "kid",
            run: async (c, kid) => {
                const out = await addToKidView(
                    config,
                    kid,
                    { pin: field(c.body, "pin"), kid: field(c.body, "kid") },
                    c.device,
                    c.req.headers.get("x-kid-session") ?? c.cookies.get(n.kids) ?? "",
                );
                if ("error" in out) {
                    switch (out.error) {
                        case "wrong-pin":
                            return problem(400, "wrong-pin", { attemptsLeft: out.attemptsLeft });
                        case "rate-limited":
                            return problem(429, "rate-limited", { retryAfter: out.retryAfter });
                        case "no-pin":
                            return problem(409, "no-pin");
                        case "no-consent":
                            return problem(409, "no-consent", { kid: out.kid });
                        case "not-allowed":
                        case "not-found":
                            return problem(REFUSED[out.error], out.error);
                        case "bad-request":
                            return problem(400, "bad-request", {
                                problem: "pin is four digits, and kid names a child",
                            });
                    }
                }
                if (c.req.headers.has("x-kid-session"))
                    return bind(
                        c,
                        json(200, { credential: out.credential }),
                        kid.family.id,
                        out.credential.split(KIDS_JOIN).flatMap((x) => {
                            const parsed = parseCredential(x);
                            return parsed ? [parsed.id] : [];
                        }),
                    );
                // The view's cookie now carries the new child's key beside the others.
                const headers = new Headers();
                headers.append(
                    "set-cookie",
                    cookie(config, n.kids, out.credential, kidsMaxAge(out.keys)),
                );
                return bind(
                    c,
                    json(204, null, headers),
                    kid.family.id,
                    out.keys.map((k) => k.id),
                );
            },
        },
        {
            method: "POST",
            path: "/api/kid/leave",
            who: "kid",
            run: async (c, kid) => {
                // A tab-opened view can return to the existing parent without rotating that shared session.
                const credential = c.cookies.get(n.session) ?? null;
                const active = await adultFrom(credential);
                if (
                    c.req.headers.has("x-kid-session") &&
                    active &&
                    active !== "put-away" &&
                    active.parent &&
                    active.family.id === kid.family.id
                ) {
                    if (
                        !(await browserAllows(
                            active.family.id,
                            [active.session.id],
                            c.cookies.get(n.browser) ?? null,
                        ))
                    )
                        return problem(401, "signed-out");
                    const unlocked = await unlockParent(config, credential, field(c.body, "pin"));
                    if (unlocked !== true) return problem(403, unlocked.error);
                    return json(200, { me: await me(active) });
                }
                const out = await leaveKidView(
                    config,
                    kid,
                    field(c.body, "pin"),
                    c.device,
                    c.cookies.get(n.session) ?? null,
                );
                if ("error" in out) {
                    switch (out.error) {
                        case "wrong-pin":
                            return problem(400, "wrong-pin", { attemptsLeft: out.attemptsLeft });
                        case "rate-limited":
                            return problem(429, "rate-limited", { retryAfter: out.retryAfter });
                        case "no-pin":
                            return problem(409, "no-pin");
                        case "not-allowed":
                            return problem(403, "not-allowed");
                        case "bad-request":
                            return problem(400, "bad-request", { problem: "pin is four digits" });
                    }
                }
                // The browser changes back from the children's view to a grown-up's session: the one
                // it held, sent again with its age from now, or the PIN's shared one when that has gone.
                const headers = new Headers();
                headers.append(
                    "set-cookie",
                    cookie(config, n.session, out.credential, maxAgeOf(out.me.session)),
                );
                if (!c.req.headers.has("x-kid-session"))
                    headers.append("set-cookie", cookie(config, n.kids, "", 0));
                return bind(c, json(204, null, headers), out.me.family.id, [out.me.session.id]);
            },
        },

        {
            method: "GET",
            path: "/api/dev/outbox",
            who: "local",
            run: async () => json(200, { emails: outbox() }),
        },
    ];
}

function matcher(path: string): (pathname: string) => Record<string, string> | null {
    const names: string[] = [];
    const pattern = new RegExp(
        `^${path.replace(/:([a-z]+)/g, (_m, name: string) => {
            names.push(name);
            return "([^/]+)";
        })}$`,
    );
    return (pathname) => {
        const m = pathname.match(pattern);
        if (!m) return null;
        const params: Record<string, string> = {};
        for (const [i, name] of names.entries()) {
            // A malformed escape matches no route, and so answers 404 inside the app's own handling.
            const value = decoded(m[i + 1] ?? "");
            if (value === null) return null;
            params[name] = value;
        }
        return params;
    };
}

/** The most a body may be, from auth.md's limit on a batch. */
export const BODY_LIMIT = 1024 * 1024;

/** Production trusts Render's managed ingress; local requests use their socket address. */
function clientIp(req: Request, socket: string | null, config: Config): string | null {
    if (config.env === "local") return socket;
    const forwarded = req.headers.get("cf-connecting-ip")?.trim();
    return forwarded && !forwarded.includes("%") && isIP(forwarded) ? forwarded : null;
}

/**
 * The app: one function from a request to a response. `ip` is the caller's address as the socket saw
 * it; the tests pass their own.
 */
export function app(config: Config): (req: Request, ip?: string | null) => Promise<Response> {
    const table = routes(config).map((r) => ({ ...r, match: matcher(r.path) }));
    const n = names(config);
    const serveDist = config.env === "production" ? staticFrom(config.secure) : null;

    const cors = (req: Request, res: Response): Response => {
        const origin = req.headers.get("origin");
        if (config.env === "local" && origin && config.origins.includes(origin)) {
            res.headers.set("access-control-allow-origin", origin);
            res.headers.set("access-control-allow-credentials", "true");
            res.headers.set("vary", "Origin");
        }
        return res;
    };

    // The local routes answer only a request made on this computer: from a loopback socket,
    // and to a loopback host, so a page elsewhere that points its own name at 127.0.0.1 is refused too.
    const onThisComputer = (url: URL, ip: string | null): boolean =>
        config.env === "local" && ip !== null && isLoopback(ip) && isLoopback(url.hostname);

    /** Whether a route's own answer already sets or clears a cookie of this name. */
    const setsCookie = (res: Response, name: string): boolean =>
        res.headers.getSetCookie().some((s) => s.startsWith(`${name}=`));

    return async (req, ip = null) => {
        const url = new URL(req.url);
        const method = req.method.toUpperCase();
        const address = clientIp(req, ip, config);
        if (
            config.env === "production" &&
            !address &&
            url.pathname.startsWith("/api/") &&
            url.pathname !== "/api/health"
        ) {
            config.log("Managed ingress request missing a valid client IP");
            return cors(req, problem(503, "server"));
        }
        if (
            url.pathname === "/api/letters/unsubscribe" &&
            (method === "GET" || method === "POST")
        ) {
            try {
                return await unsubscribeRequest(req, config.pepper);
            } catch {
                return problem(500, "server");
            }
        }
        if (url.pathname === "/api/email/webhook" && method === "POST") {
            if (!config.mailWebhookSecret) return problem(404, "not-found");
            try {
                return await webhookRequest(req, config.mailWebhookSecret);
            } catch {
                return problem(500, "server");
            }
        }
        if (method === "OPTIONS") {
            const res = json(204, null);
            res.headers.set("access-control-allow-methods", "GET, POST");
            res.headers.set(
                "access-control-allow-headers",
                "content-type, x-kid-session, x-sign-in-challenge",
            );
            return cors(req, res);
        }
        const found = table
            .map((r) => ({ r, params: r.match(url.pathname) }))
            .filter((x) => x.params !== null);
        const hit = found.find((x) => x.r.method === method);
        if (!hit || !hit.params) {
            const served = serveDist ? await serveDist(req) : null;
            return served ?? cors(req, problem(404, "not-found"));
        }
        if (hit.r.who === "local" && !onThisComputer(url, ip))
            return cors(req, problem(404, "not-found"));

        try {
            if (method !== "GET" && method !== "HEAD") {
                const origin = req.headers.get("origin");
                const site = req.headers.get("sec-fetch-site");
                if (
                    !origin ||
                    !config.origins.includes(origin) ||
                    (site !== null && site !== "same-origin" && site !== "same-site")
                )
                    return cors(req, problem(403, "origin"));
            }
            let body: unknown = {};
            if (method === "POST") {
                // Every POST declares JSON, an empty one included, since a page on another site can
                // send a POST of a simple type without asking first, and with no body at all.
                if (!/^application\/json\b/i.test(req.headers.get("content-type") ?? ""))
                    return cors(req, problem(415, "not-json"));
                const text = await req.text();
                if (text.length > BODY_LIMIT)
                    return cors(req, problem(413, "too-large", { limit: "1 MB" }));
                if (text.trim()) {
                    try {
                        body = JSON.parse(text);
                    } catch {
                        return cors(
                            req,
                            problem(400, "bad-request", { problem: "the body is not JSON" }),
                        );
                    }
                }
            }
            const c: Ctx = {
                req,
                url,
                params: hit.params,
                body,
                ip: address,
                cookies: cookiesOf(req, [n.session, n.pending, n.kids, n.browser]),
                device: deviceName(req.headers.get("user-agent")),
            };
            const r = hit.r;
            if (r.who === "adult") {
                // A child tab never borrows the shared parent cookie, including after expiry.
                if (req.headers.has("x-kid-session")) return cors(req, problem(403, "not-allowed"));
                const sent = c.cookies.get(n.session) ?? null;
                const adult = await adultFrom(sent);
                // A session put away for a children's view is refused and its cookie kept, since the
                // family's PIN gives it back on that browser (.docs/auth.md, flow 7).
                if (adult === "put-away") return cors(req, problem(401, "put-away"));
                if (!adult) {
                    // A cookie that opens nothing is cleared, since the pages route on whether one is
                    // there (server/pages.ts), and the next page it asks for is then the site.
                    const refused = problem(401, "signed-out");
                    if (sent !== null)
                        refused.headers.append("set-cookie", cookie(config, n.session, "", 0));
                    return cors(req, refused);
                }
                if (
                    !(await browserAllows(
                        adult.family.id,
                        [adult.session.id],
                        c.cookies.get(n.browser) ?? null,
                    ))
                )
                    return cors(req, problem(401, "signed-out"));
                const res = await r.run(c, adult);
                // A use that moved `seen_at` sends the cookie again, so the browser keeps it as long as
                // the key lives rather than thirty days from sign-in, unless the route set or cleared it.
                const age = adult.seen ? maxAgeOf(adult.session) : null;
                if (age !== null && sent !== null && !setsCookie(res, n.session))
                    res.headers.append("set-cookie", cookie(config, n.session, sent, age));
                return cors(req, res);
            }
            if (r.who === "kid") {
                // Kid routes read the children's view's cookie and nothing else; a session is ignored.
                const tab = req.headers.has("x-kid-session");
                const sent = req.headers.get("x-kid-session") ?? c.cookies.get(n.kids) ?? null;
                const kid = await kidSessionFrom(sent);
                if (!kid) {
                    const refused = problem(401, "no-kid-session");
                    if (sent !== null && !tab)
                        refused.headers.append("set-cookie", cookie(config, n.kids, "", 0));
                    return cors(req, refused);
                }
                if (
                    !(await browserAllows(
                        kid.family.id,
                        kid.keys.map((k) => k.id),
                        c.cookies.get(n.browser) ?? null,
                    ))
                )
                    return cors(req, problem(401, "no-kid-session"));
                const res = await r.run(c, kid);
                // As a session's: sent again when `seen_at` moved, holding only the keys still alive.
                if (!tab && sent !== null && kid.seen && !setsCookie(res, n.kids)) {
                    const live = new Set(kid.keys.map((k) => k.id));
                    const kept = sent
                        .split(KIDS_JOIN)
                        .filter((credential) => live.has(parseCredential(credential)?.id ?? ""));
                    res.headers.append(
                        "set-cookie",
                        cookie(config, n.kids, kept.join(KIDS_JOIN), kidsMaxAge(kid.keys)),
                    );
                }
                return cors(req, res);
            }
            return cors(req, await r.run(c));
        } catch (error) {
            if (error instanceof Refused) return cors(req, json(error.status, error.body));
            const request = randomUUID();
            // Outside local a failure is logged only by what cannot carry a family's data: a failed
            // query's message holds its parameters, which can be a child's name or an event's contents.
            const detail =
                config.env === "local" && error instanceof Error
                    ? (error.stack ?? error.message)
                    : `code ${codeOf(error) ?? "none"}`;
            config.log(`${method} ${hit.r.path} 500 request ${request}: ${detail}`);
            const failed = problem(500, "server");
            failed.headers.set("x-request-id", request);
            return cors(req, failed);
        }
    };
}

/** The first `code` on an error or its causes: a Postgres error code, or a system one such as ECONNREFUSED. */
function codeOf(error: unknown): string | null {
    let e: unknown = error;
    for (let depth = 0; depth < 5 && isRecord(e); depth++) {
        if (typeof e.code === "string") return e.code;
        e = e.cause;
    }
    return null;
}

async function readBody(req: IncomingMessage): Promise<Buffer | null> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
        const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        size += b.length;
        if (size > BODY_LIMIT + 1) return null;
        chunks.push(b);
    }
    return Buffer.concat(chunks);
}

const gzip = promisify(gzipCb);

/** A body at least this big is worth squeezing; under it the headers cost more than it saves. */
const SQUEEZE_FROM = 1400;

/**
 * The body gzipped, when the caller takes it that way and there is enough of it to be worth it. The
 * family's reads are repetitive JSON and squeeze to about an eighth: the calendar's year of
 * sittings is 414 kB and 54 kB squeezed, and a lesson's file 131 kB and 13 kB, which is what makes
 * reading the events themselves affordable while there is no fold of the year on the way out
 * (api.md, "What the pages derive"). */
export async function squeezed(
    body: Buffer,
    req: IncomingMessage,
    res: ServerResponse,
): Promise<Buffer> {
    const asked = req.headers["accept-encoding"];
    const takes = (Array.isArray(asked) ? asked.join(", ") : (asked ?? "")).includes("gzip");
    if (!takes || body.length < SQUEEZE_FROM || res.hasHeader("content-encoding")) return body;
    const out = await gzip(body);
    const vary = res.getHeader("vary");
    res.setHeader("content-encoding", "gzip");
    res.setHeader("vary", vary ? `${String(vary)}, Accept-Encoding` : "Accept-Encoding");
    res.setHeader("content-length", String(out.length));
    return out;
}

async function answer(
    handle: ReturnType<typeof app>,
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    const started = Date.now();
    const body = await readBody(req);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers.set(k, v);
        else if (Array.isArray(v)) headers.set(k, v.join(", "));
    }
    const method = req.method ?? "GET";
    const url = `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`;
    const response =
        body === null
            ? new Response(JSON.stringify({ error: "too-large", limit: "1 MB" }), { status: 413 })
            : await handle(
                  new Request(url, {
                      method,
                      headers,
                      ...(method === "GET" || method === "HEAD"
                          ? {}
                          : { body: new Uint8Array(body) }),
                  }),
                  req.socket.remoteAddress ?? null,
              );
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
        if (key !== "set-cookie") res.setHeader(key, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);
    res.end(await squeezed(Buffer.from(await response.arrayBuffer()), req, res));
    process.stdout.write(
        `${method} ${req.url ?? "/"} ${response.status} ${Date.now() - started}ms\n`,
    );
}

/** Listens on the fixed port and refuses to start if it is taken, rather than drifting to another. */
export function serve(config: Config): Promise<() => Promise<void>> {
    const handle = app(config);
    const server = createServer((req, res) => {
        answer(handle, req, res).catch((error: unknown) => {
            process.stderr.write(`${String(error)}\n`);
            res.statusCode = 500;
            res.end();
        });
    });
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, config.host, () => {
            server.off("error", reject);
            resolve(
                () =>
                    new Promise<void>((done) => {
                        server.close(() => done());
                        server.closeAllConnections();
                    }),
            );
        });
    });
}

if (import.meta.filename === process.argv[1]) {
    const config = configFrom(process.env);
    if ("problem" in config) {
        process.stderr.write(`the API will not start: ${config.problem}\n`);
        process.exit(1);
    }
    const packDir = process.env.PACK_DIR || join(import.meta.dirname, "..", "dist", "pack");
    const pack = loadPack(packDir);
    if ("problem" in pack)
        process.stderr.write(`no pack, so no lessons are served: ${pack.problem}\n`);
    else config.pack = pack;
    const unwatch = watchPack(
        packDir,
        (next) => {
            config.pack = next;
        },
        (line) => process.stdout.write(`${line}\n`),
    );
    try {
        const stop = await serve(config);
        process.stdout.write(
            `API on http://${config.host}:${config.port} for ${config.origins.join(" and ")}\n`,
        );
        const end = (): void => {
            unwatch();
            void stop()
                .then(closeApp)
                .then(() => process.exit(0));
        };
        process.once("SIGINT", end);
        process.once("SIGTERM", end);
    } catch (error) {
        const taken = isRecord(error) && error.code === "EADDRINUSE";
        process.stderr.write(
            taken
                ? `port ${config.port} is taken. See what holds it with: lsof -nP -iTCP:${config.port} -sTCP:LISTEN\n`
                : `the API could not start: ${String(error)}\n`,
        );
        process.exit(1);
    }
}
