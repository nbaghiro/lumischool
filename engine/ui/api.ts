// The grown-ups' way to the API (.docs/api.md): who is signed in on this browser, the family, its
// children and the children's views, and reading every answer back into the shapes the contract
// names. Every reader returns null when nobody is signed in, without asking the network, so a page
// that can work without the API still does. The session is a cookie script never reads, so this
// browser also keeps a hint that it signed in, and a page asks the API only when the hint is there.

import type {
    KidLogins,
    KidSessions,
    KidSessionView,
    Sessions,
    SessionView,
    FamilyChoice,
    FamilyView,
    Me,
    Outbox,
    PackView,
    Person,
    Verified,
} from "../../server/api";
import type { Content, Family, Kid, Member } from "../../server/db/schema";
import type { Draft, Envelope, EventKind } from "../answer";
import type { PackLesson, PackScene } from "../pack";
import {
    call as wireCall,
    list,
    num,
    obj,
    readEnvelope,
    readKid,
    str,
    strOrNull,
    unreadable,
    type Answer,
    type Failure,
} from "./wire";
import { kidCredential, keepKidCredential } from "./kid-session";

const call = (method: "GET" | "POST", path: string, body?: unknown): Promise<Answer> => {
    const credential = kidCredential();
    return wireCall(method, path, body, credential === null ? {} : { "x-kid-session": credential });
};

const readFamily = (v: unknown): Family | null =>
    obj(v) && str(v.id) && str(v.name) && str(v.time_zone)
        ? { id: v.id, name: v.name, time_zone: v.time_zone }
        : null;

const readMember = (v: unknown): Member | null =>
    obj(v) &&
    str(v.id) &&
    str(v.user_id) &&
    str(v.family_id) &&
    strOrNull(v.kid_id) &&
    strOrNull(v.from_day) &&
    strOrNull(v.to_day) &&
    strOrNull(v.ended_at)
        ? {
              id: v.id,
              user_id: v.user_id,
              family_id: v.family_id,
              kid_id: v.kid_id,
              from_day: v.from_day,
              to_day: v.to_day,
              ended_at: v.ended_at,
          }
        : null;

const readPerson = (v: unknown): Person | null =>
    obj(v) && str(v.id) && str(v.email) && strOrNull(v.name) && obj(v.settings)
        ? { id: v.id, email: v.email, name: v.name, settings: v.settings }
        : null;

const readChoice = (v: unknown): FamilyChoice | null =>
    obj(v) && str(v.family_id) && str(v.name) && strOrNull(v.kid_id)
        ? { family_id: v.family_id, name: v.name, kid_id: v.kid_id }
        : null;

const CONTENT_KINDS: readonly Content["kind"][] = [
    "item",
    "lesson",
    "define",
    "activity",
    "track",
    "pack",
];
const isContentKind = (v: unknown): v is Content["kind"] => CONTENT_KINDS.some((k) => k === v);

const readContent = (v: unknown): Content | null =>
    obj(v) &&
    str(v.id) &&
    strOrNull(v.family_id) &&
    str(v.body) &&
    str(v.hash) &&
    str(v.name) &&
    isContentKind(v.kind)
        ? {
              id: v.id,
              family_id: v.family_id,
              body: v.body,
              hash: v.hash,
              name: v.name,
              kind: v.kind,
          }
        : null;

function readMe(v: unknown): Me | null {
    if (!obj(v)) return null;
    const user = readPerson(v.user);
    const family = readFamily(v.family);
    const members = list(v.members, readMember);
    const families = list(v.families, readChoice);
    const s = v.session;
    if (!user || !family || !members || !families) return null;
    if (!obj(s) || !str(s.id) || !str(s.kind) || !str(s.created_at)) return null;
    return {
        user,
        family,
        members,
        families,
        session: { id: s.id, kind: s.kind, created_at: s.created_at },
    };
}

const HINT = "lumischool.signed-in";

