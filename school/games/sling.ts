// The slingshot: pull a ball back, let it go, and knock the stars off a tower of rods.
//
// The world is the engine's bodies, planck behind them, stepped at a fixed sixty steps a second, in
// squares, with y pointing down so a body's angle is the angle the page rotates its drawing by. The tower is Cuisenaire rods
// from the shelf, one square per unit, and the stars and the ball are the shelf's own props, so
// the pieces a child knocks over are the ones they count with. A star is down when it lies on the
// ground or has left the world. There is no score and no limit on shots: after a brief settling
// pause a new ball is in the sling, the flight trail fades away, and
// changing one thing at a time between two shots is the skill the game rewards. At the harder level
// the angle is written in degrees on the arc the pull makes, which is the protractor a grade four
// child is learning to read, used for something.
//
// planck steps the same world the same way for the same input on the same JavaScript runtime, and
// makes no promise across runtimes (planck's own documentation); a test runs a shot twice in node
// and compares every body.
import { fitZoom, follow, type Cam } from "../../engine/motion/camera";
import { arc, degreesOf, throwOf, withinReach } from "../../engine/motion/flight";
import { knob } from "../../engine/motion/tune";
import { bodies, type Bodies, type Body } from "../../engine/motion/bodies";
import { PHYSICAL_MATERIALS, type PhysicalMaterial } from "../../engine/motion/physical-materials";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export type Piece =
    | {
          kind: "rod";
          n: number;
          x: number;
          y: number;
          up?: boolean;
          fixed?: boolean;
          material?: PhysicalMaterial;
      }
    | { kind: "star"; x: number; y: number }
    | { kind: "weight"; x: number; y: number; r: number; material: "stone" };

export interface SlingLevel extends ActionLevel {
    world: { w: number; h: number };
    ground: number;
    /** Where the ball sits in the sling at rest. */
    pouch: { x: number; y: number };
    pieces: Piece[];
    /** A rod on a pivot, which a hit tips like a see-saw: the pivot's place and the rod's length. */
    seesaw?: { x: number; y: number; n: number };
    /** Seconds of the flight drawn in dots while aiming. */
    preview: number;
    /** Whether the angle and the pull are written in numbers. */
    numbers: boolean;
    /** Squares of sky laid over the play, which the camera leaves out when it fits the play. */
    sky?: number;
}

/** The slingshot's tuning table. The world's gravity and sizes take hold at the next start; the pull and speed at the next shot. */
export const SLING = {
    maxPull: knob(
        4.5,
        3,
        6,
        0.5,
        "squares",
        "a full pull fits between the fork and the edge of a phone held upright",
    ),
    minPull: knob(
        0.7,
        0.3,
        1.5,
        0.1,
        "squares",
        "anything shorter is a finger resting on the ball, not a pull",
    ),
    speed: knob(
        38,
        24,
        50,
        1,
        "squares a second",
        "a full pull at the best angle just clears the far tower",
    ),
    gravity: knob(
        30,
        15,
        45,
        1,
        "squares a second, each second",
        "an arc slow enough for the eye to follow the whole way",
    ),
    ball: knob(
        0.62,
        0.4,
        0.9,
        0.02,
        "squares across the middle",
        "big enough to knock a rod and small enough to miss one",
    ),
    star: knob(
        0.68,
        0.4,
        0.9,
        0.02,
        "squares across the middle",
        "a star rolls off a rod it is knocked from",
    ),
};

const tower = (x: number, g: number): Piece[] => [
    { kind: "rod", n: 3, x: x - 2, y: g - 1.5, up: true },
    { kind: "rod", n: 3, x: x + 2, y: g - 1.5, up: true },
    { kind: "rod", n: 6, x, y: g - 3.5 },
    { kind: "rod", n: 2, x: x - 1.5, y: g - 5, up: true },
    { kind: "rod", n: 2, x: x + 1.5, y: g - 5, up: true },
    { kind: "rod", n: 4, x, y: g - 6.5 },
];

