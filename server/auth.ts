// Who is asking, and how they came to be signed in (.docs/auth.md): the credential checks the entry
// point in server/http.ts runs before any family is read, sign-in by emailed code, sessions and
// switching family, signing out, the children's view a parent opens and the family's PIN that leaves
// it. Every read and write here runs through `withFamily` or one of the store's security-definer
// functions.

import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import { suggestedUsername, usernameOf } from "../school/family/login";
import {
    lockKidLogins,
    loginPin,
    loginTry,
    lookupLogin,
    saveKidLogin,
    saveLoginPin,
    stopKidLogins,
} from "./db/kid-login";
import type { KidLogins } from "./api";
import type { SignInMethod } from "../engine/answer";
import { isParent } from "../school/family/access";
import type { FamilyChoice, KidSessions, Me, Start } from "./api";
import { setScope, withFamily, type FamilyTx } from "./db/client";
import {
    addKid,
    CONSENT_NOTICE,
    createFamily,
    familyRow,
    kidsOf,
    log,
    person,
    record,
    rowsOf,
    saveLogin,
    savePicture,
    type Written,
} from "./db/events";
import {
    endHeld,
    endKids,
    endOwnSession,
    endPutAway,
    endSession,
    endSessions,
    familiesIn,
    hasPin,
    issue,
    issueCode,
    kidViewsOf,
    lockedLogin,
    loginByAddress,
    myFamilies,
    newSecret,
    openKids,
    parseCredential,
    pinFor,
    pinHash,
    pinTried,
    prove,
    putAway,
    restore,
    sameHash,
    sessionsOf,
    setPin,
    sha256,
    useCode,
    verify,
    verifyKids,
    type Held,
    type KidKey,
} from "./db/keys";
import type { Sessions } from "./api";
import type { Family, Key, Kid, Member } from "./db/schema";
import { codeEmail, type Transport } from "./email";

export interface AuthConfig {
    env: "local" | "production";
    /** The key for code HMACs, network hashes and the family's PIN, which is never in the database. */
    pepper: string;
    send: Transport;
    /**
     * A fixed code the code step accepts beside the emailed one, outside production only, so a
     * developer and the end-to-end tests sign in without reading the outbox (.docs/auth.md, flow 2).
     */
    devCode: string | null;
}

/** A person signed in to one family, as the entry point found them. */
export interface Adult {
    family: Family;
    user: string;
    session: Pick<Key, "id" | "kind" | "created_at">;
    /** Their active rows in this family. */
    rows: Member[];
    parent: boolean;
    /** Today in the family's time zone, which is what a tutor's window is measured in. */
    today: string;
    /** Whether this request moved the session's `seen_at`, which is when the cookie is sent again. */
    seen: boolean;
    /** Whether the family's PIN made this session, which then never counts as a fresh sign-in. */
    byPin: boolean;
}

/** A browser's children's view, as the entry point found it (.docs/auth.md, flow 5). */
export interface KidSession {
    family: Family;
    view: string;
    /** The parent who opened the view, who gets a session back when a grown-up leaves it with the PIN. */
    opener: string;
    /** One key for each child the view is for. */
    keys: KidKey[];
    /** Today in the family's time zone, which is what a tutor's window is measured in. */
    today: string;
    /** Whether this request moved a key's `seen_at`, which is when the cookie is sent again. */
    seen: boolean;
}

/** How a children's view's credentials are joined in its one cookie. */
export const KIDS_JOIN = "~";

/** The most children one view is opened for, and so the most credentials its cookie holds. */
const KIDS_MOST = 30;

const MINUTE = 60_000;

