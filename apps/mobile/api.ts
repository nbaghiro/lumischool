import { ORIGIN, USER_AGENT } from "./origin";
import { credentials } from "./store";

// These three restate server/api.ts, which this app cannot type check against: it imports
// server/db/keys.ts for a type, and that file needs Node's types. Keep them in step by hand.

/** A family a person may choose, as server/api.ts declares it. */
export interface FamilyChoice {
    family_id: string;
    name: string;
    kid_id: string | null;
}

/** A new family's answers, as server/api.ts declares them. */
export interface Start {
    name: string;
    family: string;
    timeZone: string;
}

const CODES = [
    "bad-request",
    "delivery-failed",
    "bad-email",
    "no-pending",
    "wrong-code",
    "bad-envelope",
    "signed-out",
    "put-away",
    "no-kid-session",
    "origin",
    "not-allowed",
    "fresh-sign-in",
    "not-found",
    "no-consent",
    "notice-changed",
    "expired",
    "dead-code",
    "wrong-pin",
    "no-pin",
    "too-large",
    "not-json",
    "rate-limited",
    "server",
] as const;

/** The refusals server/api.ts names in `ErrorCode`. */
export type ErrorCode = (typeof CODES)[number];

/** Who a request is sent as: the grown-up's session, the children's view, or nobody yet. */
type As = "adult" | "kid" | "anyone";

/** A refusal from the API, or `offline` when no answer came, or `unreadable` when one came wrong. */
export interface Problem {
    error: ErrorCode | "offline" | "unreadable";
    status: number;
    attemptsLeft?: number;
    retryAfter?: number;
    problem?: string;
}

export type Reply<T> = { ok: true; value: T } | { ok: false; problem: Problem };

type Fields = Record<string, unknown>;

const obj = (v: unknown): v is Fields => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const isCode = (v: unknown): v is ErrorCode => CODES.some((c) => c === v);

function problemOf(status: number, body: unknown): Problem {
    if (!obj(body) || !isCode(body.error)) return { error: "unreadable", status };
    const p: Problem = { error: body.error, status };
    if (num(body.attemptsLeft)) p.attemptsLeft = body.attemptsLeft;
    if (num(body.retryAfter)) p.retryAfter = body.retryAfter;
    if (str(body.problem)) p.problem = body.problem;
    return p;
}

const failed = <T>(problem: Problem): Reply<T> => ({ ok: false, problem });
const unreadable = <T>(status: number): Reply<T> => failed({ error: "unreadable", status });

let build: string | null = null;

/** The deploy the last answer came from, by its `x-lumi-build`. */
export const lastBuild = (): string | null => build;

/** The headers a request from the app carries, which the page's own requests never can. */
export function headersFor(as: As): Record<string, string> {
    const held = credentials();
    const headers: Record<string, string> = {};
    if (held.device !== null) headers["X-Lumi-Device"] = held.device;
    if (as === "adult" && held.session !== null) {
        headers.Authorization = `Bearer ${held.session}`;
    }
    if (as === "kid" && held.kid !== null) headers["X-Kid-Session"] = held.kid;
    return headers;
}

async function call(
    method: "GET" | "POST",
    path: string,
    as: As,
    body?: Fields,
    extra: Record<string, string> = {},
): Promise<{ status: number; body: unknown } | Problem> {
    const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        ...headersFor(as),
        ...extra,
    };
    if (method === "POST") headers["Content-Type"] = "application/json";
    let res: Response;
    try {
        res = await fetch(
            `${ORIGIN}${path}`,
            method === "POST"
                ? { method, headers, credentials: "omit", body: JSON.stringify(body ?? {}) }
                : { method, headers, credentials: "omit" },
        );
    } catch {
        return { error: "offline", status: 0 };
    }
    build = res.headers.get("x-lumi-build") ?? build;
    const text = await res.text().catch(() => "");
    let parsed: unknown = null;
    if (text !== "") {
        try {
            parsed = JSON.parse(text);
        } catch {
            return { error: "unreadable", status: res.status };
        }
    }
    return res.ok ? { status: res.status, body: parsed } : problemOf(res.status, parsed);
}

