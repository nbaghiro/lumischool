// Hands: what is common to every game a child plays by hand.
//
// A game's binding says three things about a position: how the board is composed as parts, which
// parts are handles a hand may pick up, and what a release means, as moves the mechanic already
// lists. Everything else is here and is the same for every hands-on game: a press picks a handle
// up, a drag moves it in one of three ways (free, along a path, or as an aim that moves nothing
// until it is let go), a release is judged, and a judged release either plays moves or sends the
// part home and says why in a sentence. The controller never names a move itself: it plays the
// indices a landing carries, and a test on each binding checks that those indices are moves the
// mechanic offered from that position. It knows nothing of the games' model beyond whether a
// position is won, and it reaches the page only through the stage's surface, so it runs in node.
//
// A free drag is a piece to a target, judged by the pieces module. A path drag is a part whose
// reference point is projected onto a rail, judged by how far along the rail it was let go, with a
// flick carried along the rail and a bump at the rail's end. An aim is a handle at the tip of an
// arrow: the part does not move while the hand does, a preview shows where it would land, and the
// release plays the landing.
import type { Beat } from "../../engine/motion/beat";
import type { Cue } from "../../engine/motion/cues";
import type { Gesture } from "../../engine/motion/gesture";
import {
    alongPath,
    atLeast,
    dist,
    inside,
    isCircle,
    projectOnPath,
    type Pt,
    type Rect,
    type Shape,
} from "../../engine/motion/geometry";
import { land, nearestTarget, type Reach, type Target } from "./pieces";
import type { Mark, Scene, ShowOptions } from "../../engine/motion/scene";
import { SPRINGS, type Spring } from "../../engine/motion/spring";
import type { How, TraceEvent } from "../../engine/motion/trace";

/** What a landing means: the moves it plays, in order, or a sentence saying why it plays none. */
export interface Choice {
    moves: number[];
    refuse?: string;
}

/** A place along a path a released part may come to rest, and how far either side still counts. */
export interface Stop {
    s: number;
    reach: number;
    choice: Choice;
}

export interface Handle {
    /** The part that is lifted and moved. Empty for an aim whose part stays put. */
    key: string;
    /** Where a press picks this handle up, in sheet squares, any of them. The part's own box when absent. */
    hit?: Shape | Shape[];
    mode: "free" | "path" | "aim";
    /** Where the part rests now, as its top left, so a miss knows where home is. */
    home: Pt;
    /** For a path drag: the rail in sheet squares, and the part's reference point inside its box. */
    path?: Pt[];
    ref?: Pt;
    stops?: Stop[];
    /** For a free drag or an aim: shapes on the sheet carrying what landing in them means. */
    targets?: Target<Choice>[];
    /** For an aim: how far from the nearest target a release still counts, in squares. */
    reach?: number;
    /** What a tap on the handle plays, for a thing a child can tap as well as drag: the dice, which a tap throws. */
    tap?: Choice;
}

/** What a binding and the controller may ask of the stage. The stage in stage.ts is one. */
export interface Surface {
    show(scene: Scene, o?: ShowOptions): void;
    /** One of a part's own anchors, in sheet squares, as it is drawn right now. */
    anchor(key: string, name: string): Pt | null;
    at(key: string): Pt | null;
    /** How far a part is turned, in clockwise radians, as it is drawn now: a carried jug swaying. */
    turned(key: string): number;
    rect(key: string): Rect | null;
    z(key: string): number;
    place(key: string, p: Pt): void;
    /** `v` is how fast a hand let the part go, in squares a second, so it goes home with that speed. */
    glide(key: string, to: Pt, spring?: Spring, v?: Pt): void;
    follow(key: string, to: Pt): void;
    nudge(key: string, by: Pt): void;
    lift(key: string, on: boolean): void;
    tag(key: string, cls: string, on: boolean): void;
    /** Take a part off the sheet that no scene will name again, such as a ghost of a landing. */
    remove(key: string): void;
    marks(layer: string, marks: Mark[]): void;
    /** The width the stage has on the page, in pixels. */
    readonly room: number;
}

export interface Ctx {
    stage: Surface;
    /** The forty four pixel floor in squares at the current square size. */
    minTarget(): number;
}

/** Where a hand let a part go, how fast, and how far it was swaying, so the move's beat starts from there. */
export interface Release {
    key: string;
    at: Pt;
    v: Pt;
    angle: number;
}