const LAID: Levels<SlingLevel> = [
    {
        title: "Three stars",
        goal: "Pull the ball back and let go. Knock all three stars down.",
        grades: [1, 2],
        world: { w: 40, h: 22 },
        ground: 19,
        pouch: { x: 6.5, y: 13.8 },
        pieces: [
            ...tower(28, 19),
            { kind: "star", x: 28, y: 19 - 7.7 },
            { kind: "rod", n: 1, x: 34, y: 18.5 },
            { kind: "rod", n: 1, x: 34, y: 17.5 },
            { kind: "star", x: 34, y: 16.3 },
            { kind: "rod", n: 2, x: 22.5, y: 18.5 },
            { kind: "star", x: 22.5, y: 17.3 },
        ],
        preview: 0.45,
        numbers: false,
    },
    {
        title: "Over the wall",
        goal: "The stars are behind a wall. Send the ball high enough to drop on them.",
        grades: [3, 4],
        world: { w: 60, h: 28 },
        ground: 25,
        pouch: { x: 6.5, y: 19.8 },
        pieces: [
            { kind: "rod", n: 5, x: 24, y: 22.5, up: true, fixed: true },
            { kind: "rod", n: 5, x: 24, y: 17.5, up: true, fixed: true },
            { kind: "rod", n: 3, x: 24, y: 13.5, up: true, fixed: true },
            ...tower(46, 25),
            { kind: "star", x: 46, y: 25 - 7.7 },
            { kind: "rod", n: 3, x: 53, y: 23.5, up: true },
            { kind: "rod", n: 3, x: 53, y: 21.5 },
            { kind: "star", x: 53, y: 20.3 },
        ],
        seesaw: { x: 36, y: 24, n: 7 },
        preview: 0.22,
        numbers: true,
    },
    {
        title: "The rolling stone",
        goal: "Nudge the heavy stone into the timber tower. Knock the star down.",
        grades: [2, 4],
        world: { w: 44, h: 22 },
        ground: 19,
        pouch: { x: 6.5, y: 13.8 },
        pieces: [
            { kind: "rod", n: 4, x: 22, y: 18.5, fixed: true, material: "stone" },
            { kind: "weight", x: 22, y: 16.8, r: 1.2, material: "stone" },
            ...tower(32, 19).map((piece) =>
                piece.kind === "rod" ? { ...piece, material: "timber" as const } : piece,
            ),
            { kind: "star", x: 32, y: 11.3 },
        ],
        preview: 0.45,
        numbers: false,
    },
];

/** How much of the world a zoom of one shows. A wider world is shown whole while aiming, at a zoom under one. */
const VIEW = { w: 40, h: 22 };

/**
 * Squares of sky laid over a level's play, so a field grown to a tall window shows sky rather than blank
 * page. A level shown zoomed out needs more, since a zoomed view covers more of the world. Each level is
 * laid out above as if the sky were not there.
 */
const skyOver = (L: SlingLevel) => Math.ceil(L.world.h / fitZoom(VIEW, L.world) - L.world.h) + 8;
const underSky = (L: SlingLevel): SlingLevel => {
    const sky = skyOver(L),
        up = (y: number) => y + sky;
    return {
        ...L,
        sky,
        world: { w: L.world.w, h: L.world.h + sky },
        ground: up(L.ground),
        pouch: { x: L.pouch.x, y: up(L.pouch.y) },
        pieces: L.pieces.map((p) => ({ ...p, y: up(p.y) })),
        ...(L.seesaw ? { seesaw: { ...L.seesaw, y: up(L.seesaw.y) } } : {}),
    };
};
const [FIRST_LAID, ...REST_LAID] = LAID;
export const SLING_LEVELS: Levels<SlingLevel> = [underSky(FIRST_LAID), ...REST_LAID.map(underSky)];
/** The part of a level's world the play is in, which the camera fits while aiming. */
const playOf = (L: SlingLevel) => ({ w: L.world.w, h: L.world.h - (L.sky ?? 0) });

const RATE = 60,
    DT = 1 / RATE;

