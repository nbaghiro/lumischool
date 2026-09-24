// Row to the jetty: row a boat along the river and bring its bow to rest touching the jetty.
//
// The child drags back through the water to drive the oars and brings the finger forward again to
// recover, or holds space for a drive and lets go to recover. A drive adds speed by how long it was
// and whether it came in time with the glide: a catch while the boat still surges from the last drive
// splashes and wastes its push, and one long after lets the boat slow first. Between strokes the boat
// glides, slowed by the water and on later levels pushed back by a current. The bow has to come to rest
// touching the jetty, or tie up at a buoy: too fast and it bumps the jetty and comes away backwards, too
// slow and it stops short and needs another stroke, so the last strokes are a judgement of how far a
// glide will carry. The posts along the bank are marked in metres. A press that first drags forward, or
// the left arrow, backs water. See .docs/games.md.
import { follow, type Cam } from "../../engine/motion/camera";
import { drive, glide, meet, timing, type Rhythm, type Timing } from "../../engine/motion/stroke";
import { knob } from "../../engine/motion/tune";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface RowLevel extends ActionLevel {
    /** Metres of river marked with posts, from the start. */
    metres: number;
    /** Where the bow has to come to rest, in metres, and what is there. */
    target: number;
    end: "jetty" | "buoy";
    /** A post every this many metres. */
    every: number;
    /** Which posts carry their number: every one, the tens, or only the start, the middle and the end. */
    labels: "all" | "tens" | "halves";
    /** Metres a second the river pushes the boat back. */
    current: number;
    /** The line over the field until the first stroke. */
    prompt: string;
    done: string;
}

export const ROW_LEVELS: Levels<RowLevel> = [
    {
        title: "One hundred metres",
        grades: [1, 2],
        goal: "Row to the jetty at 100 metres and stop with the bow touching it.",
        prompt: "Drag back through the water to row. Stop with the bow on the jetty.",
        done: "The bow is touching the jetty at 100 metres.",
        metres: 100,
        target: 100,
        end: "jetty",
        every: 10,
        labels: "all",
        current: 0,
    },
    {
        title: "Fifty metres in fives",
        grades: [1, 2],
        goal: "Row to the jetty at 50 metres and stop with the bow touching it. The posts are 5 metres apart.",
        prompt: "The posts are 5 metres apart. Stop with the bow on the jetty.",
        done: "The bow is touching the jetty at 50 metres.",
        metres: 50,
        target: 50,
        end: "jetty",
        every: 5,
        labels: "all",
        current: 0,
    },
    {
        title: "Only some numbers",
        grades: [2, 3],
        goal: "Row to the jetty at 100 metres. Only 0, 50 and 100 are written on the posts.",
        prompt: "Only three posts have numbers. Stop with the bow on the jetty.",
        done: "The bow is touching the jetty at 100 metres.",
        metres: 100,
        target: 100,
        end: "jetty",
        every: 10,
        labels: "halves",
        current: 0,
    },
    {
        title: "Against the current",
        grades: [2, 3],
        goal: "Row to the jetty at 100 metres. The river pushes the boat back.",
        prompt: "The river pushes the boat back, so a glide carries less.",
        done: "The bow is touching the jetty at 100 metres, against the current.",
        metres: 100,
        target: 100,
        end: "jetty",
        every: 10,
        labels: "all",
        current: 0.35,
    },
    {
        title: "The buoy on 64",
        grades: [3, 4],
        goal: "Row to the buoy at 64 metres and tie up to it. If you row past it, back water.",
        prompt: "Tie up at the buoy on 64. Drag forward to back water.",
        done: "Tied up at the buoy on 64 metres.",
        metres: 80,
        target: 64,
        end: "buoy",
        every: 10,
        labels: "all",
        current: 0,
    },
    {
        title: "The buoy on 35, against the current",
        grades: [4, 4],
        goal: "Row to the buoy at 35 metres against the current. Only the tens are written on the posts.",
        prompt: "The buoy is on 35, and the river pushes the boat back.",
        done: "Tied up at the buoy on 35 metres.",
        metres: 50,
        target: 35,
        end: "buoy",
        every: 5,
        labels: "tens",
        current: 0.3,
    },
];

