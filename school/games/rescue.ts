// Rescue pups: the Pup family as a rescue team, each with a job and a vehicle of its own. A level is
// a call-out of one or two missions, and each mission is a real piece of physics the hand sets by
// degrees: Rufus aims the fire truck's hose and water arcs onto the flames, Maple flies the
// helicopter and lowers a swinging rope to lift someone off a cliff, Pip drives the digger and loads
// the rubble on the road into a truck that takes exactly so many tonnes, and Dot throws a life ring
// from the rescue boat and pulls the swimmer in. The numbers are the litres in the tank, the metres of
// rope, the tonnes a load must make and the pad a helicopter lands on. The team is our own: nothing
// in it is taken from any show. See .docs/games.md.
import type { ActionGame, ActionLevel, Levels } from "./game";
import { actor, actorSprites, stepActor, type Actor, type Cycle } from "../../engine/motion/actor";
import { follow, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import {
    STREAM,
    count,
    drain,
    liquid,
    places,
    pour,
    stepLiquid,
    type Liquid,
} from "../../engine/motion/liquid";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import {
    runner,
    seek,
    stepRunner,
    type Course,
    type Moves,
    type Runner,
} from "../../engine/motion/walker";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";
import { COPTER } from "../../engine/parts/travel/rescuecopter";
import { DIGGER } from "../../engine/parts/travel/digger";
import { DIGGERARM } from "../../engine/parts/travel/diggerarm";
import { DUMPTRUCK } from "../../engine/parts/travel/dumptruck";
import { FIRETRUCK } from "../../engine/parts/travel/firetruck";
import { RESCUEBOAT } from "../../engine/parts/travel/rescueboat";
import type { Pup } from "../../engine/parts/animals/pupfamily";
import { BEYOND, ground, row } from "./scenery";

const RATE = 60,
    DT = 1 / RATE;
/** The ground's top, the world's height and its width, in squares; a square is a metre. */
export const GROUND = 20;
const H = GROUND + 2.5,
    W = 44;
const VIEW = { w: 40, h: 22 };
/** Where the rescue station stands, and where a pup sets off from its door. */
const BASE_X = 1,
    DOOR_X = 0.5;

export type Job = "fire" | "air" | "dig" | "sea";

/** Who does each job, and what they wear for it. */
export const CREW: Record<Job, { pup: Pup; name: string; gear: string; pitch: number }> = {
    fire: { pup: "rufus", name: "Rufus", gear: "helmet", pitch: 0.8 },
    air: { pup: "maple", name: "Maple", gear: "cap", pitch: 1 },
    dig: { pup: "pip", name: "Pip", gear: "hardhat", pitch: 1.25 },
    sea: { pup: "dot", name: "Dot", gear: "vest", pitch: 1.5 },
};

/** A fire on a building: where it burns, in squares, and the litres of water it takes to put out. */
export interface Fire {
    x: number;
    y: number;
    need: number;
}

export interface FireStage {
    kind: "fire";
    house: "cottage" | "barn";
    fires: Fire[];
    /** Litres the truck's tank holds. */
    tank: number;
    /** Squares a second, each second, the wind pushes the water; less than nought blows back towards the truck. */
    wind: number;
    /** Litres a second a fire nobody is spraying grows by, up to half as much again as it started with. */
    grow: number;
}

/** Someone on a ledge: which drawing, the ledge they stand on, and the pad they must be landed on. */
export interface Stranded {
    who: "lamb" | "hiker";
    ledge: number;
    pad: number;
}

export interface AirStage {
    kind: "air";
    /** Each ledge's top, in squares down from the sky, and where it ends, sticking out of the cliff face. */
    ledges: { y: number; x: number }[];
    stranded: Stranded[];
    /** The numbers painted on the landing pads, left to right. */
    pads: number[];
}

export interface DigStage {
    kind: "dig";
    /** The rubble on the road, in tonnes, nearest the digger first. */
    rocks: number[];
    /** Tonnes the truck takes away in one load: it goes only when it holds exactly this. */
    load: number;
}

export interface SeaStage {
    kind: "sea";
    /** How far out each swimmer is, in metres from where the ring is thrown. */
    swimmers: number[];
    /** Metres of rope on the ring: a throw goes no further. */
    rope: number;
    /** Squares a second the river carries a floating ring away from the boat. */
    current: number;
    wind: number;
}

export type Stage = FireStage | AirStage | DigStage | SeaStage;

export interface RescueLevel extends ActionLevel {
    prompt: string;
    stages: [Stage, ...Stage[]];
    /** How much of each aid shows, from all of it to none: the arc of the water and the throw, the rope's numbers, the drop line. */
    preview: number;
}

export const RESCUE = {
    gravity: knob(
        20,
        12,
        30,
        1,
        "squares a second each second",
        "a thrown ring and a falling rock drop at this: gentler than true gravity, so a flight can be watched",
    ),
    swing: knob(
        0.45,
        0.1,
        1.2,
        0.05,
        "of the swing a second",
        "air slows a swinging load this much: a swing dies away in a few seconds of holding still",
    ),
    pump: knob(
        7.5,
        4,
        12,
        0.5,
        "litres a second",
        "the hose runs this fast: a window fire of five litres is out in under a second of good aim",
    ),
};

export const RESCUE_LEVELS: Levels<RescueLevel> = [
    {
        title: "Fire at the cottage",
        grades: [1, 2],
        goal: "Rufus puts out both window fires with the water in the tank.",
        prompt: "Hold where the water should go, or aim with the arrows and hold space. Each fire needs its litres.",
        preview: 1,
        stages: [
            {
                kind: "fire",
                house: "cottage",
                fires: [
                    { x: 25.6, y: 16.8, need: 4 },
                    { x: 30, y: 16.8, need: 4 },
                ],
                tank: 20,
                wind: 0,
                grow: 0.25,
            },
        ],
    },
    {
        title: "The lamb on the cliff",
        grades: [1, 2],
        goal: "Maple lifts the lamb off the ledge and lands it on pad 2.",
        prompt: "Fly over the lamb, let the rope down to it, then carry it to its pad. A slow swing is easier to catch.",
        preview: 1,
        stages: [
            {
                kind: "air",
                ledges: [{ y: 12, x: 27 }],
                stranded: [{ who: "lamb", ledge: 0, pad: 2 }],
                pads: [1, 2, 3],
            },
        ],
    },
    {
        title: "Rocks on the road",
        grades: [1, 3],
        goal: "Pip loads the rubble into the truck, exactly 5 tonnes a load, until the road is clear.",
        prompt: "Scoop a rock, swing round to the truck and drop it in. The truck goes when it holds exactly 5 tonnes.",
        preview: 1,
        stages: [{ kind: "dig", rocks: [2, 5, 3], load: 5 }],
    },
    {
        title: "Swimmer in the river",
        grades: [1, 3],
        goal: "Dot throws the ring to the swimmer and pulls them in to the boat.",
        prompt: "Pull back and let go to throw the ring, then hold to pull the swimmer in. The river carries the ring away.",
        preview: 1,
        stages: [{ kind: "sea", swimmers: [6], rope: 9, current: 0.5, wind: 0 }],
    },
    {
        title: "The barn and the wind",
        grades: [2, 4],
        goal: "Rufus puts out three fires on the barn while the wind blows the water back.",
        prompt: "The wind pushes the water back towards the truck. Aim further than the fire.",
        preview: 0.5,
        stages: [
            {
                kind: "fire",
                house: "barn",
                fires: [
                    { x: 24.9, y: 17.2, need: 5 },
                    { x: 28, y: 13.6, need: 6 },
                    { x: 31.1, y: 17.2, need: 5 },
                ],
                tank: 30,
                wind: -4,
                grow: 0.4,
            },
        ],
    },
    {
        title: "Two on the cliff",
        grades: [2, 4],
        goal: "Maple takes the hiker to pad 6 and the lamb to pad 4.",
        prompt: "The hiker is further down than the lamb. Count the metres of rope, and keep clear of the rock.",
        preview: 0.5,
        stages: [
            {
                kind: "air",
                ledges: [
                    { y: 8, x: 27.6 },
                    { y: 14, x: 23.6 },
                ],
                stranded: [
                    { who: "lamb", ledge: 0, pad: 4 },
                    { who: "hiker", ledge: 1, pad: 6 },
                ],
                pads: [2, 4, 6, 8],
            },
        ],
    },
    {
        title: "Clear the road, then the fire",
        grades: [2, 4],
        goal: "Pip clears 14 tonnes of rubble in loads of 7, then Rufus gets through to the cottage fire.",
        prompt: "Two loads of exactly 7 tonnes clear the road. Then the fire truck can get through.",
        preview: 0.25,
        stages: [
            { kind: "dig", rocks: [3, 5, 4, 2], load: 7 },
            {
                kind: "fire",
                house: "cottage",
                fires: [
                    { x: 25.6, y: 16.8, need: 5 },
                    { x: 28, y: 14, need: 4 },
                    { x: 30, y: 16.8, need: 5 },
                ],
                tank: 26,
                wind: 2,
                grow: 0.4,
            },
        ],
    },
    {
        title: "Rescue at the river",
        grades: [3, 4],
        goal: "Dot pulls two swimmers from the fast river, then Maple lifts the hiker off the cliff to pad 9.",
        prompt: "The river runs fast and the rope is 10 metres. Then the hiker waits on the cliff for Maple.",
        preview: 0,
        stages: [
            { kind: "sea", swimmers: [5, 8], rope: 10, current: 0.9, wind: 1.5 },
            {
                kind: "air",
                ledges: [{ y: 13, x: 25.5 }],
                stranded: [{ who: "hiker", ledge: 0, pad: 9 }],
                pads: [3, 6, 9, 12],
            },
        ],
    },
];

/** How a pup runs from the station to its vehicle, and hops in. */
const MOVES: Moves = {
    speed: 7,
    accel: 30,
    airAccel: 20,
    gravity: 40,
    jump: 2.2,
    cut: 3,
    coyote: 0.1,
    buffer: 0.1,
    step: 0.3,
    fall: 20,
    climb: 3,
    pace: 0.9,
    height: 2,
};
const COURSE: Course = {
    floor: (_x, from, to) => (GROUND >= from && GROUND <= to ? { y: GROUND } : null),
};
/** Seconds a pup's hop from the ground into its seat takes. */
const HOP = 0.35;

type Act = "run" | "hop" | "work" | "cheer";
/** How wide each pup is drawn: smaller in the helicopter and the digger, so only a head shows in the window. */
const PUP_SIZE: Record<Job, number> = { fire: 2.2, air: 1.7, dig: 1.7, sea: 2.2 };
/** How far a seated pup's feet are below its head, at those sizes. */
const HEAD: Record<Job, number> = { fire: 0, air: 1.4, dig: 1.55, sea: 0 };
const WORK_POSE: Record<Job, string> = { fire: "carry", air: "stand", dig: "sit", sea: "carry" };

interface Crew {
    r: Runner;
    a: Actor<Act>;
    /** Seconds into the hop, once the pup has reached its vehicle; -1 before. */
    hop: number;
    aboard: boolean;
    /** Seconds since it set off, so a pup that cannot find its way is put in its seat. */
    since: number;
}

interface FireState {
    kind: "fire";
    L: FireStage;
    angle: number;
    power: number;
    tank: number;
    water: Liquid;
    fires: { need: number; hit: number }[];
    spraying: boolean;
}

interface AirState {
    kind: "air";
    L: AirStage;
    hx: number;
    hy: number;
    hvx: number;
    rope: number;
    load: { x: number; y: number; vx: number; vy: number };
    carrying: number | null;
    saved: boolean[];
    /** Seconds of the take-off from the station's pad, once the pilot is aboard. */
    lift: number;
}

interface Rock {
    t: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    at: "ground" | "air" | "bucket" | "truck" | "gone";
}

interface DigState {
    kind: "dig";
    L: DigStage;
    x: number;
    vx: number;
    facing: 1 | -1;
    arm: number;
    rocks: Rock[];
    load: number;
    /** Seconds left of the truck's trip away with a load; nought while it is here. */
    away: number;
    /** Where the bucket was a step ago, for the speed a dropped rock leaves it with. */
    was: Pt;
}

interface Swimmer {
    x0: number;
    x: number;
    caught: boolean;
    saved: boolean;
}

interface SeaState {
    kind: "sea";
    L: SeaStage;
    angle: number;
    power: number;
    ring: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        at: "held" | "flying" | "floating" | "back" | "towing";
        since: number;
    };
    swimmers: Swimmer[];
    ripples: { x: number; age: number; size?: number }[];
}

