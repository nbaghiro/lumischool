// The variations of Rescue pups, and a driver that plays each one to its win through the pad: for each
// mission it lines up the hose, the helicopter, the digger or the throw with the arrows the way a
// player would, and presses go when the aim is right. It reads only what the screen shows, and every
// press goes through the real game, so a variation a child is given has been played to the end first.
import { emptyPad, type Pad } from "../../engine/motion/pad";
import {
    ARM,
    BED,
    DRIVE,
    FIRE_AIM,
    GROUND,
    HANG,
    HELI,
    RESCUE_LEVELS,
    SEA_AIM,
    bucketOf,
    grabOf,
    padX,
    pivotOf,
    rescueGame,
    rockR,
    startLevel,
    streamPath,
    throwPath,
    winchOf,
    type RescueLevel,
    type RescueState,
    type Stage,
} from "./rescue";
import { COPTER } from "../../engine/parts/travel/rescuecopter";
import { DIGGER } from "../../engine/parts/travel/digger";

export interface RescueConfiguration {
    phase: number;
    variant: number;
}

export const RESCUE_VARIANTS = 3;

/** Other rubble for a load of a size, each set making whole loads in more than one order. */
const RUBBLE: Partial<Record<number, [number[], number[]]>> = {
    5: [
        [1, 4, 5],
        [4, 1, 3, 2],
    ],
    7: [
        [6, 1, 4, 3],
        [2, 5, 3, 4],
    ],
};

/** The list turned by `k` places: the first `k` go to the end. */
const rotate = <T>(xs: readonly T[], k: number): T[] => [...xs.slice(k), ...xs.slice(0, k)];

function varyStage(st: Stage, variant: number): Stage {
    if (variant === 0) return st;
    if (st.kind === "fire") {
        const needs = rotate(
            st.fires.map((f) => f.need),
            1,
        ).map((n) => n + (variant === 2 ? 1 : 0));
        const more = variant === 2 ? st.fires.length * 2 : 0;
        return {
            ...st,
            fires: st.fires.map((f, i) => ({ ...f, need: needs[i] ?? f.need })),
            tank: st.tank + more,
        };
    }
    if (st.kind === "air") {
        const shift = variant === 1 ? 1 : -1;
        const pads = st.pads;
        return {
            ...st,
            ledges: st.ledges.map((l) => ({ ...l, y: Math.max(8, Math.min(15, l.y + shift)) })),
            stranded: st.stranded.map((w) => ({
                ...w,
                pad: pads[(pads.indexOf(w.pad) + variant) % pads.length] ?? w.pad,
            })),
        };
    }
    if (st.kind === "dig") return { ...st, rocks: RUBBLE[st.load]?.[variant - 1] ?? st.rocks };
    return {
        ...st,
        swimmers: st.swimmers.map((m) =>
            Math.max(3, Math.min(st.rope - 1, m + (variant === 1 ? 1 : -1))),
        ),
    };
}

/** A level as one of its variations lays it out: other litres, pads, ledges, rubble or distances. */
export function vary(L: RescueLevel, variant: number): RescueLevel {
    if (variant === 0) return L;
    const [first, ...rest] = L.stages;
    const pads = (st: Stage) => (st.kind === "air" ? st.stranded.map((w) => w.pad) : []);
    const stages: [Stage, ...Stage[]] = [
        varyStage(first, variant),
        ...rest.map((st) => varyStage(st, variant)),
    ];
    const words = (text: string) => {
        let out = text;
        L.stages.forEach((st, i) => {
            const now = stages[i];
            if (!now) return;
            pads(st).forEach((p, k) => {
                const q = pads(now)[k];
                if (q !== undefined) out = out.replace(`pad ${p}`, `pad #${q}`);
            });
        });
        return out.replaceAll("pad #", "pad ");
    };
    return { ...L, stages, goal: words(L.goal) };
}

export function rescueChallenge(seed: number, phase: number): RescueConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < RESCUE_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % RESCUE_VARIANTS };
}

export function isRescueConfiguration(v: unknown, phase: number): v is RescueConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < RESCUE_VARIANTS &&
        RESCUE_LEVELS[phase] !== undefined
    );
}

export function openRescueConfiguration(c: RescueConfiguration): RescueState {
    const L = RESCUE_LEVELS[c.phase];
    if (!L) throw new Error("No such rescue level");
    return startLevel(vary(L, c.variant), c.phase);
}

const RATE = rescueGame.rate,
    DT = 1 / RATE;

const pad = (hold: ("up" | "down" | "left" | "right")[] = [], o: Partial<Pad> = {}): Pad => ({
    ...emptyPad(),
    holding: hold,
    held: hold[hold.length - 1] ?? null,
    ...o,
});