/** The shelf drawing and the crop that show a piece. */
function pieceArt(p: Piece | { kind: "ball" } | { kind: "pivot" }): {
    art: string;
    params?: Record<string, unknown>;
    crop: { x: number; y: number; w: number; h: number };
} {
    switch (p.kind) {
        case "rod":
            if (p.material)
                return {
                    art: "slingbeam",
                    params: { length: p.n, material: p.material },
                    crop: { x: 0, y: 0, w: p.n, h: 1 },
                };
            return {
                art: "rods",
                params: { rods: [p.n], mode: "stair", numbers: false },
                crop: { x: 1.4, y: 0.9, w: p.n + 0.2, h: 1.2 },
            };
        case "weight":
            return { art: "slingweight", crop: { x: 0, y: 0, w: 2, h: 2 } };
        case "star":
            return { art: "prop.star", crop: { x: 0.2, y: 0.3, w: 1.6, h: 1.6 } };
        case "ball":
            return { art: "prop.ball", crop: { x: 0.3, y: 0.3, w: 1.4, h: 1.4 } };
        case "pivot":
            return {
                art: "prop.shapes",
                params: { kinds: ["triangle"] },
                crop: { x: 0.8, y: 0.55, w: 1.6, h: 1.45 },
            };
    }
}

/** The velocity a pull gives, in squares a second: straight back through the pouch, faster the further it was pulled. */
export const launch = (pull: { x: number; y: number }) =>
    throwOf(pull, { most: SLING.maxPull.value, speed: SLING.speed.value });

/** A pull clamped to the sling's reach. */
export const reach = (pull: { x: number; y: number }) => withinReach(pull, SLING.maxPull.value);

interface Thing {
    body: Body;
    piece: Piece;
    key: string;
    down: boolean;
}

export interface SlingState {
    level: number;
    L: SlingLevel;
    world: Bodies;
    things: Thing[];
    plank: Body | null;
    ball: Body | null;
    phase: "aim" | "fly" | "settle";
    /** The aim the arrow keys step, used when nobody is dragging: degrees above the ground and a pull in squares. */
    keyAim: { deg: number; pull: number };
    /** The pull being held now, from a drag or from the keys. */
    pull: { x: number; y: number } | null;
    flight: number;
    grounded: number;
    settling: number;
    ready: number;
    trail: { x: number; y: number }[];
    trailAge: number;
    shots: number;
    starsDown: number;
    hits: number;
    said: string;
    steps: number;
    cam: Cam;
    won: boolean;
    lastHit: number;
}

function addPiece(world: Bodies, p: Piece): Body {
    if (p.kind === "star")
        return world.ball({
            x: p.x,
            y: p.y,
            r: SLING.star.value,
            density: 0.6,
            friction: 0.6,
            restitution: 0.1,
        });
    if (p.kind === "weight")
        return world.ball({
            x: p.x,
            y: p.y,
            r: p.r,
            ...PHYSICAL_MATERIALS[p.material],
            fast: true,
        });
    return world.box({
        x: p.x,
        y: p.y,
        w: p.n - 0.04,
        h: 0.96,
        angle: p.up ? Math.PI / 2 : 0,
        fixed: p.fixed,
        ...PHYSICAL_MATERIALS[p.material ?? "timber"],
    });
}

export function start(level: number): SlingState {
    return startSlingLevel(SLING_LEVELS[level] ?? SLING_LEVELS[0], level);
}

/** Start exact stored geometry, used by certified generated challenges and replays. */
export function startSlingLevel(L: SlingLevel, level = 0): SlingState {
    const world = bodies({ gravity: { x: 0, y: SLING.gravity.value } });
    world.ground({ y: L.ground, from: -20, to: L.world.w + 20, friction: 0.9 });
    const things: Thing[] = L.pieces.map((piece, i) => ({
        body: addPiece(world, piece),
        piece,
        key: `${piece.kind}:${i}`,
        down: false,
    }));
    let plank: Body | null = null;
    if (L.seesaw) {
        const s = L.seesaw;
        plank = world.box({
            x: s.x,
            y: s.y - 0.5,
            w: s.n,
            h: 0.9,
            density: 0.8,
            friction: 0.8,
            hinge: { at: { x: s.x, y: s.y - 0.5 }, lower: -0.45, upper: 0.45 },
        });
        // A cube at each end keeps the plank level, and the star sits between them until a hit tips it.
        for (const [i, dx] of [-1, 1].entries()) {
            const piece: Piece = {
                kind: "rod",
                n: 1,
                x: s.x + dx * (s.n / 2 - 0.5),
                y: s.y - 1.45,
            };
            things.push({ body: addPiece(world, piece), piece, key: `seesaw:${i}`, down: false });
        }
        const star: Piece = { kind: "star", x: s.x, y: s.y - 1.63 };
        things.push({ body: addPiece(world, star), piece: star, key: "star:seesaw", down: false });
    }
    const s: SlingState = {
        level,
        L,
        world,
        things,
        plank,
        ball: null,
        phase: "aim",
        keyAim: { deg: 35, pull: 3 },
        pull: null,
        flight: 0,
        grounded: 0,
        settling: 0,
        ready: 0,
        trail: [],
        trailAge: 0,
        shots: 0,
        starsDown: 0,
        hits: 0,
        said: "",
        steps: 0,
        cam: {
            x: L.world.w / 2,
            y: (L.sky ?? 0) + playOf(L).h / 2,
            zoom: fitZoom(VIEW, playOf(L)),
        },
        won: false,
        lastHit: -99,
    };
    return s;
}