type StageState = FireState | AirState | DigState | SeaState;

export interface RescueState {
    phase: number;
    L: RescueLevel;
    stage: number;
    st: StageState;
    crew: Crew;
    cam: Cam;
    steps: number;
    /** Seconds since the stage's last rescue, while the team cheers before the next mission; -1 while it goes on. */
    done: number;
    won: boolean;
    touched: boolean;
    note: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const jobOf = (st: Stage): Job => st.kind;

/* The fire truck's place and its hose's nozzle. */
const TRUCK_X = 10;
export const HOUSE_X = 28;
const truckLeft = TRUCK_X - FIRETRUCK.w / 2,
    truckTop = GROUND - FIRETRUCK.h;
const DECK = { x: truckLeft + FIRETRUCK.deck.x, y: truckTop + FIRETRUCK.deck.y };
/** Where the water leaves the hose: in the firefighter's paws on the deck. */
export const NOZZLE = { x: DECK.x + 1.1, y: DECK.y - 1.5 };
export const FIRE_AIM = { lo: -1.35, hi: 0.25, min: 8, max: 24, turn: 0.8, ramp: 7 } as const;
/** Litres in each drop of the stream, and how near a fire's middle a drop puts it out. */
const DROP = 0.25,
    FIRE_R = 1.1;

/* The helicopter, the cliff and the pads. */
export const FLY = 3.4;
const HELI_HOME = 8,
    HELI_REST = GROUND - (COPTER.h / 2) * 0.9;
export const CLIFF_X = 31,
    CLIFF_TOP = 5;
/** How far in from a ledge's end someone stands on it. */
const STAND_IN = 1.4;
/** The pads stand in a row on the field, clear of the cliff and the ledges. */
export const PAD_X0 = 13.2,
    PAD_GAP = 2.9;
const PAD_TOP = GROUND - 0.85;
/** How far below the hook a carried one's feet hang. */
export const HANG = 1.3;
const ROPE_MIN = 1.2,
    ROPE_MAX = 15.5;
export const HELI = { speed: 7, accel: 12, reel: 5 } as const;
export const winchOf = (a: AirState): Pt => ({
    x: a.hx + COPTER.winch.x,
    y: a.hy + COPTER.winch.y,
});
export const padX = (i: number) => PAD_X0 + i * PAD_GAP;
/** The point on a stranded one the hook takes hold of: the middle of their back. */
export const standOf = (L: AirStage, i: number): Pt => {
    const s = L.stranded[i];
    const ledge = s ? L.ledges[s.ledge] : undefined;
    return ledge ? { x: ledge.x + STAND_IN, y: ledge.y } : { x: CLIFF_X - STAND_IN, y: 10 };
};
export const grabOf = (L: AirStage, i: number): Pt => {
    const at = standOf(L, i);
    return { x: at.x, y: at.y - HANG };
};
const rocksOf = (L: AirStage) => [
    { x0: CLIFF_X, x1: W + BEYOND, y0: CLIFF_TOP, y1: GROUND },
    ...L.ledges.map((l) => ({ x0: l.x, x1: CLIFF_X, y0: l.y, y1: l.y + 1.2 })),
];

/* The digger, the road and the truck. */
export const DIG_TRUCK_X = 9;
const digTruckLeft = DIG_TRUCK_X - DUMPTRUCK.w / 2;
const TRUCK_RIGHT = digTruckLeft + DUMPTRUCK.w;
/** The truck faces left, so its open bed is on the digger's side and its cab away from it. */
export const BED = {
    x0: TRUCK_RIGHT - DUMPTRUCK.bed.x1 + 0.3,
    x1: TRUCK_RIGHT - DUMPTRUCK.bed.x0 - 0.3,
    rim: GROUND - DUMPTRUCK.h + DUMPTRUCK.bed.rim,
    floor: GROUND - DUMPTRUCK.h + DUMPTRUCK.bed.floor,
};
export const DIGGER_START = 17,
    ROCK_X0 = 25,
    ROCK_GAP = 3.4;
export const ARM = {
    len: DIGGERARM.bucket.x - DIGGERARM.pivot.x,
    lo: -1.05,
    hi: 0.3,
    turn: 1.1,
} as const;
export const DRIVE = { speed: 4.5, accel: 14 } as const;
const BODY = DIGGER.w / 2 - 0.2;
export const rockR = (t: number) => 0.45 + t * 0.09;
export const pivotOf = (d: DigState): Pt => ({
    x: d.x + d.facing * DIGGER.pivot.x,
    y: GROUND - DIGGER.h / 2 + DIGGER.pivot.y,
});
export const bucketOf = (d: DigState): Pt => {
    const p = pivotOf(d);
    return { x: p.x + d.facing * Math.cos(d.arm) * ARM.len, y: p.y + Math.sin(d.arm) * ARM.len };
};

/* The river, the boat and the throw. */
export const BANK_X = 10.5;
export const SURFACE = GROUND + 0.35;
const BOAT_X = 14;
const boatLeft = BOAT_X - RESCUEBOAT.w / 2;
/** Where the ring leaves Dot's paws, and where metre nought is on the river. */
export const THROW = {
    x: boatLeft + RESCUEBOAT.deck.x + 0.9,
    y: SURFACE - RESCUEBOAT.waterline + RESCUEBOAT.deck.y - 1.6,
};
export const SEA_AIM = { lo: -1.35, hi: 0.1, min: 4, max: 16, turn: 0.9, ramp: 6 } as const;
/** How near the swimmer's hands a floating ring must come for them to take it. */
export const CATCH = 0.8;
const REEL = 3,
    BACK = 9;
export const swimmerAt = (sw: Swimmer, i: number, t: number) =>
    sw.x0 + Math.sin(t * 0.7 + i * 1.9) * 0.9;

function fireStart(L: FireStage): FireState {
    return {
        kind: "fire",
        L,
        angle: -0.55,
        power: 17,
        tank: L.tank,
        water: liquid(160),
        fires: L.fires.map((f) => ({ need: f.need, hit: -60 })),
        spraying: false,
    };
}

function airStart(L: AirStage): AirState {
    const hook = { x: HELI_HOME + COPTER.winch.x, y: HELI_REST + COPTER.winch.y };
    return {
        kind: "air",
        L,
        hx: HELI_HOME,
        hy: HELI_REST,
        hvx: 0,
        rope: ROPE_MIN,
        load: { x: hook.x, y: Math.min(hook.y + ROPE_MIN, GROUND - 0.3), vx: 0, vy: 0 },
        carrying: null,
        saved: L.stranded.map(() => false),
        lift: 0,
    };
}

function digStart(L: DigStage): DigState {
    const d: DigState = {
        kind: "dig",
        L,
        x: DIGGER_START,
        vx: 0,
        facing: 1,
        arm: -0.6,
        rocks: L.rocks.map((t, i) => ({
            t,
            x: ROCK_X0 + i * ROCK_GAP,
            y: GROUND - rockR(t),
            vx: 0,
            vy: 0,
            at: "ground" as const,
        })),
        load: 0,
        away: 0,
        was: { x: 0, y: 0 },
    };
    d.was = bucketOf(d);
    return d;
}

function seaStart(L: SeaStage): SeaState {
    return {
        kind: "sea",
        L,
        // a gentle lob that falls well short, so the first throw is the child's own judgement
        angle: -0.7,
        power: 5,
        ring: { x: THROW.x, y: THROW.y, vx: 0, vy: 0, at: "held", since: 0 },
        swimmers: L.swimmers.map((m) => ({
            x0: THROW.x + m,
            x: THROW.x + m,
            caught: false,
            saved: false,
        })),
        ripples: [],
    };
}

export function stageStart(st: Stage): StageState {
    return st.kind === "fire"
        ? fireStart(st)
        : st.kind === "air"
          ? airStart(st)
          : st.kind === "dig"
            ? digStart(st)
            : seaStart(st);
}

/** Where a job's pup gets in, on the ground beside the vehicle. */
function boardAt(st: StageState): Pt {
    if (st.kind === "fire") return { x: DECK.x - 0.6, y: GROUND };
    if (st.kind === "air") return { x: st.hx - 1.2, y: GROUND };
    if (st.kind === "dig") return { x: st.x - 1.8, y: GROUND };
    return { x: BANK_X - 0.6, y: GROUND };
}

/** Where a pup's feet are once it is in its seat, and which way it faces. */
export function seatOf(st: StageState): { x: number; y: number; facing: 1 | -1 } {
    if (st.kind === "fire") return { x: DECK.x, y: DECK.y, facing: 1 };
    if (st.kind === "air")
        return { x: st.hx + COPTER.seat.x, y: st.hy + COPTER.seat.y + HEAD.air, facing: 1 };
    if (st.kind === "dig")
        return {
            x: st.x + st.facing * DIGGER.seat.x,
            y: GROUND - DIGGER.h / 2 + DIGGER.seat.y + HEAD.dig,
            facing: st.facing,
        };
    return {
        x: boatLeft + RESCUEBOAT.deck.x,
        y: SURFACE - RESCUEBOAT.waterline + RESCUEBOAT.deck.y,
        facing: 1,
    };
}

const crewAt = (): Crew => ({
    r: runner(DOOR_X, GROUND, 1),
    a: actor<Act>("run", "run"),
    hop: -1,
    aboard: false,
    since: 0,
});

export function startLevel(L: RescueLevel, phase = 0): RescueState {
    const st = stageStart(L.stages[0]);
    return {
        phase,
        L,
        stage: 0,
        st,
        crew: crewAt(),
        cam: { ...restCam(st), zoom: 1 },
        steps: 0,
        done: -1,
        won: false,
        touched: false,
        note: "",
    };
}

const restCam = (st: StageState): Pt => ({ x: st.kind === "air" ? 20 : W / 2, y: H - VIEW.h / 2 });

const ACTS: Record<Act, Cycle> = {
    run: { poses: ["run", "walk"], per: 2 },
    hop: { poses: ["jump"] },
    work: { poses: ["stand"] },
    cheer: { poses: ["cheer", "jump"], every: 0.28 },
};
const actsFor = (job: Job): Record<Act, Cycle> => ({ ...ACTS, work: { poses: [WORK_POSE[job]] } });

/** The pup runs from the station's door to its vehicle and hops in; the vehicle waits for it. */
function stepCrew(s: RescueState, out: Happening[]): void {
    const c = s.crew,
        job = jobOf(s.st.L),
        acts = actsFor(job);
    if (c.aboard) {
        const seat = seatOf(s.st);
        c.r.x = seat.x;
        c.r.y = seat.y;
        stepActor(c.a, s.done >= 0 || s.won ? "cheer" : "work", acts, DT, c.r.stride, seat.facing);
        return;
    }
    const at = boardAt(s.st);
    c.since += DT;
    if (c.hop < 0) {
        stepRunner(c.r, seek(c.r, at.x, COURSE, MOVES, 0.2), COURSE, MOVES, DT);
        stepActor(c.a, "run", acts, DT, c.r.stride, c.r.x <= at.x ? 1 : -1);
        if (Math.abs(c.r.x - at.x) <= 0.25 || c.since > 4) {
            c.hop = 0;
            out.push({ cue: "lift", pitch: CREW[job].pitch, strength: 0.4 });
        }
        return;
    }
    c.hop += DT;
    const seat = seatOf(s.st),
        k = Math.min(1, c.hop / HOP);
    c.r.x = at.x + (seat.x - at.x) * k;
    c.r.y = at.y + (seat.y - at.y) * k - Math.sin(k * Math.PI) * 1.4;
    stepActor(c.a, "hop", acts, DT, c.r.stride, seat.facing);
    if (k >= 1) {
        c.aboard = true;
        out.push({ cue: "level", pitch: CREW[job].pitch });
    }
}

const held = (pad: Pad, d: "up" | "down" | "left" | "right") =>
    pad.holding.includes(d) || pad.pressed.includes(d);

/** A rescue part done: the checkpoint the player can go back to, a chime, and what the note says. */
function part(s: RescueState, out: Happening[], note: string): void {
    s.note = note;
    out.push({ event: { kind: "checkpoint" } }, { cue: "ring" });
}

function stageDone(s: RescueState, out: Happening[], note: string): void {
    s.done = 0;
    s.note = note;
    out.push(
        { cue: "level", pitch: CREW[jobOf(s.st.L)].pitch },
        { burst: { kind: "sparkle", x: s.crew.r.x, y: s.crew.r.y - 2, n: 12 } },
    );
}

/* Fire: the hose, the water and the flames. */

const fireLeft = (f: FireState) =>
    f.fires.reduce((a, x) => a + (x.need > 0 ? Math.ceil(x.need) : 0), 0);

/** Where the water leaves the nozzle at this aim, and how fast. */
export const streamOf = (angle: number, power: number) => ({
    at: { x: NOZZLE.x + Math.cos(angle) * 0.6, y: NOZZLE.y + Math.sin(angle) * 0.6 },
    v: { x: Math.cos(angle) * power, y: Math.sin(angle) * power },
});

function stepFire(s: RescueState, f: FireState, pad: Pad, out: Happening[]): void {
    const L = f.L;
    if (s.crew.aboard && s.done < 0) {
        if (pad.touch) {
            const dx = pad.touch.x - NOZZLE.x,
                dy = pad.touch.y - NOZZLE.y;
            f.angle = clamp(Math.atan2(dy, dx), FIRE_AIM.lo, FIRE_AIM.hi);
            f.power = clamp(4 + Math.hypot(dx, dy) * 0.95, FIRE_AIM.min, FIRE_AIM.max);
        }
        if (held(pad, "up"))
            f.angle = clamp(f.angle - FIRE_AIM.turn * DT, FIRE_AIM.lo, FIRE_AIM.hi);
        if (held(pad, "down"))
            f.angle = clamp(f.angle + FIRE_AIM.turn * DT, FIRE_AIM.lo, FIRE_AIM.hi);
        if (held(pad, "left"))
            f.power = clamp(f.power - FIRE_AIM.ramp * DT, FIRE_AIM.min, FIRE_AIM.max);
        if (held(pad, "right"))
            f.power = clamp(f.power + FIRE_AIM.ramp * DT, FIRE_AIM.min, FIRE_AIM.max);
        f.spraying = (pad.go || pad.touch !== null) && f.tank >= DROP;
    } else f.spraying = false;
    // the stream leaves at the pump's rate, a drop at a time, wavering a little as a real one does
    const every = Math.max(1, Math.round((RATE * DROP) / RESCUE.pump.value));
    if (f.spraying && s.steps % every === 0) {
        const wobble = Math.sin(s.steps * 1.7) * 0.012,
            surge = Math.sin(s.steps * 2.3) * 0.15;
        const { at, v } = streamOf(f.angle + wobble, f.power + surge);
        if (pour(f.water, at, v)) f.tank = Math.max(0, f.tank - DROP);
    }
    for (let i = 0; i < count(f.water); i++)
        f.water.drops[i * 4 + 2] = (f.water.drops[i * 4 + 2] ?? 0) + L.wind * DT;
    stepLiquid(f.water, DT, STREAM);
    let splashed = 0;
    const gone = drain(f.water, (d) => {
        for (const [i, fire] of L.fires.entries()) {
            const st = f.fires[i];
            if (!st || st.need <= 0) continue;
            if (Math.hypot(d.x - fire.x, d.y - fire.y) < FIRE_R) {
                st.need -= DROP;
                st.hit = s.steps;
                return true;
            }
        }
        if (d.y >= GROUND - 0.1) {
            splashed++;
            return true;
        }
        return d.x < -BEYOND || d.x > W + BEYOND;
    });
    if (splashed && s.steps % 20 === 0)
        out.push({ puff: { x: gone[0]?.x ?? NOZZLE.x, y: GROUND - 0.2, n: 2 } });
    for (const [i, fire] of L.fires.entries()) {
        const st = f.fires[i];
        if (!st || st.need <= 0) continue;
        if (st.need <= 1e-6) st.need = 0;
        // a fire spreads only once the truck is there to fight it, so a slow start costs nothing
        if (s.crew.aboard && s.steps - st.hit > RATE / 2)
            st.need = Math.min(fire.need * 1.5, st.need + L.grow * DT);
    }
    for (const [i, fire] of L.fires.entries()) {
        const st = f.fires[i];
        if (!st || st.need > 0 || st.hit < 0) continue;
        st.hit = -1;
        st.need = 0;
        out.push(
            { puff: { x: fire.x, y: fire.y - 0.5, n: 8 } },
            { cue: "splash", pan: panOf(fire.x, s.cam.x, VIEW.w) },
        );
        const left = f.fires.filter((x) => x.need > 0).length;
        if (left === 0) {
            part(s, out, `Every fire is out, with ${Math.floor(f.tank)} litres left in the tank.`);
            stageDone(s, out, s.note);
            return;
        }
        part(
            s,
            out,
            `That fire is out. ${left === 1 ? "One fire is" : `${left} fires are`} still burning.`,
        );
    }
    if (f.tank < DROP && count(f.water) === 0 && s.done < 0) {
        const left = fireLeft(f);
        f.tank = L.tank;
        f.fires = L.fires.map((x) => ({ need: x.need, hit: -60 }));
        s.note = `The tank ran dry with about ${left} litres of fire still burning. The truck fills up again: try with less water spilled.`;
        out.push({ cue: "back" });
    }
}

/* Air: the helicopter, the swinging rope and the pads. */

function stepAir(s: RescueState, a: AirState, pad: Pad, out: Happening[]): void {
    const L = a.L;
    let want = 0;
    let ropeWant: number | null = null;
    if (s.crew.aboard && a.lift < 1) {
        a.lift = Math.min(1, a.lift + DT / 1.2);
        const k = a.lift * a.lift * (3 - 2 * a.lift);
        a.hy = HELI_REST + (FLY - HELI_REST) * k;
    } else if (a.lift >= 1 && s.done < 0) {
        if (held(pad, "left")) want -= HELI.speed;
        if (held(pad, "right")) want += HELI.speed;
        if (held(pad, "up")) a.rope -= HELI.reel * DT;
        if (held(pad, "down")) a.rope += HELI.reel * DT;
        if (pad.touch) {
            want = clamp((pad.touch.x - a.hx) * 2, -HELI.speed, HELI.speed);
            ropeWant = pad.touch.y - winchOf(a).y;
        }
    }
    if (ropeWant !== null) a.rope += clamp(ropeWant - a.rope, -HELI.reel * DT, HELI.reel * DT);
    a.rope = clamp(a.rope, ROPE_MIN, ROPE_MAX);
    const dv = want - a.hvx;
    a.hvx += clamp(dv, -HELI.accel * DT, HELI.accel * DT);
    a.hx = clamp(a.hx + a.hvx * DT, 4, W + 6);
    if (a.hx === 4 || a.hx === W + 6) a.hvx = 0;
    // the load: a weight on a rope from the winch, which only pulls, and air that slows its swing
    const hook = winchOf(a),
        ld = a.load,
        g = RESCUE.gravity.value;
    ld.vy += g * DT;
    const drag = Math.max(0, 1 - RESCUE.swing.value * DT);
    ld.vx *= drag;
    ld.vy *= drag;
    ld.x += ld.vx * DT;
    ld.y += ld.vy * DT;
    const dx = ld.x - hook.x,
        dy = ld.y - hook.y,
        d = Math.hypot(dx, dy);
    if (d > a.rope && d > 1e-9) {
        const ux = dx / d,
            uy = dy / d;
        ld.x = hook.x + ux * a.rope;
        ld.y = hook.y + uy * a.rope;
        const out_ = (ld.vx - a.hvx) * ux + ld.vy * uy;
        if (out_ > 0) {
            ld.vx -= out_ * ux;
            ld.vy -= out_ * uy;
        }
    }
    const foot = a.carrying === null ? 0.3 : HANG;
    let bumped = 0;
    for (const r of rocksOf(L)) {
        const x0 = r.x0 - 0.35,
            x1 = r.x1 + 0.35,
            y0 = r.y0 - foot,
            y1 = r.y1 + 0.35;
        if (ld.x <= x0 || ld.x >= x1 || ld.y <= y0 || ld.y >= y1) continue;
        const pushes = [
            { d: ld.x - x0, x: x0, y: ld.y, nx: -1, ny: 0 },
            { d: x1 - ld.x, x: x1, y: ld.y, nx: 1, ny: 0 },
            { d: ld.y - y0, x: ld.x, y: y0, nx: 0, ny: -1 },
            { d: y1 - ld.y, x: ld.x, y: y1, nx: 0, ny: 1 },
        ].sort((p, q) => p.d - q.d);
        const p = pushes[0];
        if (!p) continue;
        ld.x = p.x;
        ld.y = p.y;
        const into = ld.vx * p.nx + ld.vy * p.ny;
        if (into < 0) {
            bumped = Math.max(bumped, -into);
            ld.vx -= 1.3 * into * p.nx;
            ld.vy -= 1.3 * into * p.ny;
            ld.vx *= 0.6;
        }
    }
    if (ld.y > GROUND - foot) {
        ld.y = GROUND - foot;
        ld.vy = Math.min(0, ld.vy);
        ld.vx *= 0.9;
    }
    if (bumped > 2.5) {
        out.push({ cue: "creak", strength: Math.min(1, bumped / 8) });
        if (s.done < 0) s.note = "Bump. Keep the swing small near the rock.";
    }
    if (s.done >= 0) return;
    const speed = Math.hypot(ld.vx - a.hvx, ld.vy);
    if (a.carrying === null) {
        for (const [i] of L.stranded.entries()) {
            if (a.saved[i]) continue;
            const g0 = grabOf(L, i);
            if (Math.hypot(ld.x - g0.x, ld.y - g0.y) > 0.9) continue;
            if (speed > 3.5) {
                s.note = "The hook swings past too fast to take hold. Slow the swing.";
                continue;
            }
            a.carrying = i;
            const who = L.stranded[i];
            part(s, out, `Got the ${who?.who ?? "lamb"}. Now take them to pad ${who?.pad ?? 1}.`);
            out.push({ cue: "lift", pitch: 1.2 });
            break;
        }
        return;
    }
    const who = L.stranded[a.carrying];
    if (!who) return;
    const feet = ld.y + HANG;
    for (const [i, n] of L.pads.entries()) {
        if (Math.abs(ld.x - padX(i)) > 1.3 || feet < PAD_TOP - 0.4 || speed > 3) continue;
        if (n !== who.pad) {
            s.note = `That is pad ${n}. The ${who.who} goes to pad ${who.pad}.`;
            continue;
        }
        a.saved[a.carrying] = true;
        a.carrying = null;
        a.rope = Math.max(ROPE_MIN, a.rope - 0.6);
        out.push(
            { cue: "place" },
            { burst: { kind: "sparkle", x: padX(i), y: PAD_TOP - 1, n: 10 } },
        );
        const left = a.saved.filter((x) => !x).length;
        if (left === 0) {
            part(s, out, `Safe on pad ${n}. Everyone is off the cliff.`);
            stageDone(s, out, s.note);
        } else
            part(s, out, `Safe on pad ${n}. ${left === 1 ? "One more" : `${left} more`} to fetch.`);
        return;
    }
}

/* Dig: the digger, the rubble and the truck. */

const onRoad = (d: DigState) =>
    d.rocks.filter((r) => r.at === "ground" || r.at === "air" || r.at === "bucket");

/** Keeps the digger's body clear of the truck and of the rocks on the ground either side of it. */
function limits(d: DigState): { lo: number; hi: number } {
    let lo = TRUCK_RIGHT + BODY + 0.2,
        hi = W + BEYOND - BODY;
    for (const r of d.rocks) {
        if (r.at !== "ground") continue;
        const rr = rockR(r.t);
        if (r.x >= d.x) hi = Math.min(hi, r.x - rr - BODY);
        else lo = Math.max(lo, r.x + rr + BODY);
    }
    return { lo, hi: Math.max(lo, hi) };
}

function scoopOrDrop(s: RescueState, d: DigState, out: Happening[]): void {
    const b = bucketOf(d);
    const carried = d.rocks.find((r) => r.at === "bucket");
    if (carried) {
        carried.at = "air";
        carried.vx = (b.x - d.was.x) / DT;
        carried.vy = (b.y - d.was.y) / DT;
        out.push({ cue: "lift", strength: 0.3 });
        return;
    }
    const near = d.rocks
        .filter((r) => r.at === "ground" || (r.at === "truck" && d.away === 0))
        .map((r) => ({ r, d: Math.hypot(r.x - b.x, r.y - b.y) - rockR(r.t) }))
        .sort((p, q) => p.d - q.d)[0];
    if (!near || near.d > 0.9) {
        s.note = "The bucket is not at a rock. Lower it onto one, then scoop.";
        out.push({ cue: "nope" });
        return;
    }
    if (near.r.at === "truck") d.load -= near.r.t;
    near.r.at = "bucket";
    out.push({ cue: "lift", pitch: 0.8 });
    s.note = `A ${near.r.t} tonne rock in the bucket.`;
}

function landRock(s: RescueState, d: DigState, r: Rock, out: Happening[]): void {
    const rr = rockR(r.t);
    const inBed = d.away === 0 && r.x > BED.x0 && r.x < BED.x1;
    if (inBed && r.y + rr >= BED.rim && r.vy > 0) {
        r.at = "truck";
        r.y = BED.floor - rr;
        r.vx = r.vy = 0;
        d.load += r.t;
        out.push(
            { cue: "bump", strength: 0.7, pitch: 0.7 },
            { puff: { x: r.x, y: BED.rim, n: 4 } },
        );
        if (d.load > d.L.load) {
            d.load -= r.t;
            r.at = "ground";
            r.x = TRUCK_RIGHT + rr + 0.3;
            r.y = GROUND - rr;
            if (d.x - BODY < r.x + rr) d.x = r.x + rr + BODY;
            s.note = `${d.load} and ${r.t} make ${d.load + r.t} tonnes, more than ${d.L.load}. The truck tips the ${r.t} tonne rock back out.`;
            out.push({ cue: "nope" });
            return;
        }
        if (d.load === d.L.load) {
            d.away = 3;
            const left = onRoad(d).reduce((a, x) => a + x.t, 0);
            part(
                s,
                out,
                `Exactly ${d.L.load} tonnes. The truck takes the load away${left ? `, and ${left} tonnes are still on the road` : ""}.`,
            );
            return;
        }
        s.note = `${d.load} tonnes in the truck. ${d.L.load - d.load} more to make ${d.L.load}.`;
        return;
    }
    const truckHit =
        d.away === 0 && r.x > digTruckLeft - rr && r.x < TRUCK_RIGHT + rr && r.y + rr >= BED.rim;
    if (truckHit || r.y + rr >= GROUND) {
        r.at = "ground";
        r.y = GROUND - rr;
        if (truckHit) r.x = TRUCK_RIGHT + rr + 0.3;
        r.vx = clamp(r.vx * 0.15, -1, 1);
        r.vy = 0;
        // a rock that lands against the digger's tracks rolls out beside them
        if (Math.abs(r.x - d.x) < BODY + rr) r.x = d.x + (r.x >= d.x ? 1 : -1) * (BODY + rr + 0.1);
        out.push(
            { cue: "crash", strength: 0.5 },
            { puff: { x: r.x, y: GROUND, n: 5 } },
            { shake: 0.15 },
        );
        s.note = `The ${r.t} tonne rock fell on the road. Scoop it up again.`;
    }
}

function stepDig(s: RescueState, d: DigState, pad: Pad, out: Happening[]): void {
    let want = 0;
    let act = false;
    if (s.crew.aboard && s.done < 0) {
        if (held(pad, "left")) {
            want = -DRIVE.speed;
            d.facing = -1;
        }
        if (held(pad, "right")) {
            want = DRIVE.speed;
            d.facing = 1;
        }
        if (held(pad, "up")) d.arm = clamp(d.arm - ARM.turn * DT, ARM.lo, ARM.hi);
        if (held(pad, "down")) d.arm = clamp(d.arm + ARM.turn * DT, ARM.lo, ARM.hi);
        if (pad.touch) {
            const t = pad.touch;
            if (t.x < d.x - 1.5) d.facing = -1;
            else if (t.x > d.x + 1.5) d.facing = 1;
            const p = pivotOf(d);
            const target = clamp(Math.asin(clamp((t.y - p.y) / ARM.len, -1, 1)), ARM.lo, ARM.hi);
            d.arm += clamp(target - d.arm, -ARM.turn * DT, ARM.turn * DT);
            const reach = DIGGER.pivot.x + Math.cos(d.arm) * ARM.len;
            want = clamp((t.x - d.facing * reach - d.x) * 3, -DRIVE.speed, DRIVE.speed);
        }
        act = pad.tapped || pad.lifted !== null;
    }
    d.vx += clamp(want - d.vx, -DRIVE.accel * DT, DRIVE.accel * DT);
    const lim = limits(d);
    d.x += d.vx * DT;
    if (d.x < lim.lo || d.x > lim.hi) {
        d.x = clamp(d.x, lim.lo, lim.hi);
        d.vx = 0;
    }
    // the arm never digs into the ground
    const p = pivotOf(d);
    d.arm = Math.min(d.arm, Math.asin(clamp((GROUND - 0.5 - p.y) / ARM.len, -1, 1)));
    if (act) scoopOrDrop(s, d, out);
    const b = bucketOf(d);
    for (const r of d.rocks) {
        if (r.at === "bucket") {
            r.x = b.x;
            r.y = b.y - 0.05;
        } else if (r.at === "air") {
            r.vy += RESCUE.gravity.value * DT;
            r.x += r.vx * DT;
            r.y += r.vy * DT;
            landRock(s, d, r, out);
        } else if (r.at === "ground" && Math.abs(r.vx) > 0.01) {
            r.x += r.vx * DT;
            r.vx *= Math.max(0, 1 - 6 * DT);
        }
    }
    d.was = b;
    if (d.away > 0) {
        d.away = Math.max(0, d.away - DT);
        if (d.away === 0) {
            for (const r of d.rocks) if (r.at === "truck") r.at = "gone";
            d.load = 0;
            if (s.done < 0 && onRoad(d).length === 0) {
                s.note = "The road is clear.";
                stageDone(s, out, "The road is clear. The way is open.");
            } else out.push({ cue: "place", pitch: 0.8 });
        }
    }
}

/* Sea: the boat, the ring and the swimmers. */

export const seaFlight = (angle: number, power: number) => ({
    x: THROW.x,
    y: THROW.y,
    vx: Math.cos(angle) * power,
    vy: Math.sin(angle) * power,
});

function stepSea(s: RescueState, sea: SeaState, pad: Pad, out: Happening[]): void {
    const L = sea.L,
        t = s.steps * DT,
        ring = sea.ring;
    ring.since += DT;
    for (const [i, sw] of sea.swimmers.entries())
        if (!sw.caught && !sw.saved) sw.x = swimmerAt(sw, i, t);
    const ready = s.crew.aboard && s.done < 0;
    if (ready && ring.at === "held") {
        if (pad.touch) {
            const dx = pad.touch.x - THROW.x,
                dy = pad.touch.y - THROW.y;
            sea.angle = clamp(Math.atan2(dy, dx), SEA_AIM.lo, SEA_AIM.hi);
            sea.power = clamp(Math.hypot(dx, dy) * 1.1, SEA_AIM.min, SEA_AIM.max);
        }
        if (held(pad, "up"))
            sea.angle = clamp(sea.angle - SEA_AIM.turn * DT, SEA_AIM.lo, SEA_AIM.hi);
        if (held(pad, "down"))
            sea.angle = clamp(sea.angle + SEA_AIM.turn * DT, SEA_AIM.lo, SEA_AIM.hi);
        if (held(pad, "left"))
            sea.power = clamp(sea.power - SEA_AIM.ramp * DT, SEA_AIM.min, SEA_AIM.max);
        if (held(pad, "right"))
            sea.power = clamp(sea.power + SEA_AIM.ramp * DT, SEA_AIM.min, SEA_AIM.max);
        const lifted =
            pad.lifted && Math.hypot(pad.lifted.x - THROW.x, pad.lifted.y - THROW.y) > 0.8;
        if (pad.tapped || lifted) {
            Object.assign(ring, seaFlight(sea.angle, sea.power), { at: "flying", since: 0 });
            out.push({ cue: "lift", strength: sea.power / SEA_AIM.max });
        }
    }
    const reach = THROW.x + L.rope;
    if (ring.at === "flying") {
        ring.vx += L.wind * DT;
        ring.vy += RESCUE.gravity.value * DT;
        ring.x += ring.vx * DT;
        ring.y += ring.vy * DT;
        const dx = ring.x - THROW.x,
            dy = ring.y - THROW.y,
            d = Math.hypot(dx, dy);
        if (d > L.rope) {
            const ux = dx / d,
                uy = dy / d;
            ring.x = THROW.x + ux * L.rope;
            ring.y = THROW.y + uy * L.rope;
            const o = ring.vx * ux + ring.vy * uy;
            if (o > 0) {
                ring.vx -= o * ux;
                ring.vy -= o * uy;
            }
        }
        if (ring.y >= SURFACE) {
            ring.y = SURFACE;
            ring.vx = L.current;
            ring.vy = 0;
            ring.at = "floating";
            ring.since = 0;
            sea.ripples.push({ x: ring.x, age: 0, size: 0.9 });
            out.push({ cue: "splash", pan: panOf(ring.x, s.cam.x, VIEW.w) });
        }
    }
    if (ring.at === "floating") {
        ring.x = Math.min(reach, ring.x + L.current * DT);
        const i = sea.swimmers.findIndex(
            (sw) => !sw.saved && !sw.caught && Math.abs(sw.x - ring.x) < CATCH,
        );
        const sw = sea.swimmers[i];
        if (sw) {
            sw.caught = true;
            ring.at = "towing";
            part(
                s,
                out,
                `Caught. The swimmer holds the ring, ${Math.round(sw.x - THROW.x)} metres out. Hold to pull them in.`,
            );
        } else if (ring.since > 1.8) {
            const near = sea.swimmers
                .filter((x) => !x.saved)
                .map((x) => x.x - ring.x)
                .sort((p, q) => Math.abs(p) - Math.abs(q))[0];
            ring.at = "back";
            s.note =
                near === undefined
                    ? "The ring is pulled back in."
                    : `The ring floated ${Math.abs(Math.round(near))} metres ${near > 0 ? "short of" : "past"} the swimmer. It is pulled back in to throw again.`;
            out.push({ cue: "back" });
        }
    }
    if (ring.at === "back") {
        const dx = THROW.x - ring.x,
            dy = THROW.y - ring.y,
            d = Math.hypot(dx, dy),
            step = BACK * DT;
        if (d <= step)
            Object.assign(ring, { x: THROW.x, y: THROW.y, vx: 0, vy: 0, at: "held", since: 0 });
        else {
            ring.x += (dx / d) * step;
            ring.y = ring.x > BOAT_X + 2 ? SURFACE : ring.y + (dy / d) * step;
        }
    }
    if (ring.at === "towing") {
        const sw = sea.swimmers.find((x) => x.caught && !x.saved);
        if (!sw) return;
        const pulling = ready && (pad.go || pad.touch !== null);
        sw.x = Math.min(reach, sw.x + (L.current - (pulling ? REEL : 0)) * DT);
        ring.x = sw.x;
        ring.y = SURFACE;
        if (pulling && s.steps % 12 === 0) sea.ripples.push({ x: sw.x + 0.6, age: 0, size: 0.4 });
        if (sw.x <= THROW.x + 1.3) {
            sw.saved = true;
            sw.caught = false;
            Object.assign(ring, { x: THROW.x, y: THROW.y, vx: 0, vy: 0, at: "held", since: 0 });
            out.push(
                { cue: "place" },
                { burst: { kind: "splash", x: THROW.x + 1, y: SURFACE, n: 8 } },
            );
            const left = sea.swimmers.filter((x) => !x.saved).length;
            if (left === 0) {
                part(s, out, "Aboard and safe. Everyone is out of the river.");
                stageDone(s, out, s.note);
            } else
                part(
                    s,
                    out,
                    `Aboard and safe. ${left === 1 ? "One more swimmer" : `${left} more swimmers`} to go.`,
                );
        }
    }
    for (const r of sea.ripples) r.age += DT;
    sea.ripples = sea.ripples.filter((r) => r.age < 2.5);
}

export function stepRescue(s: RescueState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (pad.go || pad.tapped || pad.touch || pad.holding.length || pad.pressed.length)
        s.touched = true;
    stepCrew(s, out);
    const st = s.st;
    if (st.kind === "fire") stepFire(s, st, pad, out);
    else if (st.kind === "air") stepAir(s, st, pad, out);
    else if (st.kind === "dig") stepDig(s, st, pad, out);
    else stepSea(s, st, pad, out);
    if (s.done >= 0 && !s.won) {
        s.done += DT;
        if (s.done >= 1.6) {
            const next = s.L.stages[s.stage + 1];
            if (next) {
                s.stage++;
                s.st = stageStart(next);
                s.crew = crewAt();
                s.done = -1;
                s.note = `On to the next call. ${CREW[next.kind].name} takes this one.`;
                out.push({ cue: "level", pitch: CREW[next.kind].pitch });
            } else {
                s.won = true;
                s.note = "Every rescue is done. The whole team cheers.";
                out.push({ event: { kind: "won" } }, { cue: "win" });
            }
        }
    }
    s.cam = follow(
        s.cam,
        { ...camWant(s), zoom: 1 },
        { rate: 2.5, dt: DT, view: VIEW, world: { w: W, h: H } },
    );
    return out;
}

function camWant(s: RescueState): Pt {
    const st = s.st;
    if (st.kind === "air") return { x: clamp(st.hx + 4, 20, W - 20), y: H - VIEW.h / 2 };
    return restCam(st);
}

/* The dotted aids: the arc a stream or a throw will take, cut short as the levels go on. */

/** The path of one drop of the stream, stepped as the liquid steps it, until it meets a fire or the ground. */
export function streamPath(L: FireStage, angle: number, power: number, most = RATE * 2): Pt[] {
    const { at, v } = streamOf(angle, power);
    let x = at.x,
        y = at.y,
        vx = v.x,
        vy = v.y;
    const pts: Pt[] = [{ x, y }];
    for (let i = 0; i < most; i++) {
        vx += L.wind * DT;
        const fastest = Math.min(STREAM.most, Math.hypot(vx, vy) + STREAM.gravity * DT);
        const pieces = Math.max(1, Math.min(4, Math.ceil((fastest * DT) / STREAM.r))),
            h = DT / pieces;
        for (let k = 0; k < pieces; k++) {
            vy += STREAM.gravity * h;
            x += vx * h;
            y += vy * h;
        }
        pts.push({ x, y });
        // the house stands behind the water, so a drop meets only a fire or the ground
        if (L.fires.some((f) => Math.hypot(x - f.x, y - f.y) < FIRE_R) || y >= GROUND) break;
    }
    return pts;
}

/** The path of a thrown ring until it meets the water, the rope holding it back as it does in play. */
export function throwPath(
    L: SeaStage,
    angle: number,
    power: number,
    gravity = RESCUE.gravity.value,
): Pt[] {
    const r = seaFlight(angle, power),
        pts: Pt[] = [{ x: r.x, y: r.y }];
    for (let i = 0; i < RATE * 3; i++) {
        r.vx += L.wind * DT;
        r.vy += gravity * DT;
        r.x += r.vx * DT;
        r.y += r.vy * DT;
        const dx = r.x - THROW.x,
            dy = r.y - THROW.y,
            d = Math.hypot(dx, dy);
        if (d > L.rope) {
            const ux = dx / d,
                uy = dy / d;
            r.x = THROW.x + ux * L.rope;
            r.y = THROW.y + uy * L.rope;
            const o = r.vx * ux + r.vy * uy;
            if (o > 0) {
                r.vx -= o * ux;
                r.vy -= o * uy;
            }
        }
        pts.push({ x: r.x, y: Math.min(r.y, SURFACE) });
        if (r.y >= SURFACE) break;
    }
    return pts;
}

/** Points of `pts` that are within the first `share` of its length, every half square, for a dotted line. */
function dotted(pts: readonly Pt[], share: number): Pt[] {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
            b = pts[i];
        if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    const out: Pt[] = [];
    let walked = 0,
        next = 0.5;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
            b = pts[i];
        if (!a || !b) continue;
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        while (next <= walked + l && next <= total * share) {
            const k = (next - walked) / (l || 1);
            out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
            next += 0.5;
        }
        walked += l;
    }
    return out;
}