/** One game bound to one round: the view's side of the model, with whatever identity the view keeps. */
export interface Session<P> {
    /**
     * What a move looks like, from the scene before it to the scene after, which the beat ends exactly
     * on. `hand` is set when the move was a part let go, and `seed` makes the same move look the same
     * when it is played again.
     */
    beat?(from: P, to: P, o: { was: Scene; now: Scene; hand: Release | null; seed: number }): Beat;
    /** What winning looks like, played after the move that won and ending on the same scene. */
    finish?(pos: P, o: { scene: Scene; seed: number }): Beat;
    /** Where the win's star lands, in sheet squares. */
    star?(pos: P): Pt | null;
    /** The board as parts. May call the stage to read anchors, and may show a first pass itself. */
    parts(pos: P): Scene;
    handles(pos: P): Handle[];
    /** Once a frame while anything moves, for parts that ride other parts. */
    frame?(pos: P): void;
    /** While a handle is held: what the release would do, drawn. `target` and `stop` are the nearest. */
    preview?(
        pos: P,
        h: Handle,
        at: { point: Pt; target: Target<Choice> | null; stop: Stop | null },
    ): void;
    unpreview?(): void;
    /** After a position is drawn: marks that belong to the position, a crash for one. */
    after?(pos: P): void;
    /** Which part a hand moved, so the view's identity follows the hand rather than the list. */
    prefer?(key: string): void;
    /** Springs for numeric settings that morph, and for parts that glide. */
    morph?: Record<string, Spring>;
    glide?: Spring;
}

export interface HandsHooks<P> {
    here(): P;
    session(): Session<P>;
    play(
        moves: number[],
        how: How,
        extra: Partial<TraceEvent>,
        prefer?: string,
        hand?: Release,
    ): void;
    /** A release that chose nothing: the page logs it and redraws, which sends the part home. */
    miss(extra: Partial<TraceEvent>): void;
    hear(c: Cue): void;
    say(text: string): void;
    reach(): Reach;
    /** The forty four pixel floor in squares: a part smaller than a finger is grown to it for a press. */
    floor?(): number;
}

interface Holding {
    h: Handle;
    /** Pointer offset from the part's top left at the press, so the part does not jump to the finger. */
    grab: Pt;
    bumped: boolean;
}

/** Whether a stop is within reach of a distance along a path. */
export const atStop = (s: number, stop: Stop): boolean => Math.abs(s - stop.s) <= stop.reach;

/** The nearest stop a release along a path lands in, or null. */
export function stopFor(s: number, stops: Stop[]): Stop | null {
    let best: Stop | null = null;
    for (const st of stops)
        if (atStop(s, st) && (!best || Math.abs(s - st.s) < Math.abs(s - best.s))) best = st;
    return best;
}

/**
 * How far along a path a release ends up when it was moving: the velocity is projected onto the
 * path's direction at the release point and carried on for a moment, so a carriage pushed with a
 * flick rolls the rest of the way to the points.
 */
export function rollAlong(path: Pt[], s: number, v: Pt, seconds: number): number {
    const here = alongPath(path, s),
        ahead = alongPath(path, s + 0.5);
    const dx = ahead.x - here.x,
        dy = ahead.y - here.y,
        len = Math.hypot(dx, dy) || 1;
    const along = (v.x * dx + v.y * dy) / len;
    return Math.max(0, s + along * seconds);
}

/** The length of a path in squares. */
export function pathLength(path: Pt[]): number {
    let sum = 0,
        last: Pt | null = null;
    for (const p of path) {
        if (last) sum += dist(last, p);
        last = p;
    }
    return sum;
}

/** Where a held handle may go, as marks: a ring or a box per target that plays something, the one under the hand filled. */
export function targetMarks(h: Handle, under: Target<Choice> | null): Mark[] {
    const out: Mark[] = [];
    for (const t of h.targets ?? []) {
        if (!t.carries.moves.length) continue;
        const on = under?.id === t.id;
        const s = t.shape;
        out.push(
            isCircle(s)
                ? { kind: "ring", x: s.cx, y: s.cy, r: s.r, on }
                : { kind: "box", x: s.x, y: s.y, w: s.w, h: s.h, on },
        );
    }
    return out;
}

