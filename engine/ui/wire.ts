// The wire both clients share (.docs/api.md): one request, what went wrong as a code a page can switch
// on, and the checkers for the rows the answers carry. It names no route. The grown-ups' client in
// api.ts names theirs and the children's client in kid.ts names its own, and
// tools/scripts/check-kids-build.ts keeps the grown-ups' routes out of the children's build.

import type { ErrorCode, KidRecord, Problem } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { check, isTweak, type Envelope, type WorldTweak } from "../answer";

/** What went wrong: the API's own problem, or `offline` for a request that never reached it. */
export type Failure = Omit<Problem, "error"> & { error: ErrorCode | "offline"; status: number };

/** Every code the API answers with, complete, so a new code is a type error here until it is read. */
const CODES: Record<ErrorCode, true> = {
    "bad-request": true,
    "bad-email": true,
    "delivery-failed": true,
    "no-pending": true,
    "wrong-code": true,
    "bad-envelope": true,
    "signed-out": true,
    "put-away": true,
    origin: true,
    "not-allowed": true,
    "fresh-sign-in": true,
    "not-found": true,
    "no-consent": true,
    "notice-changed": true,
    expired: true,
    "dead-code": true,
    "too-large": true,
    "not-json": true,
    "rate-limited": true,
    server: true,
    "no-kid-session": true,
    "wrong-pin": true,
    "no-pin": true,
};
const isCode = (v: string): v is ErrorCode => Object.hasOwn(CODES, v);

export type Answer = { ok: true; status: number; body: unknown } | { ok: false; failure: Failure };

export const obj = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
export const str = (v: unknown): v is string => typeof v === "string";
export const strOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";
export const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function list<T>(v: unknown, read: (x: unknown) => T | null): T[] | null {
    if (!Array.isArray(v)) return null;
    const out: T[] = [];
    for (const x of v as unknown[]) {
        const r = read(x);
        if (r === null) return null;
        out.push(r);
    }
    return out;
}

export const readKid = (v: unknown): Kid | null =>
    obj(v) && str(v.id) && str(v.family_id) && str(v.name) && num(v.grade)
        ? {
              id: v.id,
              family_id: v.family_id,
              name: v.name,
              grade: v.grade,
              settings: v.settings ?? {},
          }
        : null;

export function readEnvelope(v: unknown): Envelope | null {
    const c = check(v);
    return c.ok ? c.envelope : null;
}

export const day = (v: unknown): v is string => str(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const dayOrNull = (v: unknown): v is string | null => v === null || day(v);
const ints = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => Number.isInteger(n));
export const strs = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);

const readProgress = (v: unknown): ChildRecord["years"][number]["progress"] | null => {
    if (!(obj(v) && obj(v.done) && str(v.current) && num(v.week) && strs(v.unlocked))) return null;
    const done: Record<string, { stars: 1 | 2 | 3; on: string; minutes: number; right: number }> =
        {};
    for (const [id, r] of Object.entries(v.done)) {
        if (!(
            obj(r) &&
            (r.stars === 1 || r.stars === 2 || r.stars === 3) &&
            day(r.on) &&
            num(r.minutes) &&
            num(r.right)
        ))
            return null;
        done[id] = { stars: r.stars, on: r.on, minutes: r.minutes, right: r.right };
    }
    return { done, current: v.current, week: v.week, unlocked: v.unlocked };
};

const readDay = (v: unknown): ChildRecord["plan"][number]["days"][number] | null =>
    obj(v) &&
    day(v.on) &&
    (v.kind === "lesson" || v.kind === "again" || v.kind === "practice" || v.kind === "off") &&
    (v.lesson === undefined || str(v.lesson)) &&
    (v.note === undefined || str(v.note))
        ? {
              on: v.on,
              kind: v.kind,
              ...(str(v.lesson) ? { lesson: v.lesson } : {}),
              ...(str(v.note) ? { note: v.note } : {}),
          }
        : null;

type ChildRecord = Omit<KidRecord, "kid" | "pack">;

const worldsOrOwn = (v: unknown): v is (string | null)[] => Array.isArray(v) && v.every(strOrNull);

function readTweaks(v: unknown): Record<string, WorldTweak> | null {
    if (!obj(v)) return null;
    const tweaks: Record<string, WorldTweak> = {};
    for (const [world, t] of Object.entries(v)) {
        if (!isTweak(t)) return null;
        tweaks[world] = t;
    }
    return tweaks;
}