/* The frame. */

function pupSprite(s: RescueState, rest: boolean): Sprite[] {
    const c = s.crew,
        job = jobOf(s.st.L),
        z = s.st.kind === "air" || s.st.kind === "dig" ? 4 : 7;
    return actorSprites(
        c.a,
        actsFor(job),
        (pose, facing) => ({
            key: "pup",
            art: "pupfamily",
            params: {
                member: CREW[job].pup,
                pose,
                mood: s.done >= 0 || s.won ? "excited" : "happy",
                dir: facing,
                gear: CREW[job].gear,
            },
            x: c.r.x,
            y: c.r.y,
            size: PUP_SIZE[job],
            stand: true,
            z,
        }),
        c.r.stride,
        rest,
    );
}

function fireSprites(
    s: RescueState,
    f: FireState,
    rest: boolean,
    sprites: Sprite[],
    marks: Mark[],
): void {
    const L = f.L;
    sprites.push({
        key: "house",
        art: L.house,
        params: L.house === "barn" ? { windows: 2, hay: 1 } : { windows: 2, lit: 0 },
        x: HOUSE_X,
        y: GROUND,
        stand: true,
        size: L.house === "barn" ? 10 : 9,
        z: 3,
        still: true,
    });
    sprites.push({
        key: "truck",
        art: "firetruck",
        params: { lights: s.crew.aboard && s.done < 0 && !rest && s.steps % 30 < 15 ? 1 : 0 },
        x: TRUCK_X,
        y: GROUND,
        stand: true,
        z: 6,
    });
    const t = s.steps * DT;
    for (const [i, fire] of L.fires.entries()) {
        const st = f.fires[i];
        if (!st || st.need <= 0) continue;
        const k = 0.55 + Math.min(1.5, st.need / fire.need) * 0.45;
        sprites.push({
            key: `fire:${i}`,
            art: "blaze",
            params: { tongues: st.need > fire.need ? 4 : 3 },
            x: fire.x,
            y: fire.y + 0.9,
            stand: true,
            size: 2 * k,
            squash: rest ? 0 : Math.sin(t * 9 + i * 2) * 0.06,
            glow: 1.4 * k,
            z: 5,
        });
        marks.push({
            kind: "word",
            x: fire.x,
            y: fire.y - 2.4 * k - 0.4,
            text: `${Math.ceil(st.need)} L`,
            size: 0.7,
        });
    }
    // the hose from the reel to the nozzle, and the nozzle along the aim
    const reel = { x: truckLeft + 3.35, y: truckTop + 2.65 },
        dir = { x: Math.cos(f.angle), y: Math.sin(f.angle) };
    if (s.crew.aboard) {
        marks.push({ kind: "line", a: reel, b: NOZZLE, bend: -0.6, style: "rod" });
        marks.push({
            kind: "line",
            a: NOZZLE,
            b: { x: NOZZLE.x + dir.x * 0.8, y: NOZZLE.y + dir.y * 0.8 },
            style: "rod",
        });
        if (!rest && s.L.preview > 0 && s.done < 0) {
            const pts = dotted(streamPath(L, f.angle, f.power), s.L.preview);
            if (pts.length) marks.push({ kind: "dots", pts, faint: true });
        }
    }
    marks.push({
        kind: "word",
        x: TRUCK_X,
        y: truckTop - 1.4,
        text: `Tank ${Math.floor(f.tank)} of ${L.tank} L`,
        size: 0.7,
    });
}