/** The rowing's tuning table. */
export const ROW = {
    push: knob(
        3.2,
        1.5,
        5,
        0.1,
        "metres a second",
        "a whole stroke from rest sets the boat off at about 2.5 metres a second",
    ),
    top: knob(
        6,
        3,
        9,
        0.25,
        "metres a second",
        "strokes in rhythm ease the boat towards this and never past it",
    ),
    water: knob(
        0.22,
        0.1,
        0.5,
        0.01,
        "a second",
        "a boat at 3 metres a second glides about 14 metres after its last stroke",
    ),
    early: knob(
        0.5,
        0.2,
        1,
        0.05,
        "seconds",
        "a catch sooner than this after the last drive splashes and wastes its push",
    ),
    late: knob(1.8, 1, 3, 0.1, "seconds", "a catch later than this has let the boat slow first"),
    rushed: knob(0.4, 0, 1, 0.05, "share", "a rushed stroke keeps this share of its push"),
    gentle: knob(
        0.7,
        0.3,
        1.5,
        0.05,
        "metres a second",
        "a gliding bow this slow or slower rests on the jetty or catches the buoy, which leaves about 3 metres to judge",
    ),
    bounce: knob(
        0.5,
        0.1,
        0.8,
        0.05,
        "share",
        "a bump sends the boat back with this share of its speed",
    ),
    drag: knob(5, 2, 8, 0.5, "squares", "a whole stroke is a drag about a hand long on a tablet"),
    hold: knob(
        0.6,
        0.3,
        1.2,
        0.05,
        "seconds",
        "space held this long is a whole stroke, about as long as a whole drag takes",
    ),
};

export const rhythmOf = (): Rhythm => ({
    push: ROW.push.value,
    top: ROW.top.value,
    window: [ROW.early.value, ROW.late.value],
    rushed: ROW.rushed.value,
});

const RATE = 60,
    DT = 1 / RATE;
/** In squares: the view, the world's height, the far bank, the water's surface and depth, where metre nought is, and how far the marked river spans. */
export const RIVER = {
    view: { w: 46, h: 27 },
    h: 30,
    bank: 12,
    surface: 17,
    deep: 12,
    x0: 8,
    span: 31,
} as const;
/**
 * The boat, in squares: how wide the `rowboat` drawing is placed, and its box, waterline and bow as
 * the drawing lays them out, restated so the game can float it and find its bow. A test holds them
 * to the drawing's own numbers.
 */
export const BOAT = { size: 6.5, box: { w: 8, h: 5 }, waterline: 3.6, bowAt: 7.75 } as const;
/** How far the bow is ahead of the boat's middle, and how far its box's foot sits under the surface, in squares. */
const BOW = (BOAT.bowAt - BOAT.box.w / 2) * (BOAT.size / BOAT.box.w),
    FOOT = (BOAT.box.h - BOAT.waterline) * (BOAT.size / BOAT.box.w);
/** The river post's height, tall enough that its plate stands clear of the boat and its rower, and how far its foot goes under. */
const POST = { tall: 6, under: 1 } as const;
/** The mooring buoy's waterline down its box, as the `mooringbuoy` drawing lays it out. */
const BUOY = { h: 3, waterline: 2.05 } as const;
const perOf = (L: RowLevel) => RIVER.span / L.metres;
/** Where a place on the river, in metres from the start, is across the world, in squares. */
export const xOf = (L: RowLevel, m: number): number => RIVER.x0 + m * perOf(L);
// The whole river is in view from the start, so the distance to the jetty can be judged by eye.
const WORLD = { w: RIVER.view.w, h: RIVER.h };

interface Stroke {
    kind: "ahead" | "astern";
    timing: Timing;
    length: number;
}