/** Holds the arrows that move `now` towards `want` by `rate` a second, stopping once it is within half a step. */
function towards(
    now: number,
    want: number,
    rate: number,
    less: "up" | "down" | "left" | "right",
    more: "up" | "down" | "left" | "right",
) {
    const d = want - now,
        half = (rate * DT) / 2;
    return d > half ? [more] : d < -half ? [less] : [];
}

/** Whether `now` is within half a step of `want`. */
const at = (now: number, want: number, rate: number) =>
    Math.abs(want - now) <= (rate * DT) / 2 + 1e-9;

/* The fire: the aim that lands the stream on the fire, found by stepping the stream's own path. */
const fireAims = new Map<string, { angle: number; power: number } | null>();
function fireAim(s: RescueState, i: number): { angle: number; power: number } | null {
    const st = s.st;
    if (st.kind !== "fire") return null;
    const fire = st.L.fires[i];
    if (!fire) return null;
    const key = JSON.stringify([st.L, i]);
    const known = fireAims.get(key);
    if (known !== undefined) return known;
    let best: { angle: number; power: number; off: number } | null = null;
    for (let power = 12; power <= FIRE_AIM.max; power += 0.5)
        for (let angle = FIRE_AIM.lo; angle <= FIRE_AIM.hi; angle += 0.01) {
            const pts = streamPath(st.L, angle, power);
            const end = pts[pts.length - 1];
            if (!end) continue;
            const hit = st.L.fires.findIndex((f) => Math.hypot(end.x - f.x, end.y - f.y) < 1.1);
            if (hit !== i) continue;
            // aim for the middle of the fire, and for a flat, quick stream over a lob that hangs in the wind
            const off = Math.hypot(end.x - fire.x, end.y - fire.y) + pts.length * 0.004;
            if (!best || off < best.off) best = { angle, power, off };
        }
    const found = best ? { angle: best.angle, power: best.power } : null;
    fireAims.set(key, found);
    return found;
}

function fireDriver(s: RescueState): Pad {
    const st = s.st;
    if (st.kind !== "fire") return pad();
    const i = st.fires.findIndex((f) => f.need > 0);
    const aim = i < 0 ? null : fireAim(s, i);
    if (!aim) return pad();
    const hold = [
        ...towards(st.angle, aim.angle, FIRE_AIM.turn, "up", "down"),
        ...towards(st.power, aim.power, FIRE_AIM.ramp, "left", "right"),
    ];
    const lined = at(st.angle, aim.angle, FIRE_AIM.turn) && at(st.power, aim.power, FIRE_AIM.ramp);
    // a careful hand lets go once the water already in the air will finish the fire
    const flying = st.water.tags.length * 0.25,
        need = st.fires[i]?.need ?? 0;
    return pad(hold, { go: lined && flying < need });
}

/* The helicopter: over the one to fetch, down to them, up, across to the pad and down again. */
const SAFE = 1.5;
function airDriver(s: RescueState): Pad {
    const a = s.st;
    if (a.kind !== "air" || a.lift < 1) return pad();
    const hook = winchOf(a),
        ld = a.load;
    // only the sideways swing: a load being lowered falls, and that is not a swing
    const swing = Math.abs(ld.vx - a.hvx) + Math.abs(ld.x - hook.x);
    let x: number, rope: number;
    if (a.carrying === null) {
        const i = a.saved.findIndex((v) => !v);
        const g = grabOf(a.L, i);
        x = g.x - COPTER.winch.x;
        const over = Math.abs(a.hx - x) < 0.25 && Math.abs(a.hvx) < 0.3 && swing < 0.6;
        rope = over || a.rope > SAFE + 0.2 ? g.y - hook.y : SAFE;
        if (!over && Math.abs(a.hx - x) > 0.25) rope = SAFE;
    } else {
        const who = a.L.stranded[a.carrying];
        const i = who ? a.L.pads.indexOf(who.pad) : 0;
        x = padX(i) - COPTER.winch.x;
        const over = Math.abs(a.hx - x) < 0.25 && Math.abs(a.hvx) < 0.3 && swing < 0.6;
        rope = over ? GROUND - 0.85 - HANG - hook.y + 0.3 : SAFE;
        // lift clear of the ledge before setting off
        if (a.rope > SAFE + 0.1 && !over) {
            return pad(towards(a.rope, SAFE, HELI.reel, "up", "down"));
        }
    }
    const dx = x - a.hx;
    const want = Math.max(-HELI.speed, Math.min(HELI.speed, dx * 1.4));
    const hold: ("up" | "down" | "left" | "right")[] = [];
    if (a.hvx < want - 0.25) hold.push("right");
    else if (a.hvx > want + 0.25) hold.push("left");
    hold.push(...towards(a.rope, rope, HELI.reel, "up", "down"));
    return pad(hold);
}

/* The digger: scoop the nearest rock that still lets every load come out exact, carry it round to the truck and drop it in. */

