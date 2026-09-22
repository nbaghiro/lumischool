// The child's view's way to the API (.docs/auth.md, flow 5, and .docs/api.md, "A child's view"): the
// kid session this browser holds, a child's state, and what a child does. What a child does waits in
// a queue in the browser and is sent in chunks, oldest first, and a chunk leaves the queue as it
// lands; nothing else of a child's is kept here. Only `/api/kid` routes are named in this file, which
// tools/scripts/check-kids-build.ts holds for everything the child's build carries.

import type { KidRecord, KidState, KidView, PackView } from "../../server/api";
import { check, type Draft, type Envelope } from "../answer";
import type { PackLesson } from "../pack";
import {
    call,
    list,
    num,
    obj,
    readChildRecord,
    readEnvelope,
    readKid,
    str,
    strOrNull,
    unreadable,
    type Answer,
    type Failure,
} from "./wire";

/** What a child's page records: the server stamps the family, the device and the number. */
export type Doing = Envelope extends infer E
    ? E extends Envelope
        ? Pick<E, "kind" | "data">
        : never
    : never;

const present = <T>(v: T | null): v is T => v !== null;

/** One event, as JSON, may be at most this many bytes. Larger is refused when it is recorded. */
const EVENT_BYTES = 256 * 1024;
/** A chunk holds at most this many events and bytes, inside the API's 50 events and 1 MB. */
const CHUNK_EVENTS = 50;
const CHUNK_BYTES = 512 * 1024;

/** An event waiting to be sent. `order` is when it was recorded, and keeps a child's events in turn. */
export interface Queued {
    id: string;
    kid_id: string;
    draft: Draft;
    order: number;
    bytes: number;
}

interface Queue {
    put(rows: readonly Queued[]): Promise<void>;
    /** Every waiting event, oldest first. */
    all(): Promise<Queued[]>;
    drop(ids: readonly string[]): Promise<void>;
    clear(): Promise<void>;
}

const byOrder = (a: Queued, b: Queued): number => a.order - b.order;

/** A draft read back from the queue's storage, checked as the envelope it will become. */
function readDraft(v: unknown): Draft | null {
    if (!obj(v)) return null;
    const place = "00000000-0000-4000-8000-000000000000";
    const c = check({ ...v, family_id: place, actor: null, device: place, seq: 0 });
    if (!c.ok || v.kid_id !== c.envelope.kid_id) return null;
    const { family_id: _family, actor: _actor, device: _device, seq: _seq, ...draft } = c.envelope;
    return draft;
}

function readQueued(v: unknown): Queued | null {
    if (!obj(v) || !str(v.id) || !str(v.kid_id) || !num(v.order) || !num(v.bytes)) return null;
    const draft = readDraft(v.draft);
    return draft && draft.id === v.id
        ? { id: v.id, kid_id: v.kid_id, draft, order: v.order, bytes: v.bytes }
        : null;
}

function memoryQueue(): Queue {
    const rows = new Map<string, Queued>();
    return {
        put: async (add) => {
            for (const r of add) rows.set(r.id, structuredClone(r));
        },
        all: async () => [...rows.values()].map((r) => structuredClone(r)).sort(byOrder),
        drop: async (ids) => {
            for (const id of ids) rows.delete(id);
        },
        clear: async () => {
            rows.clear();
        },
    };
}

const done = <T>(r: IDBRequest<T>): Promise<T> =>
    new Promise((ok, no) => {
        r.onsuccess = () => ok(r.result);
        r.onerror = () => no(r.error);
    });

const finished = (tx: IDBTransaction): Promise<void> =>
    new Promise((ok, no) => {
        tx.oncomplete = () => ok();
        tx.onerror = () => no(tx.error);
        tx.onabort = () => no(tx.error);
    });

async function indexedQueue(): Promise<Queue | null> {
    if (typeof indexedDB === "undefined") return null;
    try {
        const open = indexedDB.open("lumischool-kid", 1);
        open.onupgradeneeded = () => {
            open.result.createObjectStore("queue", { keyPath: "id" });
        };
        const db = await done(open);
        const writing = async (work: (s: IDBObjectStore) => void): Promise<void> => {
            const tx = db.transaction("queue", "readwrite");
            work(tx.objectStore("queue"));
            await finished(tx);
        };
        return {
            put: (add) => writing((s) => add.forEach((r) => s.put(r))),
            all: async () =>
                (await done<unknown[]>(db.transaction("queue").objectStore("queue").getAll()))
                    .map(readQueued)
                    .filter(present)
                    .sort(byOrder),
            drop: (ids) => writing((s) => ids.forEach((id) => s.delete(id))),
            clear: () => writing((s) => s.clear()),
        };
    } catch {
        return null;
    }
}

