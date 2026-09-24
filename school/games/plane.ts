// The paper plane: fly through the hoop at the height the flag asks for, on poles marked as number lines.
//
// The plane flies on by itself. Holding a finger anywhere on the sky, the big button or the space
// bar lifts it, and letting go lets it glide down, with its nose along its path and a climb costing
// it speed that a dive gives back. Poles stand along the way, each marked from its foot to its top
// as a number line, with hoops hung at a few heights and a flag at the top saying which height to
// go through. So where a number is on a line is the aim, and the steering is the answer: seven on a
// line to ten, seventy on a line to a hundred marked in tens, three eighths on a line from nought to
// one, and seven tenths or two fifths on one marked in tenths. The course goes round, so a flag
// missed comes round again, and the round is won when every flag has been flown through. Nothing is
// lost and nothing is timed: a hoop at the wrong height is said and passed, and a plane that skims
// the grass bounces up again.
//
// The world is layered: far hills and houses move by a share of the camera's travel and the grass in
// front passes quicker, so the plane's speed is felt without the child having to watch it.
import { follow, type Cam } from "../../engine/motion/camera";
import { glide, noseOf, within, type Flyer, type Wing } from "../../engine/motion/glide";
import { knob } from "../../engine/motion/tune";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { crossing, lengths, row, type Eye, type Row } from "./scenery";

/** A gate: the flag's words, the mark it means, and the marks the hoops hang at. */
interface Gate {
    flag: string;
    target: number;
    hoops: number[];
}

export interface PlaneLevel extends ActionLevel {
    /** The pole's number line: how many steps it is marked in, and the label at each mark ("" for none). */
    ticks: number;
    labels: string[];
    /** A mark's value in the words the sentence uses. */
    words(this: void, tick: number): string;
    gates: Gate[];
    look: Look;
    done: string;
}

type Look = "meadow" | "harbour" | "mountains" | "town";

const upto = (n: number, label: (i: number) => string) =>
    Array.from({ length: n + 1 }, (_, i) => label(i));
const ends = (n: number, mid?: string) =>
    upto(n, (i) => (i === 0 ? "0" : i === n ? "1" : i * 2 === n && mid ? mid : ""));