const keyPull = (a: { deg: number; pull: number }) => {
    const r = (a.deg * Math.PI) / 180;
    return { x: -Math.cos(r) * a.pull, y: Math.sin(r) * a.pull };
};

function fire(s: SlingState, pull: { x: number; y: number }, out: Happening[]): void {
    const p = reach(pull);
    if (Math.hypot(p.x, p.y) < SLING.minPull.value) {
        s.pull = null;
        return;
    }
    const v = launch(p);
    const ball = s.world.ball({
        x: s.L.pouch.x + p.x,
        y: s.L.pouch.y + p.y,
        r: SLING.ball.value,
        density: 5,
        friction: 0.5,
        restitution: 0.3,
        fast: true,
    });
    s.world.launch(ball, v, v.x * 0.4);
    s.ball = ball;
    s.phase = "fly";
    s.flight = 0;
    s.grounded = 0;
    s.settling = 0;
    s.ready = 0;
    s.trail = [];
    s.trailAge = 0;
    s.pull = null;
    s.shots++;
    s.said = "";
    out.push({ cue: "lift" });
}

export function step(s: SlingState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.trailAge += DT;
    if (s.trailAge >= 0.8) s.trail = [];
    s.ready = Math.max(0, s.ready - DT);
    if (s.phase === "aim" && !s.won) {
        for (const d of pad.pressed) {
            if (d === "up") s.keyAim.deg = Math.min(80, s.keyAim.deg + 5);
            if (d === "down") s.keyAim.deg = Math.max(-10, s.keyAim.deg - 5);
            if (d === "right") s.keyAim.pull = Math.min(SLING.maxPull.value, s.keyAim.pull + 0.5);
            if (d === "left") s.keyAim.pull = Math.max(1, s.keyAim.pull - 0.5);
        }
        if (pad.released) fire(s, pad.released, out);
        else if (pad.tapped) fire(s, keyPull(s.keyAim), out);
        else
            s.pull = pad.pull
                ? reach(pad.pull)
                : pad.pressed.length || s.pull
                  ? keyPull(s.keyAim)
                  : null;
    }
    const hit = s.world.step(DT);
    s.hits = hit > 6 ? hit : 0;
    if (s.hits > 0 && s.steps - s.lastHit > 8) {
        s.lastHit = s.steps;
        const b = s.ball ? s.world.where(s.ball) : null;
        out.push({ cue: "bump" });
        if (s.hits > 14 && b)
            out.push(
                { puff: { x: b.x, y: b.y, n: Math.min(10, Math.round(s.hits / 3)) } },
                { shake: Math.min(0.6, s.hits / 60) },
            );
    }
    const L = s.L;
    for (const t of s.things) {
        if (t.piece.kind !== "star" || t.down) continue;
        const p = s.world.where(t.body);
        if (
            p.y > L.ground - SLING.star.value - 0.15 ||
            p.y > L.world.h + 4 ||
            p.x < -4 ||
            p.x > L.world.w + 4
        ) {
            t.down = true;
            s.starsDown++;
            const left = s.things.filter((x) => x.piece.kind === "star" && !x.down).length;
            s.said = left ? `A star is down. ${left} to go.` : "All the stars are down.";
            out.push(
                { cue: "place" },
                { puff: { x: p.x, y: Math.min(p.y, L.ground - 0.4), n: 6 } },
            );
            if (!left) {
                s.won = true;
                out.push({ cue: "win" });
            }
        }
    }
    if (s.phase !== "aim") {
        s.flight += DT;
        const b = s.ball;
        const at = b ? s.world.where(b) : null;
        if (at && s.phase === "fly" && s.steps % 3 === 0) {
            s.trail.push({ x: at.x, y: at.y });
            if (s.trail.length > 20) s.trail.shift();
            s.trailAge = 0;
        }
        const gone = !at || at.x > L.world.w + 3 || at.x < -3 || at.y > L.world.h + 3;
        s.grounded = at && at.y >= L.ground - SLING.ball.value - 0.15 ? s.grounded + DT : 0;
        if (
            s.phase === "fly" &&
            (gone ||
                s.grounded > 0.6 ||
                (b && !s.world.moving(b) && s.flight > 0.5) ||
                s.flight > 6)
        )
            s.phase = "settle";
        if (s.phase === "settle") s.settling += DT;
        if (
            s.phase === "settle" &&
            (s.settling >= 1.2 ||
                (s.settling >= 0.6 && !s.things.some((t) => s.world.moving(t.body))) ||
                s.won)
        ) {
            if (b) s.world.remove(b);
            s.ball = null;
            s.phase = "aim";
            if (!s.won) {
                s.ready = 1.5;
                s.said = "Next ball ready. Pull back and let go.";
            }
        }
    }
    // The camera shows the whole play while aiming and follows the ball while it flies, keeping
    // the ground in view and rising only when the ball would leave the top.
    const whole = fitZoom(VIEW, playOf(L));
    const flying = s.phase === "fly" && s.ball && whole < 1 ? s.world.where(s.ball) : null;
    const want = flying
        ? { x: flying.x, y: flying.y + VIEW.h / 2 - 3, zoom: 1 }
        : { x: L.world.w / 2, y: (L.sky ?? 0) + playOf(L).h / 2, zoom: whole };
    s.cam = follow(s.cam, want, { rate: 5, zoomRate: 3, dt: DT, view: VIEW, world: L.world });
    return out;
}