let queueNow: Promise<Queue> | null = null;

/**
 * IndexedDB where the browser has it, and memory where it does not (a private window, a test), where
 * a reload loses what was waiting.
 */
const queue = (): Promise<Queue> => (queueNow ??= indexedQueue().then((q) => q ?? memoryQueue()));

/**
 * The waiting events as they will be sent: one kid per chunk, since a chunk goes to that kid's route;
 * each kid's events oldest first; the kid whose oldest event is oldest first; and no chunk over
 * `CHUNK_EVENTS` or `CHUNK_BYTES`.
 */
export function chunksOf(rows: readonly Queued[]): Queued[][] {
    const byKid = new Map<string, Queued[]>();
    for (const r of [...rows].sort(byOrder))
        byKid.set(r.kid_id, [...(byKid.get(r.kid_id) ?? []), r]);
    const out: Queued[][] = [];
    for (const kidRows of byKid.values()) {
        let chunk: Queued[] = [];
        let bytes = 0;
        for (const r of kidRows) {
            if (
                chunk.length === CHUNK_EVENTS ||
                (chunk.length > 0 && bytes + r.bytes > CHUNK_BYTES)
            ) {
                out.push(chunk);
                chunk = [];
                bytes = 0;
            }
            chunk.push(r);
            bytes += r.bytes;
        }
        if (chunk.length) out.push(chunk);
    }
    return out;
}

/** Where sending stands, for the page: how much waits, and whether the network is away. */
export interface Sending {
    unsent: number;
    offline: boolean;
    /** The kid session has ended, so nothing more can be sent or read under it. */
    ended: boolean;
}

/** Runs `work` after `ms` milliseconds, and returns what cancels it. */
type Later = (work: () => void, ms: number) => () => void;

let later: Later = (work, ms) => {
    const t = setTimeout(work, ms);
    return () => clearTimeout(t);
};

/** For a test, which runs the waits itself. */
export function useLater(each: Later): void {
    later = each;
}

const FIRST_WAIT = 2_000;
const LONGEST_WAIT = 60_000;

let now: Sending = { unsent: 0, offline: false, ended: false };
/**
 * Whether the network is away, as the queue last learned it: from the browser's offline and online
 * events and from each send. An empty queue reports it rather than clearing it, since a send begun
 * as the page opened can find the queue empty after the offline event has put the note up, and it
 * would take the note down while the network is still away. */
let away = false;
let wait = 0;
let cancelWait = (): void => {};
let stopped: Failure | null = null;
const watchers = new Set<(s: Sending) => void>();

async function tell(o: Partial<Omit<Sending, "unsent">> = {}): Promise<void> {
    now = { ...now, ...o, unsent: (await (await queue()).all()).length };
    for (const w of watchers) w(now);
}

/** Tells `on` where sending stands now and each time it changes. Returns what stops it. */
export function watch(on: (s: Sending) => void): () => void {
    watchers.add(on);
    on(now);
    void tell();
    return () => watchers.delete(on);
}

/** Tries again after a wait that doubles from two seconds to a minute, or as long as the API asked. */
function tryAgainLater(retryAfter?: number): void {
    cancelWait();
    wait = Math.min(LONGEST_WAIT, wait ? wait * 2 : FIRST_WAIT);
    cancelWait = later(() => void send(), Math.max(wait, (retryAfter ?? 0) * 1000));
}

/**
 * Sends one chunk at a time until the queue is empty or the API cannot be reached. A chunk that lands
 * leaves the queue. An event the API refuses by rule would be refused however often it went, so it
 * leaves the queue too, and what was behind it carries on; only no network, a busy API or our own
 * fault waits and tries again.
 */