export interface RowState {
    level: number;
    L: RowLevel;
    /** Where the bow is, in metres from the start, and the boat's speed through the water, in metres a second. */
    x: number;
    v: number;
    steps: number;
    /** The drive in the water now, if any. */
    stroke: Stroke | null;
    /** The step the last drive ended on. */
    endedAt: number | null;
    /** Where the blades are, from nought at the catch to one at the finish. */
    oar: number;
    /** A held press: which way it drives, once it has moved, where across it last turned, and whether a bump has knocked the oars out of its hands. */
    hand: { turn: number; kind: "ahead" | "astern" | null; knocked: boolean } | null;
    keyWas: "ahead" | "astern" | null;
    strokes: number;
    rushed: number;
    bumps: number;
    /** Where the boat came to rest short the last two times, in metres, left faint on the water. */
    stops: number[];
    restFor: number;
    passed: boolean;
    cam: Cam;
    said: string;
    saidAt: number;
    touched: boolean;
    won: boolean;
    wonAt: number;
}

export function start(level: number): RowState {
    return startRowLevel(ROW_LEVELS[level] ?? ROW_LEVELS[0], level);
}

export function startRowLevel(L: RowLevel, level = 0): RowState {
    return {
        level,
        L,
        x: 0,
        v: 0,
        steps: 0,
        stroke: null,
        endedAt: null,
        oar: 0,
        hand: null,
        keyWas: null,
        strokes: 0,
        rushed: 0,
        bumps: 0,
        stops: [],
        restFor: 0,
        passed: false,
        cam: { x: RIVER.view.w / 2, y: RIVER.h / 2, zoom: 1 },
        said: "",
        saidAt: -999,
        touched: false,
        won: false,
        wonAt: -1,
    };
}