/** The worlds the family chose, as the server folds them (school/family/chosen.ts). */
function readWorlds(v: unknown): ChildRecord["worlds"] | null {
    if (!(obj(v) && obj(v.terms) && obj(v.begun))) return null;
    const terms: Record<string, (string | null)[]> = {};
    for (const [grade, list] of Object.entries(v.terms)) {
        if (!worldsOrOwn(list)) return null;
        terms[grade] = list;
    }
    const begun: Record<string, string> = {};
    for (const [term, on] of Object.entries(v.begun)) {
        if (!day(on)) return null;
        begun[term] = on;
    }
    const kept = list(v.kept, (k) => {
        const kt = obj(k) ? readTweaks(k.tweaks) : null;
        return obj(k) && str(k.term) && kt ? { term: k.term, tweaks: kt } : null;
    });
    const latest = readTweaks(v.tweaks);
    return kept && latest ? { terms, tweaks: latest, begun, kept } : null;
}

/** The fields of a child's record the server folds (school/family/family.ts), read the same for a child's view and a grown-up's page. */
export function readChildRecord(v: unknown): ChildRecord | null {
    if (!obj(v)) return null;
    const tracks = list(v.tracks, (t) =>
        obj(t) &&
        str(t.track) &&
        typeof t.on === "boolean" &&
        num(t.perWeek) &&
        day(t.day) &&
        typeof t.own === "boolean"
            ? { track: t.track, on: t.on, perWeek: t.perWeek, day: t.day, own: t.own }
            : null,
    );
    const years = list(v.years, (y) => {
        const progress = obj(y) ? readProgress(y.progress) : null;
        return obj(y) && num(y.grade) && progress ? { grade: y.grade, progress } : null;
    });
    const plan = list(v.plan, (p) => {
        const days = obj(p) ? list(p.days, readDay) : null;
        return obj(p) && str(p.track) && days ? { track: p.track, days } : null;
    });
    const unfinished = list(v.unfinished, (u) =>
        obj(u) &&
        str(u.sitting) &&
        str(u.lesson) &&
        str(u.lessonHash) &&
        str(u.began) &&
        ints(u.answered)
            ? {
                  sitting: u.sitting,
                  lesson: u.lesson,
                  lessonHash: u.lessonHash,
                  began: u.began,
                  answered: u.answered,
              }
            : null,
    );
    const worlds = readWorlds(v.worlds);
    if (!(day(v.today) && dayOrNull(v.start) && tracks && years && plan && unfinished && worlds))
        return null;
    return { today: v.today, start: v.start, tracks, years, plan, unfinished, worlds };
}

/**
 * One request. A POST always sends JSON, `{}` when there is nothing to say, because the API refuses a
 * body of any other type. The credential is whichever cookie the browser holds, which script never
 * reads.
 */
export async function call(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
): Promise<Answer> {
    const headers: Record<string, string> = { accept: "application/json", ...extra };
    if (method === "POST") headers["content-type"] = "application/json";
    const init: RequestInit = { method, headers, credentials: "same-origin" };
    if (method === "POST") init.body = JSON.stringify(body ?? {});
    let res: Response;
    try {
        res = await fetch(path, init);
    } catch {
        return { ok: false, failure: { error: "offline", status: 0 } };
    }
    let read: unknown = null;
    if (res.status !== 204) {
        try {
            read = await res.json();
        } catch {
            read = null;
        }
    }
    if (res.ok) return { ok: true, status: res.status, body: read };
    // A proxy with nothing behind it answers with a page of its own rather than our JSON.
    if (!obj(read) || !str(read.error) || !isCode(read.error))
        return {
            ok: false,
            failure: { error: res.status >= 500 ? "offline" : "server", status: res.status },
        };
    const f: Failure = { error: read.error, status: res.status };
    if (num(read.at)) f.at = read.at;
    if (num(read.attemptsLeft)) f.attemptsLeft = read.attemptsLeft;
    if (num(read.retryAfter)) f.retryAfter = read.retryAfter;
    if (str(read.problem)) f.problem = read.problem;
    if (str(read.notice)) f.notice = read.notice;
    if (str(read.kid)) f.kid = read.kid;
    return { ok: false, failure: f };
}

export const unreadable = (status: number): Failure => ({
    error: "server",
    status,
    problem: "the answer was not the shape .docs/api.md gives",
});