/** A day as `2026-09-14`, in a time zone. */
export function dayIn(timeZone: string, at: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(at);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const keyed = (pepper: string, what: string, value: string): string =>
    createHmac("sha256", pepper).update(`${what}:${value}`, "utf8").digest("hex");

/**
 * The network an address belongs to: IPv4 as it is, IPv6 by its /64, since one allocation holds
 * addresses enough to rotate through a limit (auth.md, "Rate limits").
 */
function networkOf(ip: string): string {
    const v4 = ip.match(/^(?:::ffff:)?(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
    if (v4) return v4;
    const [head = "", tail] = ip.split("::");
    const front = head ? head.split(":") : [];
    const back = tail ? tail.split(":") : [];
    const gap = Array.from({ length: Math.max(0, 8 - front.length - back.length) }, () => "0");
    const full = tail === undefined ? front : [...front, ...gap, ...back];
    return `${full
        .slice(0, 4)
        .map((part) => part.padStart(4, "0"))
        .join(":")}::/64`;
}

const networkHash = (config: AuthConfig, ip: string | null): string | null =>
    ip ? keyed(config.pepper, "network", networkOf(ip)) : null;

const codeHash = (config: AuthConfig, code: string): string => keyed(config.pepper, "code", code);

/** "Safari on an iPad", for the session list. A guess from the user agent, and only a label. */
export function deviceName(userAgent: string | null): string | null {
    if (!userAgent) return null;
    const browser = /Edg\//.test(userAgent)
        ? "Edge"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Chrome\//.test(userAgent)
            ? "Chrome"
            : /Safari\//.test(userAgent)
              ? "Safari"
              : null;
    const device = /iPad/.test(userAgent)
        ? "an iPad"
        : /iPhone/.test(userAgent)
          ? "an iPhone"
          : /Android/.test(userAgent)
            ? "Android"
            : /Mac OS X|Macintosh/.test(userAgent)
              ? "a Mac"
              : /Windows/.test(userAgent)
                ? "Windows"
                : /Linux/.test(userAgent)
                  ? "Linux"
                  : null;
    if (browser && device) return `${browser} on ${device}`;
    return browser ?? device;
}

/**
 * A session signed in within the last ten minutes, which granting and destroying actions need. A
 * session the family's PIN made is never one, since a PIN a child watched must not open those actions.
 */
const fresh = (adult: Pick<Adult, "session" | "byPin">): boolean =>
    !adult.byPin && Date.now() - Date.parse(adult.session.created_at) < 10 * MINUTE;

/**
 * The entry point's check of a session cookie (auth.md, "Every credential names its family"): the key
 * is read inside its own family, and then the person's membership in the same family, so a request is
 * in exactly one family before any of its own work runs. An ended membership signs no one in.
 */
/**
 * The entry point's check of a session cookie: the person, or null for a cookie that opens nothing,
 * or "put-away" for a session put away while a children's view is open on that browser, which every
 * adult route refuses and none clears, since the family's PIN gives it back (.docs/auth.md, flow 5).
 */
export async function adultFrom(credential: string | null): Promise<Adult | "put-away" | null> {
    if (!credential) return null;
    const found = await verify(credential, ["session", "shared-session"]);
    if (found === "put-away") return found;
    if (!found || !found.user_id) return null;
    const user = found.user_id;
    return withFamily({ family: found.family_id, user }, async (tx) => {
        const family = await familyRow(tx, found.family_id);
        const rows = (await rowsOf(tx, found.family_id, user)).filter((m) => m.ended_at === null);
        if (!family || rows.length === 0) return null;
        return {
            family,
            user,
            session: { id: found.id, kind: found.kind, created_at: found.created_at },
            rows,
            parent: isParent(rows),
            today: dayIn(family.time_zone),
            seen: found.seen,
            byPin: isRecord(found.detail) && found.detail.pin === true,
        };
    });
}

/**
 * The entry point's check of a children's view's cookie: its credentials, joined by `KIDS_JOIN`, are
 * read inside their one family, and the keys still alive are the children the view reaches.
 */
export async function kidSessionFrom(cookie: string | null): Promise<KidSession | null> {
    if (!cookie) return null;
    const credentials = cookie.split(KIDS_JOIN);
    if (credentials.length > KIDS_MOST) return null;
    const found = await verifyKids(credentials);
    const first = found?.keys[0];
    if (!found || !first) return null;
    return withFamily({ family: found.family_id }, async (tx) => {
        const family = await familyRow(tx, found.family_id);
        if (!family) return null;
        return {
            family,
            view: first.view,
            opener: first.user_id,
            keys: found.keys.filter((k) => k.view === first.view),
            today: dayIn(family.time_zone),
            seen: found.seen,
        };
    });
}

/** What `/api/me` answers, read inside the transaction that has the family and the person set. */
async function meIn(
    tx: FamilyTx,
    family: string,
    user: string,
    session: Me["session"],
): Promise<Me> {
    const row = await familyRow(tx, family);
    const self = await person(tx, user);
    if (!row || !self) throw new Error("me: the family or the login is missing");
    const rows = (await rowsOf(tx, family, user)).filter((m) => m.ended_at === null);
    return { user: self, family: row, members: rows, families: await familiesIn(tx), session };
}

export async function me(adult: Adult): Promise<Me> {
    return withFamily({ family: adult.family.id, user: adult.user }, (tx) =>
        meIn(tx, adult.family.id, adult.user, adult.session),
    );
}

export interface Opened {
    me: Me;
    credential: string;
}

interface How {
    method: SignInMethod;
    shared: boolean;
    device: string | null;
    /** The old session's, when switching family, so the switch is not a fresh sign-in. */
    created_at?: string;
    /** The session this browser held, ended in the same transaction when it is this person's. */
    held: Held | null;
    /** Whether the family's PIN made this session, which is then never a fresh sign-in. */
    pin?: boolean;
    /** What the step records before `signed-in`. */
    written?: Written[];
}

/**
 * Inside the caller's transaction: ends the session the browser held if it is this person's, makes
 * the new session key, and records `signed-in` after anything else the step records.
 */
async function openIn(tx: FamilyTx, family: string, user: string, how: How): Promise<Opened> {
    if (how.held) await endHeld(tx, how.held, { family, user });
    const kind = how.shared ? "shared-session" : "session";
    const created_at = how.created_at ?? new Date().toISOString();
    const key = await issue(tx, family, {
        kind,
        user_id: user,
        name: how.device,
        created_at,
        ...(how.pin ? { detail: { pin: true } } : {}),
    });
    await record(tx, family, [
        ...(how.written ?? []),
        {
            kid_id: null,
            kind: "signed-in",
            data: { method: how.method, session: key.id, shared: how.shared },
            actor: user,
        },
    ]);
    return {
        me: await meIn(tx, family, user, { id: key.id, kind, created_at }),
        credential: key.credential,
    };
}

const openSession = (family: string, user: string, how: How): Promise<Opened> =>
    withFamily({ family, user }, (tx) => openIn(tx, family, user, how));

/** The session cookie a browser sent while signing in again, as `endHeld` looks for it. */
function heldBy(credential: string | null): Held | null {
    const parsed = credential ? parseCredential(credential) : null;
    return parsed ? { family: parsed.family, id: parsed.id, hash: sha256(parsed.secret) } : null;
}

/** Uses a proven code and opens the session in one transaction, so no code is spent on a sign-in that failed. */
function signIn(
    pending: string,
    family: string,
    user: string,
    how: How,
): Promise<Opened | Declined> {
    return withFamily({ family, user }, async (tx): Promise<Opened | Declined> => {
        if (!(await useCode(tx, "sign-in", sha256(pending)))) return { error: "expired" };
        return openIn(tx, family, user, how);
    });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Asked = { pending: string } | { error: "bad-email" | "rate-limited" };

/**
 * Flow 2's first request: a code for an address, held by a new pending cookie. The answer is the same
 * whether or not the address has a login; only a malformed address or a limit is refused.
 */
export async function askForCode(
    config: AuthConfig,
    input: { email: string; shared: boolean; start: Start | null },
    ip: string | null,
): Promise<Asked> {
    const email = input.email.trim().toLowerCase();
    if (email.length > 254 || !EMAIL.test(email)) return { error: "bad-email" };
    const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
    // Never in production, whatever the configuration holds: there it would sign in anyone who asked.
    const fixed = config.env === "local" ? config.devCode : null;
    const pending = newSecret();
    const issued = await issueCode("sign-in", {
        hash: sha256(pending),
        email,
        ip: networkHash(config, ip),
        user_id: await loginByAddress(email),
        accept: fixed
            ? [codeHash(config, code), codeHash(config, fixed)]
            : [codeHash(config, code)],
        detail: { shared: input.shared, ...(input.start ? { start: input.start } : {}) },
    });
    if (!issued) return { error: "rate-limited" };
    await config.send(codeEmail(email, code));
    return { pending };
}

export type Declined =
    | { error: "no-pending" | "expired" | "dead-code" | "not-found" | "bad-request" }
    | { error: "wrong-code"; attemptsLeft: number };

type Proven = {
    id: string;
    email: string;
    user: string | null;
    shared: boolean;
    /** Flow 1's answers, when the code was asked for from the start page. */
    start: Start | null;
};

/** The start page's three answers, read back from a code's detail without trusting them. */
export function startOf(v: unknown): Start | null {
    if (!isRecord(v)) return null;
    const { name, family, timeZone } = v;
    if (typeof name !== "string" || typeof family !== "string" || typeof timeZone !== "string")
        return null;
    if (!family.trim() || family.length > 80 || name.length > 80) return null;
    try {
        dayIn(timeZone);
    } catch {
        return null;
    }
    return { name, family, timeZone };
}

async function provenBy(pending: string, attempt: string | null): Promise<Proven | Declined> {
    const proof = await prove("sign-in", sha256(pending), attempt);
    switch (proof.outcome) {
        case "unknown":
        case "unproven":
            return { error: "no-pending" };
        case "expired":
            return { error: "expired" };
        case "dead":
            return { error: "dead-code" };
        case "wrong":
            return { error: "wrong-code", attemptsLeft: proof.attemptsLeft };
        case "right": {
            if (!proof.email) return { error: "no-pending" };
            return {
                id: proof.id,
                email: proof.email,
                user: proof.user_id ?? (await loginByAddress(proof.email)),
                shared: isRecord(proof.detail) && proof.detail.shared === true,
                start: isRecord(proof.detail) ? startOf(proof.detail.start) : null,
            };
        }
    }
}

/**
 * Flow 2's second request. A login in one family is signed in there at once; a login in several is
 * asked which, with the code kept proven for its ten minutes; an address with no login, or a login
 * whose memberships have all ended, is offered a family of its own. `sent` is the session cookie the
 * browser holds, which signing in again ends when it is this person's.
 */
export async function checkCode(
    config: AuthConfig,
    pending: string | null,
    code: string,
    device: string | null,
    sent: string | null,
): Promise<Opened | { choose: FamilyChoice[] } | { start: true } | Declined> {
    if (!pending) return { error: "no-pending" };
    const proven = await provenBy(pending, codeHash(config, code.replace(/\s|-/g, "")));
    if ("error" in proven) return proven;
    if (proven.start) return startFamily(pending, proven, proven.start, device, sent);
    const families = proven.user ? await myFamilies(proven.user) : [];
    const [only] = families;
    if (!proven.user || !only) return { start: true };
    if (families.length > 1) return { choose: families };
    return signIn(pending, only.family_id, proven.user, {
        method: "email-code",
        shared: proven.shared,
        device,
        held: heldBy(sent),
    });
}

/**
 * After a proven code: the family chosen from several, or a new family with the person as its first
 * parent, made with the login if there was none, in one transaction (auth.md, flow 1).
 */
export async function chooseFamily(
    pending: string | null,
    choice: { family_id: string } | { start: Start },
    device: string | null,
    sent: string | null,
): Promise<Opened | Declined> {
    if (!pending) return { error: "no-pending" };
    const proven = await provenBy(pending, null);
    if ("error" in proven) return proven;
    if ("family_id" in choice) {
        const families = proven.user ? await myFamilies(proven.user) : [];
        if (!proven.user || !families.some((f) => f.family_id === choice.family_id))
            return { error: "not-found" };
        return signIn(pending, choice.family_id, proven.user, {
            method: "email-code",
            shared: proven.shared,
            device,
            held: heldBy(sent),
        });
    }
    return startFamily(pending, proven, choice.start, device, sent);
}

/**
 * A new family with the person as its first parent, in one transaction (auth.md, flow 1): the code is
 * used, the login is read again by its address under the address's lock and written if there is none,
 * and the family, its first parent, the session and `member-added` and `signed-in` are written. An
 * address that already has a login keeps it, which is how a tutor starts a family of their own.
 */
async function startFamily(
    pending: string,
    proven: Proven,
    start: Start,
    device: string | null,
    sent: string | null,
): Promise<Opened | Declined> {
    const family = randomUUID();
    return withFamily({ family }, async (tx): Promise<Opened | Declined> => {
        if (!(await useCode(tx, "sign-in", sha256(pending)))) return { error: "expired" };
        const login = await lockedLogin(tx, proven.email);
        const user = login ?? randomUUID();
        // The person is known only now, and the policies admit their login and membership only for them.
        await setScope(tx, { family, user });
        const name = start.name.trim() || null;
        if (!login) await saveLogin(tx, { id: user, email: proven.email, name });
        await createFamily(tx, {
            id: family,
            name: start.family.trim(),
            time_zone: start.timeZone,
        });
        const self = await person(tx, user);
        return openIn(tx, family, user, {
            method: "email-code",
            shared: proven.shared,
            device,
            held: heldBy(sent),
            written: [
                {
                    kid_id: null,
                    kind: "member-added",
                    data: {
                        user,
                        name: self?.name ?? name,
                        kid: null,
                        fromDay: null,
                        toDay: null,
                        invitedBy: null,
                    },
                    actor: user,
                },
            ],
        });
    });
}

/**
 * One browser is in one family at a time: switching makes a session in the other family that keeps
 * the old one's `created_at`, and deletes the old key in the same transaction (auth.md, "Choosing a
 * family"). A session the PIN made stays one that is never fresh.
 */
export async function switchFamily(
    adult: Adult,
    family_id: string,
    device: string | null,
): Promise<Opened | null> {
    const families = await myFamilies(adult.user);
    if (!families.some((f) => f.family_id === family_id)) return null;
    return openSession(family_id, adult.user, {
        method: "switch",
        shared: adult.session.kind === "shared-session",
        device,
        created_at: adult.session.created_at,
        held: { family: adult.family.id, id: adult.session.id, hash: null },
        pin: adult.byPin,
    });
}

/** Ends this session, or every session the person has in this family, and records which. */
export async function signOut(adult: Adult, everywhere: boolean): Promise<void> {
    await withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (everywhere) await endSessions(tx, adult.user);
        else await endSession(tx, adult.session.id);
        await record(tx, adult.family.id, [
            { kid_id: null, kind: "signed-out", data: { everywhere }, actor: adult.user },
        ]);
    });
}

/** A grown-up picks their own picture: a word the shelf names a portrait by, which the page honours when the shelf can draw it. */
export async function setMyPicture(
    adult: Adult,
    picture: unknown,
): Promise<{ ok: true } | { error: "bad-request" }> {
    if (typeof picture !== "string" || !/^[a-z]{1,20}$/.test(picture))
        return { error: "bad-request" };
    await withFamily({ family: adult.family.id, user: adult.user }, (tx) =>
        savePicture(tx, adult.user, picture),
    );
    return { ok: true };
}

/** Flow 10: the person's sessions in this family, for the account page, this browser's marked. */
export async function mySessions(adult: Adult): Promise<Sessions> {
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => ({
        sessions: (await sessionsOf(tx, adult.user)).map((s) => ({
            ...s,
            own: s.id === adult.session.id,
        })),
    }));
}

/**
 * Flow 10: a person ends one of their own sessions in this family from the account page, this
 * browser's included, and `signed-out` is recorded. `own` says whether it was this browser's, whose
 * cookie the route then clears.
 */
export async function endMySession(
    adult: Adult,
    id: unknown,
): Promise<{ own: boolean } | { error: "bad-request" | "not-found" }> {
    if (typeof id !== "string" || !id) return { error: "bad-request" };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (!(await endOwnSession(tx, adult.user, id))) return { error: "not-found" };
        await record(tx, adult.family.id, [
            { kid_id: null, kind: "signed-out", data: { everywhere: false }, actor: adult.user },
        ]);
        return { own: id === adult.session.id };
    });
}