async function sendAll(): Promise<void> {
    const q = await queue();
    for (;;) {
        const [chunk] = chunksOf(await q.all());
        const kid = chunk?.[0]?.kid_id;
        if (!chunk || !kid) {
            stopped = null;
            wait = 0;
            await tell({ offline: away });
            return;
        }
        const a = await call("POST", `/api/kid/${encodeURIComponent(kid)}/events`, {
            events: chunk.map((r) => r.draft),
        });
        if (a.ok) {
            // The ids the API now holds leave the queue, whether it wrote them now or had them already.
            // An answer without them is our own fault, and the chunk waits to go again.
            const ids = obj(a.body) ? list(a.body.ids, (v) => (str(v) ? v : null)) : null;
            // an answer came back, so the network is there, whatever the browser last said
            away = false;
            if (!ids) {
                stopped = unreadable(a.status);
                tryAgainLater();
                await tell({ offline: false });
                return;
            }
            await q.drop(ids);
            stopped = null;
            wait = 0;
            await tell({ offline: false });
            continue;
        }
        const f = a.failure;
        if (f.error === "offline" || f.error === "rate-limited" || f.status >= 500) {
            stopped = f;
            tryAgainLater(f.retryAfter);
            away = f.error === "offline";
            await tell({ offline: away });
            return;
        }
        if (f.error === "no-kid-session") {
            await ended();
            return;
        }
        const one = f.at === undefined ? undefined : chunk[f.at];
        const refused =
            one !== undefined
                ? [one.id]
                : f.error === "not-found"
                  ? (await q.all()).filter((r) => r.kid_id === kid).map((r) => r.id)
                  : chunk.map((r) => r.id);
        await q.drop(refused);
    }
}

let running: Promise<void> | null = null;
let again = false;

/** Sends what is waiting. One send runs at a time, and a call while one runs sends again after it. */
export function send(): Promise<void> {
    if (running) {
        again = true;
        return running;
    }
    running = (async () => {
        do {
            again = false;
            await sendAll();
        } while (again);
    })().finally(() => {
        running = null;
    });
    return running;
}

async function ended(): Promise<void> {
    cancelWait();
    await (await queue()).clear();
    await tell({ ended: true, offline: false });
}

/**
 * Records what a child did, for the child named, and sends it when it can. An event that is not the
 * shape `engine/answer.ts` declares, or is over `EVENT_BYTES`, is refused here and nothing is kept.
 */
export async function record(
    kidId: string,
    doings: readonly Doing[],
): Promise<Draft[] | { problem: string }> {
    const rows: Queued[] = [];
    const encoder = new TextEncoder();
    for (const d of doings) {
        const draft: Draft = {
            ...d,
            id: crypto.randomUUID(),
            kid_id: kidId,
            at: new Date().toISOString(),
        };
        const read = readDraft(draft);
        if (!read) return { problem: `${d.kind} is not the shape engine/answer.ts declares` };
        const bytes = encoder.encode(JSON.stringify(read)).length;
        if (bytes > EVENT_BYTES)
            return { problem: `${d.kind} is ${bytes} bytes, over ${EVENT_BYTES}` };
        rows.push({ id: read.id, kid_id: kidId, draft: read, order: nextOrder(), bytes });
    }
    if (!rows.length) return [];
    await (await queue()).put(rows);
    await tell();
    void send();
    return rows.map((r) => r.draft);
}

let lastOrder = 0;
const nextOrder = (): number => (lastOrder = Math.max(lastOrder + 1, Date.now() * 1000));

/** Sends again when the network comes back or the page is looked at again. Returns what stops it. */
export function start(): () => void {
    const online = (): void => {
        away = false;
        void send();
    };
    const offline = (): void => {
        away = true;
        void tell({ offline: true });
    };
    const seen = (): void => {
        if (document.visibilityState === "visible") void send();
    };
    addEventListener("online", online);
    addEventListener("offline", offline);
    document.addEventListener("visibilitychange", seen);
    if (navigator.onLine === false) offline();
    void send();
    return () => {
        removeEventListener("online", online);
        removeEventListener("offline", offline);
        document.removeEventListener("visibilitychange", seen);
    };
}

async function answered(a: Answer): Promise<Answer> {
    if (!a.ok && a.failure.error === "no-kid-session") await ended();
    return a;
}

