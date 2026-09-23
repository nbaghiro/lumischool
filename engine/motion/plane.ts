// Flying over the journal's map in the paper plane: the game, stepped on the engine's fixed loop from
// a Pad, with nothing in it that touches the page. The map's fly.ts turns devices into the Pad and
// draws what this says; .docs/overworld.md compares it with the other ways of travelling we
// considered. The games' own plane is glide.ts, a different game.
//
// The lever has four notches. The plane takes up each one's speed and height on a spring, climbing
// when it goes faster and sinking when it slows, so height is never a control of its own. It turns
// while a direction is held, and the wind carries it, more the higher it flies. It can come down
// only on a landing field, with the lever at its lowest; anywhere else it skims low and flies on, so
// there is nothing to crash into and nothing to fail. It cannot fly out over the paper the child's
// map has not drawn yet: near that edge it turns back by itself. There is no clock, no score, and
// the stars it catches and the creatures it spots are not counted or kept.
import type { Pt, Rect } from "./geometry";
import type { Pad } from "./pad";
import { springAt, type Spring } from "./spring";

export const FLY = {
    /** Steps a second on the page's fixed loop. */
    rate: 60,
    /** Air speed at each notch of the lever, in world units a second. */
    speed: [230, 420, 650, 900],
    /** How high the plane flies at each notch, as a share of its highest. */
    height: [0, 0.38, 0.7, 1],
    /** How low it flies with the lever at its lowest anywhere but over a field: it skims and flies on. */
    skim: 0.12,
    /** Radians a second at full lock. */
    turn: 1.7,
    /** How far from a field's middle a touchdown counts, along the field and across it. */
    field: { along: 560, across: 300 },
    /** How near a star passes to be caught, and a creature to be spotted, in world units. */
    catch: 200,
    spot: 600,
    /** How far ahead it looks for the edge of what the map has drawn. */
    probe: 750,
} as const;

export const NOTCHES = ["Land", "Slow", "Cruise", "Fast"] as const;
/** How the plane takes up a new speed, and how it climbs or sinks to a new height. */
const SPEED: Spring = { hz: 0.55, zeta: 1 };
const LIFT: Spring = { hz: 0.42, zeta: 1 };
const ROLL: Spring = { hz: 0.9, zeta: 1 };

/** A field to land on beside a world the child can go to: its middle, and the way it runs, in radians. */
export interface Field {
    node: number;
    at: Pt;
    angle: number;
}
/** A creature that can be spotted from the air. */
export interface Sight {
    art: string;
    at: Pt;
    name: string;
    k?: number;
    flip?: boolean;
}

/** What the plane flies over: the child's map, as far as it has been drawn. */
export interface Sky {
    bounds: Rect;
    /** Whether the child's map has drawn this far; past it the paper is blank, and the plane turns back. */
    open(p: Pt): boolean;
    fields: Field[];
    sights: Sight[];
    /** Stars strung along the way to where the child is going. */
    stars: Pt[];
    /** The wind at a point, in world units a second, blowing towards where it points. */
    wind(p: Pt): Pt;
}

export interface Plane {
    x: number;
    y: number;
    heading: number;
    notch: number;
    speed: number;
    speedV: number;
    height: number;
    heightV: number;
    /** How far over it leans in a turn, -1 to 1, for the drawing. */
    bank: number;
    time: number;
    phase: "air" | "rolling" | "down";
    /** The field it touched down on, and where it came to a stop. */
    field: number | null;
    landed: number | null;
    caught: number[];
    seen: number[];
    /** When the edge of the drawn map last turned it back, so it is said once rather than every step. */
    turned: number;
    /** Its speed over the ground, for the camera's lead and the words. */
    vx: number;
    vy: number;
}

export type FlightEvent =
    | { is: "notch"; notch: number }
    | { is: "caught"; star: number }
    | { is: "spotted"; sight: number }
    | { is: "turned" }
    | { is: "touch"; field: number; into: boolean }
    | { is: "landed"; node: number };