const isProblem = (v: { status: number; body: unknown } | Problem): v is Problem => "error" in v;

/** A grown-up signed in on this device, with the credentials the app keeps. */
export interface SignedIn {
    session: string;
    device: string;
}

function signedInFrom(body: unknown): SignedIn | null {
    if (!obj(body) || !obj(body.native)) return null;
    const { session, device } = body.native;
    return str(session) && str(device) ? { session, device } : null;
}

const readChoice = (v: unknown): FamilyChoice | null =>
    obj(v) && str(v.family_id) && str(v.name) && (v.kid_id === null || str(v.kid_id))
        ? { family_id: v.family_id, name: v.name, kid_id: v.kid_id }
        : null;

function choicesOf(v: unknown): FamilyChoice[] | null {
    if (!Array.isArray(v)) return null;
    const out: FamilyChoice[] = [];
    for (const item of v) {
        const choice = readChoice(item);
        if (choice === null) return null;
        out.push(choice);
    }
    return out;
}

/**
 * Asks for a code by email, with a new family's answers when starting one, or `shared` for a device
 * the family shares, whose session then ends after thirty idle minutes (server/db/keys.ts).
 */
export async function startEmail(
    email: string,
    o: { start: Start } | { shared: boolean },
): Promise<Reply<string>> {
    const body: Fields = { email, tab: true, device: true };
    if ("start" in o) body.start = o.start;
    else if (o.shared) body.shared = true;
    const a = await call("POST", "/api/auth/email/start", "anyone", body);
    if (isProblem(a)) return failed(a);
    return obj(a.body) && str(a.body.challenge)
        ? { ok: true, value: a.body.challenge }
        : unreadable(a.status);
}

export type Verified =
    | { kind: "in"; signedIn: SignedIn }
    | { kind: "choose"; families: FamilyChoice[] }
    | { kind: "start" };

export async function verifyCode(challenge: string, code: string): Promise<Reply<Verified>> {
    const a = await call(
        "POST",
        "/api/auth/email/verify",
        "anyone",
        { code, device: true },
        { "X-Sign-In-Challenge": challenge },
    );
    if (isProblem(a)) return failed(a);
    if (obj(a.body) && a.body.start === true) return { ok: true, value: { kind: "start" } };
    const families = obj(a.body) ? choicesOf(a.body.choose) : null;
    if (families !== null) return { ok: true, value: { kind: "choose", families } };
    const signedIn = signedInFrom(a.body);
    return signedIn ? { ok: true, value: { kind: "in", signedIn } } : unreadable(a.status);
}

export async function chooseFamily(
    challenge: string,
    choice: { family_id: string } | { start: Start },
): Promise<Reply<SignedIn>> {
    const a = await call(
        "POST",
        "/api/auth/email/choose",
        "anyone",
        { ...choice, device: true },
        { "X-Sign-In-Challenge": challenge },
    );
    if (isProblem(a)) return failed(a);
    const signedIn = signedInFrom(a.body);
    return signedIn ? { ok: true, value: signedIn } : unreadable(a.status);
}

export async function switchFamily(family_id: string): Promise<Reply<SignedIn>> {
    const a = await call("POST", "/api/auth/switch", "adult", { family_id });
    if (isProblem(a)) return failed(a);
    const signedIn = signedInFrom(a.body);
    return signedIn ? { ok: true, value: signedIn } : unreadable(a.status);
}

export async function signOut(): Promise<Reply<null>> {
    const a = await call("POST", "/api/auth/sign-out", "adult", {});
    return isProblem(a) ? failed(a) : { ok: true, value: null };
}

/** Gives back a session put away while a children's view was open, with the family's PIN. */
export async function unlock(pin: string): Promise<Reply<null>> {
    const a = await call("POST", "/api/auth/unlock", "adult", { pin });
    return isProblem(a) ? failed(a) : { ok: true, value: null };
}