function airSprites(
    s: RescueState,
    a: AirState,
    rest: boolean,
    sprites: Sprite[],
    marks: Mark[],
): void {
    const L = a.L;
    sprites.push({
        key: "home",
        art: "helipad",
        params: { n: 0 },
        x: HELI_HOME,
        y: GROUND,
        stand: true,
        z: 3,
        still: true,
    });
    for (const [i, n] of L.pads.entries())
        sprites.push({
            key: `pad:${i}`,
            art: "helipad",
            params: { n },
            x: padX(i),
            y: GROUND,
            stand: true,
            z: 3,
            still: true,
        });
    for (let x = CLIFF_X; x < W + BEYOND; x += 16)
        sprites.push({
            key: `cliff:${x}`,
            art: "streambank",
            params: {
                w: 16,
                h: GROUND - CLIFF_TOP,
                edge: x === CLIFF_X ? "left" : "none",
                cliff: 1,
            },
            x: x + 8,
            y: GROUND,
            stand: true,
            z: 2,
            still: true,
        });
    for (const [i, l] of L.ledges.entries())
        sprites.push({
            key: `ledge:${i}`,
            art: "streambank",
            params: { w: Math.round(CLIFF_X - l.x + 1), h: 2, edge: "left", cliff: 1 },
            x: (l.x + CLIFF_X + 1) / 2,
            y: l.y + 2,
            stand: true,
            z: 3,
            still: true,
        });
    const hook = winchOf(a),
        ld = a.load;
    for (const [i, who] of L.stranded.entries()) {
        const carried = a.carrying === i;
        const padI = L.pads.indexOf(who.pad);
        const at = carried
            ? { x: ld.x, y: ld.y + HANG }
            : a.saved[i]
              ? { x: padX(padI < 0 ? 0 : padI) + (who.who === "lamb" ? -0.6 : 0.6), y: PAD_TOP }
              : standOf(L, i);
        sprites.push(
            who.who === "lamb"
                ? {
                      key: `who:${i}`,
                      art: "sheep",
                      params: { step: 0, graze: false, alarm: !a.saved[i] },
                      x: at.x,
                      y: at.y,
                      stand: true,
                      size: 2.2,
                      z: 5,
                  }
                : {
                      key: `who:${i}`,
                      art: "person",
                      params: { pose: a.saved[i] ? "cheer" : carried ? "hang" : "wave" },
                      x: at.x,
                      y: at.y,
                      stand: true,
                      size: 2,
                      z: 5,
                  },
        );
        if (!a.saved[i] && !carried) {
            const g = grabOf(L, i),
                depth = Math.round(g.y - (FLY + COPTER.winch.y));
            marks.push({
                kind: "word",
                x: at.x - 2.6,
                y: at.y - 1.2,
                text: `${depth} m down`,
                size: 0.6,
            });
        }
    }
    // the winch stays wound up until the helicopter is in the air
    const flying = a.lift >= 1;
    if (flying) marks.push({ kind: "line", a: hook, b: { x: ld.x, y: ld.y }, style: "thin" });
    // the rope's metres: a tick at each, and the number every two while the aids last
    const len = Math.hypot(ld.x - hook.x, ld.y - hook.y);
    if (flying && len > 0.5 && !rest)
        for (let m = 1; m < len; m++) {
            const k = m / len,
                x = hook.x + (ld.x - hook.x) * k,
                y = hook.y + (ld.y - hook.y) * k;
            marks.push({
                kind: "line",
                a: { x: x - 0.18, y },
                b: { x: x + 0.18, y },
                style: "thin",
            });
            if (s.L.preview >= 0.5 && m % 2 === 0)
                marks.push({ kind: "word", x: x + 0.7, y: y + 0.15, text: String(m), size: 0.4 });
        }
    if (flying)
        sprites.push({
            key: "hook",
            art: "lifering",
            params: { bands: 4 },
            x: ld.x,
            y: ld.y,
            size: 0.7,
            z: 6,
        });
    sprites.push({
        key: "heli",
        art: "rescuecopter",
        params: { rotor: s.crew.aboard ? 1 : 0 },
        x: a.hx,
        y: a.hy,
        z: 6,
    });
    marks.push({
        kind: "word",
        x: a.hx,
        y: a.hy - 2.7,
        text: `Rope ${Math.round(a.rope)} m`,
        size: 0.6,
    });
}

