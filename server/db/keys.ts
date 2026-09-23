// Every secret we keep the hash of. A key named by a credential (`<family>.<id>.<secret>`) is read
// inside `withFamily` for its family. Codes have no family and are reached only through the
// migration's security-definer functions. Expiry is a rule per kind in `EXPIRY`, so there is no
// `expires_at` to keep in step.

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { setScope, withFamily, type FamilyTx } from "./client";
import { keys, type Key } from "./schema";

export const KEY_KINDS = [
    "browser",
    "session",
    "shared-session",
    "kid-session",
    "pin",
    "kid-pin",
    "kid-attempt",
    "sign-in",
    "confirm",
    "invite",
] as const;
export type KeyKind = (typeof KEY_KINDS)[number];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Clock = Pick<Key, "created_at" | "seen_at">;

const after = (instant: string, ms: number): Date => new Date(Date.parse(instant) + ms);
const earliest = (a: Date, b: Date): Date => (a < b ? a : b);

/**
 * When a key stops working, per kind. A complete record over the kinds, so a new kind cannot be added
 * without deciding how long it lives. The numbers are the owner's, and none of them is measured.
 */
export const EXPIRY: Record<KeyKind, (k: Clock) => Date> = {
    browser: (k) => after(k.seen_at ?? k.created_at, 90 * DAY),
    "sign-in": (k) => after(k.created_at, 10 * MINUTE),
    confirm: (k) => after(k.created_at, 10 * MINUTE),
    invite: (k) => after(k.created_at, 7 * DAY),
    session: (k) =>
        earliest(after(k.seen_at ?? k.created_at, 30 * DAY), after(k.created_at, 90 * DAY)),
    "shared-session": (k) =>
        earliest(after(k.seen_at ?? k.created_at, 30 * MINUTE), after(k.created_at, 12 * HOUR)),
    // A children's view lasts as a parent's own session does, since a parent opened it.
    "kid-session": (k) =>
        earliest(after(k.seen_at ?? k.created_at, 30 * DAY), after(k.created_at, 90 * DAY)),
    // A family's PIN lasts until a parent sets another, or the family closes.
    pin: () => new Date(8_640_000_000_000_000),
    "kid-pin": () => new Date(8_640_000_000_000_000),
    "kid-attempt": (k) => after(k.created_at, DAY),
};

export const isLive = (kind: KeyKind, clock: Clock, now: Date = new Date()): boolean =>
    EXPIRY[kind](clock) > now;

/**
 * How old `seen_at` must be before a use moves it (.docs/auth.md, "An adult's session"): a day for a
 * session or a children's view, whose idle limit is thirty days, so an ordinary day costs one write,
 * and a minute for a shared session, whose idle limit is thirty minutes. A PIN's `seen_at` is its last
 * wrong try, which `pinTried` writes.
 */
const SEEN_STEP: Record<KeyKind, number> = {
    browser: DAY,
    session: DAY,
    "shared-session": MINUTE,
    "kid-session": DAY,
    pin: 0,
    "kid-pin": 0,
    "kid-attempt": 0,
    "sign-in": 0,
    confirm: 0,
    invite: 0,
};

type Code = "sign-in" | "confirm" | "invite";

/** The earliest `created_at` a code of this kind can have and still be alive. */
export function notBefore(kind: Code, now: Date = new Date()): Date {
    const life = EXPIRY[kind]({ created_at: new Date(0).toISOString(), seen_at: null }).getTime();
    return new Date(now.getTime() - life);
}

export const sha256 = (secret: string): string =>
    createHash("sha256").update(secret, "utf8").digest("hex");

/** A new secret: 32 random bytes, base64url. */
export const newSecret = (): string => randomBytes(32).toString("base64url");