/** The signed-in grown-up as the switch reads them: their address, this family and the others. */
export interface Me {
    /** The person's id and the picture they picked, which choose the portrait on their stamp. */
    id: string;
    name: string | null;
    picture: unknown;
    email: string;
    family: { id: string; name: string };
    families: FamilyChoice[];
}

export async function me(): Promise<Reply<Me>> {
    const a = await call("GET", "/api/me", "adult");
    if (isProblem(a)) return failed(a);
    const b = a.body;
    if (!obj(b) || !obj(b.user) || !obj(b.family)) return unreadable(a.status);
    const { email, id: userId, name: userName, settings } = b.user;
    const { id, name } = b.family;
    const families = choicesOf(b.families);
    const picture = obj(settings) ? settings.picture : null;
    return str(email) && str(userId) && str(id) && str(name) && families
        ? {
              ok: true,
              value: {
                  id: userId,
                  name: str(userName) ? userName : null,
                  picture,
                  email,
                  family: { id, name },
                  families,
              },
          }
        : unreadable(a.status);
}

export interface Child {
    id: string;
    name: string;
}

export async function children(): Promise<Reply<Child[]>> {
    const a = await call("GET", "/api/family", "adult");
    if (isProblem(a)) return failed(a);
    if (!obj(a.body) || !Array.isArray(a.body.kids)) return unreadable(a.status);
    const kids: Child[] = [];
    for (const k of a.body.kids) {
        if (!obj(k) || !str(k.id) || !str(k.name)) return unreadable(a.status);
        kids.push({ id: k.id, name: k.name });
    }
    return { ok: true, value: kids };
}

/** Opens a children's view for these children, keeping the grown-up's session as it is. */
export async function openChildren(kids: string[]): Promise<Reply<string>> {
    const a = await call("POST", "/api/kid-sessions", "adult", { kids, tab: true });
    if (isProblem(a)) return failed(a);
    return obj(a.body) && str(a.body.credential)
        ? { ok: true, value: a.body.credential }
        : unreadable(a.status);
}

/** A child signed in with their username and PIN, and the browser key the server bound it to. */
export async function kidSignIn(
    username: string,
    pin: string,
): Promise<Reply<{ credential: string; device: string | null }>> {
    const a = await call("POST", "/api/kid/sign-in", "anyone", { username, pin, device: true });
    if (isProblem(a)) return failed(a);
    if (!obj(a.body) || !str(a.body.credential)) return unreadable(a.status);
    const device = obj(a.body.native) && str(a.body.native.device) ? a.body.native.device : null;
    return { ok: true, value: { credential: a.body.credential, device } };
}

/**
 * Leaves the children's view with the family's PIN. A grown-up's session comes back when the server
 * issues one, as it does for a view a child signed in to; otherwise the session the app holds stands.
 */
export async function leaveChildren(pin: string): Promise<Reply<SignedIn | null>> {
    const a = await call("POST", "/api/kid/leave", "kid", { pin });
    if (isProblem(a)) return failed(a);
    return { ok: true, value: signedInFrom(a.body) };
}

/** Ends a children's view a child signed in to, when the family has no PIN to leave it with. */
export async function kidSignOut(): Promise<Reply<null>> {
    const a = await call("POST", "/api/kid/sign-out", "kid", {});
    return isProblem(a) ? failed(a) : { ok: true, value: null };
}

/** Asks the server which deploy it runs, for reloading a page an older deploy served. */
export async function currentBuild(): Promise<string | null> {
    const a = await call("GET", "/api/health", "anyone");
    return isProblem(a) && a.error === "offline" ? null : build;
}

/** The page a web view first loads, which sets its cookies from the app's headers and goes on. */
export const handoffUrl = (to: string): string =>
    `${ORIGIN}/api/native/web?to=${encodeURIComponent(to)}`;