function digSprites(
    s: RescueState,
    d: DigState,
    rest: boolean,
    sprites: Sprite[],
    marks: Mark[],
): void {
    const truckX = DIG_TRUCK_X - (d.away > 0 ? Math.sin((d.away / 3) * Math.PI) * 22 : 0);
    sprites.push({
        key: "truck",
        art: "dumptruck",
        params: { load: 0 },
        x: truckX,
        y: GROUND,
        stand: true,
        flip: true,
        z: 5,
    });
    for (const [i, r] of d.rocks.entries()) {
        if (r.at === "gone") continue;
        const rr = rockR(r.t);
        const x = r.at === "truck" ? r.x + (truckX - DIG_TRUCK_X) : r.x;
        sprites.push({
            key: `rock:${i}`,
            art: "rubble",
            params: { cracks: (i % 2) + 1 },
            x,
            y: r.y,
            size: rr * 2.2,
            z: r.at === "truck" ? 4 : 7,
        });
        if (r.at !== "truck")
            marks.push({ kind: "word", x, y: r.y - rr - 0.5, text: `${r.t} t`, size: 0.6 });
    }
    sprites.push({
        key: "digger",
        art: "digger",
        params: { tracks: 5 },
        x: d.x,
        y: GROUND,
        stand: true,
        flip: d.facing < 0,
        z: 6,
    });
    const p = pivotOf(d),
        c = {
            x: p.x + d.facing * Math.cos(d.arm) * -DIGGERARM.pivot.x,
            y: p.y + Math.sin(d.arm) * -DIGGERARM.pivot.x,
        };
    sprites.push({
        key: "arm",
        art: "diggerarm",
        params: { teeth: 3 },
        x: c.x,
        y: c.y,
        angle: d.facing * d.arm,
        flip: d.facing < 0,
        z: 8,
    });
    const carried = d.rocks.find((r) => r.at === "bucket");
    if (carried && !rest && s.L.preview > 0) {
        const floor = carried.x > BED.x0 && carried.x < BED.x1 && d.away === 0 ? BED.rim : GROUND;
        const pts: Pt[] = [];
        for (let y = carried.y + rockR(carried.t) + 0.4; y < floor; y += 0.5)
            pts.push({ x: carried.x, y });
        if (pts.length) marks.push({ kind: "dots", pts, faint: true });
    }
    marks.push({
        kind: "word",
        x: truckX - 1,
        y: GROUND - DUMPTRUCK.h - 1.2,
        text: d.away > 0 ? "Away with a load" : `${d.load} of ${d.L.load} t`,
        size: 0.7,
    });
    const left = onRoad(d).reduce((a, r) => a + r.t, 0);
    if (left > 0)
        marks.push({
            kind: "word",
            x: ROCK_X0 + 5,
            y: GROUND + 1.4,
            text: `${left} t on the road`,
            size: 0.55,
        });
}

