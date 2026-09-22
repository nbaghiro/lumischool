// A move's presentation, as data: what each part of the board does between one position and the
// next, and the marks, bursts and sounds that go with it, on the stage's clock. A binding builds a
// beat from the scene before a move and the scene after it, the stage plays it, and under reduced
// motion only its sounds are left. However it moves, a beat ends exactly on the scene after, which
// `mismatches` checks and the games' tests hold every flagship move to, so the picture left on the
// board is always the model's position. See .docs/engine.md.
import type { Cue } from "./cues";
import { dropAt, dropTime, impacts } from "./drop";
import { lob as lobOf } from "./flight";
import { flowAt, flowTime } from "./flow";
import type { Pt } from "./geometry";
import type { BurstKind, Mark, Part, Scene } from "./scene";
import { settleTime, springAt, type Spring } from "./spring";
import { easeBack, easeInOut, easeOut } from "./timeline";

/** What a track moves: a part's place, turn, squash or size, or one of its numeric settings. */
export type Channel = "x" | "y" | "angle" | "squash" | "scale" | `param:${string}`;

/** How a track goes from its first value to its last. Every one is exactly on its last value at its end. */
export type Motion =
    | { ease: "linear" | "out" | "inOut" | "back" }
    /** On a spring, leaving with a speed of its own in units a second: a hand's release, or a knock. */
    | { spring: Spring; v0: number }
    /** Falling onto its last value and bouncing to rest there. The last value is not above the first. */
    | { drop: { g: number; bounce: number } }
    /** In flight under gravity, in squares a second each second, from its first value to its last in the track's time. */
    | { fall: number }
    /** As a pour goes: starting and stopping over `ramp` seconds, and steady between. */
    | { flow: { rate: number; ramp: number } };

export interface Track {
    key: string;
    ch: Channel;
    at: number;
    dur: number;
    from: number;
    to: number;
    motion: Motion;
}

export interface Beat {
    tracks: Track[];
    /** Settings a part switches to at a moment (a tap turned on, a row written in a table), where it turns about from then, and how high it is stacked. */
    sets: {
        key: string;
        at: number;
        params?: Record<string, unknown>;
        pivot?: Pt | null;
        z?: number;
    }[];
    /** Parts on the board only while the beat plays: a ball on its way out of a machine, or one leaving the board. */
    extra: Part[];
    marks: { at: number; dur: number; marks: Mark[] }[];
    bursts: { at: number; kind: BurstKind; x: number; y: number; n: number; dir?: number }[];
    cues: { at: number; cue: Cue }[];
    length: number;
}

/** A part as a beat draws it at a moment. */
export interface Pose {
    x: number;
    y: number;
    angle: number;
    squash: number;
    scale: number;
    pivot: Pt | null;
    /** How high it is stacked, or null for where the stage lays it. */
    z: number | null;
    params: Record<string, unknown>;
}

const EASE = { linear: (u: number) => u, out: easeOut, inOut: easeInOut, back: easeBack };

/** Squares a second each second, for a thing thrown or let fall on a board. */
const G = 42;

/** A landing's squash coming back: quick, and ringing once. */
const SPRING_BACK: Spring = { hz: 5, zeta: 0.35 };

/** How long a motion takes on its own, where it has a length of its own, and `fallback` where it has not. */
function natural(from: number, to: number, m: Motion, fallback: number): number {
    if ("spring" in m) return settleTime(m.spring, from, to, m.v0);
    if ("drop" in m) return dropTime({ from, to, v0: 0, ...m.drop });
    if ("flow" in m) return flowTime({ amount: Math.abs(to - from), ...m.flow });
    return fallback;
}

function valueOf(tr: Track, t: number): number {
    const u = t - tr.at,
        span = tr.to - tr.from,
        m = tr.motion;
    if (u <= 0) return tr.from;
    // A beat's length is a sum of starts and lengths, and taking the start back off can come to a hair
    // under the length, which must still be the end.
    if (u >= tr.dur - 1e-9) return tr.to;
    if ("ease" in m) return tr.from + span * EASE[m.ease](u / tr.dur);
    if ("spring" in m) return springAt(m.spring, tr.from, tr.to, m.v0, u).x;
    if ("drop" in m) return dropAt({ from: tr.from, to: tr.to, v0: 0, ...m.drop }, u).y;
    if ("fall" in m)
        return (
            tr.from + ((span - 0.5 * m.fall * tr.dur * tr.dur) / tr.dur) * u + 0.5 * m.fall * u * u
        );
    return tr.from + Math.sign(span) * flowAt({ amount: Math.abs(span), ...m.flow }, u).moved;
}