/**
 * The kids with an active consent: those whose latest `consent-given` has no later
 * `consent-withdrawn` (auth.md, "What the parent consents to"). Only they may have a children's view
 * opened for them.
 */
export async function consented(tx: FamilyTx, family: string): Promise<Set<string>> {
    const out = new Set<string>();
    for (const e of await log(tx, { family, kinds: ["consent-given", "consent-withdrawn"] })) {
        if (e.kind === "consent-given") out.add(e.data.kid);
        if (e.kind === "consent-withdrawn") out.delete(e.data.kid);
    }
    return out;
}

export type Added =
    { kid: Kid } | { error: "not-allowed" | "bad-request" } | { error: "notice"; notice: string };

/**
 * Flow 4: a kid and the parent's consent to the current notice, in one transaction. The event is the
 * family's, with the kid's id and not their name, so it outlives the kid (auth.md, "What the parent
 * consents to"). No email goes yet: the console transport has no consent template to print.
 */
export async function addKidWithConsent(
    adult: Adult,
    input: { name: string; grade: number; notice: string },
): Promise<Added> {
    if (!adult.parent) return { error: "not-allowed" };
    const name = input.name.trim();
    if (
        !name ||
        name.length > 40 ||
        !Number.isInteger(input.grade) ||
        input.grade < 0 ||
        input.grade > 8
    )
        return { error: "bad-request" };
    if (input.notice !== CONSENT_NOTICE) return { error: "notice", notice: CONSENT_NOTICE };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const kid = await addKid(tx, adult.family.id, { name, grade: input.grade });
        await saveKidLogin(
            tx,
            kid.id,
            suggestedUsername(name, randomBytes(6).toString("hex")),
            false,
        );
        await record(tx, adult.family.id, [
            {
                kid_id: null,
                kind: "consent-given",
                data: { kid: kid.id, notice: CONSENT_NOTICE, method: "email-plus" },
                actor: adult.user,
            },
        ]);
        return { kid };
    });
}