/** Where the ball would be for the first `seconds` of a flight, with nothing in its way. */
export function path(
    s: SlingState,
    pull: { x: number; y: number },
    seconds: number,
): { x: number; y: number }[] {
    const p = reach(pull);
    return arc({ x: s.L.pouch.x + p.x, y: s.L.pouch.y + p.y }, launch(p), SLING.gravity.value, {
        seconds,
    });
}

export function frame(s: SlingState, rest = false): Frame {
    const L = s.L;
    const sprites: Sprite[] = [];
    const marks: Mark[] = [];
    for (let x0 = 0; x0 < L.world.w; x0 += 20) {
        sprites.push({
            key: `ground:${x0}`,
            art: "arcade.ground",
            params: { w: Math.min(20, L.world.w - x0) },
            seed: 60 + x0,
            x: x0 + Math.min(20, L.world.w - x0) / 2,
            y: L.ground + 1.1,
            z: 0,
            still: true,
        });
    }
    sprites.push({
        key: "fork",
        art: "arcade.sling",
        seed: 21,
        x: L.pouch.x,
        y: L.pouch.y + 2.4,
        z: 1,
        still: true,
    });
    for (const t of s.things) {
        const p = s.world.where(t.body),
            a = pieceArt(t.piece);
        sprites.push({
            key: t.key,
            ...a,
            seed: 100 + s.things.indexOf(t),
            x: p.x,
            y: p.y,
            angle: p.angle,
            z: t.piece.kind === "star" ? 3 : 2,
            still: t.piece.kind === "rod" && t.piece.fixed === true,
            ...(t.piece.kind === "weight" ? { size: t.piece.r * 2 } : {}),
        });
    }
    if (s.plank && L.seesaw) {
        const p = s.world.where(s.plank);
        sprites.push({
            key: "plank",
            ...pieceArt({ kind: "rod", n: L.seesaw.n, x: 0, y: 0 }),
            seed: 131,
            x: p.x,
            y: p.y,
            angle: p.angle,
            z: 2,
        });
        sprites.push({
            key: "pivot",
            ...pieceArt({ kind: "pivot" }),
            seed: 132,
            size: 1.6,
            x: L.seesaw.x,
            y: L.seesaw.y + 0.25,
            z: 1,
            still: true,
        });
    }
    const flying = s.ball ? s.world.where(s.ball) : null;
    const ballAt =
        flying ??
        (s.phase === "aim"
            ? { x: L.pouch.x + (s.pull?.x ?? 0), y: L.pouch.y + (s.pull?.y ?? 0) }
            : null);
    if (ballAt)
        sprites.push({
            key: flying ? `ball:${s.shots}` : `loaded:${s.shots}`,
            ...pieceArt({ kind: "ball" }),
            seed: 140,
            x: ballAt.x,
            y: ballAt.y,
            angle: flying ? flying.angle : 0,
            z: 4,
        });
    if (!rest && s.trail.length)
        marks.push({
            kind: "dots",
            pts: s.trail,
            opacity: 0.3 * Math.max(0, 1 - s.trailAge / 0.8),
        });
    if (s.phase === "aim" && !s.won) {
        if (s.ready > 0 && !s.pull)
            marks.push({ kind: "ring", x: L.pouch.x, y: L.pouch.y, r: 1, on: true });
        const tips = [
            { x: L.pouch.x - 0.6, y: L.pouch.y - 0.1 },
            { x: L.pouch.x + 0.6, y: L.pouch.y - 0.1 },
        ];
        const at = ballAt ?? L.pouch;
        for (const tip of tips) marks.push({ kind: "line", a: tip, b: at });
        if (s.pull && Math.hypot(s.pull.x, s.pull.y) >= SLING.minPull.value) {
            marks.push({ kind: "dots", pts: path(s, s.pull, L.preview), opacity: 0.5 });
            if (L.numbers) {
                marks.push({
                    kind: "word",
                    x: L.pouch.x + 2.4,
                    y: L.pouch.y - 2.6,
                    text: `${degreesOf(s.pull)}°`,
                    size: 0.9,
                });
                marks.push({
                    kind: "word",
                    x: L.pouch.x - 0.2,
                    y: L.pouch.y + 3.4,
                    text: `pull ${Math.round(Math.hypot(s.pull.x, s.pull.y) * 2) / 2}`,
                    size: 0.75,
                });
            }
        }
    }
    const cam = rest
        ? { x: L.world.w / 2, y: (L.sky ?? 0) + playOf(L).h / 2, zoom: fitZoom(VIEW, playOf(L)) }
        : s.cam;
    return { sprites, marks, camera: { ...cam }, view: { ...VIEW }, world: { ...L.world } };
}