/** A plane on the ground at a field, facing along it, with the lever on slow so it lifts off at once. */
export function takeOff(from: Pt, heading = 0): Plane {
    return {
        x: from.x,
        y: from.y,
        heading,
        notch: 1,
        speed: 0,
        speedV: 0,
        height: 0,
        heightV: 0,
        bank: 0,
        time: 0,
        phase: "air",
        field: null,
        landed: null,
        caught: [],
        seen: [],
        turned: -99,
        vx: 0,
        vy: 0,
    };
}

/** The field under a point, if it is over one: within its length along it and its width across it. */
export function fieldAt(sky: Sky, p: Pt): number {
    return sky.fields.findIndex((f) => {
        const dx = p.x - f.at.x,
            dy = p.y - f.at.y,
            c = Math.cos(f.angle),
            s = Math.sin(f.angle);
        return (
            Math.abs(dx * c + dy * s) < FLY.field.along &&
            Math.abs(-dx * s + dy * c) < FLY.field.across
        );
    });
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** One fixed step. The Pad is read, not changed; the page spends it after the step. */
export function step(p: Plane, sky: Sky, pad: Pad, dt: number): FlightEvent[] {
    const out: FlightEvent[] = [];
    p.time += dt;
    if (p.phase === "down") return out;
    if (p.phase === "air") {
        const was = p.notch;
        for (const d of pad.pressed) {
            if (d === "up") p.notch = Math.min(NOTCHES.length - 1, p.notch + 1);
            if (d === "down") p.notch = Math.max(0, p.notch - 1);
        }
        if (pad.tapped) p.notch = Math.min(NOTCHES.length - 1, p.notch + 1);
        if (p.notch !== was) out.push({ is: "notch", notch: p.notch });
        const steer =
            (pad.holding.includes("right") ? 1 : 0) - (pad.holding.includes("left") ? 1 : 0);
        // near the edge of what the map has drawn it turns back towards the middle of it by itself
        const ahead = {
            x: p.x + Math.cos(p.heading) * FLY.probe,
            y: p.y + Math.sin(p.heading) * FLY.probe,
        };
        if (!sky.open(ahead)) {
            const c = { x: sky.bounds.x + sky.bounds.w / 2, y: sky.bounds.y + sky.bounds.h / 2 };
            const want = wrap(Math.atan2(c.y - p.y, c.x - p.x) - p.heading);
            p.heading = wrap(
                p.heading + Math.sign(want) * Math.min(Math.abs(want), FLY.turn * 1.2 * dt),
            );
            if (p.time - p.turned > 5) out.push({ is: "turned" });
            p.turned = p.time;
        } else p.heading = wrap(p.heading + steer * FLY.turn * dt);
        p.bank += (steer - p.bank) * Math.min(1, dt * 5);
    }
    const over = fieldAt(sky, p);
    const speedTo = p.phase === "rolling" ? 0 : (FLY.speed[p.notch] ?? 0);
    const sp = springAt(p.phase === "rolling" ? ROLL : SPEED, p.speed, speedTo, p.speedV, dt);
    p.speed = Math.max(0, sp.x);
    p.speedV = sp.v;
    const heightTo =
        p.phase === "rolling"
            ? 0
            : p.notch === 0
              ? over >= 0
                  ? 0
                  : FLY.skim
              : (FLY.height[p.notch] ?? 0);
    const ht = springAt(LIFT, p.height, heightTo, p.heightV, dt);
    p.height = Math.max(0, Math.min(1.05, ht.x));
    p.heightV = ht.v;
    // the wind carries it, more the higher it is; on the ground it rolls straight
    const w = p.phase === "air" ? sky.wind(p) : { x: 0, y: 0 },
        lift = 0.35 + 0.65 * p.height;
    p.vx = Math.cos(p.heading) * p.speed + w.x * lift;
    p.vy = Math.sin(p.heading) * p.speed + w.y * lift;
    const b = sky.bounds;
    p.x = Math.max(b.x, Math.min(b.x + b.w, p.x + p.vx * dt));
    p.y = Math.max(b.y, Math.min(b.y + b.h, p.y + p.vy * dt));
    if (p.phase === "air") {
        sky.stars.forEach((s, i) => {
            if (
                !p.caught.includes(i) &&
                p.height > 0.15 &&
                Math.hypot(s.x - p.x, s.y - p.y) < FLY.catch
            ) {
                p.caught.push(i);
                out.push({ is: "caught", star: i });
            }
        });
        sky.sights.forEach((s, i) => {
            if (
                !p.seen.includes(i) &&
                p.height < 0.6 &&
                Math.hypot(s.at.x - p.x, s.at.y - p.y) < FLY.spot
            ) {
                p.seen.push(i);
                out.push({ is: "spotted", sight: i });
            }
        });
        if (over >= 0 && p.notch === 0 && p.height < 0.03) {
            // into the wind the plane is slower over the ground, so it comes down shorter and softer
            const wind = sky.wind(p),
                into = wind.x * Math.cos(p.heading) + wind.y * Math.sin(p.heading) < 0;
            p.phase = "rolling";
            p.field = over;
            p.speedV = 0;
            out.push({ is: "touch", field: over, into });
        }
    } else if (p.phase === "rolling" && p.speed < 12) {
        p.phase = "down";
        p.speed = 0;
        p.landed = sky.fields[p.field ?? 0]?.node ?? null;
        if (p.landed !== null) out.push({ is: "landed", node: p.landed });
    }
    return out;
}

/** Which way a point is from the plane, in the words the flight says. */
export function bearing(p: Plane, to: Pt): "ahead" | "to the right" | "to the left" | "behind" {
    const a = wrap(Math.atan2(to.y - p.y, to.x - p.x) - p.heading);
    return Math.abs(a) < 0.6
        ? "ahead"
        : Math.abs(a) > 2.4
          ? "behind"
          : a > 0
            ? "to the right"
            : "to the left";
}

/** Where the wind comes from, as a compass point: a wind blowing east is a west wind. */
export function windFrom(w: Pt): string {
    const deg = ((Math.atan2(-w.y, -w.x) * 180) / Math.PI + 360) % 360;
    // y runs south on the map, so a quarter turn clockwise from east is south
    return (
        ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"][
            Math.round(deg / 45) % 8
        ] ?? "west"
    );
}