export type OpenedKids =
    | { credential: string }
    | { error: "not-allowed" | "bad-request" | "not-found" }
    | { error: "no-consent"; kid: string };

/**
 * Flow 5: a parent opens the children's view on the browser they are signed in on, for children of
 * the family with an active consent. In one transaction a key is made for each child, the parent's own
 * session key on this browser is put away for the view rather than deleted, and `kid-session-opened`
 * and `session-changed` are recorded. The browser keeps the session's cookie, which every adult route
 * refuses while the key is put away, and the family's PIN gives it back (flow 7). No fresh sign-in
 * is asked for, since the browser can reach less than it could.
 */
export async function openKidView(
    adult: Adult,
    kids: unknown,
    device: string | null,
): Promise<OpenedKids> {
    if (!adult.parent) return { error: "not-allowed" };
    if (
        !Array.isArray(kids) ||
        kids.length === 0 ||
        kids.length > KIDS_MOST ||
        !kids.every((k): k is string => typeof k === "string")
    )
        return { error: "bad-request" };
    const chosen = [...new Set(kids)];
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const known = new Set((await kidsOf(tx, adult.family.id)).map((k) => k.id));
        const allowed = await consented(tx, adult.family.id);
        for (const kid of chosen) {
            if (!known.has(kid)) return { error: "not-found" };
            if (!allowed.has(kid)) return { error: "no-consent", kid };
        }
        const opened = await openKids(tx, adult.family.id, {
            user: adult.user,
            name: device,
            kids: chosen,
        });
        await putAway(tx, adult.session.id, opened.view);
        await record(tx, adult.family.id, [
            {
                kid_id: null,
                kind: "kid-session-opened",
                data: {
                    view: opened.view,
                    keys: opened.keys.map(({ kid, key }) => ({ kid, key })),
                },
                actor: adult.user,
            },
            {
                kid_id: null,
                kind: "session-changed",
                data: { session: adult.session.id, change: "put-away" },
                actor: adult.user,
            },
        ]);
        return { credential: opened.keys.map((k) => k.credential).join(KIDS_JOIN) };
    });
}