export function say(s: SlingState): string {
    const up = s.things.filter((t) => t.piece.kind === "star" && !t.down);
    const aim = s.pull ?? keyPull(s.keyAim);
    const parts = [s.said];
    if (s.won)
        parts.push(`All the stars are down, in ${s.shots} ${s.shots === 1 ? "shot" : "shots"}.`);
    else {
        parts.push(
            `${up.length} ${up.length === 1 ? "star is" : "stars are"} still up, the nearest ${Math.round(Math.min(...up.map((t) => s.world.where(t.body).x)) - s.L.pouch.x)} squares away.`,
        );
        if (s.phase === "aim")
            parts.push(
                `The ball is in the sling, aimed at ${degreesOf(aim)} degrees with a pull of ${Math.round(Math.hypot(aim.x, aim.y) * 2) / 2} squares.`,
            );
        else
            parts.push(
                s.phase === "fly" ? "The ball is flying." : "The next ball is getting ready.",
            );
    }
    return parts.filter(Boolean).join(" ");
}

export const slingGame: ActionGame<SlingState> = {
    id: "sling",
    title: "Slingshot",
    group: "action",
    levels: SLING_LEVELS,
    rate: RATE,
    bleed: true,
    cover: { art: "arcade.sling", params: {} },
    hint: "Pull the ball back and let go, or aim with the arrow keys and press space",
    controls: {
        arrows: { up: "Aim higher", down: "Aim lower", left: "Pull less", right: "Pull more" },
        go: "Let go",
    },
    start,
    step,
    frame,
    say,
    note: (s) =>
        s.won
            ? "All the stars are down."
            : s.phase === "settle"
              ? "Next ball getting ready…"
              : s.said || (s.shots === 0 ? "Pull the ball back and let go." : ""),
    won: (s) => s.won,
    objectives: (s) => ({
        completed: s.starsDown,
        total: s.things.filter((t) => t.piece.kind === "star").length,
    }),
    tuning: SLING,
    pullFrom: (s) => (s.phase === "aim" && !s.won ? s.L.pouch : null),
    still: { press: () => 1, settling: (s) => s.phase !== "aim" },
};