export interface Landing {
    field: Field;
    from: Pt;
    tangent: Pt;
    height: number;
    bank: number;
    notch: number;
    elapsed: number;
    duration: number;
}

/** A guided approach keeps the current velocity, then eases to rest on the chosen field. */
export function approach(p: Plane, field: Field): Landing {
    const distance = Math.hypot(field.at.x - p.x, field.at.y - p.y);
    const duration = Math.max(2.6, (distance * 1.5) / Math.max(FLY.speed[1], p.speed));
    return {
        field,
        from: { x: p.x, y: p.y },
        tangent: { x: p.vx * duration, y: p.vy * duration },
        height: p.height,
        bank: p.bank,
        notch: p.notch,
        elapsed: 0,
        duration,
    };
}

export function landStep(p: Plane, landing: Landing, dt: number): boolean {
    landing.elapsed = Math.min(landing.duration, landing.elapsed + dt);
    const t = landing.elapsed / landing.duration;
    const h = t * t * (3 - 2 * t),
        tangent = t * (1 - t) * (1 - t);
    const dh = 6 * t * (1 - t),
        dv = 1 - 4 * t + 3 * t * t;
    const dx = landing.field.at.x - landing.from.x,
        dy = landing.field.at.y - landing.from.y;
    p.x = landing.from.x + dx * h + landing.tangent.x * tangent;
    p.y = landing.from.y + dy * h + landing.tangent.y * tangent;
    p.vx = (dx * dh + landing.tangent.x * dv) / landing.duration;
    p.vy = (dy * dh + landing.tangent.y * dv) / landing.duration;
    p.speed = Math.hypot(p.vx, p.vy);
    if (p.speed > 1) {
        const turn = wrap(Math.atan2(p.vy, p.vx) - p.heading);
        p.heading += turn * Math.min(1, dt * 4);
    }
    const descent = Math.min(1, t / 0.85);
    p.height = landing.height * (1 - descent * descent * (3 - 2 * descent));
    p.bank = landing.bank * (1 - h);
    p.notch = Math.max(0, landing.notch - Math.floor((t * (landing.notch + 1)) / 0.7));
    p.phase = t === 1 ? "down" : t >= 0.85 ? "rolling" : "air";
    if (t === 1) {
        p.speed = 0;
        p.landed = landing.field.node;
    }
    return t === 1;
}