function seaSprites(
    s: RescueState,
    sea: SeaState,
    rest: boolean,
    sprites: Sprite[],
    marks: Mark[],
): void {
    const L = sea.L,
        t = s.steps * DT;
    const bob = rest ? 0 : Math.sin(t * 1.6) * 0.08;
    sprites.push({
        key: "jetty",
        art: "jetty",
        params: { posts: 3 },
        x: BANK_X - 1.5,
        y: GROUND + 0.6,
        stand: true,
        size: 5,
        z: 3,
        still: true,
    });
    sprites.push({
        key: "boat",
        art: "rescueboat",
        params: { flag: 1 },
        x: BOAT_X,
        y: SURFACE - RESCUEBOAT.waterline + RESCUEBOAT.h + bob,
        stand: true,
        z: 6,
    });
    for (const [i, sw] of sea.swimmers.entries()) {
        if (sw.saved) {
            sprites.push({
                key: `swimmer:${i}`,
                art: "person",
                params: { pose: "cheer" },
                x: boatLeft + 3.4 + i * 0.9,
                y: THROW.y + 1.6 + bob,
                stand: true,
                size: 1.6,
                z: 5,
            });
            continue;
        }
        sprites.push({
            key: `swimmer:${i}`,
            art: "person",
            params: { pose: sw.caught ? "hang" : "wave" },
            x: sw.x,
            y: SURFACE + 2.3 + (rest ? 0 : Math.sin(t * 2.2 + i) * 0.1),
            stand: true,
            size: 1.8,
            z: 2,
        });
        marks.push({
            kind: "word",
            x: sw.x,
            y: SURFACE - 3.4,
            text: `${Math.round(sw.x - THROW.x)} m`,
            size: 0.6,
        });
    }
    const ring = sea.ring;
    if (ring.at !== "held" || s.crew.aboard)
        sprites.push({
            key: "ring",
            art: "lifering",
            params: { bands: 4 },
            x: ring.x,
            y: ring.at === "floating" || ring.at === "towing" ? SURFACE - 0.1 : ring.y,
            size: 0.9,
            z: 7,
        });
    if (ring.at !== "held")
        marks.push({
            kind: "line",
            a: THROW,
            b: { x: ring.x, y: ring.y },
            bend: ring.at === "flying" ? 0 : -0.8,
            style: "thin",
        });
    // the metres across the river from where the ring is thrown, as the rope reaches
    for (let m = 1; m <= L.rope; m++) {
        const x = THROW.x + m;
        marks.push({
            kind: "line",
            a: { x, y: SURFACE + 0.35 },
            b: { x, y: SURFACE + (m % 2 === 0 ? 0.8 : 0.6) },
            style: "thin",
        });
        if (m % 2 === 0)
            marks.push({ kind: "word", x, y: SURFACE + 1.35, text: String(m), size: 0.45 });
    }
    marks.push({ kind: "word", x: BOAT_X, y: THROW.y - 2.6, text: `Rope ${L.rope} m`, size: 0.6 });
    if (ring.at === "held" && s.crew.aboard && !rest && s.L.preview > 0 && s.done < 0) {
        const pts = dotted(throwPath(L, sea.angle, sea.power), s.L.preview);
        if (pts.length) marks.push({ kind: "dots", pts, faint: true });
    }
}