/** What this browser remembers of a sign-in, which is only enough to know to ask. */
interface Hint {
    email: string;
    name: string | null;
    family: string;
}

function storage(): Storage | null {
    try {
        return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
        return null;
    }
}

export function signedIn(): Hint | null {
    try {
        const raw: unknown = JSON.parse(storage()?.getItem(HINT) ?? "null");
        return obj(raw) && str(raw.email) && strOrNull(raw.name) && str(raw.family)
            ? { email: raw.email, name: raw.name, family: raw.family }
            : null;
    } catch {
        return null;
    }
}

function remember(me: Me): void {
    const hint: Hint = { email: me.user.email, name: me.user.name, family: me.family.name };
    try {
        storage()?.setItem(HINT, JSON.stringify(hint));
    } catch {
        // storage is off, so every visit asks
    }
}

function forget(): void {
    try {
        storage()?.removeItem(HINT);
    } catch {
        // storage is off, so there is nothing to forget
    }
}

/** A refusal, after forgetting the sign-in when the refusal is that there is none. */
function refused(f: Failure): Failure {
    if (f.error === "signed-out") forget();
    return f;
}

/**
 * The signed-in person, or null. With no hint this asks nothing; with one it asks, and a session that
 * has ended forgets the hint. `ask` asks whatever the hint says and answers with what went wrong,
 * for a screen served only because a session cookie came with the request: the hint is kept per
 * browser and per origin and can be cleared, and the API's answer to a stale cookie clears it.
 */
export function me(): Promise<Me | null>;
export function me(o: { ask: true }): Promise<Me | Failure>;
export async function me(o: { ask?: true } = {}): Promise<Me | Failure | null> {
    if (!o.ask && !signedIn()) return null;
    const a = await call("GET", "/api/me");
    if (!a.ok) {
        refused(a.failure);
        return o.ask ? a.failure : null;
    }
    const m = readMe(a.body);
    if (m) remember(m);
    return m ?? (o.ask ? unreadable(a.status) : null);
}

function signedInWith(a: Answer): { me: Me } | Failure {
    if (!a.ok) return a.failure;
    const m = obj(a.body) ? readMe(a.body.me) : null;
    if (!m) return unreadable(a.status);
    remember(m);
    keepKidCredential("");
    return { me: m };
}

/** Asks for a code. `start` carries a new family's answers on it (flow 1). */
export async function startEmail(
    email: string,
    o: { shared?: boolean; start?: { name: string; family: string; timeZone: string } } = {},
): Promise<true | Failure> {
    const body: Record<string, unknown> = { email };
    if (o.shared) body.shared = true;
    if (o.start) body.start = o.start;
    const a = await call("POST", "/api/auth/email/start", body);
    return a.ok ? true : a.failure;
}

export async function verifyCode(code: string): Promise<Verified | Failure> {
    const a = await call("POST", "/api/auth/email/verify", { code });
    if (!a.ok) return a.failure;
    if (obj(a.body) && a.body.start === true) return { start: true };
    const choose = obj(a.body) ? list(a.body.choose, readChoice) : null;
    if (choose) return { choose };
    return signedInWith(a);
}

export const chooseFamily = async (family_id: string): Promise<{ me: Me } | Failure> =>
    signedInWith(await call("POST", "/api/auth/email/choose", { family_id }));

export const startFamily = async (start: {
    name: string;
    family: string;
    timeZone: string;
}): Promise<{ me: Me } | Failure> =>
    signedInWith(await call("POST", "/api/auth/email/choose", { start }));

export const switchFamily = async (family_id: string): Promise<{ me: Me } | Failure> =>
    signedInWith(await call("POST", "/api/auth/switch", { family_id }));

/** Signs out, and forgets the sign-in only once the API has said the session is over. */
export async function signOut(everywhere = false): Promise<true | Failure> {
    const a = await call("POST", "/api/auth/sign-out", everywhere ? { everywhere } : {});
    if (!a.ok && a.failure.error !== "signed-out") return a.failure;
    forget();
    return true;
}