/** Two hex digests compared in constant time. */
export function sameHash(a: string, b: string): boolean {
    const x = Buffer.from(a, "hex");
    const y = Buffer.from(b, "hex");
    return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/** The key the server keys hashes under on a developer's computer, where `AUTH_PEPPER` is not set. */
export const LOCAL_PEPPER = "lumischool-local-pepper";

/**
 * A family PIN's hash: keyed under the pepper, which is never in the database, so a copy of the table
 * cannot be turned back into ten thousand PINs, and naming the family, so two families' PINs never
 * share a hash (.docs/auth.md, flow 7).
 */
export const pinHash = (pepper: string, family: string, pin: string): string =>
    createHmac("sha256", pepper).update(`pin:${family}:${pin}`, "utf8").digest("hex");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `<family>.<id>.<secret>`, or null when it is not that shape. */
export function parseCredential(
    credential: string,
): { family: string; id: string; secret: string } | null {
    const [family, id, secret, ...rest] = credential.split(".");
    if (rest.length || !family || !id || !secret || !UUID.test(family) || !UUID.test(id))
        return null;
    return { family, id, secret };
}

export const credentialOf = (family: string, id: string, secret: string): string =>
    `${family}.${id}.${secret}`;

export interface Verified extends Pick<Key, "id" | "user_id" | "kid_id" | "created_at" | "detail"> {
    family_id: string;
    kind: KeyKind;
    /** Whether this use moved `seen_at`, which is when a session's cookie is sent again. */
    seen: boolean;
}

const isKind = (kind: string): kind is KeyKind => KEY_KINDS.some((k) => k === kind);

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Whether a use now should move a key's `seen_at`, by its kind's step. */
const dueToSee = (kind: KeyKind, seen_at: string | null, now: Date): boolean =>
    seen_at === null || now.getTime() - Date.parse(seen_at) >= SEEN_STEP[kind];

/**
 * The children's view a session was put away for, from its `detail`, or null for a session in use.
 * A session is put away, not deleted, while a view is open on its browser, so that the family's PIN
 * can give it back (.docs/auth.md, flow 5). The mark is in `detail` beside the PIN's, rather than a
 * kind of its own or a column, because it changes nothing about how long the key lives or who ends
 * it: `EXPIRY` reads the kind, and sign-out everywhere, removal and a sign-in that replaces what the
 * browser held delete a put-away session with the rest by the kind they already look for.
 */
export const putAwayFor = (detail: unknown): string | null =>
    isRecord(detail) ? text(detail.putAway) : null;

/**
 * Checks a session credential inside its own family: the key must exist under that family's policy, be
 * one of `kinds`, match the secret, and be alive by its kind's rule. On success its `seen_at` moves
 * when it is older than the kind's step. A key put away for a children's view is refused as
 * "put-away", whatever else is true of it, and its `seen_at` does not move: this is the one read every
 * adult route goes through, so the refusal here is the server's on every one of them.
 */
export async function verify(
    credential: string,
    kinds: readonly KeyKind[],
    allowLocked = false,
): Promise<Verified | "put-away" | null> {
    const parsed = parseCredential(credential);
    if (!parsed) return null;
    return withFamily({ family: parsed.family }, async (tx) => {
        const [row] = await tx
            .select()
            .from(keys)
            .where(and(eq(keys.id, parsed.id), inArray(keys.kind, [...kinds])));
        if (!row || !sameHash(sha256(parsed.secret), row.hash)) return null;
        const kind = row.kind;
        if (!isKind(kind) || !kinds.includes(kind) || !isLive(kind, row)) return null;
        if (!allowLocked && putAwayFor(row.detail) !== null) return "put-away";
        const now = new Date();
        const seen = dueToSee(kind, row.seen_at, now);
        if (seen)
            await tx.update(keys).set({ seen_at: now.toISOString() }).where(eq(keys.id, row.id));
        return {
            family_id: parsed.family,
            id: row.id,
            kind,
            user_id: row.user_id,
            kid_id: row.kid_id,
            created_at: row.created_at,
            detail: row.detail,
            seen,
        };
    });
}

/**
 * A session a browser already holds: the family its credential names, its id, and the hash of its
 * secret, or null for a session the entry point has verified already.
 */
export interface Held {
    family: string;
    id: string;
    hash: string | null;
}

/**
 * Ends a session a person held, inside the transaction that opens their new one (.docs/auth.md, "An
 * adult's session"), when it is theirs. The key is looked for in its own family, which need not be the
 * transaction's, and the transaction is back in `scope` before this returns.
 */
export async function endHeld(
    tx: FamilyTx,
    held: Held,
    scope: { family: string; user: string },
): Promise<boolean> {
    await setScope(tx, { family: held.family, user: scope.user });
    const where = [
        eq(keys.id, held.id),
        eq(keys.user_id, scope.user),
        inArray(keys.kind, ["session", "shared-session"]),
    ];
    if (held.hash !== null) where.push(eq(keys.hash, held.hash));
    const gone = await tx
        .delete(keys)
        .where(and(...where))
        .returning({ id: keys.id });
    await setScope(tx, scope);
    return gone.length === 1;
}

/**
 * Makes a key inside the current family and returns its credential. The secret leaves this function
 * once, in the credential, and only its hash is kept. `created_at` is given only when a session carries
 * another's (switching family is not a fresh sign-in).
 */
export async function issue(
    tx: FamilyTx,
    family: string,
    key: {
        kind: Exclude<KeyKind, "sign-in" | "pin">;
        id?: string;
        user_id?: string | null;
        kid_id?: string | null;
        name?: string | null;
        email?: string | null;
        detail?: Record<string, unknown>;
        created_at?: string;
        seen_at?: string;
    },
): Promise<{ id: string; credential: string }> {
    const secret = newSecret();
    const [row] = await tx
        .insert(keys)
        .values({
            ...(key.id ? { id: key.id } : {}),
            family_id: family,
            kind: key.kind,
            hash: sha256(secret),
            user_id: key.user_id ?? null,
            kid_id: key.kid_id ?? null,
            name: key.name ?? null,
            email: key.email ?? null,
            detail: key.detail ?? {},
            ...(key.created_at ? { created_at: key.created_at } : {}),
            ...(key.seen_at ? { seen_at: key.seen_at } : {}),
        })
        .returning({ id: keys.id });
    if (!row) throw new Error("issue: the insert returned no row");
    return { id: row.id, credential: credentialOf(family, row.id, secret) };
}

/**
 * Puts a session away for a children's view opened on its browser: the key stays, marked with the
 * view in `detail`, and `seen_at` is left as it was, so it runs out exactly as it would have.
 */
export async function putAway(tx: FamilyTx, id: string, view: string): Promise<boolean> {
    const marked = await tx
        .update(keys)
        .set({ detail: sql`${keys.detail} || ${JSON.stringify({ putAway: view })}::jsonb` })
        .where(and(eq(keys.id, id), inArray(keys.kind, ["session", "shared-session"])))
        .returning({ id: keys.id });
    return marked.length === 1;
}

/**
 * Gives a put-away session back: the browser's credential must name a live session key in this
 * family whose secret matches and which was put away for this very view, as `verify` would check it
 * but for the mark. The mark comes off and `seen_at` moves, since the session is in use again, and
 * the key is marked as the PIN's from then on, so it is never a fresh sign-in whatever its
 * `created_at`: a four-digit PIN says nothing about who typed it (.docs/auth.md, flow 7). Null when
 * there is no such key, which is when the view was copied to another browser or the session has run
 * out while it was put away.
 */
export async function restore(
    tx: FamilyTx,
    credential: string,
    view: string,
): Promise<(Pick<Key, "id" | "created_at"> & { kind: "session" | "shared-session" }) | null> {
    const parsed = parseCredential(credential);
    if (!parsed) return null;
    const [row] = await tx
        .select()
        .from(keys)
        .where(and(eq(keys.id, parsed.id), inArray(keys.kind, ["session", "shared-session"])));
    if (!row || !sameHash(sha256(parsed.secret), row.hash)) return null;
    const kind = row.kind === "shared-session" ? "shared-session" : "session";
    if (!isLive(kind, row) || putAwayFor(row.detail) !== view) return null;
    await tx
        .update(keys)
        .set({
            detail: sql`(${keys.detail} - 'putAway') || '{"pin": true}'::jsonb`,
            seen_at: new Date().toISOString(),
        })
        .where(eq(keys.id, row.id));
    return { id: row.id, kind, created_at: row.created_at };
}

/**
 * Ends the sessions put away for a children's view, when the view ends without the PIN on its own
 * browser: nothing could give them back. Says which went, for the record.
 */
export async function endPutAway(tx: FamilyTx, view: string): Promise<string[]> {
    const gone = await tx
        .delete(keys)
        .where(
            and(
                inArray(keys.kind, ["session", "shared-session"]),
                sql`${keys.detail} ->> 'putAway' = ${view}`,
            ),
        )
        .returning({ id: keys.id });
    return gone.map((r) => r.id);
}

/**
 * A person's sessions in the current family, alive by their kind's rule, oldest first, for the account
 * page (.docs/auth.md, flow 10). Never a hash: what leaves here is what a person may see of their own
 * sessions, and which browser each is.
 */
export async function sessionsOf(
    tx: FamilyTx,
    user: string,
): Promise<
    (Pick<Key, "id" | "name" | "created_at" | "seen_at"> & {
        kind: "session" | "shared-session";
        putAway: boolean;
        byPin: boolean;
    })[]
> {
    const rows = await tx
        .select({
            id: keys.id,
            kind: keys.kind,
            name: keys.name,
            created_at: keys.created_at,
            seen_at: keys.seen_at,
            detail: keys.detail,
        })
        .from(keys)
        .where(and(eq(keys.user_id, user), inArray(keys.kind, ["session", "shared-session"])));
    const now = new Date();
    return rows
        .flatMap((r) => {
            const kind: "session" | "shared-session" =
                r.kind === "shared-session" ? "shared-session" : "session";
            return isLive(kind, r, now)
                ? [
                      {
                          id: r.id,
                          kind,
                          name: r.name,
                          created_at: r.created_at,
                          seen_at: r.seen_at,
                          putAway: putAwayFor(r.detail) !== null,
                          byPin: isRecord(r.detail) && r.detail.pin === true,
                      },
                  ]
                : [];
        })
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Ends one of a person's own sessions in the current family, and says whether there was one. */
export async function endOwnSession(tx: FamilyTx, user: string, id: string): Promise<boolean> {
    const gone = await tx
        .delete(keys)
        .where(
            and(
                eq(keys.id, id),
                eq(keys.user_id, user),
                inArray(keys.kind, ["session", "shared-session"]),
            ),
        )
        .returning({ id: keys.id });
    return gone.length === 1;
}

/** Ends one session. */
export async function endSession(tx: FamilyTx, id: string): Promise<boolean> {
    const gone = await tx
        .delete(keys)
        .where(and(eq(keys.id, id), inArray(keys.kind, ["session", "shared-session"])))
        .returning({ id: keys.id });
    return gone.length === 1;
}

/** Ends every session a person has in the current family, and says how many there were. */
export async function endSessions(tx: FamilyTx, user: string): Promise<number> {
    const gone = await tx
        .delete(keys)
        .where(and(eq(keys.user_id, user), inArray(keys.kind, ["session", "shared-session"])))
        .returning({ id: keys.id });
    return gone.length;
}

/** The view a children's-view key belongs to, from its `detail`. */
const viewOf = (detail: unknown): string | null => (isRecord(detail) ? text(detail.view) : null);

/** One child's key in a children's view, as the entry point found it. */
export interface KidKey {
    id: string;
    kid_id: string;
    /** The parent who opened the view. */
    user_id: string;
    view: string;
    created_at: string;
    login?: boolean;
}

/**
 * Checks a children's view's credentials inside their one family (.docs/auth.md, flow 5): each must be
 * a live `kid-session` key there whose secret matches. A key that has ended is left out and the others
 * go on working, so a view loses one child when that child's key goes. `seen` is whether this use moved
 * any key's `seen_at`, which is when the view's cookie is sent again.
 */
export async function verifyKids(
    credentials: readonly string[],
): Promise<{ family_id: string; keys: KidKey[]; seen: boolean } | null> {
    const parsed = credentials.map(parseCredential);
    const family = parsed[0]?.family;
    if (!family || parsed.some((p) => p === null || p.family !== family)) return null;
    const ids = parsed.flatMap((p) => (p ? [p.id] : []));
    return withFamily({ family }, async (tx) => {
        const rows = await tx
            .select()
            .from(keys)
            .where(and(inArray(keys.id, ids), eq(keys.kind, "kid-session")));
        const now = new Date();
        const live: KidKey[] = [];
        const due: string[] = [];
        for (const p of parsed) {
            const row = p ? rows.find((r) => r.id === p.id) : undefined;
            const view = row ? viewOf(row.detail) : null;
            if (!p || !row || !row.kid_id || !row.user_id || !view) continue;
            if (!sameHash(sha256(p.secret), row.hash) || !isLive("kid-session", row, now)) continue;
            live.push({
                id: row.id,
                kid_id: row.kid_id,
                user_id: row.user_id,
                view,
                created_at: row.created_at,
                login: isRecord(row.detail) && row.detail.login === true,
            });
            if (dueToSee("kid-session", row.seen_at, now)) due.push(row.id);
        }
        if (!live.length) return null;
        if (due.length)
            await tx.update(keys).set({ seen_at: now.toISOString() }).where(inArray(keys.id, due));
        return { family_id: family, keys: live, seen: due.length > 0 };
    });
}

/**
 * Opens a children's view inside the current family: one `kid-session` key per child, sharing one view
 * id in `detail`, each naming the child and the parent who opened it. The credentials are the only
 * time the secrets leave us.
 */
export async function openKids(
    tx: FamilyTx,
    family: string,
    o: { user: string; name: string | null; kids: readonly string[]; login?: boolean },
): Promise<{ view: string; keys: { kid: string; key: string; credential: string }[] }> {
    const view = randomUUID();
    const out: { kid: string; key: string; credential: string }[] = [];
    for (const kid of o.kids) {
        const key = await issue(tx, family, {
            kind: "kid-session",
            kid_id: kid,
            user_id: o.user,
            name: o.name,
            detail: { view, ...(o.login ? { login: true } : {}) },
        });
        out.push({ kid, key: key.id, credential: key.credential });
    }
    return { view, keys: out };
}

/** The children's views open in the current family, one per view, oldest first, never with a hash. */
export async function kidViewsOf(tx: FamilyTx): Promise<
    {
        view: string;
        name: string | null;
        user_id: string;
        kids: string[];
        created_at: string;
        seen_at: string | null;
    }[]
> {
    const rows = await tx
        .select({
            kid_id: keys.kid_id,
            user_id: keys.user_id,
            name: keys.name,
            detail: keys.detail,
            created_at: keys.created_at,
            seen_at: keys.seen_at,
        })
        .from(keys)
        .where(eq(keys.kind, "kid-session"));
    const views = new Map<
        string,
        {
            view: string;
            name: string | null;
            user_id: string;
            kids: string[];
            created_at: string;
            seen_at: string | null;
        }
    >();
    const now = new Date();
    for (const r of rows) {
        const view = viewOf(r.detail);
        if (!view || !r.kid_id || !r.user_id || !isLive("kid-session", r, now)) continue;
        const had = views.get(view);
        if (!had) {
            views.set(view, {
                view,
                name: r.name,
                user_id: r.user_id,
                kids: [r.kid_id],
                created_at: r.created_at,
                seen_at: r.seen_at,
            });
            continue;
        }
        had.kids.push(r.kid_id);
        if (r.created_at < had.created_at) had.created_at = r.created_at;
        if (r.seen_at !== null && (had.seen_at === null || r.seen_at > had.seen_at))
            had.seen_at = r.seen_at;
    }
    return [...views.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Ends children's-view keys in the current family, by view or by id, and says which went. */
export async function endKids(
    tx: FamilyTx,
    which: { view: string } | { ids: readonly string[] },
): Promise<{ kid: string; key: string; view: string }[]> {
    if ("ids" in which && which.ids.length === 0) return [];
    const gone = await tx
        .delete(keys)
        .where(
            and(
                eq(keys.kind, "kid-session"),
                "view" in which
                    ? sql`${keys.detail} ->> 'view' = ${which.view}`
                    : inArray(keys.id, [...which.ids]),
            ),
        )
        .returning({ id: keys.id, kid_id: keys.kid_id, detail: keys.detail });
    return gone.flatMap((r) => {
        const view = viewOf(r.detail);
        return r.kid_id && view ? [{ kid: r.kid_id, key: r.id, view }] : [];
    });
}

/** Whether the current family has a PIN. */
export async function hasPin(tx: FamilyTx): Promise<boolean> {
    const [row] = await tx.select({ id: keys.id }).from(keys).where(eq(keys.kind, "pin"));
    return row !== undefined;
}

/** The current family's PIN key, locked until the transaction ends, so two tries at once count in turn. */
export async function pinFor(
    tx: FamilyTx,
): Promise<Pick<Key, "id" | "hash" | "attempts" | "seen_at"> | null> {
    const [row] = await tx
        .select({ id: keys.id, hash: keys.hash, attempts: keys.attempts, seen_at: keys.seen_at })
        .from(keys)
        .where(eq(keys.kind, "pin"))
        .for("update");
    return row ?? null;
}

/** Sets the current family's PIN, replacing any before it, with no wrong tries counted. */
export async function setPin(
    tx: FamilyTx,
    family: string,
    pin: { user: string; hash: string },
): Promise<void> {
    await tx.delete(keys).where(eq(keys.kind, "pin"));
    await tx
        .insert(keys)
        .values({ family_id: family, kind: "pin", hash: pin.hash, user_id: pin.user });
}

/** Counts a try at the PIN: a right one clears the count, and a wrong one adds to it and says when. */
export async function pinTried(tx: FamilyTx, id: string, right: boolean): Promise<void> {
    await tx
        .update(keys)
        .set(
            right
                ? { attempts: 0 }
                : { attempts: sql`${keys.attempts} + 1`, seen_at: new Date().toISOString() },
        )
        .where(and(eq(keys.id, id), eq(keys.kind, "pin")));
}

/**
 * Makes a sign-in or confirm code, held by the browser's pending cookie (`hash` is the cookie's
 * hash) and completed by any of the hashes in `accept`. False when a limit refused, which the caller
 * must not reveal.
 */
export async function issueCode(
    kind: "sign-in" | "confirm",
    code: {
        hash: string;
        email: string;
        ip: string | null;
        user_id?: string | null;
        accept: string[];
        /** What the step after the code needs, such as whether the device is shared. */
        detail?: Record<string, unknown>;
    },
): Promise<boolean> {
    return withFamily({ family: null }, async (tx) => {
        const detail = JSON.stringify({ ...code.detail, accept: code.accept });
        const rows = await tx.execute(
            sql`select key_issue(${kind}, ${code.hash}, ${code.email}, ${code.ip}, ${code.user_id ?? null}::uuid, ${detail}::jsonb) as ok`,
        );
        const first: unknown = rows[0];
        return isRecord(first) && first.ok === true;
    });
}

export type Proof =
    | { outcome: "unknown" | "expired" | "dead" | "unproven" }
    | { outcome: "wrong"; attemptsLeft: number }
    | {
          outcome: "right";
          id: string;
          email: string | null;
          user_id: string | null;
          detail: unknown;
      };

/**
 * A guess at a sign-in or confirm code, found by the pending cookie's hash. A right guess proves the
 * code and keeps it until `useCode` takes it; a wrong one is counted, and five make it dead. A null
 * attempt only asks whether the code is proven already, and counts nothing.
 */
export async function prove(
    kind: "sign-in" | "confirm",
    hash: string,
    attempt: string | null,
): Promise<Proof> {
    return withFamily({ family: null }, async (tx) => {
        const rows = await tx.execute(
            sql`select * from key_prove(${hash}, ${kind}, ${attempt}, ${notBefore(kind).toISOString()}::timestamptz)`,
        );
        const r: unknown = rows[0];
        if (!isRecord(r)) return { outcome: "unknown" };
        const id = text(r.key_id);
        if (r.outcome === "right" && id)
            return {
                outcome: "right",
                id,
                email: text(r.key_email),
                user_id: text(r.key_user_id),
                detail: r.key_detail,
            };
        if (r.outcome === "wrong")
            return {
                outcome: "wrong",
                attemptsLeft: typeof r.attempts_left === "number" ? r.attempts_left : 0,
            };
        if (r.outcome === "expired" || r.outcome === "dead" || r.outcome === "unproven")
            return { outcome: r.outcome };
        return { outcome: "unknown" };
    });
}

/**
 * Takes a proven code, once, inside the transaction that does what the code was for, so a step that
 * fails leaves the code to be used again: it is deleted, and the event the caller writes is its record.
 */
export async function useCode(
    tx: FamilyTx,
    kind: "sign-in" | "confirm",
    hash: string,
): Promise<{ id: string; email: string | null; user_id: string | null; detail: unknown } | null> {
    const rows = await tx.execute(
        sql`select * from key_use(${hash}, ${kind}, ${notBefore(kind).toISOString()}::timestamptz)`,
    );
    const r: unknown = rows[0];
    if (!isRecord(r)) return null;
    const id = text(r.key_id);
    return id
        ? { id, email: text(r.key_email), user_id: text(r.key_user_id), detail: r.key_detail }
        : null;
}

async function loginIn(tx: FamilyTx, email: string): Promise<string | null> {
    const rows = await tx.execute(sql`select login_by_address(${email}) as id`);
    const r: unknown = rows[0];
    return isRecord(r) ? text(r.id) : null;
}

/** The login for an address, before any family is known, or null. */
export async function loginByAddress(email: string): Promise<string | null> {
    return withFamily({ family: null }, (tx) => loginIn(tx, email));
}

/**
 * The login for an address, read once the transaction holds the address's lock, which it keeps until
 * it ends. Two codes for one new address used at the same moment then make one login: the second
 * waits, and finds the first's. The lock and the read are two statements because a statement sees only
 * what was committed when it began.
 */
export async function lockedLogin(tx: FamilyTx, email: string): Promise<string | null> {
    const lock = `login:${email.trim().toLowerCase()}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lock}, 0))`);
    return loginIn(tx, email);
}

/** The families the person `app.user` names can choose between, inside a transaction that set them. */
export async function familiesIn(
    tx: FamilyTx,
): Promise<{ family_id: string; name: string; kid_id: string | null }[]> {
    const rows = await tx.execute(sql`select * from my_families()`);
    const out: { family_id: string; name: string; kid_id: string | null }[] = [];
    for (const r of rows) {
        if (!isRecord(r)) continue;
        const family = text(r.family_id);
        const name = text(r.family_name);
        if (family && name) out.push({ family_id: family, name, kid_id: text(r.kid_id) });
    }
    return out;
}

/** The families a signed-in person can choose between. */
export async function myFamilies(
    user: string,
): Promise<{ family_id: string; name: string; kid_id: string | null }[]> {
    return withFamily({ family: null, user }, familiesIn);
}

/** Bind newly issued logins to a revocable browser key. */
export async function bindToBrowser(
    family: string,
    ids: readonly string[],
    browser: string,
): Promise<void> {
    const parsed = parseCredential(browser);
    if (!ids.length || !parsed) return;
    await withFamily({ family }, async (tx) => {
        await tx
            .update(keys)
            .set({
                detail: sql`${keys.detail} || ${JSON.stringify({ browser: sha256(browser), browserFamily: parsed.family, browserId: parsed.id })}::jsonb`,
            })
            .where(and(inArray(keys.id, [...ids]), sql`not (${keys.detail} ? 'browser')`));
    });
}

export async function browserAllows(
    family: string,
    ids: readonly string[],
    browser: string | null,
): Promise<boolean> {
    const rows = await withFamily({ family }, (tx) =>
        tx
            .select({ detail: keys.detail })
            .from(keys)
            .where(inArray(keys.id, [...ids])),
    );
    const bindings = rows.flatMap((r) =>
        isRecord(r.detail) && typeof r.detail.browser === "string" ? [r.detail.browser] : [],
    );
    if (rows.length !== ids.length || bindings.length !== ids.length) return false;
    if (!browser || bindings.some((b) => !sameHash(b, sha256(browser)))) return false;
    const held = await verify(browser, ["browser"]);
    return !!held && held !== "put-away";
}

export async function endBrowser(credential: string): Promise<void> {
    const held = await verify(credential, ["browser"]);
    if (!held || held === "put-away") return;
    await withFamily({ family: held.family_id }, async (tx) => {
        await tx.delete(keys).where(and(eq(keys.id, held.id), eq(keys.kind, "browser")));
    });
}

/** Resolve browser revocation before showing account lists, without holding nested transactions. */
export async function visibleBrowserSessions(
    family: string,
): Promise<{ sessions: Set<string>; views: Set<string> }> {
    const rows = await withFamily({ family }, (tx) =>
        tx
            .select({ id: keys.id, detail: keys.detail })
            .from(keys)
            .where(inArray(keys.kind, ["session", "shared-session", "kid-session"])),
    );
    const groups = new Map<string, Set<string>>();
    for (const row of rows) {
        if (!isRecord(row.detail)) continue;
        const { browserFamily, browserId } = row.detail;
        if (
            typeof browserFamily !== "string" ||
            typeof browserId !== "string" ||
            !UUID.test(browserFamily) ||
            !UUID.test(browserId)
        )
            continue;
        const ids = groups.get(browserFamily) ?? new Set<string>();
        ids.add(browserId);
        groups.set(browserFamily, ids);
    }
    const live = new Set<string>();
    for (const [owner, ids] of groups) {
        const browsers = await withFamily({ family: owner }, (tx) =>
            tx
                .select()
                .from(keys)
                .where(and(eq(keys.kind, "browser"), inArray(keys.id, [...ids]))),
        );
        for (const browser of browsers)
            if (isLive("browser", browser)) live.add(`${owner}:${browser.id}`);
    }
    const sessions = new Set<string>(),
        views = new Set<string>();
    for (const row of rows) {
        if (
            !isRecord(row.detail) ||
            typeof row.detail.browserFamily !== "string" ||
            typeof row.detail.browserId !== "string" ||
            !live.has(`${row.detail.browserFamily}:${row.detail.browserId}`)
        )
            continue;
        sessions.add(row.id);
        if (typeof row.detail.view === "string") views.add(row.detail.view);
    }
    return { sessions, views };
}