export function rescueFrame(s: RescueState, rest = false): Frame {
    const st = s.st,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    const cam = rest ? { ...restCam(st), zoom: 1 } : s.cam;
    const eye = { cam, view: VIEW };
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.2,
                base: 3.5,
                every: 14,
                stray: 3,
                z: 1,
                alpha: 0.7,
                things: [
                    { art: "cloud", size: 5, often: 2, params: { puffs: 4 } },
                    { art: "cloud", size: 3.6, often: 1, params: { puffs: 3 }, lift: 1.5 },
                ],
            },
            eye,
            40 + s.phase,
        ),
    );
    if (st.kind === "sea") {
        sprites.push(...ground("bank", -BEYOND, BANK_X, GROUND, 2));
        sprites.push(...ground("bed", BANK_X, W + BEYOND, H - 0.8, 1));
    } else sprites.push(...ground("ground", -BEYOND, W + BEYOND, GROUND, 2));
    sprites.push({
        key: "base",
        art: "rescuebase",
        params: { doors: 2 },
        x: BASE_X,
        y: GROUND,
        stand: true,
        z: 2,
        still: true,
    });
    if (st.kind === "fire") fireSprites(s, st, rest, sprites, marks);
    else if (st.kind === "air") airSprites(s, st, rest, sprites, marks);
    else if (st.kind === "dig") digSprites(s, st, rest, sprites, marks);
    else seaSprites(s, st, rest, sprites, marks);
    sprites.push(...pupSprite(s, rest));
    const frame: Frame = {
        sprites,
        marks,
        camera: { ...cam },
        view: { ...VIEW },
        world: { w: W, h: H },
        time: rest ? 0 : s.steps * DT,
    };
    if (st.kind === "fire")
        frame.liquid = [{ drops: places(st.water), r: STREAM.r * 1.4, hue: "sky", z: 7 }];
    if (st.kind === "sea")
        frame.water = [
            {
                x: BANK_X,
                w: W + BEYOND - BANK_X,
                level: SURFACE,
                bottom: H + 2,
                flow: st.L.current,
                waves: 0.1,
                ripples: rest ? [] : st.ripples.map((r) => ({ ...r })),
            },
        ];
    return frame;
}