/**
 * The family's rows, or null. With no hint this asks nothing, as `me` does; `ask` asks whatever the
 * hint says and answers with what went wrong, for a screen served only because a session cookie came
 * with the request.
 */
export function familyRows(): Promise<FamilyView | null>;
export function familyRows(o: { ask: true }): Promise<FamilyView | Failure>;
export async function familyRows(o: { ask?: true } = {}): Promise<FamilyView | Failure | null> {
    if (!o.ask && !signedIn()) return null;
    const a = await call("GET", "/api/family");
    if (!a.ok) {
        refused(a.failure);
        return o.ask ? a.failure : null;
    }
    const family = obj(a.body) ? readFamily(a.body.family) : null;
    const kids = obj(a.body) ? list(a.body.kids, readKid) : null;
    const members = obj(a.body) ? list(a.body.members, readMember) : null;
    const users = obj(a.body) ? list(a.body.users, readPerson) : null;
    const pin = obj(a.body) && typeof a.body.pin === "boolean" ? a.body.pin : null;
    if (family && kids && members && users && pin !== null)
        return { family, kids, members, users, pin };
    return o.ask ? unreadable(a.status) : null;
}

/** Flow 4: a kid and the parent's consent to the notice they were shown, in one request. */
export async function addKid(input: {
    name: string;
    grade: number;
    notice: string;
}): Promise<{ kid: Kid } | Failure> {
    const a = await call("POST", "/api/kids", {
        name: input.name,
        grade: input.grade,
        consent: { notice: input.notice },
    });
    if (!a.ok) return a.failure;
    const kid = obj(a.body) ? readKid(a.body.kid) : null;
    return kid ? { kid } : unreadable(a.status);
}

/**
 * Opens the children's view on this browser for these children (.docs/auth.md, flow 5). The API ends
 * this browser's session in the same answer, so the hint goes too, and the page goes to `/kids`.
 */
export async function openKidSession(kids: readonly string[]): Promise<true | Failure> {
    const a = await call("POST", "/api/kid-sessions", { kids, tab: true });
    if (!a.ok) return refused(a.failure);
    if (!obj(a.body) || !str(a.body.credential)) return unreadable(a.status);
    keepKidCredential(a.body.credential);
    forget();
    return true;
}

/** Ends every children's view open in the family, on whichever browsers hold them. What they had not sent is lost. */
export async function endKidSessions(): Promise<{ ended: number } | Failure> {
    const a = await call("POST", "/api/kid-sessions/end-all", {});
    if (!a.ok) return refused(a.failure);
    return obj(a.body) && num(a.body.ended) ? { ended: a.body.ended } : unreadable(a.status);
}

const readSession = (v: unknown): SessionView | null =>
    obj(v) &&
    str(v.id) &&
    (v.kind === "session" || v.kind === "shared-session") &&
    strOrNull(v.name) &&
    str(v.created_at) &&
    strOrNull(v.seen_at) &&
    typeof v.own === "boolean" &&
    typeof v.putAway === "boolean" &&
    typeof v.byPin === "boolean"
        ? {
              id: v.id,
              kind: v.kind,
              name: v.name,
              created_at: v.created_at,
              seen_at: v.seen_at,
              own: v.own,
              putAway: v.putAway,
              byPin: v.byPin,
          }
        : null;

/** A grown-up's own picture on the bar and the account page, by the shelf's name for a portrait. */
export async function setPicture(picture: string): Promise<true | Failure> {
    const a = await call("POST", "/api/me/picture", { picture });
    return a.ok ? true : refused(a.failure);
}