function tell(s: RowState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

/** The boat's speed over the river bed: its speed through the water less the current. */
export const groundSpeed = (s: RowState): number => s.v - s.L.current;

function catchAt(s: RowState, kind: "ahead" | "astern", out: Happening[]): void {
    const since = s.endedAt === null ? null : (s.steps - s.endedAt) / RATE;
    const t = kind === "astern" ? "in time" : timing(since, rhythmOf());
    s.stroke = { kind, timing: t, length: 0 };
    s.strokes++;
    s.touched = true;
    const blade = xOf(s.L, s.x) - BOW + 2;
    if (t === "rushed") {
        s.rushed++;
        out.push(
            { cue: "splash" },
            { burst: { kind: "splash", x: blade, y: RIVER.surface, n: 8 } },
        );
        if (s.rushed === 1)
            tell(s, "Too soon. Let the boat glide a moment before the next stroke.");
    } else
        out.push({ cue: "lift" }, { burst: { kind: "splash", x: blade, y: RIVER.surface, n: 3 } });
}

/** A piece of the drive in the water now, as a share of a whole stroke. A drive stops adding once it is whole. */
function pull(s: RowState, amount: number): void {
    const st = s.stroke;
    if (!st) return;
    const piece = Math.min(Math.max(0, 1 - st.length), amount);
    if (piece <= 0) return;
    st.length += piece;
    s.v = drive(s.v, st.kind === "ahead" ? piece : -piece, st.timing, rhythmOf());
    s.oar = Math.min(1, s.oar + piece);
    if (st.length >= 1) s.endedAt = s.steps;
}

function recover(s: RowState): void {
    if (!s.stroke) return;
    if (s.stroke.length < 1) s.endedAt = s.steps;
    s.stroke = null;
}

/** Squares a hand has to turn back by before a drive ends or a recovery catches, so a shaking hand is not a stroke. */
const TURN = 0.4;

function hands(s: RowState, pad: Pad, out: Happening[]): void {
    // Where it lifts is the hand's last place too: under reduced motion a moving finger runs no steps, so the whole drag arrives with the lift.
    const t = pad.touch ?? (s.hand ? pad.lifted : null);
    if (t) {
        const h = s.hand;
        if (!h) {
            s.hand = { turn: t.x, kind: null, knocked: false };
            s.touched = true;
        } else if (h.knocked) {
            // The rest of the press does nothing, so the drag going on after a bump is not a rushed stroke.
        } else if (!h.kind) {
            // A press drives the way it first moves: back through the water rows ahead, forward backs water.
            if (Math.abs(t.x - h.turn) > TURN) {
                h.kind = t.x < h.turn ? "ahead" : "astern";
                catchAt(s, h.kind, out);
                pull(s, Math.abs(t.x - h.turn) / ROW.drag.value);
                h.turn = t.x;
            }
        } else {
            // `turn` is the furthest the hand has gone in the drive, or in the recovery.
            const back = (t.x - h.turn) * (h.kind === "ahead" ? -1 : 1);
            if (s.stroke) {
                if (back > 0) {
                    pull(s, back / ROW.drag.value);
                    h.turn = t.x;
                } else if (back < -TURN) {
                    recover(s);
                    h.turn = t.x;
                }
            } else if (back < 0) h.turn = t.x;
            else if (back > TURN) {
                catchAt(s, h.kind, out);
                pull(s, back / ROW.drag.value);
                h.turn = t.x;
            }
        }
    }
    if (pad.lifted) {
        recover(s);
        s.hand = null;
    }
}

function keys(s: RowState, pad: Pad, out: Happening[]): void {
    if (pad.touch || s.hand) return;
    const want =
        pad.go || pad.holding.includes("right")
            ? "ahead"
            : pad.holding.includes("left")
              ? "astern"
              : null;
    if (want !== s.keyWas) {
        recover(s);
        if (want) catchAt(s, want, out);
        s.keyWas = want;
    }
    if (want && s.stroke) pull(s, DT / ROW.hold.value);
}

function tieUp(s: RowState, out: Happening[]): void {
    s.x = s.L.target;
    s.v = 0;
    s.stroke = null;
    s.won = true;
    s.wonAt = s.steps;
    tell(s, s.L.done);
    out.push(
        { cue: "win" },
        { burst: { kind: "sparkle", x: xOf(s.L, s.L.target), y: RIVER.surface - 1.5, n: 12 } },
    );
}

export function step(s: RowState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    const L = s.L;
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    if (!s.stroke || s.stroke.length >= 1) s.oar = Math.max(0, s.oar - DT * 2.2);
    if (!s.won) {
        const was = s.x,
            g = glide(s.v, DT, ROW.water.value, L.current);
        s.v = g.v;
        s.x += g.moved;
        if (s.x < 0) {
            s.x = 0;
            s.v = Math.max(0, s.v);
        }
        const ground = groundSpeed(s);
        // The bow comes to rest only gliding: oars still pulling ram the jetty and row past the buoy.
        const pulling = s.stroke !== null && s.stroke.length < 1;
        const gentle = pulling ? 0 : ROW.gentle.value;
        if (L.end === "jetty") {
            if (s.x >= L.target) {
                const m = meet(ground, gentle, ROW.bounce.value);
                if (m.bumped) {
                    tell(
                        s,
                        pulling
                            ? "The oars were still pulling, so the boat bumped the jetty. Let it glide the last bit."
                            : "Too fast. The boat bumped the jetty.",
                    );
                    recover(s);
                    if (s.hand) s.hand.knocked = true;
                    s.x = L.target - 0.05;
                    s.v = m.v + L.current;
                    s.bumps++;
                    out.push(
                        { cue: "bump" },
                        { shake: 0.3 },
                        { puff: { x: xOf(L, L.target), y: RIVER.surface - 0.4, n: 6 } },
                    );
                } else tieUp(s, out);
            }
        } else {
            const crossed =
                (was < L.target && s.x >= L.target) || (was > L.target && s.x <= L.target);
            // Drifting back on the current alone does not catch the buoy: the boat has to be backed onto it.
            if (crossed && Math.abs(ground) <= gentle && (ground > 0 || s.v < 0)) tieUp(s, out);
            else if (crossed && s.x > L.target && !s.passed) {
                s.passed = true;
                tell(s, "Past the buoy. Drag forward to back water.");
            }
            if (s.x < L.target - 1) s.passed = false;
            const end = (WORLD.w - 4 - RIVER.x0) / perOf(L);
            if (s.x > end) {
                s.x = end;
                s.v = Math.min(0, s.v);
            }
        }
        if (!s.won && !s.stroke && L.current === 0 && Math.abs(s.v) < 0.05) {
            if (++s.restFor === Math.round(RATE * 0.6) && s.x < L.target - 0.5 && s.strokes > 0) {
                s.stops = [s.x, ...s.stops].slice(0, 2);
                tell(
                    s,
                    `Stopped at ${metres(Math.round(s.x))}, ${metres(L.target - Math.round(s.x))} short of the ${L.end}.`,
                );
                out.push({ cue: "place" });
            }
        } else s.restFor = 0;
    }
    s.cam = follow(s.cam, wanted(s), { rate: 3, dt: DT, view: RIVER.view, world: WORLD });
    return out;
}

/** The camera looks a little ahead of the boat, further the faster it goes. */
const wanted = (s: RowState): Cam => ({
    x: xOf(s.L, s.x) - 2 + Math.max(0, Math.min(4, s.v)) * 1.5,
    y: RIVER.h / 2,
    zoom: 1,
});

const labelled = (L: RowLevel, m: number): boolean =>
    L.labels === "all" ||
    (L.labels === "tens" ? m % 10 === 0 : m === 0 || m === L.metres || m * 2 === L.metres);

/** What stands on the far bank at each level, from the shelf's river pieces, so the levels are different places along one river. */
const BANK: {
    art: string;
    params: Record<string, unknown>;
    size: number;
    x: number;
    lift?: number;
}[][] = [
    [
        { art: "firs", params: { count: 3, snow: 0 }, size: 8, x: 5 },
        { art: "hedge", params: { clumps: 4, berries: 4, gap: 0 }, size: 10, x: 24 },
        { art: "tree", params: { fruit: 0, fallen: 0, item: "apple" }, size: 6, x: 38 },
        { art: "firs", params: { count: 2, snow: 0 }, size: 6, x: 52 },
    ],
    [
        { art: "cottage", params: { windows: 2, lit: 1 }, size: 8, x: 8 },
        { art: "hedge", params: { clumps: 3, berries: 5, gap: 1 }, size: 9, x: 20 },
        { art: "heron", params: { facing: -1, reeds: 3 }, size: 4.5, x: 31, lift: -0.3 },
        { art: "firs", params: { count: 2, snow: 0 }, size: 6, x: 44 },
    ],
    [
        { art: "firs", params: { count: 2, snow: 0 }, size: 6, x: 4 },
        { art: "stile", params: { steps: 2 }, size: 4.5, x: 12 },
        { art: "tree", params: { fruit: 5, fallen: 1, item: "apple" }, size: 6, x: 22 },
        { art: "kingfisher", params: { flying: 0, facing: -1 }, size: 3.5, x: 32, lift: 1.2 },
        { art: "hedge", params: { clumps: 3, berries: 3, gap: 0 }, size: 8, x: 43 },
    ],
    [
        { art: "windmill", params: { sails: 4, turn: 0 }, size: 7, x: 6 },
        { art: "hedge", params: { clumps: 4, berries: 2, gap: 0 }, size: 10, x: 19 },
        { art: "birdhide", params: { slots: 3 }, size: 7, x: 33 },
        { art: "firs", params: { count: 2, snow: 0 }, size: 6, x: 45 },
    ],
    [
        { art: "barn", params: { windows: 2, hay: 1 }, size: 8, x: 7 },
        { art: "tree", params: { fruit: 0, fallen: 0, item: "pear" }, size: 6, x: 18 },
        { art: "heron", params: { facing: 1, reeds: 3 }, size: 4.5, x: 27, lift: -0.3 },
        { art: "hedge", params: { clumps: 3, berries: 4, gap: 0 }, size: 8, x: 40 },
    ],
    [
        { art: "firs", params: { count: 3, snow: 0 }, size: 8, x: 6 },
        { art: "cottage", params: { windows: 3, lit: 0 }, size: 8, x: 19 },
        { art: "kingfisher", params: { flying: 1, facing: 1 }, size: 3.5, x: 30, lift: 2.5 },
        { art: "stile", params: { steps: 3 }, size: 4.5, x: 38 },
        { art: "tree", params: { fruit: 0, fallen: 0, item: "apple" }, size: 6, x: 48 },
    ],
];

/** Where reeds stand at the water's edge at each level, in squares across, kept away from the finish. */
const REEDS: [number, number][][] = [
    [
        [4, 0.15],
        [30, -0.2],
    ],
    [
        [3, 0.2],
        [21, 0.1],
    ],
    [
        [5, -0.15],
        [26, 0.2],
    ],
    [
        [3.5, 0.15],
        [17, -0.1],
        [33, 0.2],
    ],
    [
        [5, 0.2],
        [43, -0.15],
    ],
    [
        [3, 0.15],
        [24, 0.2],
    ],
];

export function frame(s: RowState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    for (let x0 = 0; x0 < WORLD.w; x0 += 20) {
        const w = Math.min(20, WORLD.w - x0);
        sprites.push({
            key: `ground:${x0}`,
            art: "arcade.ground",
            params: { w },
            seed: 60 + x0,
            x: x0 + w / 2,
            y: RIVER.bank + 1.1,
            z: 0,
            still: true,
        });
    }
    sprites.push(
        {
            key: "cloud:0",
            art: "cloud",
            params: { puffs: 4, rain: 0 },
            seed: 11,
            x: 12,
            y: 4,
            z: 0,
            still: true,
        },
        {
            key: "cloud:1",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 12,
            x: 40,
            y: 3,
            z: 0,
            still: true,
        },
    );
    (BANK[s.level] ?? BANK[0] ?? []).forEach((b, i) => {
        sprites.push({
            key: `bank:${i}`,
            art: b.art,
            params: b.params,
            seed: 13 + i,
            size: b.size,
            x: b.x,
            y: RIVER.bank - (b.lift ?? 0),
            stand: true,
            z: 1,
            still: true,
        });
    });
    for (let x0 = 0; x0 < WORLD.w; x0 += 16) {
        const across = Math.min(16, WORLD.w - x0);
        sprites.push({
            key: `sea:${x0}`,
            art: "sea",
            params: { across, deep: RIVER.deep, x0, bed: true },
            seed: 900 + x0,
            x: x0 + across / 2,
            y: RIVER.surface - 0.5 + RIVER.deep / 2,
            z: 10,
            still: true,
        });
    }
    if (L.current > 0) {
        // The current is streaks that drift back along the surface, four squares to a repeat; still under reduced motion.
        const drift = rest ? 0 : (s.steps * DT * L.current * perOf(L)) % 4,
            len = WORLD.w + 8;
        sprites.push({
            key: "current",
            art: "current",
            params: { length: len, facing: -1 },
            seed: 19,
            x: len / 2 - 4 - drift,
            y: RIVER.surface + 0.55,
            z: 11,
        });
    }
    (REEDS[s.level] ?? []).forEach(([x, lean], i) => {
        sprites.push({
            key: `reeds:${i}`,
            art: "reeds",
            params: { stems: 5 + (i % 3), lean },
            seed: 40 + i,
            size: 3.5,
            x,
            y: RIVER.surface + 0.4,
            stand: true,
            z: 13,
            still: true,
        });
    });
    for (let m = 0; m <= L.metres; m += L.every) {
        const x = xOf(L, m);
        sprites.push({
            key: `post:${m}`,
            art: "riverpost",
            params: { n: labelled(L, m) ? String(m) : "", tall: POST.tall },
            seed: 200 + m,
            size: 2,
            x,
            y: RIVER.surface + POST.under,
            stand: true,
            z: 12,
            still: true,
        });
    }
    const at = xOf(L, L.target);
    if (L.end === "jetty") {
        sprites.push({
            key: "jetty",
            art: "jetty",
            params: { posts: 2 },
            seed: 30,
            x: at + 3,
            y: RIVER.surface + 1.6,
            stand: true,
            z: 14,
            still: true,
        });
    } else {
        const bob = rest || s.won ? 0 : Math.sin(s.steps / 25) * 0.08;
        sprites.push({
            key: "buoy",
            art: "mooringbuoy",
            params: { n: String(L.target) },
            seed: 31,
            size: 3,
            x: at + 0.9,
            y: RIVER.surface - (BUOY.waterline - BUOY.h / 2) + bob,
            z: 14,
        });
    }
    for (const [i, m] of s.stops.entries()) {
        const x = xOf(L, m);
        marks.push({
            kind: "line",
            a: { x, y: RIVER.surface - 1.2 - i * 0.2 },
            b: { x, y: RIVER.surface + 1 },
            style: "aim",
        });
    }
    // Feather the blade above the water on recovery, including after a held key finishes its drive.
    const bow = xOf(L, s.x),
        mid = bow - BOW,
        stroke = Math.round((s.stroke?.kind === "astern" ? 1 - s.oar : s.oar) * 32) / 32,
        lifted = s.stroke === null || s.stroke.length >= 1 ? 1 : 0;
    sprites.push({
        key: "boat",
        art: "rowboat",
        params: {
            stroke,
            lifted,
            facing: 1,
            tone: 4,
            hair: "curly",
            colour: "black",
            top: "berry",
            cheer: s.won ? 1 : 0,
        },
        seed: 40,
        size: BOAT.size,
        x: mid,
        y: RIVER.surface + FOOT,
        stand: true,
        z: 20,
        live: true,
    });
    if (s.won)
        marks.push({
            kind: "line",
            a: { x: bow - 0.3, y: RIVER.surface - 1.1 },
            b: {
                x: L.end === "jetty" ? at + 0.6 : at + 0.9,
                y: L.end === "jetty" ? RIVER.surface - 1.9 : RIVER.surface - 1.6,
            },
            bend: -0.25,
            style: "thin",
        });
    const camera = rest ? { ...wanted(s) } : { ...s.cam };
    return { sprites, marks, camera, view: { ...RIVER.view }, world: { ...WORLD } };
}

const metres = (n: number): string => `${n} metre${n === 1 ? "" : "s"}`;

export function say(s: RowState): string {
    const L = s.L;
    if (s.won) return L.done;
    const ground = groundSpeed(s),
        at = Math.round(s.x),
        left = L.target - at;
    // Held at the start, the current cannot move the boat, so it is still.
    const speed =
        Math.abs(ground) < 0.05 || (s.x <= 0 && ground < 0)
            ? "still"
            : `going ${ground > 0 ? "forward" : "backward"} at ${Math.abs(ground).toFixed(1)} metres a second`;
    const gap =
        left === 0
            ? "level with the bow"
            : `${metres(Math.abs(left))} ${left > 0 ? "ahead" : "behind"}`;
    const where = `The bow is at ${metres(at)}, ${speed}. The ${L.end} is at ${metres(L.target)}, ${gap}.`;
    return [s.said, where, L.current ? "The river pushes the boat back." : ""]
        .filter(Boolean)
        .join(" ");
}

export const rowGame: ActionGame<RowState> = {
    id: "straight",
    title: "Row to the jetty",
    group: "action",
    levels: ROW_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    plays: { activity: "race.stop-on-the-line", levels: [0, 1] },
    cover: {
        art: "rowboat",
        params: {
            stroke: 0.5,
            lifted: 0,
            facing: 1,
            tone: 4,
            hair: "curly",
            colour: "black",
            top: "berry",
            cheer: 0,
        },
    },
    hint: "Hold Row forwards for a stroke, then release to get ready for the next. Hold Back water to slow down or reverse. You can also drag backwards through the water and forwards to recover, or use the left and right arrow keys.",
    controls: { arrows: { left: "Back water", right: "Row forwards" } },
    start,
    step,
    frame,
    say,
    cancelInput(s) {
        recover(s);
        s.hand = null;
        s.keyWas = null;
    },
    tuning: ROW,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    // Under reduced motion a press is a whole stroke, and the glide is worked out to rest before the next.
    still: {
        press: () => Math.round(RATE * ROW.hold.value),
        settling: (s) => !s.won && (s.stroke !== null || Math.abs(s.v) > 0.1),
    },
};