const eighths = ["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "1"];

export const PLANE_LEVELS: Levels<PlaneLevel> = [
    {
        title: "Up to ten",
        goal: "Fly through the hoop at the height on the flag. Hold to climb, let go to glide.",
        grades: [1, 1],
        ticks: 10,
        labels: upto(10, String),
        words: String,
        look: "meadow",
        gates: [
            { flag: "7", target: 7, hoops: [3, 7, 9] },
            { flag: "4", target: 4, hoops: [2, 4, 8] },
            { flag: "9", target: 9, hoops: [5, 7, 9] },
            { flag: "2", target: 2, hoops: [2, 6, 8] },
            { flag: "6", target: 6, hoops: [4, 6, 10] },
            { flag: "3", target: 3, hoops: [1, 3, 5] },
        ],
        done: "Every flag, flown through.",
    },
    {
        title: "Tens to a hundred",
        goal: "The poles go up in tens to 100. Fly through the height on each flag.",
        grades: [2, 2],
        ticks: 10,
        labels: upto(10, (i) => (i === 0 ? "0" : i === 5 ? "50" : i === 10 ? "100" : "")),
        words: (i) => String(i * 10),
        look: "harbour",
        gates: [
            { flag: "70", target: 7, hoops: [3, 7, 9] },
            { flag: "30", target: 3, hoops: [3, 5, 8] },
            { flag: "90", target: 9, hoops: [6, 8, 9] },
            { flag: "20", target: 2, hoops: [2, 4, 7] },
            { flag: "60", target: 6, hoops: [4, 6, 8] },
            { flag: "40", target: 4, hoops: [4, 5, 7] },
        ],
        done: "Every flag, flown through, from twenty to ninety.",
    },
    {
        title: "Halves, quarters and eighths",
        goal: "The poles go from 0 to 1 in eighths. Fly through the fraction on each flag.",
        grades: [3, 3],
        ticks: 8,
        labels: ends(8, "1/2"),
        words: (i) => eighths[i] ?? "",
        look: "mountains",
        gates: [
            { flag: "3/4", target: 6, hoops: [2, 6, 7] },
            { flag: "1/4", target: 2, hoops: [2, 4, 6] },
            { flag: "3/8", target: 3, hoops: [3, 5, 6] },
            { flag: "7/8", target: 7, hoops: [5, 6, 7] },
            { flag: "5/8", target: 5, hoops: [3, 5, 7] },
            { flag: "1/2", target: 4, hoops: [2, 4, 5] },
        ],
        done: "Every flag, flown through: quarters and eighths on the same line.",
    },
    {
        title: "Tenths",
        goal: "The poles go from 0 to 1 in tenths. Fly through the number on each flag, however it is written.",
        grades: [4, 4],
        ticks: 10,
        labels: ends(10),
        words: (i) => (i === 10 ? "1" : `0.${i}`),
        look: "town",
        gates: [
            { flag: "0.7", target: 7, hoops: [3, 7, 9] },
            { flag: "3/10", target: 3, hoops: [3, 5, 8] },
            { flag: "2/5", target: 4, hoops: [2, 4, 6] },
            { flag: "0.9", target: 9, hoops: [6, 8, 9] },
            { flag: "1/2", target: 5, hoops: [3, 5, 7] },
            { flag: "0.1", target: 1, hoops: [1, 2, 4] },
        ],
        done: "Every flag, flown through: seven tenths, three tenths, two fifths, nine tenths, a half and one tenth.",
    },
];

/** The plane's tuning table, read every step. */
export const PLANE = {
    cruise: knob(
        5.5,
        3,
        9,
        0.5,
        "squares a second",
        "about four seconds from one pole to the next, time to read the flag and pick the hoop",
    ),
    lift: knob(
        28,
        12,
        50,
        1,
        "squares a second, each second",
        "a hold turns a glide into a climb in about a third of a second",
    ),
    fall: knob(
        11,
        5,
        20,
        0.5,
        "squares a second, each second",
        "let go, and the plane tips into a glide rather than dropping",
    ),
    rise: knob(
        6,
        3,
        10,
        0.5,
        "squares a second",
        "from the grass to the top of a pole in about three seconds of holding",
    ),
    sink: knob(
        4.2,
        2,
        8,
        0.2,
        "squares a second",
        "a glide slow enough to come down onto a hoop rather than past it",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
const VIEW = { w: 36, h: 22 };
/** The course in squares: the ground, the ceiling, the poles' spacing, and where a pole's scale runs; the pole drawing's POLE values are repeated here and a test holds them together. */
export const COURSE = {
    ground: 19.6,
    top: 1.3,
    pad: 20,
    first: 14,
    every: 22,
    pole: 19,
    foot: 1.2,
    head: 2.8,
    poleX: 1.9,
    hoop: 1.7,
    reach: 0.95,
} as const;
const zero = COURSE.ground - 0.4,
    span = COURSE.pole - COURSE.head - COURSE.foot;

const lapOf = (L: PlaneLevel) => L.gates.length * COURSE.every;
/** Where a pole stands (the line of the pole), and the height of a mark on it. */
const poleAt = (k: number) => COURSE.pad + COURSE.first + k * COURSE.every;
export const heightOf = (L: PlaneLevel, tick: number) => zero - (tick / L.ticks) * span;

export interface PlaneState {
    level: number;
    L: PlaneLevel;
    plane: Flyer;
    pitch: number;
    cam: Cam;
    done: boolean[];
    /** The step a gate was flown through, for its hoop's flash. */
    lit: number[];
    trail: Pt[];
    laps: number;
    wrong: number;
    said: string;
    saidAt: number;
    steps: number;
    won: boolean;
    wonAt: number;
    /** Where the loop the plane flies when the round is won is centred, and when it began. */
    loop: { x: number; y: number; at: number } | null;
    /** Whether the hands are lifting it now, for the ring at its nose that answers a held finger. */
    lifting: boolean;
}

const wing = (): Wing => ({
    cruise: PLANE.cruise.value,
    lift: PLANE.lift.value,
    fall: PLANE.fall.value,
    rise: PLANE.rise.value,
    sink: PLANE.sink.value,
    trade: 0.28,
    settle: 1.6,
});

export function start(level: number): PlaneState {
    return startPlaneLevel(PLANE_LEVELS[level] ?? PLANE_LEVELS[0], level);
}

export function startPlaneLevel(L: PlaneLevel, level = 0): PlaneState {
    const plane = { x: COURSE.pad + 2, y: 10, vx: PLANE.cruise.value, vy: 0 };
    return {
        level,
        L,
        plane,
        pitch: 0,
        cam: { x: plane.x + 7, y: VIEW.h / 2, zoom: 1 },
        done: L.gates.map(() => false),
        lit: L.gates.map(() => -999),
        trail: [],
        laps: 0,
        wrong: 0,
        said: "",
        saidAt: -999,
        steps: 0,
        won: false,
        wonAt: -1,
        loop: null,
        lifting: false,
    };
}

function tell(s: PlaneState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

/** The mark nearest a height, on the level's pole. */
const nearestTick = (L: PlaneLevel, y: number) =>
    Math.max(0, Math.min(L.ticks, Math.round(((zero - y) / span) * L.ticks)));

export function step(s: PlaneState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    const L = s.L,
        lap = lapOf(L);
    const held = pad.go || pad.touch !== null || pad.holding.includes("up");
    const dive = !held && (pad.brake || pad.holding.includes("down"));
    s.lifting = held;
    const was = s.plane;
    if (s.loop) {
        // The loop the plane flies once every flag is done: a circle above where it was, then on its way.
        const u = (s.steps - s.loop.at) / (RATE * 1.6);
        if (u >= 1) {
            s.plane = {
                x: s.loop.x + PLANE.cruise.value * 1.6,
                y: s.loop.y,
                vx: PLANE.cruise.value,
                vy: 0,
            };
            s.loop = null;
        } else {
            const a = u * Math.PI * 2,
                r = 2.6;
            s.plane = {
                x: s.loop.x + Math.sin(a) * r + PLANE.cruise.value * 1.6 * u,
                y: s.loop.y - r + Math.cos(a) * r,
                vx: (Math.cos(a) * r * Math.PI * 2) / 1.6 + PLANE.cruise.value,
                vy: (-Math.sin(a) * r * Math.PI * 2) / 1.6,
            };
        }
    } else {
        const w = wing(),
            next = within(
                glide(s.plane, held, DT, dive ? { ...w, fall: w.fall * 2, sink: w.sink * 1.7 } : w),
                COURSE.top,
                COURSE.ground - 1,
                0.45,
            );
        s.plane = next.f;
        if (next.touched === "floor" && next.speed > 0.6)
            out.push(
                { cue: "bump" },
                {
                    burst: {
                        kind: L.look === "harbour" ? "splash" : "dust",
                        x: s.plane.x,
                        y: COURSE.ground - 0.3,
                        n: 5,
                    },
                },
            );
    }
    const p = s.plane;
    s.pitch += (noseOf(p) - s.pitch) * (1 - Math.exp(-12 * DT));
    if (s.steps % 5 === 0) s.trail = [...s.trail, { x: p.x - 1.4, y: p.y + 0.1 }].slice(-10);
    // Through a gate: the hoop the plane was in, if any, when it passed the hoops' line.
    for (const [k, gate] of L.gates.entries()) {
        const hx = poleAt(k) + COURSE.hoop;
        if (!(was.x < hx && p.x >= hx) || s.loop) continue;
        const hoop = gate.hoops.find((t) => Math.abs(p.y - heightOf(L, t)) < COURSE.reach);
        if (s.done[k]) continue;
        if (hoop === gate.target) {
            s.done[k] = true;
            s.lit[k] = s.steps;
            out.push({ cue: "ring" }, { burst: { kind: "sparkle", x: hx, y: p.y, n: 12 } });
            const left = s.done.filter((d) => !d).length;
            if (!left) {
                s.won = true;
                s.wonAt = s.steps;
                s.loop = { x: p.x, y: p.y, at: s.steps };
                out.push(
                    { cue: "win" },
                    { burst: { kind: "sparkle", x: p.x + 2, y: p.y - 2, n: 16 } },
                );
                tell(s, L.done);
            } else
                tell(
                    s,
                    `${L.words(gate.target)}, and through. ${left === 1 ? "One flag" : `${left} flags`} to go.`,
                );
        } else if (hoop !== undefined) {
            s.wrong++;
            out.push({ cue: "nope" });
            tell(s, `That hoop is at ${L.words(hoop)}. The flag says ${gate.flag}.`);
        } else {
            tell(
                s,
                `Past the hoops, at about ${L.words(nearestTick(L, p.y))}. This flag comes round again.`,
            );
        }
    }
    // The course goes round: past the last pole the world starts again, and the camera and the dots go with it.
    if (s.plane.x > COURSE.pad + lap) {
        s.plane = { ...s.plane, x: s.plane.x - lap };
        if (s.loop) s.loop = { ...s.loop, x: s.loop.x - lap };
        s.cam = { ...s.cam, x: s.cam.x - lap };
        s.trail = s.trail.map((q) => ({ x: q.x - lap, y: q.y }));
        s.laps++;
    }
    s.cam = follow(
        s.cam,
        { x: s.plane.x + 7, y: VIEW.h / 2, zoom: 1 },
        { rate: 3.5, dt: DT, view: VIEW, world: { w: lap + COURSE.pad * 2, h: VIEW.h } },
    );
    return out;
}

/** The rows each place is made of, far to near: what is on the skyline, what stands nearer, and what passes in front. */
const LOOKS: Record<Look, { rows: Row[]; ground: "grass" | "sea" }> = {
    meadow: {
        ground: "grass",
        rows: [
            {
                key: "far",
                depth: 0.3,
                base: COURSE.ground - 0.9,
                every: 9,
                stray: 2.5,
                z: 2,
                alpha: 0.55,
                things: [
                    { art: "firs", size: 4.5, often: 2, params: { count: 3, snow: 0 } },
                    { art: "windmill", size: 3.6, often: 1 },
                    {
                        art: "tree",
                        size: 3.6,
                        often: 2,
                        params: { fruit: 3, fallen: 0, item: "apple" },
                    },
                ],
            },
            {
                key: "mid",
                depth: 0.6,
                base: COURSE.ground - 0.3,
                every: 8,
                stray: 2,
                gaps: 0.25,
                z: 4,
                things: [
                    { art: "cottage", size: 4.4, often: 2 },
                    { art: "barn", size: 5.2, often: 1 },
                    {
                        art: "tree",
                        size: 4.6,
                        often: 2,
                        params: { fruit: 5, fallen: 1, item: "apple" },
                    },
                    {
                        art: "animals",
                        size: 6,
                        often: 1,
                        params: { kind: "sheep", count: 2, label: "" },
                    },
                ],
            },
        ],
    },
    harbour: {
        ground: "sea",
        rows: [
            {
                key: "far",
                depth: 0.3,
                base: COURSE.ground - 0.6,
                every: 12,
                stray: 3,
                z: 2,
                alpha: 0.6,
                things: [
                    { art: "lighthouse", size: 3.4, often: 1 },
                    { art: "ship", size: 4.6, often: 2 },
                    { art: "iceberg", size: 3, often: 0.3 },
                ],
            },
            {
                key: "mid",
                depth: 0.6,
                base: COURSE.ground - 0.2,
                every: 11,
                stray: 3,
                gaps: 0.3,
                z: 4,
                things: [
                    { art: "svg.boat", size: 4.4, often: 2 },
                    { art: "ferry", size: 6, often: 1 },
                    { art: "jetty", size: 7, often: 1, params: { posts: 3 } },
                ],
            },
        ],
    },
    mountains: {
        ground: "grass",
        rows: [
            {
                key: "far",
                depth: 0.25,
                base: COURSE.ground - 0.8,
                every: 13,
                stray: 2,
                z: 2,
                alpha: 0.5,
                things: [{ art: "peaks", size: 15, often: 1 }],
            },
            {
                key: "mid",
                depth: 0.55,
                base: COURSE.ground - 0.3,
                every: 6,
                stray: 1.8,
                gaps: 0.2,
                z: 4,
                things: [
                    { art: "firs", size: 5, often: 3, params: { count: 3, snow: 1 } },
                    { art: "tent", size: 3.6, often: 1 },
                    { art: "observatory", size: 4.2, often: 0.5 },
                ],
            },
        ],
    },
    town: {
        ground: "grass",
        rows: [
            {
                key: "far",
                depth: 0.3,
                base: COURSE.ground - 0.8,
                every: 10,
                stray: 1,
                z: 2,
                alpha: 0.5,
                things: [
                    { art: "houses", size: 8, often: 3, params: { count: 3, windows: 2 } },
                    { art: "clocktower", size: 3.4, often: 1 },
                ],
            },
            {
                key: "mid",
                depth: 0.6,
                base: COURSE.ground - 0.3,
                every: 9,
                stray: 2,
                gaps: 0.2,
                z: 4,
                things: [
                    { art: "station", size: 7, often: 1 },
                    { art: "bandstand", size: 4.6, often: 1 },
                    { art: "library", size: 5, often: 1 },
                    {
                        art: "tree",
                        size: 4.4,
                        often: 2,
                        params: { fruit: 0, fallen: 0, item: "apple" },
                    },
                ],
            },
        ],
    },
};

export function frame(s: PlaneState, rest = false): Frame {
    const L = s.L,
        lap = lapOf(L),
        t = rest ? 0 : s.steps / RATE,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    const cam = rest ? { x: s.plane.x + 7, y: VIEW.h / 2, zoom: 1 } : s.cam;
    const eye: Eye = { cam, view: VIEW, lap };
    const look = LOOKS[L.look];
    sprites.push({
        key: "sun",
        art: "strokes.sun",
        size: 3,
        x: cam.x * 0.02 + 6,
        y: 3.2,
        depth: 0.02,
        z: 1,
        seed: 2,
        still: true,
    });
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.15,
                base: 5,
                every: 11,
                stray: 3,
                z: 1,
                drift: 0.3,
                things: [
                    { art: "cloud", size: 5, often: 2, params: { puffs: 4 } },
                    { art: "cloud", size: 3.6, often: 2, params: { puffs: 3 }, lift: 2 },
                ],
            },
            eye,
            31 + s.level,
            t,
        ),
    );
    for (const r of look.rows) sprites.push(...row(r, eye, 7 + s.level));
    if (look.ground === "sea")
        sprites.push(
            ...lengths(
                {
                    key: "sea",
                    art: "sea",
                    every: 18,
                    y: COURSE.ground - 0.5 + 3,
                    z: 8,
                    params: (x0, across) => ({ across, deep: 6, x0, bed: false }),
                },
                eye,
            ),
        );
    else
        sprites.push(
            ...lengths(
                {
                    key: "ground",
                    art: "arcade.ground",
                    every: 20,
                    y: COURSE.ground + 1.1,
                    z: 8,
                    params: (_x0, across) => ({ w: across }),
                },
                eye,
            ),
        );
    const bird = rest
        ? null
        : crossing(
              {
                  key: "birds",
                  thing:
                      L.look === "mountains"
                          ? { art: "eagle", size: 4 }
                          : L.look === "harbour"
                            ? { art: "gull", size: 2.4 }
                            : { art: "geese", size: 5, flip: true },
                  every: 21,
                  takes: 9,
                  y: 6,
                  bob: 0.5,
                  z: 6,
                  seed: 5 + s.level,
              },
              eye,
              t,
          );
    if (bird) sprites.push(bird);
    // The poles, their hoops in two halves so the plane passes between them, and each flag's number.
    const tones = ["berry", "sky", "mint"] as const;
    for (let copy = -1; copy <= 1; copy++)
        for (const [k, gate] of L.gates.entries()) {
            const x = poleAt(k) + copy * lap;
            if (x < cam.x - VIEW.w / 2 - 6 || x > cam.x + VIEW.w / 2 + 6) continue;
            const key = `${k}:${copy}`,
                flash = !rest && s.steps - (s.lit[k] ?? -999) < RATE * 0.6;
            sprites.push({
                key: `pole:${key}`,
                art: "scalepole",
                params: { tall: COURSE.pole, ticks: L.ticks, labels: L.labels, flag: gate.flag },
                x: x - COURSE.poleX + 2.5,
                y: COURSE.ground + 0.8,
                stand: true,
                z: 20,
                still: true,
                seed: 50 + k,
            });
            for (const tick of gate.hoops) {
                const lit = s.done[k] === true && tick === gate.target,
                    y = heightOf(L, tick),
                    tone = tones[(k + tick) % 3] ?? "berry";
                for (const part of ["back", "front"] as const) {
                    sprites.push({
                        key: `hoop:${key}:${tick}:${part}`,
                        art: "hoop",
                        params: { tall: 3, part, tone, lit },
                        size: 2,
                        x: x + COURSE.hoop,
                        y,
                        z: part === "back" ? 22 : 60,
                        scale:
                            flash && lit
                                ? 1 +
                                  Math.sin(((s.steps - (s.lit[k] ?? 0)) / (RATE * 0.6)) * Math.PI) *
                                      0.18
                                : 1,
                        seed: 60 + tick,
                    });
                }
            }
            if (s.done[k])
                sprites.push({
                    key: `done:${key}`,
                    art: "stickers",
                    params: { kinds: ["star"], word: "" },
                    size: 1.8,
                    x: x + 1.3,
                    y: heightOf(L, L.ticks) - 3.2,
                    z: 61,
                    seed: 9,
                });
        }
    // The plane, with the dots of where it has just been.
    const p = s.plane,
        nose = rest ? noseOf(p) : s.pitch;
    if (s.trail.length > 1 && !rest) marks.push({ kind: "dots", pts: s.trail, faint: true });
    if (s.lifting && !rest)
        marks.push({
            kind: "ring",
            x: p.x + Math.cos(nose) * 1.9,
            y: p.y + Math.sin(nose) * 1.9,
            r: 0.45,
            on: true,
        });
    sprites.push({
        key: "plane",
        art: "paperplane",
        params: { bank: Math.max(-1, Math.min(1, p.vy * 0.12)) },
        size: 3.3,
        x: p.x,
        y: p.y,
        angle: nose,
        z: 40,
        seed: 4,
    });
    // Grass and flowers in front, passing quicker than the world.
    if (look.ground === "grass")
        sprites.push(
            ...row(
                {
                    key: "near",
                    depth: 1.45,
                    base: VIEW.h + 0.4,
                    every: 5,
                    stray: 2,
                    gaps: 0.3,
                    z: 90,
                    things: [
                        { art: "flowers", size: 2.6, often: 2, params: { count: 1, petals: 5 } },
                        { art: "flowers", size: 3, often: 1, params: { count: 2, petals: 6 } },
                    ],
                },
                eye,
                13,
            ),
        );
    const filled = s.done.filter(Boolean).length;
    sprites.push({
        key: "progress",
        art: "starrow",
        params: { slots: L.gates.length, filled },
        size: L.gates.length * 1.6 + 1.6,
        x: (L.gates.length * 1.6 + 1.6) / 2 + 0.5,
        y: VIEW.h - 1.1,
        fixed: true,
        z: 100,
        seed: 3,
    });
    return {
        sprites,
        marks,
        camera: { ...cam },
        view: { ...VIEW },
        world: { w: lap + COURSE.pad * 2, h: VIEW.h },
    };
}

export function say(s: PlaneState): string {
    const L = s.L,
        p = s.plane;
    const next = L.gates
        .map((g, k) => ({ g, k, x: poleAt(k) + COURSE.hoop }))
        .filter((q) => !s.done[q.k])
        .map((q) => ({ ...q, ahead: (((q.x - p.x) % lapOf(L)) + lapOf(L)) % lapOf(L) }))
        .sort((a, b) => a.ahead - b.ahead)[0];
    const climbing = p.vy < -0.5 ? "climbing" : p.vy > 0.5 ? "gliding down" : "flying level";
    const now = `The plane is at about ${L.words(nearestTick(L, p.y))} on the poles, ${climbing}.`;
    const ahead = next
        ? `The next flag says ${next.g.flag}, ${Math.round(next.ahead)} squares ahead, with hoops at ${next.g.hoops.map((h) => L.words(h)).join(", ")}.`
        : "";
    return [s.said, s.won ? "" : now, s.won ? "" : ahead].filter(Boolean).join(" ");
}

export const planeGame: ActionGame<PlaneState> = {
    objectives: (s) => ({ completed: s.done.filter(Boolean).length, total: s.L.gates.length }),
    id: "plane",
    title: "Paper plane",
    group: "action",
    levels: PLANE_LEVELS,
    rate: RATE,
    cover: { art: "paperplane", params: { bank: 0.3 } },
    hint: "Hold a finger on the sky, space or the up arrow to climb; let go to glide, or hold the down arrow to dive",
    controls: { go: "Climb", brake: "Dive" },
    start,
    step,
    frame,
    say,
    note: (s) => (s.steps - s.saidAt < RATE * 4 || s.won ? s.said : ""),
    won: (s) => s.won,
    touch: true,
    tuning: PLANE,
    still: { press: () => RATE / 2 },
};