/** The person's own sessions in this family, this browser's marked (.docs/auth.md, flow 10). */
export async function sessions(): Promise<Sessions | Failure> {
    const a = await call("GET", "/api/sessions");
    if (!a.ok) return refused(a.failure);
    const list_ = obj(a.body) ? list(a.body.sessions, readSession) : null;
    return list_ ? { sessions: list_ } : unreadable(a.status);
}

/** Ends one of the person's own sessions. Ending this browser's ends the sign-in here, as Sign out does. */
export async function endSession(id: string, own: boolean): Promise<true | Failure> {
    const a = await call("POST", "/api/sessions/end", { id });
    if (!a.ok) return refused(a.failure);
    if (own) forget();
    return true;
}

const readView = (v: unknown): KidSessionView | null =>
    obj(v) &&
    str(v.view) &&
    str(v.user_id) &&
    strOrNull(v.name) &&
    str(v.created_at) &&
    strOrNull(v.seen_at) &&
    Array.isArray(v.kids) &&
    v.kids.every(str)
        ? {
              view: v.view,
              user_id: v.user_id,
              name: v.name,
              created_at: v.created_at,
              seen_at: v.seen_at,
              kids: v.kids,
          }
        : null;

/** The children's views open in the family, one per browser, and whether the family has a PIN. */
export async function kidSessions(): Promise<KidSessions | Failure> {
    const a = await call("GET", "/api/kid-sessions");
    if (!a.ok) return refused(a.failure);
    const views = obj(a.body) ? list(a.body.views, readView) : null;
    const pin = obj(a.body) && typeof a.body.pin === "boolean" ? a.body.pin : null;
    return views && pin !== null ? { views, pin } : unreadable(a.status);
}

/** Ends one children's view, on whichever browser holds it. What it had not sent is lost. */
export async function endKidSession(view: string): Promise<true | Failure> {
    const a = await call("POST", "/api/kid-sessions/end", { view });
    return a.ok ? true : refused(a.failure);
}

/** Sets the family's PIN, or sets it again, which needs a sign-in in the last ten minutes. */
export async function setPin(pin: string): Promise<true | Failure> {
    const a = await call("POST", "/api/family/pin", { pin });
    return a.ok ? true : refused(a.failure);
}

export async function kidLogins(): Promise<KidLogins | Failure> {
    const a = await call("GET", "/api/kid-logins");
    if (!a.ok) return refused(a.failure);
    const kids = obj(a.body)
        ? list(a.body.kids, (k) =>
              obj(k) &&
              str(k.id) &&
              str(k.name) &&
              strOrNull(k.username) &&
              typeof k.enabled === "boolean"
                  ? { id: k.id, name: k.name, username: k.username, enabled: k.enabled }
                  : null,
          )
        : null;
    return obj(a.body) && typeof a.body.pinSet === "boolean" && kids
        ? { pinSet: a.body.pinSet, kids }
        : unreadable(a.status);
}

export async function setKidsPin(pin: string): Promise<true | Failure> {
    const a = await call("POST", "/api/kid-logins/pin", { pin });
    return a.ok ? true : refused(a.failure);
}

export async function setKidLogin(
    kid: string,
    username: string,
    enabled: boolean,
): Promise<true | Failure> {
    const a = await call("POST", "/api/kid-logins", { kid, username, enabled });
    return a.ok ? true : refused(a.failure);
}

/**
 * The family's log, or one kid's, optionally narrowed before the server reads it. `lesson` narrows
 * it to one lesson's own sittings, as the child's own route does, so a page that draws one finished
 * sheet reads that sheet's events rather than a term of them.
 */
export async function events(
    kid?: string,
    options: { kinds?: readonly EventKind[]; from?: string; to?: string; lesson?: string } = {},
): Promise<Envelope[] | null> {
    if (!signedIn()) return null;
    const q = new URLSearchParams();
    if (kid) q.set("kid", kid);
    if (options.kinds?.length) q.set("kinds", options.kinds.join(","));
    if (options.from) q.set("from", options.from);
    if (options.to) q.set("to", options.to);
    if (options.lesson) q.set("lesson", options.lesson);
    const a = await call("GET", `/api/events${q.size ? `?${q}` : ""}`);
    if (!a.ok) {
        refused(a.failure);
        return null;
    }
    return obj(a.body) ? list(a.body.events, readEnvelope) : null;
}

