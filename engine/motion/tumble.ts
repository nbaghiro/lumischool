// Things thrown across a tray and tumbling to rest, seen from above: dice flicked onto the felt of a
// box. They fly the way the hand threw them, knock off the walls and each other and slow on the felt,
// simulated as bodies with no gravity. What they come to rest showing is not the simulation's to say:
// the game decides where each lands and how it lies, and the path is bent towards that, a little at
// first and wholly by the end, so every throw looks different and the outcome is still the game's.
// Squares, seconds and radians, y growing downwards.
import { bodies } from "./bodies";
import type { Pt, Rect } from "./geometry";
import { seeded } from "./spawn";

export interface TumbleThrow {
    /** The tray's inside. */
    tray: Rect;
    /**
     * Where each thing starts, and where the game has decided each comes to rest and how far it has
     * turned by then, in radians from how it started; a whole turn more or less is a real spin.
     */
    from: Pt[];
    to: Pt[];
    turnTo: number[];
    /** How the hand threw them, in squares a second; each is sent a little differently from a seed. */
    v: Pt;
    seed: number;
    /** Each thing's side, in squares. */
    size: number;
    /** The longest a throw may take to come to rest, in seconds. */
    most?: number;
}

export interface Tumbled {
    /** Where each thing is and how it is turned, at every step until they rest. */
    frames: { t: number; at: Pt[]; angle: number[] }[];
    /** Every knock against a wall or another thing, and how hard it was. */
    hits: { t: number; speed: number; at: Pt }[];
}

const DT = 1 / 60;
const smooth = (u: number): number => u * u * (3 - 2 * u);

export function tumble(o: TumbleThrow): Tumbled {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    const { x, y, w: tw, h: th } = o.tray;
    const wall = { fixed: true, restitution: 0.55, friction: 0.2 };
    w.box({ x: x + tw / 2, y: y - 0.5, w: tw + 2, h: 1, ...wall });
    w.box({ x: x + tw / 2, y: y + th + 0.5, w: tw + 2, h: 1, ...wall });
    w.box({ x: x - 0.5, y: y + th / 2, w: 1, h: th + 2, ...wall });
    w.box({ x: x + tw + 0.5, y: y + th / 2, w: 1, h: th + 2, ...wall });
    const half = o.size / 2,
        inside = (p: Pt): Pt => ({
            x: Math.max(x + half, Math.min(x + tw - half, p.x)),
            y: Math.max(y + half, Math.min(y + th - half, p.y)),
        });
    const rnd = seeded(o.seed);
    const things = o.from.map((p) => {
        const at = inside(p);
        const b = w.box({
            x: at.x,
            y: at.y,
            w: o.size * 0.92,
            h: o.size * 0.92,
            density: 1,
            restitution: 0.45,
            friction: 0.3,
            damping: { move: 1.5, turn: 1.9 },
        });
        const turn = (rnd() - 0.5) * 0.5,
            k = 0.85 + rnd() * 0.3;
        const c = Math.cos(turn),
            s = Math.sin(turn);
        w.launch(
            b,
            { x: (o.v.x * c - o.v.y * s) * k, y: (o.v.x * s + o.v.y * c) * k },
            // a harder throw spins them harder
            (rnd() - 0.5) * 18 * Math.min(1.4, Math.hypot(o.v.x, o.v.y) / 14),
        );
        return b;
    });
    const raw: { t: number; at: Pt[]; angle: number[] }[] = [];
    const hits: Tumbled["hits"] = [];
    const most = o.most ?? 2.6;
    for (let t = 0; t <= most; t += DT) {
        raw.push({
            t,
            at: things.map((b) => ({ x: w.where(b).x, y: w.where(b).y })),
            angle: things.map((b) => w.where(b).angle),
        });
        w.step(DT);
        for (const h of w.hits())
            if (h.speed > 1) {
                const a = things.find((b) => b === h.a || b === h.b);
                hits.push({ t: t + DT, speed: h.speed, at: a ? w.where(a) : { x, y } });
            }
        if (t > 0.3 && things.every((b) => !w.moving(b, 0.12))) break;
    }
    const last = raw[raw.length - 1] ?? { t: 0, at: o.from, angle: o.from.map(() => 0) };
    const end = Math.max(last.t, DT);
    // bent towards where the game says each rests: nothing at the throw, all of it by the end
    const frames = raw.map((f) => {
        const k = smooth(f.t / end);
        return {
            t: f.t,
            at: f.at.map((p, i) => {
                const to = o.to[i] ?? p,
                    fin = last.at[i] ?? p;
                return inside({ x: p.x + (to.x - fin.x) * k, y: p.y + (to.y - fin.y) * k });
            }),
            angle: f.angle.map((a, i) => a + ((o.turnTo[i] ?? 0) - (last.angle[i] ?? a)) * k),
        };
    });
    const tail = frames[frames.length - 1];
    if (tail) {
        tail.at = tail.at.map((p, i) => o.to[i] ?? p);
        tail.angle = tail.angle.map((a, i) => o.turnTo[i] ?? a);
    }
    return { frames, hits };
}