const poseOf = (p: Part): Pose => ({
    x: p.at?.x ?? 0,
    y: p.at?.y ?? 0,
    angle: p.angle ?? 0,
    squash: p.squash ?? 0,
    scale: p.scale ?? 1,
    pivot: p.pivot ?? null,
    z: p.z ?? null,
    params: { ...p.params },
});

/**
 * Every part's pose at `t`: the scene's parts and the beat's own, as the scene has them wherever the
 * beat says nothing. On a channel with several tracks, the one that started last by `t` decides, and
 * before any has started the first holds its first value.
 */
export function poseAt(beat: Beat, scene: Scene, t: number): Map<string, Pose> {
    const out = new Map<string, Pose>();
    for (const p of [...scene.parts, ...beat.extra]) if (p.key) out.set(p.key, poseOf(p));
    for (const s of [...beat.sets].sort((a, b) => a.at - b.at)) {
        const pose = out.get(s.key);
        if (!pose || s.at > t) continue;
        if (s.params) Object.assign(pose.params, s.params);
        if (s.pivot !== undefined) pose.pivot = s.pivot;
        if (s.z !== undefined) pose.z = s.z;
    }
    const channels = new Map<string, Track[]>();
    for (const tr of beat.tracks) {
        const id = `${tr.key} ${tr.ch}`,
            list = channels.get(id);
        if (list) list.push(tr);
        else channels.set(id, [tr]);
    }
    for (const list of channels.values()) {
        const started = list.filter((x) => x.at <= t);
        const tr = started.length
            ? started.reduce((a, b) => (b.at >= a.at ? b : a))
            : list.reduce((a, b) => (b.at < a.at ? b : a));
        const pose = out.get(tr.key);
        if (!pose) continue;
        const v = started.length ? valueOf(tr, t) : tr.from;
        if (tr.ch === "x") pose.x = v;
        else if (tr.ch === "y") pose.y = v;
        else if (tr.ch === "angle") pose.angle = v;
        else if (tr.ch === "squash") pose.squash = v;
        else if (tr.ch === "scale") pose.scale = v;
        else pose.params[tr.ch.slice("param:".length)] = v;
    }
    return out;
}

/** A beat written a line at a time. Each motion returns the moment it ends, so the next can start there. */
export interface Score {
    track(
        key: string,
        ch: Channel,
        at: number,
        from: number,
        to: number,
        motion: Motion,
        dur?: number,
    ): number;
    /** Carried from one place to another on a spring, leaving as fast as a hand let it go. */
    glide(key: string, at: number, a: Pt, b: Pt, spring: Spring, v?: Pt): number;
    /** Thrown from one place to another, its top `rise` squares over the higher of the two. */
    lob(key: string, at: number, a: Pt, b: Pt, rise: number): number;
    /** Let fall onto a place and bouncing to rest there. Returns each moment it meets the place, the last when it is still. */
    drop(key: string, at: number, a: Pt, b: Pt, bounce?: number): number[];
    /** Squashed on landing and sprung back. */
    squash(key: string, at: number, amount: number): number;
    set(key: string, at: number, params: Record<string, unknown>): void;
    pivot(key: string, at: number, pivot: Pt | null): void;
    /** Stacked this high from `at`, so a carried thing passes in front of what it is carried over. */
    z(key: string, at: number, z: number): void;
    mark(at: number, dur: number, marks: Mark[]): void;
    burst(at: number, kind: BurstKind, x: number, y: number, n: number, dir?: number): void;
    cue(at: number, cue: Cue): void;
    extra(part: Part): void;
    beat(): Beat;
}

export function score(): Score {
    const b: Beat = { tracks: [], sets: [], extra: [], marks: [], bursts: [], cues: [], length: 0 };
    const end = (t: number): number => {
        b.length = Math.max(b.length, t);
        return t;
    };
    const track: Score["track"] = (key, ch, at, from, to, motion, dur) => {
        const d = Math.max(0, dur ?? natural(from, to, motion, 0.3));
        b.tracks.push({ key, ch, at, dur: d, from, to, motion });
        return end(at + d);
    };
    return {
        track,
        glide(key, at, a, p, spring, v = { x: 0, y: 0 }) {
            const dur = Math.max(
                natural(a.x, p.x, { spring, v0: v.x }, 0),
                natural(a.y, p.y, { spring, v0: v.y }, 0),
            );
            track(key, "x", at, a.x, p.x, { spring, v0: v.x }, dur);
            return track(key, "y", at, a.y, p.y, { spring, v0: v.y }, dur);
        },
        lob(key, at, a, p, rise) {
            const { t } = lobOf(a, p, G, rise);
            track(key, "x", at, a.x, p.x, { ease: "linear" }, t);
            return track(key, "y", at, a.y, p.y, { fall: G }, t);
        },
        drop(key, at, a, p, bounce = 0.3) {
            const hits = impacts({ from: a.y, to: p.y, v0: 0, g: G, bounce });
            track(key, "x", at, a.x, p.x, { ease: "out" }, hits[0]?.t ?? 0);
            track(key, "y", at, a.y, p.y, { drop: { g: G, bounce } });
            return hits.map((h) => at + h.t);
        },
        squash(key, at, amount) {
            track(key, "squash", at, 0, amount, { ease: "out" }, 0.06);
            return track(key, "squash", at + 0.06, amount, 0, { spring: SPRING_BACK, v0: 0 });
        },
        set(key, at, params) {
            b.sets.push({ key, at, params });
            end(at);
        },
        pivot(key, at, pivot) {
            b.sets.push({ key, at, pivot });
            end(at);
        },
        z(key, at, z) {
            b.sets.push({ key, at, z });
            end(at);
        },
        mark(at, dur, marks) {
            b.marks.push({ at, dur, marks });
            end(at + dur);
        },
        burst(at, kind, x, y, n, dir) {
            b.bursts.push(dir === undefined ? { at, kind, x, y, n } : { at, kind, x, y, n, dir });
            end(at);
        },
        cue(at, cue) {
            b.cues.push({ at, cue });
            end(at);
        },
        extra(part) {
            b.extra.push(part);
        },
        beat: () => b,
    };
}