/** The children's views open in the family and whether it has a PIN, for a parent. */
export async function kidSessionsFor(
    adult: Adult,
): Promise<KidSessions | { error: "not-allowed" }> {
    if (!adult.parent) return { error: "not-allowed" };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => ({
        views: await kidViewsOf(tx),
        pin: await hasPin(tx),
    }));
}

/** The record of the sessions put away for a view that ended without the PIN, each ended with it. */
const putAwayEnded = (sessions: readonly string[], actor: string | null): Written[] =>
    sessions.map((session) => ({
        kid_id: null,
        kind: "session-changed",
        data: { session, change: "ended" },
        actor,
    }));

/**
 * A parent ends a children's view from the family's page, on whichever browser holds it. Its keys go,
 * and with them the session put away for it on that browser, since nothing can give it back now, and
 * `kid-session-ended` and `session-changed` are recorded; what that browser had not sent is refused
 * from then on.
 */
export async function endKidView(
    adult: Adult,
    view: unknown,
): Promise<{ ok: true } | { error: "not-allowed" | "bad-request" | "not-found" }> {
    if (!adult.parent) return { error: "not-allowed" };
    if (typeof view !== "string") return { error: "bad-request" };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const ended = await endKids(tx, { view });
        if (!ended.length) return { error: "not-found" };
        const sessions = await endPutAway(tx, view);
        await record(tx, adult.family.id, [
            {
                kid_id: null,
                kind: "kid-session-ended",
                data: { view, keys: ended.map(({ kid, key }) => ({ kid, key })), reason: "ended" },
                actor: adult.user,
            },
            ...putAwayEnded(sessions, adult.user),
        ]);
        return { ok: true };
    });
}

/** A family's PIN: four digits. */
const PIN = /^\d{4}$/;

/**
 * A parent sets the family's PIN, or sets it again (.docs/auth.md, flow 7), which needs a fresh
 * sign-in: the PIN hands a session back on any of the family's children's views. Setting it clears the
 * wrong tries, so it is also how a PIN that stopped working works again.
 */
export async function setFamilyPin(
    config: AuthConfig,
    adult: Adult,
    pin: unknown,
): Promise<
    { ok: true } | { error: "not-allowed" | "bad-request" | "fresh-sign-in"; problem?: string }
> {
    if (!adult.parent) return { error: "not-allowed" };
    if (typeof pin !== "string" || !PIN.test(pin)) return { error: "bad-request" };
    if (!fresh(adult)) return { error: "fresh-sign-in" };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await lockKidLogins(tx, adult.family.id);
        const kidsPin = await loginPin(tx);
        if (kidsPin && sameHash(kidsPin.hash, kidPinHash(config, adult.family.id, pin)))
            return {
                error: "bad-request" as const,
                problem: "Choose a different PIN from the kids’ sign-in PIN.",
            };
        await setPin(tx, adult.family.id, {
            user: adult.user,
            hash: pinHash(config.pepper, adult.family.id, pin),
        });
        await record(tx, adult.family.id, [
            { kid_id: null, kind: "pin-set", data: {}, actor: adult.user },
        ]);
        return { ok: true as const };
    });
}