/** Whether `rest` can finish the load now in the truck, needing `need` more, and then make whole loads. */
function loads(rest: number[], need: number, load: number): boolean {
    if (rest.length === 0) return need === load || need === 0;
    if (need === 0) return loads(rest, load, load);
    for (let i = 0; i < rest.length; i++) {
        const t = rest[i] ?? 0;
        if (t > need) continue;
        if (loads([...rest.slice(0, i), ...rest.slice(i + 1)], need - t, load)) return true;
    }
    return false;
}

function digDriver(s: RescueState): Pad {
    const d = s.st;
    if (d.kind !== "dig") return pad();
    if (d.away > 0) return pad();
    const carried = d.rocks.find((r) => r.at === "bucket");
    let face: 1 | -1, x: number, arm: number, act: boolean;
    if (carried) {
        face = -1;
        arm = -0.9;
        const mid = (BED.x0 + BED.x1) / 2;
        act = Math.abs(bucketOf(d).x - mid) < 0.9;
        // over the bed is near enough: the truck keeps the digger from coming closer
        x = act ? d.x : mid + DIGGER.pivot.x + Math.cos(arm) * ARM.len;
    } else {
        const ground = d.rocks.filter((r) => r.at === "ground");
        const need = d.L.load - d.load;
        const next = ground
            .filter(
                (r) =>
                    r.t <= need &&
                    loads(
                        ground.filter((q) => q !== r).map((q) => q.t),
                        need - r.t,
                        d.L.load,
                    ),
            )
            .sort((p, q) => p.x - q.x)[0];
        if (!next) return pad();
        face = 1;
        const p = pivotOf(d);
        arm = Math.asin(Math.max(-1, Math.min(1, (next.y - p.y) / ARM.len)));
        const b = bucketOf(d);
        act = Math.hypot(b.x - next.x, b.y - next.y) - rockR(next.t) < 0.5;
        // a rock in reach is near enough: the rock in front may keep the digger from coming closer
        x = act ? d.x : next.x - DIGGER.pivot.x - Math.cos(arm) * ARM.len;
    }
    const hold: ("up" | "down" | "left" | "right")[] = [];
    if (d.facing !== face) return pad([face > 0 ? "right" : "left"]);
    const dx = x - d.x,
        stop = (d.vx * d.vx) / (2 * DRIVE.accel) + 0.06;
    if (dx > stop && d.vx >= -0.05) hold.push("right");
    else if (dx < -stop && d.vx <= 0.05) hold.push("left");
    hold.push(...towards(d.arm, arm, ARM.turn, "up", "down"));
    const settled = hold.length === 0 && Math.abs(d.vx) < 0.05;
    return pad(hold, { tapped: settled && act });
}

/* The throw: the pull that lands the ring a little upstream of the swimmer, then hold to pull them in. */
function seaDriver(s: RescueState, tries: { n: number }): Pad {
    const sea = s.st;
    if (sea.kind !== "sea") return pad();
    const ring = sea.ring;
    if (ring.at === "towing") return pad([], { go: true });
    if (ring.at !== "held") return pad();
    const sw = sea.swimmers.find((x) => !x.saved);
    if (!sw) return pad();
    const offsets = [-0.4, -1, 0.2, -1.5, 0.6, -0.7];
    const want = sw.x0 + (offsets[tries.n % offsets.length] ?? 0);
    const angle = -0.75;
    let power = SEA_AIM.min,
        off = Infinity;
    for (let p = SEA_AIM.min; p <= SEA_AIM.max; p += 0.05) {
        const end = throwPath(sea.L, angle, p).at(-1);
        if (!end) continue;
        const o = Math.abs(end.x - want);
        if (o < off) {
            off = o;
            power = p;
        }
    }
    const hold = [
        ...towards(sea.angle, angle, SEA_AIM.turn, "up", "down"),
        ...towards(sea.power, power, SEA_AIM.ramp, "left", "right"),
    ];
    const lined = at(sea.angle, angle, SEA_AIM.turn) && at(sea.power, power, SEA_AIM.ramp);
    if (lined) tries.n++;
    return pad(hold, { tapped: lined });
}

/** The pad a player would press next, for whichever mission is on. */
export function driver(): (s: RescueState) => Pad {
    const tries = { n: 0 };
    return (s) => {
        if (!s.crew.aboard || s.done >= 0 || s.won) return pad();
        const st = s.st;
        if (st.kind === "fire") return fireDriver(s);
        if (st.kind === "air") return airDriver(s);
        if (st.kind === "dig") return digDriver(s);
        return seaDriver(s, tries);
    };
}

/** The pads that play a variation to its win, or null when the driver does not win it in `most` seconds. */
export function rescueWay(c: RescueConfiguration, most = 240): Pad[] | null {
    const s = openRescueConfiguration(c),
        drive = driver(),
        pads: Pad[] = [];
    for (let i = 0; i < RATE * most && !s.won; i++) {
        const p = drive(s);
        pads.push(p);
        rescueGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
    }
    return s.won ? pads : null;
}