/* Words: the note, the position read aloud, the parts done. */

function partsOf(st: StageState): { done: number; total: number } {
    if (st.kind === "fire")
        return { done: st.fires.filter((f) => f.need <= 0).length, total: st.fires.length };
    if (st.kind === "air") return { done: st.saved.filter(Boolean).length, total: st.saved.length };
    if (st.kind === "sea")
        return { done: st.swimmers.filter((x) => x.saved).length, total: st.swimmers.length };
    const total = st.L.rocks.reduce((a, t) => a + t, 0) / st.L.load;
    const left = onRoad(st).reduce((a, r) => a + r.t, 0) + st.load;
    return { done: Math.floor(total - left / st.L.load), total: Math.round(total) };
}

/** Every part of every mission in the level, and how many are done. */
function objectives(s: RescueState): { completed: number; total: number } {
    let completed = 0,
        total = 0;
    for (const [i, st] of s.L.stages.entries()) {
        const p = i === s.stage ? partsOf(s.st) : partsOf(stageStart(st));
        total += p.total;
        completed += i < s.stage || s.won ? p.total : i === s.stage ? p.done : 0;
    }
    return { completed, total };
}

function say(s: RescueState): string {
    const st = s.st,
        who = CREW[jobOf(st.L)].name;
    if (!s.crew.aboard)
        return `${who} is running to the ${st.kind === "air" ? "helicopter" : st.kind === "dig" ? "digger" : st.kind === "sea" ? "boat" : "fire truck"}.`;
    if (st.kind === "fire") {
        const deg = Math.round((-st.angle * 180) / Math.PI);
        const fires = st.fires
            .map((f, i) =>
                f.need > 0
                    ? `fire ${i + 1} needs ${Math.ceil(f.need)} litres`
                    : `fire ${i + 1} is out`,
            )
            .join(", ");
        return `${who} aims the hose ${deg} degrees up at ${Math.round(((st.power - FIRE_AIM.min) / (FIRE_AIM.max - FIRE_AIM.min)) * 100)}% pressure. ${Math.floor(st.tank)} litres are in the tank. ${fires}.`;
    }
    if (st.kind === "air") {
        const carrying =
            st.carrying === null
                ? "The rope is empty"
                : `The ${st.L.stranded[st.carrying]?.who ?? "lamb"} hangs on the rope`;
        return `${who} flies the helicopter ${Math.round(st.hx - PAD_X0)} metres from the first pad with ${Math.round(st.rope)} metres of rope out. ${carrying}.`;
    }
    if (st.kind === "dig") {
        const rocks = onRoad(st)
            .map((r) => `${r.t} tonnes`)
            .join(", ");
        return `${who} drives the digger facing ${st.facing > 0 ? "right" : "left"}. The truck holds ${st.load} of ${st.L.load} tonnes. On the road: ${rocks || "nothing"}.`;
    }
    const out = st.swimmers
        .filter((x) => !x.saved)
        .map((x) => `${Math.round(x.x - THROW.x)} metres out`)
        .join(" and ");
    return `${who} is on the boat with ${st.L.rope} metres of rope. ${out ? `A swimmer is ${out}.` : "Everyone is aboard."} The ring is ${st.ring.at === "held" ? "ready to throw" : st.ring.at === "towing" ? "held by the swimmer" : "out on the water"}.`;
}

/** Rescue pups' own sounds: the pumps and splashes, a clank for a rock, a bark for each pup, and a fanfare. */
const SOUNDS: Kit = {
    level: [
        { wave: "sawtooth", hz: 420, to: 300, attack: 0.005, decay: 0.07, gain: 0.25 },
        { wave: "noise", hz: 1500, attack: 0.002, decay: 0.05, gain: 0.2 },
        { wave: "sawtooth", hz: 460, to: 320, attack: 0.005, decay: 0.08, gain: 0.25, delay: 0.14 },
    ],
    crash: [
        { wave: "noise", hz: 500, attack: 0.004, decay: 0.25, gain: 0.5 },
        { wave: "sine", hz: 80, to: 45, attack: 0.004, decay: 0.3, gain: 0.5 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.2, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.2, gain: 0.35, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.2, gain: 0.35, delay: 0.24 },
        { wave: "triangle", hz: 1047, attack: 0.01, decay: 0.5, gain: 0.35, delay: 0.36 },
        { wave: "sawtooth", hz: 480, to: 340, attack: 0.005, decay: 0.08, gain: 0.2, delay: 0.6 },
    ],
};

function hum(s: RescueState): Hum[] {
    const st = s.st;
    if (!s.crew.aboard || s.won) return [];
    if (st.kind === "fire")
        return [
            { kind: "siren", level: s.done < 0 ? 0.5 : 0 },
            ...(st.spraying ? [{ kind: "water" as const, level: 0.8 }] : []),
        ];
    if (st.kind === "air") return [{ kind: "rotor", level: 0.7, pitch: 1 + Math.abs(st.hvx) / 20 }];
    if (st.kind === "dig")
        return [
            {
                kind: "rumble",
                level: 0.5 + Math.min(0.4, Math.abs(st.vx) / 10),
                pitch: 1 + Math.abs(st.vx) / 12,
            },
        ];
    return [{ kind: "water", level: 0.35 }];
}

function settling(s: RescueState): boolean {
    const st = s.st;
    if (!s.crew.aboard || (s.done >= 0 && !s.won)) return true;
    if (st.kind === "fire") return count(st.water) > 0;
    if (st.kind === "air")
        return (
            st.lift < 1 ||
            Math.abs(st.hvx) > 0.05 ||
            Math.hypot(st.load.vx - st.hvx, st.load.vy) > 0.3
        );
    if (st.kind === "dig")
        return st.away > 0 || Math.abs(st.vx) > 0.05 || st.rocks.some((r) => r.at === "air");
    return st.ring.at === "flying" || st.ring.at === "floating" || st.ring.at === "back";
}

export const rescueGame: ActionGame<RescueState> = {
    id: "rescue",
    title: "Rescue pups",
    group: "action",
    touch: true,
    quiet: true,
    levels: RESCUE_LEVELS,
    rate: RATE,
    cover: {
        art: "pupfamily",
        params: { member: "rufus", pose: "cheer", mood: "excited", dir: 1, gear: "helmet" },
    },
    hint: "Hold a finger where the water, the rope, the bucket or the ring should go. With the keys, the arrows aim and move, and space sprays, scoops, throws or pulls.",
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: "Go",
    },
    sounds: SOUNDS,
    start: (phase) => startLevel(RESCUE_LEVELS[phase] ?? RESCUE_LEVELS[0], phase),
    step: stepRescue,
    say,
    note: (s) => (!s.touched && !s.won ? s.L.prompt : s.note),
    won: (s) => s.won,
    objectives,
    frame: rescueFrame,
    hum,
    tuning: RESCUE,
    still: {
        press: () => Math.round(RATE * 0.2),
        settling,
    },
};