export class Hands<P extends { won: boolean }> {
    private list: Handle[] = [];
    private on: Holding | null = null;
    private readonly stage: Surface;
    private readonly hooks: HandsHooks<P>;

    // Written out rather than as parameter properties, so node can strip the types in this file and
    // the tests can load it without a bundler.
    constructor(stage: Surface, hooks: HandsHooks<P>) {
        this.stage = stage;
        this.hooks = hooks;
    }

    get holding(): Handle | null {
        return this.on?.h ?? null;
    }

    /** Which handle a press at this point picks up, as an index into the current list, or null. */
    hit(p: Pt): string | null {
        this.list = this.hooks.session().handles(this.hooks.here());
        let best: { i: number; z: number } | null = null;
        for (let i = 0; i < this.list.length; i++) {
            const h = this.list[i];
            if (!h) continue;
            const own = this.stage.rect(h.key);
            const shapes = h.hit
                ? Array.isArray(h.hit)
                    ? h.hit
                    : [h.hit]
                : own
                  ? [atLeast(own, this.hooks.floor?.() ?? 0)]
                  : [];
            if (!shapes.some((shape) => inside(shape, p))) continue;
            const z = h.hit && !h.key ? 1000 : this.stage.z(h.key);
            if (!best || z > best.z) best = { i, z };
        }
        return best ? String(best.i) : null;
    }

    /** Rings for where a held handle may go, with the one under the hand filled. */
    showTargets(h: Handle | null, under: Target<Choice> | null): void {
        this.stage.marks("targets", h ? targetMarks(h, under) : []);
    }

    private refPoint(h: Handle): Pt {
        const at = this.stage.at(h.key) ?? h.home;
        return { x: at.x + (h.ref?.x ?? 0), y: at.y + (h.ref?.y ?? 0) };
    }

    /** Where along its path a part is right now. */
    private sNow(h: Handle): number {
        return h.path ? projectOnPath(this.refPoint(h), h.path).s : 0;
    }