const kidPinHash = (config: AuthConfig, family: string, pin: string): string =>
    keyed(config.pepper, "kid-pin", `${family}:${pin}`);

export async function kidLoginsFor(adult: Adult): Promise<KidLogins | { error: "not-allowed" }> {
    if (!adult.parent) return { error: "not-allowed" };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => ({
        pinSet: (await loginPin(tx)) !== null,
        kids: (await kidsOf(tx, adult.family.id)).map((kid) => ({
            id: kid.id,
            name: kid.name,
            username: isRecord(kid.settings) ? usernameOf(kid.settings.username) : null,
            enabled: isRecord(kid.settings) && kid.settings.kidLogin === true,
        })),
    }));
}

type LoginChange =
    | { ok: true }
    | { error: "not-allowed" | "fresh-sign-in" | "bad-request" | "not-found"; problem?: string };

async function revokeLogins(tx: FamilyTx, adult: Adult, kid?: string): Promise<void> {
    const ended = await endKids(tx, { ids: await stopKidLogins(tx, kid) });
    const views = [...new Set(ended.map((e) => e.view))];
    for (const view of views)
        await record(tx, adult.family.id, [
            {
                kid_id: null,
                actor: adult.user,
                kind: "kid-session-ended",
                data: {
                    view,
                    keys: ended
                        .filter((e) => e.view === view)
                        .map(({ kid, key }) => ({ kid, key })),
                    reason: "ended",
                },
            },
        ]);
}

export async function setKidsPin(
    config: AuthConfig,
    adult: Adult,
    pin: unknown,
): Promise<LoginChange> {
    if (!adult.parent) return { error: "not-allowed" };
    if (!fresh(adult)) return { error: "fresh-sign-in" };
    if (typeof pin !== "string" || !PIN.test(pin)) return { error: "bad-request" };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await lockKidLogins(tx, adult.family.id);
        const parent = await pinFor(tx);
        if (parent && sameHash(parent.hash, pinHash(config.pepper, adult.family.id, pin)))
            return {
                error: "bad-request",
                problem: "Choose a different PIN from the grown-ups' family PIN.",
            };
        await saveLoginPin(
            tx,
            adult.family.id,
            adult.user,
            kidPinHash(config, adult.family.id, pin),
        );
        await revokeLogins(tx, adult);
        return { ok: true };
    });
}

export async function changeKidLogin(
    adult: Adult,
    input: { kid: unknown; username: unknown; enabled: unknown },
): Promise<LoginChange> {
    if (!adult.parent) return { error: "not-allowed" };
    if (!fresh(adult)) return { error: "fresh-sign-in" };
    if (typeof input.kid !== "string" || typeof input.enabled !== "boolean")
        return { error: "bad-request" };
    const id = input.kid,
        enabled = input.enabled;
    try {
        return await withFamily(
            { family: adult.family.id, user: adult.user },
            async (tx): Promise<LoginChange> => {
                await lockKidLogins(tx, adult.family.id);
                const kid = (await kidsOf(tx, adult.family.id)).find((k) => k.id === id);
                if (!kid) return { error: "not-found" };
                const name =
                    input.username === "" || input.username === null
                        ? suggestedUsername(kid.name, randomBytes(6).toString("hex"))
                        : usernameOf(input.username);
                if (!name)
                    return {
                        error: "bad-request",
                        problem: "Use 3–32 letters, numbers or hyphens, starting with a letter.",
                    };
                if (
                    enabled &&
                    (!(await loginPin(tx)) || !(await consented(tx, adult.family.id)).has(id))
                )
                    return {
                        error: "bad-request",
                        problem: "Set the kids’ sign-in PIN and give consent for this child first.",
                    };
                await saveKidLogin(tx, id, name, enabled);
                await revokeLogins(tx, adult, id);
                return { ok: true };
            },
        );
    } catch (error) {
        const cause = error instanceof Error ? error.cause : null;
        if (
            (isRecord(error) && error.code === "23505") ||
            (isRecord(cause) && cause.code === "23505")
        )
            return {
                error: "bad-request",
                problem: "That username is unavailable. Choose another.",
            };
        throw error;
    }
}

export async function signInKid(
    config: AuthConfig,
    input: { username: unknown; pin: unknown },
    ip: string | null,
    device: string | null,
): Promise<{ credential: string } | null> {
    const username = usernameOf(input.username);
    if (!username || typeof input.pin !== "string" || !PIN.test(input.pin)) return null;
    const pin = input.pin;
    const found = await lookupLogin(
        username,
        keyed(config.pepper, "kid-name", username),
        networkHash(config, ip) ?? "unknown",
        sha256(newSecret()),
    );
    if (!found) return null;
    return withFamily({ family: found.family }, async (tx) => {
        await lockKidLogins(tx, found.family);
        const held = await loginPin(tx);
        if (!held?.user_id || held.attempts >= 15) return null;
        if (
            held.attempts >= 5 &&
            held.seen_at &&
            Date.now() - Date.parse(held.seen_at) < 15 * MINUTE
        )
            return null;
        const right = sameHash(held.hash, kidPinHash(config, found.family, pin));
        await loginTry(tx, held.id, right);
        if (!right) return null;
        const kid = (await kidsOf(tx, found.family)).find((k) => k.id === found.kid);
        if (
            !kid ||
            !isRecord(kid.settings) ||
            kid.settings.kidLogin !== true ||
            usernameOf(kid.settings.username) !== username
        )
            return null;
        await setScope(tx, { family: found.family, user: held.user_id });
        if (
            !isParent(
                (await rowsOf(tx, found.family, held.user_id)).filter((m) => m.ended_at === null),
            ) ||
            !(await consented(tx, found.family)).has(found.kid)
        )
            return null;
        const opened = await openKids(tx, found.family, {
            user: held.user_id,
            name: device,
            kids: [found.kid],
            login: true,
        });
        await record(tx, found.family, [
            {
                kid_id: null,
                actor: held.user_id,
                kind: "kid-session-opened",
                data: {
                    view: opened.view,
                    keys: opened.keys.map(({ kid, key }) => ({ kid, key })),
                },
            },
        ]);
        return { credential: opened.keys.map((k) => k.credential).join(KIDS_JOIN) };
    });
}

