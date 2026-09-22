// What moves in the journal’s worlds: each drawing’s motion read off its own declaration, the budget
// every declaration keeps, whether the child is working, and the rest a rare sight waits for. Pure, so
// a test holds it to .docs/motion.md. A drawing's own idle is played from its declaration by
// engine/ui/animate.ts; what is read here is what a world adds to that (a traveller's bob, a puff of
// smoke, the answer to a tap). The declarations come in as a lookup, each drawing's own (declaredOf
// in engine/ui/drawings.ts).
import type { Animation, React } from "./animation";
import type { Pt, Rect } from "./geometry";

/**
 * Coded drawings whose parts a world plays too, each part as its declaration says: a seat that
 * swings, a flag that flies, lights and a lantern's glow that brighten and dim, sails that turn.
 * Added a drawing at a time, as each is looked at moving in a world.
 */
export const WORLD_PARTS = new Set([
    "swing",
    "carousel",
    "tower",
    "windmill",
    "lantern",
    "lamppost",
    "cablecar",
    "shootingstar",
    "owlflying",
    "starlings",
]);

/** A coded part as a world plays it: a turn about its pivot, a dimming, or a steady turn at a revolution a period. */
interface CodedPart {
    name: string;
    kind: "sway" | "twinkle" | "spin";
    deg?: number;
    range?: [number, number];
    dim?: number;
    period: number;
}

/**
 * A drawing's declaration as a world reads it: a float or a puff for the whole drawing, flags and a
 * tail for the parts of a hand-drawn file, and the answer to a tap. Distances are world units and
 * periods one way. The float is what a map's traveller bobs by (school/worlds/life.ts) and the puff
 * and the tap are the world's own (engine/ui/player.ts); a drawing's idle is played from the
 * declaration itself by engine/ui/animate.ts, so this is also the projection the budget below is
 * held against.
 */
export interface DrawingMotion {
    idle?:
        | {
              kind: "float";
              lift?: number;
              drift?: number;
              deg?: number;
              pivot?: number;
              period: number;
          }
        | { kind: "puff"; at: string; every: number; rise: number; drift: number };
    react?: React;
    parts?: {
        flags?: {
            first: number;
            every: number;
            count: number;
            deg: number;
            period: number;
            wave: number;
        };
        tail?: { first: number; count: number; deg: number; period: number };
    };
    coded?: CodedPart[];
}

/** The budget every world declaration keeps. The test holds each one to it. */
export const MOTION_BUDGET = {
    /** The most a drawing turns, either way, in degrees. */
    deg: 5,
    /** The most a small part of one turns (a flag on a string, a kite's tail), which is further for being small. */
    partDeg: 16,
    /** The most a drawing travels up and down, or side to side, either way, in world units: under a square. */
    lift: 16,
    /** How much a lift or a drift grows as the camera draws back (the size rule in engine/motion/animation.ts), so the reach stays inside the clearance. */
    liftGrow: 2.4,
    /** A drawing's periods, one way: slow enough to stay calm, quick enough to be seen within a few seconds of looking. */
    period: [2.5, 9] as const,
    /** A part's periods, one way: a flag flutters faster than a boat rocks. */
    partPeriod: [0.9, 4] as const,
} as const;

/** A run of consecutive strokes, or null: the world's styles group a hand-drawn file's parts that way. */
const runOf = (of: number[]): number | null =>
    of.every((k, i) => k === (of[0] ?? 0) + i) ? (of[0] ?? 0) : null;

/**
 * The part of a declaration a world reads: a float in world units, a puff, flags and a tail named by
 * the order of a file's paths, and a tap's answer. The player draws all of it from the declaration
 * itself; what a world takes from here is the traveller's bob, the puff and the tap, and the budget
 * test holds every declaration to MOTION_BUDGET through this projection.
 */