/** What a beat leaves under reduced motion: its sounds, all at once, and nothing that moves. */
export const atRest = (b: Beat): Beat => ({
    tracks: [],
    sets: [],
    extra: [],
    marks: [],
    bursts: [],
    cues: b.cues.map((c) => ({ ...c, at: 0 })),
    length: 0,
});

/** One beat and then another, such as a move and the finish it won. */
export function followedBy(a: Beat, b: Beat): Beat {
    const k = a.length;
    const later = <T extends { at: number }>(xs: T[]): T[] =>
        xs.map((x) => ({ ...x, at: x.at + k }));
    return {
        tracks: [...a.tracks, ...later(b.tracks)],
        sets: [...a.sets, ...later(b.sets)],
        extra: [...a.extra, ...b.extra],
        marks: [...a.marks, ...later(b.marks)],
        bursts: [...a.bursts, ...later(b.bursts)],
        cues: [...a.cues, ...later(b.cues)],
        length: k + b.length,
    };
}

/** How two poses differ. Stacking is left out at the start of a beat, where a carried thing is raised at once. */
function differences(a: Pose, b: Pose, stacking = true): string[] {
    const out: string[] = [];
    for (const k of ["x", "y", "angle", "squash", "scale"] as const)
        if (Math.abs(a[k] - b[k]) > 1e-6) out.push(`${k} is ${a[k]}, not ${b[k]}`);
    if (stacking && a.z !== b.z) out.push(`stacked at ${a.z}, not ${b.z}`);
    if (JSON.stringify(a.pivot) !== JSON.stringify(b.pivot))
        out.push(`turns about ${JSON.stringify(a.pivot)}, not ${JSON.stringify(b.pivot)}`);
    for (const k of new Set([...Object.keys(a.params), ...Object.keys(b.params)])) {
        const x = a.params[k],
            y = b.params[k];
        const same =
            typeof x === "number" && typeof y === "number"
                ? Math.abs(x - y) < 1e-6
                : JSON.stringify(x) === JSON.stringify(y);
        if (!same) out.push(`${k} is ${JSON.stringify(x)}, not ${JSON.stringify(y)}`);
    }
    return out;
}

/** Where a beat's last moment is not the scene it was played to, part by part. Empty when it ends exactly there. */
export function mismatches(beat: Beat, scene: Scene): string[] {
    const last = poseAt(beat, scene, beat.length);
    return scene.parts.flatMap((p) => {
        const pose = p.key ? last.get(p.key) : undefined;
        return p.key && pose ? differences(pose, poseOf(p)).map((d) => `${p.key}: ${d}`) : [];
    });
}

/**
 * Where a beat's first moment is not the scene before it, for every part that was on the board. A part
 * that leaves has to be one of the beat's own, or it would vanish rather than go. `hand` is where a
 * carried part was let go, which is where its beat starts instead.
 */
export function jumps(
    beat: Beat,
    now: Scene,
    was: Scene,
    hand?: { key: string; at: Pt; angle: number },
): string[] {
    const first = poseAt(beat, now, 0);
    return was.parts.flatMap((p) => {
        if (!p.key) return [];
        const pose = first.get(p.key);
        if (!pose) return [`${p.key} vanishes`];
        const want = poseOf(p);
        if (hand?.key === p.key)
            Object.assign(want, { x: hand.at.x, y: hand.at.y, angle: hand.angle });
        return differences(pose, want, false).map((d) => `${p.key}: ${d}`);
    });
}