/**
 * The waits after wrong PINs in a row (.docs/auth.md, "Rate limits"): after five, each try waits a
 * minute from the last wrong one, and after ten, fifteen minutes. Counted on the PIN's own key.
 */
const PIN_WAITS: readonly { after: number; wait: number }[] = [
    { after: 10, wait: 15 * MINUTE },
    { after: 5, wait: MINUTE },
];

/** Wrong PINs in a row after which the PIN stops working until a parent sets it again. */
const PIN_STOPS = 15;

/** Why the family's PIN did not open the way: none or stopped, wrong, or too soon after wrong tries. */
export type PinRefused =
    | { error: "no-pin" }
    | { error: "wrong-pin"; attemptsLeft: number }
    | { error: "rate-limited"; retryAfter: number };

/**
 * The family's PIN checked inside its transaction, never on the device: the waits after wrong tries
 * in a row, a wrong one counted on the PIN's key and kept however the request ends, and a right one
 * clearing the count. Null when the PIN is right.
 */
async function checkPin(
    config: AuthConfig,
    tx: FamilyTx,
    family: string,
    pin: string,
): Promise<PinRefused | null> {
    const held = await pinFor(tx);
    if (!held || held.attempts >= PIN_STOPS) return { error: "no-pin" };
    const wait = PIN_WAITS.find((w) => held.attempts >= w.after)?.wait ?? 0;
    const since = held.seen_at === null ? wait : Date.now() - Date.parse(held.seen_at);
    if (since < wait)
        return { error: "rate-limited", retryAfter: Math.ceil((wait - since) / 1000) };
    if (!sameHash(pinHash(config.pepper, family, pin), held.hash)) {
        await pinTried(tx, held.id, false);
        const tries = held.attempts + 1;
        return tries >= PIN_STOPS
            ? { error: "no-pin" }
            : { error: "wrong-pin", attemptsLeft: PIN_STOPS - tries };
    }
    await pinTried(tx, held.id, true);
    return null;
}

/** The parent who opened a view, as the person the rest of the transaction acts as, or null once they are no longer an active parent. */
async function openerOf(tx: FamilyTx, kid: KidSession): Promise<string | null> {
    await setScope(tx, { family: kid.family.id, user: kid.opener });
    const rows = (await rowsOf(tx, kid.family.id, kid.opener)).filter((m) => m.ended_at === null);
    return isParent(rows) ? kid.opener : null;
}

/** The session the PIN gave back: `restored` when it is the browser's own put away for this view. */
export type Left =
    (Opened & { restored: boolean }) | PinRefused | { error: "bad-request" | "not-allowed" };

/**
 * Flow 7: a grown-up leaves the children's view with the family's PIN, which is checked here, never on
 * the device. A wrong one is counted on the PIN's key and the count kept however the request ends. A
 * right one deletes this view's keys and, in the same transaction, gives back the session this
 * browser held when the view opened, if its cookie still names it and it has not run out while put
 * away. Failing that, the parent who opened the view gets a shared session marked as the PIN's, as
 * before, so a view whose session has gone still lets a grown-up out with no code. Any other session
 * put away for this view goes, since nothing can give it back.
 */
export async function leaveKidView(
    config: AuthConfig,
    kid: KidSession,
    pin: unknown,
    device: string | null,
    session: string | null,
): Promise<Left> {
    if (kid.keys.some((key) => key.login)) return { error: "not-allowed" };
    if (typeof pin !== "string" || !PIN.test(pin)) return { error: "bad-request" };
    return withFamily({ family: kid.family.id }, async (tx): Promise<Left> => {
        const refused = await checkPin(config, tx, kid.family.id, pin);
        if (refused) return refused;
        if ((await openerOf(tx, kid)) === null) return { error: "not-allowed" };
        const ended = await endKids(tx, { ids: kid.keys.map((k) => k.id) });
        const endedView: Written[] = ended.length
            ? [
                  {
                      kid_id: null,
                      kind: "kid-session-ended",
                      data: {
                          view: kid.view,
                          keys: ended.map(({ kid: k, key }) => ({ kid: k, key })),
                          reason: "pin",
                      },
                      actor: kid.opener,
                  },
              ]
            : [];
        const back = session === null ? null : await restore(tx, session, kid.view);
        const others = await endPutAway(tx, kid.view);
        if (back) {
            await record(tx, kid.family.id, [
                ...endedView,
                {
                    kid_id: null,
                    kind: "session-changed",
                    data: { session: back.id, change: "restored" },
                    actor: kid.opener,
                },
                ...putAwayEnded(others, kid.opener),
            ]);
            return {
                me: await meIn(tx, kid.family.id, kid.opener, back),
                credential: session ?? "",
                restored: true,
            };
        }
        const opened = await openIn(tx, kid.family.id, kid.opener, {
            method: "pin",
            shared: true,
            device,
            held: null,
            pin: true,
            written: [...endedView, ...putAwayEnded(others, kid.opener)],
        });
        return { ...opened, restored: false };
    });
}