/** The children this browser's kid session is for. */
export async function view(): Promise<KidView | Failure> {
    const a = await answered(await call("GET", "/api/kid"));
    if (!a.ok) return a.failure;
    const b = a.body;
    const family =
        obj(b) && obj(b.family) && str(b.family.name) && str(b.family.time_zone)
            ? { name: b.family.name, time_zone: b.family.time_zone }
            : null;
    const kids = obj(b) ? list(b.kids, readKid) : null;
    const others = obj(b)
        ? list(b.others, (k) =>
              obj(k) && str(k.id) && str(k.name) ? { id: k.id, name: k.name } : null,
          )
        : null;
    if (!obj(b) || !family || !kids || !others || typeof b.pin !== "boolean")
        return unreadable(a.status);
    await tell({ ended: false });
    return { family, kids, others, pin: b.pin };
}

/**
 * Adds another of the family's children to this view with the family's PIN, which lumischool checks.
 * The view's cookie then carries that child's key too, and `view()` lists them.
 */
export async function add(pin: string, kidId: string): Promise<true | Failure> {
    const a = await answered(await call("POST", "/api/kid/add", { pin, kid: kidId }));
    return a.ok ? true : a.failure;
}

const kidPath = (kidId: string, rest: string): string =>
    `/api/kid/${encodeURIComponent(kidId)}/${rest}`;

/**
 * One child's log as the API holds it, the kinds a child reads back, or with a lesson named only that
 * lesson's events, which is how a page looks back at a finished lesson. What this browser has not
 * sent yet is not in it.
 */
export async function state(kidId: string, lesson?: string): Promise<KidState | Failure> {
    const path = kidPath(kidId, "state");
    const a = await answered(
        await call(
            "GET",
            lesson === undefined ? path : `${path}?lesson=${encodeURIComponent(lesson)}`,
        ),
    );
    if (!a.ok) return a.failure;
    const b = a.body;
    const kid = obj(b) ? readKid(b.kid) : null;
    const events = obj(b) ? list(b.events, readEnvelope) : null;
    const tutors = obj(b)
        ? list(b.tutors, (t) =>
              obj(t) && strOrNull(t.name) && str(t.to_day)
                  ? { name: t.name, to_day: t.to_day }
                  : null,
          )
        : null;
    return kid && events && tutors ? { kid, events, tutors } : unreadable(a.status);
}

function readRecord(v: unknown): KidRecord | null {
    if (!obj(v)) return null;
    const kid = readKid(v.kid);
    const record = readChildRecord(v);
    return kid && str(v.pack) && record ? { kid, pack: v.pack, ...record } : null;
}

/** One child's record as the API folds it from their log: their plan, each grade's progress and the sitting left open. */
export async function read(kidId: string): Promise<KidRecord | Failure> {
    const a = await answered(await call("GET", kidPath(kidId, "record")));
    if (!a.ok) return a.failure;
    return readRecord(a.body) ?? unreadable(a.status);
}

/** The pack's readers, loaded with the first read of the pack, since this file loads with the page. */
const readers = (): Promise<typeof import("../pack")> => import("../pack");

/** The pack the child's lessons are read from: its digest and the index of every lesson. */
export async function pack(kidId: string): Promise<PackView | Failure> {
    const a = await answered(await call("GET", kidPath(kidId, "pack")));
    if (!a.ok) return a.failure;
    const { readIndex } = await readers();
    const index = obj(a.body) ? readIndex(a.body.index) : null;
    return obj(a.body) && str(a.body.pack) && index?.ok
        ? { pack: a.body.pack, index: index.index }
        : unreadable(a.status);
}

/** A lesson's file from the pack, by the file its index names, which the browser may keep for a year. */
export async function lesson(
    kidId: string,
    digest: string,
    file: string,
): Promise<PackLesson | Failure> {
    const name = file.replace(/^lessons\//, "");
    const a = await answered(
        await call(
            "GET",
            kidPath(
                kidId,
                `pack/${encodeURIComponent(digest)}/lessons/${encodeURIComponent(name)}`,
            ),
        ),
    );
    if (!a.ok) return a.failure;
    const { readLesson } = await readers();
    const read = readLesson(a.body);
    return read.ok ? read.lesson : unreadable(a.status);
}

/**
 * Leaves the children's view with the family's PIN. What is waiting is sent first, and while any of
 * it cannot be, the view is not left, since a grown-up's session cannot send it afterwards.
 */
export async function leave(pin: string): Promise<true | Failure> {
    await send();
    if ((await (await queue()).all()).length) return stopped ?? { error: "offline", status: 0 };
    const a = await answered(await call("POST", "/api/kid/leave", { pin }));
    if (!a.ok) return a.failure;
    await ended();
    return true;
}