/** Appends under this browser's session; the server stamps family, actor, device and seq. */
export async function append(drafts: Draft[]): Promise<Envelope[] | Failure> {
    const a = await call("POST", "/api/events", { events: drafts });
    if (!a.ok) return refused(a.failure);
    const out = obj(a.body) ? list(a.body.events, readEnvelope) : null;
    return out ?? unreadable(a.status);
}

/** A question a parent wrote, saved as one content row with its `content-authored` event. */
export async function saveContent(
    body: string,
): Promise<{ content: Content; event: Envelope } | Failure> {
    const a = await call("POST", "/api/content", { body });
    if (!a.ok) return a.failure;
    const content = obj(a.body) ? readContent(a.body.content) : null;
    const event = obj(a.body) ? readEnvelope(a.body.event) : null;
    return content && event ? { content, event } : unreadable(a.status);
}

/** The pack the family's lessons are read from: its digest and the index of every lesson. */
/**
 * The pack's own readers, loaded the first time a page reads the pack. They carry the expressions, the
 * scenes and the numbers behind them, and every page that signs in touches this file, so they are not
 * in its static path (tools/__tests__/first-view.test.ts).
 */
const readers = (): Promise<typeof import("../pack")> => import("../pack");

export async function pack(): Promise<PackView | Failure> {
    const [a, { readIndex }] = await Promise.all([call("GET", "/api/pack"), readers()]);
    if (!a.ok) return refused(a.failure);
    const index = obj(a.body) ? readIndex(a.body.index) : null;
    return obj(a.body) && str(a.body.pack) && index?.ok
        ? { pack: a.body.pack, index: index.index }
        : unreadable(a.status);
}

/** A file of the pack, by the path its index names, under `dir`. */
const packFile = (digest: string, dir: "lessons" | "scenes", file: string): string =>
    `/api/pack/${encodeURIComponent(digest)}/${dir}/${encodeURIComponent(file.replace(`${dir}/`, ""))}`;

/** A lesson's file from the pack, which the browser may keep for a year. */
export async function packLesson(digest: string, file: string): Promise<PackLesson | Failure> {
    const [a, { readLesson }] = await Promise.all([
        call("GET", packFile(digest, "lessons", file)),
        readers(),
    ]);
    if (!a.ok) return refused(a.failure);
    const read = readLesson(a.body);
    return read.ok ? read.lesson : unreadable(a.status);
}

/** A lesson's first drawing from the pack, for a page that shows the lesson without opening it. */
export async function packScene(digest: string, file: string): Promise<PackScene | Failure> {
    const [a, { readScene }] = await Promise.all([
        call("GET", packFile(digest, "scenes", file)),
        readers(),
    ]);
    if (!a.ok) return refused(a.failure);
    const read = readScene(a.body);
    return read.ok ? read.first : unreadable(a.status);
}

/** A new id for something this browser writes, which is what makes a retried append harmless. */
export const newId = (): string => crypto.randomUUID();

/** Now, in the one timestamp format. */
export const nowAt = (): string => new Date().toISOString();

/** The local outbox, or null anywhere it does not exist, which is every server but a developer's. */
export async function outbox(): Promise<Outbox | null> {
    const a = await call("GET", "/api/dev/outbox");
    if (!a.ok || !obj(a.body)) return null;
    const emails = list(a.body.emails, (e) =>
        obj(e) && str(e.to) && str(e.subject) && str(e.text) && str(e.at)
            ? { to: e.to, subject: e.subject, text: e.text, at: e.at }
            : null,
    );
    return emails ? { emails } : null;
}