    gesture(g: Gesture, key: string | null): void {
        const pos = this.hooks.here();
        const session = this.hooks.session();
        if (g.kind === "drag-start") {
            const h = key === null ? undefined : this.list[Number(key)];
            if (!h || pos.won) return;
            const at = h.key ? (this.stage.at(h.key) ?? h.home) : { x: g.fromX, y: g.fromY };
            this.on = { h, grab: { x: g.fromX - at.x, y: g.fromY - at.y }, bumped: false };
            if (h.key && h.mode !== "aim") this.stage.lift(h.key, true);
            this.hooks.hear("lift");
            this.hooks.say("");
            this.showTargets(h, null);
            return;
        }
        if (g.kind === "hold" || g.kind === "tap") {
            const h = key === null ? undefined : this.list[Number(key)];
            if (g.kind === "tap" && h?.tap?.moves.length && !pos.won) {
                this.hooks.play(h.tap.moves, "tap", { piece: h.key }, h.key);
                this.hooks.hear("place");
                return;
            }
            if (h && !pos.won) this.showTargets(h, null);
            if (g.kind === "tap")
                setTimeout(() => {
                    if (!this.on) this.showTargets(null, null);
                }, 900);
            return;
        }
        const held = this.on;
        if (!held) return;
        const { h } = held;
        if (g.kind === "drag") {
            if (h.mode === "free") {
                this.stage.place(h.key, { x: g.x - held.grab.x, y: g.y - held.grab.y });
                const under = land(
                    { x: g.x, y: g.y, vx: 0, vy: 0 },
                    h.targets ?? [],
                    this.hooks.reach(),
                ).target;
                this.showTargets(h, under);
                session.preview?.(pos, h, { point: { x: g.x, y: g.y }, target: under, stop: null });
            } else if (h.mode === "path" && h.path) {
                // The finger can be anywhere; the part is where the rail is nearest to it.
                const p = projectOnPath({ x: g.x, y: g.y }, h.path);
                const ref = alongPath(h.path, p.s);
                this.stage.place(h.key, { x: ref.x - (h.ref?.x ?? 0), y: ref.y - (h.ref?.y ?? 0) });
                // Pushing on past the end of the rail is a bump against the buffer, said once per push.
                const end = h.path[h.path.length - 1] ?? ref,
                    before = h.path[h.path.length - 2] ?? end;
                const ex = end.x - before.x,
                    ey = end.y - before.y,
                    el = Math.hypot(ex, ey) || 1;
                const beyond = ((g.x - end.x) * ex + (g.y - end.y) * ey) / el;
                if (p.s >= pathLength(h.path) - 1e-6 && beyond > 0.6 && !held.bumped) {
                    held.bumped = true;
                    this.hooks.hear("bump");
                    this.stage.nudge(h.key, { x: (ex / el) * 0.25, y: (ey / el) * 0.25 });
                } else if (beyond < 0.3) held.bumped = false;
                session.preview?.(pos, h, {
                    point: { x: g.x, y: g.y },
                    target: null,
                    stop: stopFor(p.s, h.stops ?? []),
                });
            } else if (h.mode === "aim") {
                const near = nearestTarget({ x: g.x, y: g.y }, h.targets ?? []);
                const under = near && near.d <= (h.reach ?? 1) ? near.target : null;
                this.showTargets(h, under);
                session.preview?.(pos, h, { point: { x: g.x, y: g.y }, target: under, stop: null });
            }
            return;
        }
        // The pointer is up, one way or another. A part that is not about to be played goes home on
        // the slower spring, and the redraw that follows a miss finds it already on its way.
        this.on = null;
        if (h.key) this.stage.lift(h.key, false);
        this.showTargets(null, null);
        session.unpreview?.();
        const v = g.kind === "drag-end" ? { x: g.vx, y: g.vy } : { x: 0, y: 0 };
        const hand: Release | undefined =
            h.key && h.mode !== "aim"
                ? {
                      key: h.key,
                      at: this.stage.at(h.key) ?? h.home,
                      v,
                      angle: this.stage.turned(h.key),
                  }
                : undefined;
        const home = (): void => {
            if (hand) this.stage.glide(hand.key, h.home, SPRINGS.back, v);
        };
        if (g.kind === "cancel") {
            home();
            this.hooks.miss({ how: "drag", piece: h.key, landing: "miss" });
            return;
        }
        if (h.mode === "free") {
            const landing = land(
                { x: g.x, y: g.y, vx: g.vx, vy: g.vy },
                h.targets ?? [],
                this.hooks.reach(),
            );
            const choice = landing.target?.carries ?? null;
            if (choice && choice.moves.length) {
                this.hooks.play(
                    choice.moves,
                    landing.how === "flick" ? "flick" : "drag",
                    { piece: h.key, to: landing.target?.id, landing: landing.how },
                    h.key,
                    hand,
                );
                this.hooks.hear("place");
                return;
            }
            home();
            this.hooks.say(choice?.refuse ?? "");
            this.hooks.hear(choice ? "nope" : "back");
            this.hooks.miss({
                how: "drag",
                piece: h.key,
                to: landing.target?.id,
                landing: landing.how,
            });
            return;
        }
        if (h.mode === "path" && h.path) {
            const s0 = this.sNow(h);
            const s = g.flick ? rollAlong(h.path, s0, { x: g.vx, y: g.vy }, 0.3) : s0;
            const stop = stopFor(Math.min(s, pathLength(h.path)), h.stops ?? []);
            if (stop && stop.choice.moves.length) {
                this.hooks.play(
                    stop.choice.moves,
                    g.flick ? "flick" : "drag",
                    { piece: h.key, landing: g.flick ? "flick" : "on" },
                    h.key,
                    hand,
                );
                this.hooks.hear("place");
                return;
            }
            home();
            this.hooks.say(stop?.choice.refuse ?? "");
            this.hooks.hear(stop ? "nope" : "back");
            this.hooks.miss({ how: "drag", piece: h.key, landing: "miss" });
            return;
        }
        const near = nearestTarget({ x: g.x, y: g.y }, h.targets ?? []);
        const target = near && near.d <= (h.reach ?? 1) ? near.target : null;
        if (near && target && target.carries.moves.length) {
            this.hooks.play(
                target.carries.moves,
                "drag",
                { piece: h.key, to: target.id, landing: near.d === 0 ? "on" : "near" },
                h.key,
            );
            this.hooks.hear("place");
            return;
        }
        this.hooks.say(target?.carries.refuse ?? "");
        this.hooks.hear(target ? "nope" : "back");
        this.hooks.miss({ how: "drag", piece: h.key, landing: "miss" });
    }
}