export function worldMotion(a: Animation): DrawingMotion | undefined {
    const out: DrawingMotion = {};
    const body = Array.isArray(a.body) ? a.body[0] : a.body;
    if (body?.is === "float" && body.units) {
        out.idle = { kind: "float", period: (body.period ?? 7.4) / 2 };
        if (body.pivot) out.idle.pivot = body.pivot[1];
        if (body.lift) out.idle.lift = body.lift;
        if (body.dx) out.idle.drift = body.dx;
        if (body.deg) out.idle.deg = body.deg;
    }
    if (a.puff) out.idle = { kind: "puff", ...a.puff };
    const f = a.parts?.flag;
    if (f?.is === "sway" && f.paths && f.of?.length) {
        const first = runOf(f.of[0] ?? []),
            every = f.of[0]?.length ?? 0;
        if (
            first !== null &&
            f.of.every((run, k) => runOf(run) === first + k * every && run.length === every)
        ) {
            out.parts = {
                ...out.parts,
                flags: {
                    first,
                    every,
                    count: f.of.length,
                    deg: f.deg ?? 0,
                    period: (f.period ?? 2.6) / 2,
                    wave: f.wave ?? 0,
                },
            };
        }
    }
    const t = a.parts?.tail;
    const tailRun = t?.of?.[0];
    if (t?.is === "sway" && t.paths && tailRun && runOf(tailRun) !== null) {
        out.parts = {
            ...out.parts,
            tail: {
                first: tailRun[0] ?? 0,
                count: tailRun.length,
                deg: t.deg ?? 0,
                period: (t.period ?? 4.6) / 2,
            },
        };
    }
    if (a.react) out.react = a.react;
    return out.idle || out.parts || out.react ? out : undefined;
}

/** A drawing's declared motion by its id, or undefined for a drawing that declares none. */
export type Declared = (id: string) => Animation | undefined;

/** A drawing's declared motion, by the name the world gives it: a coded visual's id, or a hand-drawn file's name. */
export function motionOf(ref: string, declared: Declared): DrawingMotion | undefined {
    const a =
        declared(ref) ??
        declared(`svg.${ref}`) ??
        declared(`strokes.${ref}`) ??
        declared(`excalidraw.${ref}`);
    if (!a) return undefined;
    const m = worldMotion(a);
    if (!WORLD_PARTS.has(ref)) return m;
    const coded: CodedPart[] = [];
    for (const [name, part] of Object.entries(a.parts ?? {})) {
        if (part.of || part.pick) continue;
        // a world's budget: a part turns at most a revolution in twenty seconds, whatever the shelf allows
        if (part.is === "spin")
            coded.push({ name, kind: "spin", period: Math.max(20, part.rev ?? 20) });
        else if (part.is === "sway" || part.is === "flap")
            coded.push({
                name,
                kind: "sway",
                deg: part.deg ?? 6,
                range: part.range,
                period: (part.period ?? 3) / 2,
            });
        else if (part.is === "twinkle")
            coded.push({
                name,
                kind: "twinkle",
                dim: part.dim ?? 0.3,
                period: (part.period ?? 2.9) / 2,
            });
    }
    return coded.length ? { ...m, coded } : m;
}

/**
 * Whether the child is working: a pencil or highlighter in hand, or the camera at reading distance
 * with a sheet under the middle of the screen and covering at least a quarter of it. Pure, so the
 * test can hold it to the screens it was tuned on. A sheet covering a third was tried first and
 * missed: at 1440 pixels the reading camera shows margins either side and paper is 34 per cent.
 */
export function isWorking(o: {
    view: Rect;
    centre: Pt;
    sheets: Rect[];
    tool: string;
    reading: boolean;
}): boolean {
    if (o.tool !== "move") return true;
    if (!o.reading) return false;
    let cover = 0,
        centred = false;
    for (const s of o.sheets) {
        const w = Math.min(o.view.x + o.view.w, s.x + s.w) - Math.max(o.view.x, s.x);
        const h = Math.min(o.view.y + o.view.h, s.y + s.h) - Math.max(o.view.y, s.y);
        if (w > 0 && h > 0) cover += w * h;
        if (
            o.centre.x >= s.x &&
            o.centre.x <= s.x + s.w &&
            o.centre.y >= s.y &&
            o.centre.y <= s.y + s.h
        )
            centred = true;
    }
    return centred && cover / Math.max(1, o.view.w * o.view.h) > 0.25;
}

/**
 * The time a child has spent resting in a world, away from its sheets, counted in seconds while the
 * page is visible. A rare sight waits for enough of it, happens once a visit, and is never announced,
 * counted or recorded, so a child who was not looking loses nothing.
 */
export class Lingering {
    private spent = 0;
    private fired = false;
    readonly need: number;
    constructor(need: number) {
        this.need = need;
    }
    /** Count a second, and say whether this is the second the rare sight should begin. */
    tick(resting: boolean): boolean {
        if (this.fired || !resting) return false;
        this.spent += 1;
        if (this.spent < this.need) return false;
        this.fired = true;
        return true;
    }
}