export type Joined =
    | { credential: string; keys: KidKey[] }
    | PinRefused
    | { error: "bad-request" | "not-allowed" | "not-found" }
    | { error: "no-consent"; kid: string };

/**
 * Flow 6: a grown-up adds another of the family's children to the children's view this browser holds,
 * with the family's PIN, so a child cannot add a sibling alone. The new key is in the same view and
 * under the parent who opened it, `kid-session-opened` records it, and the answer is the cookie's
 * credentials with the new one added, since the secrets of the keys already there are the browser's
 * alone. A child already in the view is left as they are.
 */
export async function addToKidView(
    config: AuthConfig,
    kid: KidSession,
    input: { pin: unknown; kid: unknown },
    device: string | null,
    cookie: string,
): Promise<Joined> {
    if (kid.keys.some((key) => key.login)) return { error: "not-allowed" };
    const { pin, kid: who } = input;
    if (typeof pin !== "string" || !PIN.test(pin) || typeof who !== "string")
        return { error: "bad-request" };
    return withFamily({ family: kid.family.id }, async (tx): Promise<Joined> => {
        const refused = await checkPin(config, tx, kid.family.id, pin);
        if (refused) return refused;
        const opener = await openerOf(tx, kid);
        if (opener === null) return { error: "not-allowed" };
        const live = new Set(kid.keys.map((k) => k.id));
        const kept = cookie
            .split(KIDS_JOIN)
            .filter((credential) => live.has(parseCredential(credential)?.id ?? ""));
        if (kid.keys.some((k) => k.kid_id === who))
            return { credential: kept.join(KIDS_JOIN), keys: kid.keys };
        if (kid.keys.length >= KIDS_MOST) return { error: "bad-request" };
        if (!(await kidsOf(tx, kid.family.id)).some((k) => k.id === who))
            return { error: "not-found" };
        if (!(await consented(tx, kid.family.id)).has(who))
            return { error: "no-consent", kid: who };
        const key = await issue(tx, kid.family.id, {
            kind: "kid-session",
            kid_id: who,
            user_id: opener,
            name: device,
            detail: { view: kid.view },
        });
        await record(tx, kid.family.id, [
            {
                kid_id: null,
                kind: "kid-session-opened",
                data: { view: kid.view, keys: [{ kid: who, key: key.id }] },
                actor: opener,
            },
        ]);
        const now = new Date().toISOString();
        return {
            credential: [...kept, key.credential].join(KIDS_JOIN),
            keys: [
                ...kid.keys,
                { id: key.id, kid_id: who, user_id: opener, view: kid.view, created_at: now },
            ],
        };
    });
}

/**
 * A parent ends every children's view open in the family, from the family's page, whichever browsers
 * hold them: each view's keys go and `kid-session-ended` is recorded for it, and what those browsers
 * had not sent is refused from then on.
 */
export async function endKidViews(
    adult: Adult,
): Promise<{ ended: number } | { error: "not-allowed" }> {
    if (!adult.parent) return { error: "not-allowed" };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const views = await kidViewsOf(tx);
        const written: Written[] = [];
        let n = 0;
        for (const v of views) {
            const ended = await endKids(tx, { view: v.view });
            if (!ended.length) continue;
            n++;
            written.push(
                {
                    kid_id: null,
                    kind: "kid-session-ended",
                    data: {
                        view: v.view,
                        keys: ended.map(({ kid, key }) => ({ kid, key })),
                        reason: "ended",
                    },
                    actor: adult.user,
                },
                ...putAwayEnded(await endPutAway(tx, v.view), adult.user),
            );
        }
        if (written.length) await record(tx, adult.family.id, written);
        return { ended: n };
    });
}

/**
 * Ends the children's view a browser held when a grown-up signs in on it (.docs/auth.md, flow 7). Its
 * cookie is read only to end it, and nothing it names is reached. The person who signed in is recorded
 * as ending it when they are a parent of that view's family, and nobody otherwise. A session put away
 * for the view goes with it: the one who signed in has replaced their own already, and another
 * parent's has nothing left to come back to.
 */
export async function endHeldKids(cookie: string | null, user: string): Promise<void> {
    const kid = await kidSessionFrom(cookie);
    if (!kid) return;
    await withFamily({ family: kid.family.id, user }, async (tx) => {
        const ended = await endKids(tx, { ids: kid.keys.map((k) => k.id) });
        if (!ended.length) return;
        const rows = (await rowsOf(tx, kid.family.id, user)).filter((m) => m.ended_at === null);
        const actor = isParent(rows) ? user : null;
        await record(tx, kid.family.id, [
            {
                kid_id: null,
                kind: "kid-session-ended",
                data: {
                    view: kid.view,
                    keys: ended.map(({ kid: k, key }) => ({ kid: k, key })),
                    reason: "sign-in",
                },
                actor,
            },
            ...putAwayEnded(await endPutAway(tx, kid.view), actor),
        ]);
    });
}
