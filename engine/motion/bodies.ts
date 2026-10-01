// Rigid bodies, for the games whose model is itself a simulation.
//
// This is the one file that imports a physics library, so the library can be swapped behind it
// without touching a game. It is planck, a TypeScript port of Box2D, chosen in .docs/engine.md for
// its size, its joint limits and its bullets, and because it runs in node, so a physics game is
// tested in a plain node run like every other. A game asks for boxes, balls, a ground and a hinge,
// steps the world on the fixed loop, and reads back where each body is, what it touched and how
// hard; it never sees a planck type. planck promises the same result for the same input on the same
// JavaScript runtime and nothing across runtimes, which is enough for a record that stores what the
// child did rather than the frames. Units are squares and seconds, with y pointing down, so a body's
// angle is the angle the page turns its drawing by.
import {
    Box,
    Circle,
    CircleShape,
    DistanceJoint,
    Edge,
    EdgeShape,
    Polygon,
    PolygonShape,
    PrismaticJoint,
    PulleyJoint,
    RevoluteJoint,
    RopeJoint,
    WeldJoint,
    Vec2,
    World,
    type Body as PlanckBody,
    type Contact,
    type Fixture,
    type Joint as PlanckJoint,
    type Shape,
} from "planck";
import { ring, submerged } from "./float";
import type { Pt } from "./geometry";

/** A body in the world. The game holds it and passes it back; what is inside is this file's business. */
export interface Body {
    readonly shape: "box" | "ball" | "ground" | "poly" | "compound";
}

/** A join between two bodies, or a body and the world. Held and passed back like a body. */
export interface Joint {
    readonly kind: "hinge" | "slider" | "pulley" | "spring" | "rope" | "weld";
}

/**
 * One piece of a compound body, placed in squares from the body's centre before it is turned. A
 * polygon is convex, with at most eight corners; a shape that is not convex is made of several.
 */
export type Piece =
    | { box: { x: number; y: number; w: number; h: number; angle?: number } }
    | { poly: Pt[] }
    | { ball: { x: number; y: number; r: number } };

/** A turning motor on a hinge, or a pushing one on a slider: the speed it drives at and the most it can give. */
export interface Motor {
    speed: number;
    most: number;
}

export interface Material {
    /** Mass per square. A heavier ball knocks harder. */
    density?: number;
    friction?: number;
    /** How much a hit bounces, from nought to one. */
    restitution?: number;
}

/** What a body is besides its shape. */
export interface Kind {
    fixed?: boolean;
    /**
     * Moved by the game rather than pushed by anything: a log a current carries, a dish slid along a
     * counter. It carries what rests on it and nothing knocks it off its course.
     */
    carried?: boolean;
    /** Touches nothing and is touched by nothing: it only notices what passes through it. */
    sensor?: boolean;
    /** Never turns, however it is hit, like a rocket that stays upright on its legs. */
    upright?: boolean;
    /** How fast its moving and its turning die away by themselves, per second. */
    damping?: { move?: number; turn?: number };
    /**
     * The group it belongs to, by name, and the groups it passes through: a chain's links pass
     * through each other, and marbles through the bars of a splitter meant only for the water. At
     * most sixteen names in one world.
     */
    group?: string;
    ignores?: readonly string[];
}

/** A hinge that pins a box to the world at a point, with the angles from level it turns between, in radians. */
export interface Hinge {
    at: Pt;
    lower: number;
    upper: number;
    /**
     * A spring that turns it back to level: `k` is the turning it takes to hold it one radian over,
     * and `damping` how quickly a swing rings down. A plank on a sprung hinge tilts by how far its
     * loads are out of balance and settles level when they are equal, the way a balance does.
     */
    spring?: { k: number; damping: number };
}

/** A band of still water between `from` and `to` across, whose surface is at `y`. */
export interface Water {
    y: number;
    from: number;
    to: number;
    /** Mass per square of the water: a body lighter than this floats, a heavier one sinks. */
    density: number;
    /** How much the water slows what moves in it, per square under water. */
    drag: number;
    /**
     * Where the surface is at a place now, for water with waves on it; left out, it is flat at `y`.
     * A body is floated on the line through the surface at its two ends.
     */
    at?: (x: number) => number;
}

/** Two bodies that began touching in the last step, and how fast they were closing when they did. */
export interface Hit {
    a: Body;
    b: Body;
    speed: number;
}

export interface Survey {
    bodies: { outline: Pt[][]; state: "fixed" | "awake" | "asleep" | "sensor" }[];
    joints: { kind: Joint["kind"]; a: Pt; b: Pt }[];
}

export interface Bodies {
    /** A box `w` by `h` squares centred on `x`, `y`. */
    box(
        o: {
            x: number;
            y: number;
            w: number;
            h: number;
            angle?: number;
            hinge?: Hinge;
        } & Material &
            Kind,
    ): Body;
    /** A convex polygon, its corners in squares from `x`, `y` before it is turned: a wedge, a roof, a ramp. */
    poly(o: { x: number; y: number; points: Pt[]; angle?: number } & Material & Kind): Body;
    /** One body made of several pieces that move as one: an arch, a door frame, a bucket. */
    compound(o: { x: number; y: number; parts: Piece[]; angle?: number } & Material & Kind): Body;
    /** A ball. A fast one is checked along its whole path each step, so it cannot pass through a thin rod. */
    ball(o: { x: number; y: number; r: number; fast?: boolean } & Material & Kind): Body;
    /** A flat ground from `from` to `to` at height `y`, which nothing falls through. */
    ground(o: { y: number; from: number; to: number; friction?: number }): Body;
    /**
     * The first thing straight down from `x`, `from` to `to` (y grows downwards): where its top is and
     * which body it is, or null for nothing, as a walker's feet or a dropped thing find what is below.
     * Sensors are not found.
     */
    rayDown(x: number, from: number, to: number): { y: number; body: Body } | null;
    /** A rope of `length` between points on two bodies: it never stretches past its length and goes slack when shorter. */
    rope(a: Body, b: Body, o: { at: Pt; to: Pt; length: number; breaks?: number }): Joint;
    /**
     * Joins two bodies where they touch now, as a nail does, so they move as one. With `give` the join
     * bends under a load and springs back, ringing `hz` times a second, as the pieces of a long plank do.
     */
    weld(
        a: Body,
        b: Body,
        at: Pt,
        o?: { breaks?: number; give?: { hz: number; damping: number } },
    ): Joint;
    /**
     * Pins `b` to `a` at a point in the world, or to the world itself when `a` is null, so it turns
     * there: a door, a bucket on its axle, a link of a chain. The limits are radians from the angle it
     * is joined at. A joint given `breaks` comes apart when it is pulled harder than that, in mass
     * times squares a second, each second.
     */
    hinge(
        a: Body | null,
        b: Body,
        at: Pt,
        o?: { lower?: number; upper?: number; motor?: Motor; breaks?: number },
    ): Joint;
    /** Lets `b` slide along `axis` from a point, and nowhere else: a lift, a gate in its groove, a piston. */
    slider(
        a: Body | null,
        b: Body,
        o: { at: Pt; axis: Pt; lower?: number; upper?: number; motor?: Motor; breaks?: number },
    ): Joint;
    /**
     * A rope from `a` up over a wheel at `over`, across to a wheel at `overB`, and down to `b`: as one
     * side goes down the other goes up, `ratio` times as far for a block and tackle.
     */
    pulley(a: Body, b: Body, o: { over: Pt; overB: Pt; at: Pt; to: Pt; ratio?: number }): Joint;
    /** A spring between two points that pulls back to `length`, ringing `hz` times a second and dying by `damping` (one stops it at once). */
    spring(
        a: Body | null,
        b: Body,
        o: { at: Pt; to: Pt; length?: number; hz: number; damping: number; breaks?: number },
    ): Joint;
    /**
     * A chain of `links` from `from` to `to`, each link hinged to the next, the first end hinged to `a`
     * or the world, and the last to `b`, the world when it is null, or nothing when it is left out. A
     * chain longer than the way between its ends is laid in a sag; one that is shorter is stretched to
     * reach, so a chain that should hang short is given a nearer `to`. Its links pass through each other and through what
     * it is hung from. Returns the links, first to last.
     */
    chain(o: {
        from: Pt;
        to: Pt;
        links: number;
        /** How long the chain is along its links; left out, it is as long as from its start to its end. */
        length?: number;
        /** Each link's own length, first to last, for a chain of unlike links; `links` and `length` then follow from it. */
        sizes?: readonly number[];
        a?: Body | null;
        b?: Body | null;
        width?: number;
        density?: number;
        breaks?: number;
    }): Body[];
    /** Changes the speed a hinge's or a slider's motor drives at. */
    drive(j: Joint, speed: number): void;
    /** How far a hinge has turned, in radians from where it was joined, or a slider slid, in squares. */
    travel(j: Joint): number;
    /** Takes a joint away, as breaking would. */
    unjoin(j: Joint): void;
    /** The joints that came apart in the last step. */
    broken(): Joint[];
    /** Adds a band of water that floats what is in it by how much of it is under the surface. */
    water(w: Water): void;
    /** How much of a body is under water, from nought to one. */
    wet(b: Body): number;
    /** The outline of each of a body's pieces, in the world, a ball as a ring of corners. */
    outline(b: Body): Pt[][];
    /** Every body but the sensors, with its outlines (the ground as a line of two points) and whether anything can push it. */
    solids(): { body: Body; outline: Pt[][]; moving: boolean }[];
    /** How fast a body's surface moves at a point in the world. */
    velocityAt(b: Body, at: Pt): Pt;
    /**
     * A wall of `cols` by `rows` square blocks `size` across, centred on `x`, `y`, joined where they
     * touch so it stands as one until a hit pulls a join harder than `breaks`, when it comes apart
     * there; joined along its foot to `on` when given. The blocks, row by row from the top left.
     */
    breakable(
        o: {
            x: number;
            y: number;
            cols: number;
            rows: number;
            size: number;
            breaks: number;
            on?: Body;
        } & Material,
    ): Body[];
    /** Whether a body has come to rest and been put to sleep, so it costs nothing until it is touched. */
    asleep(b: Body): boolean;
    /** How many bodies can move, and how many of those are awake: what a body budget counts. */
    census(): { moving: number; awake: number };
    /** Every body's outline and state and every joint's two ends, in the world, for the inspector to draw. */
    survey(): Survey;
    /** Sets a body moving at `v` squares a second, turning at `spin` radians a second. */
    launch(b: Body, v: Pt, spin?: number): void;
    /** Puts a body at a place, still, as a level laid out by hand or a test's own arrangement does; `angle` sets it square again. */
    moveTo(b: Body, at: Pt, angle?: number): void;
    /** Pushes a body through its centre for the next step, in mass times squares a second, each second. */
    push(b: Body, force: Pt): void;
    /** Pushes a body at a point in the world for the next step, so it turns as well as moves: a raft pressed down at one end. */
    pushAt(b: Body, force: Pt, at: Pt): void;
    /** Changes the world's gravity from the next step, for a pull turned in a tuning table. */
    gravity(g: Pt): void;
    remove(b: Body): void;
    /** One step of `dt` seconds. Returns how hard the hardest hit in it was, nought for none. */
    step(dt: number): number;
    where(b: Body): { x: number; y: number; angle: number };
    velocity(b: Body): Pt;
    /** How fast a body is turning, in radians a second, clockwise. */
    spin(b: Body): number;
    /** Whether a body is still moving faster than `speed` squares, or radians, a second. */
    moving(b: Body, speed?: number): boolean;
    /** The bodies inside a sensor now. */
    touching(sensor: Body): Body[];
    /** The hits that began in the last step, in the order the world found them. */
    hits(): Hit[];
}

const worlds = new WeakSet<object>();

/** Whether a value is a world `bodies` made, for a tool that looks through a game's state for one. */
export const isBodies = (v: unknown): v is Bodies =>
    typeof v === "object" && v !== null && worlds.has(v);

export function bodies(o: { gravity: Pt }): Bodies {
    const world = new World({ gravity: new Vec2(o.gravity.x, o.gravity.y) });
    const inner = new Map<Body, PlanckBody>();
    const outer = new Map<PlanckBody, Body>();
    const inside = new Map<Body, Set<Body>>();
    const joints = new Map<Joint, { j: PlanckJoint; breaks: number }>();
    const springs: { body: PlanckBody; k: number; damping: number; rest: number }[] = [];
    const waters: Water[] = [];
    const groups = new Map<string, number>();
    let snapped: Joint[] = [];
    let found: Hit[] = [];
    let hardest = 0;
    let chains = 0;
    const wrap = (shape: Body["shape"], b: PlanckBody): Body => {
        const out: Body = { shape };
        inner.set(out, b);
        outer.set(b, out);
        return out;
    };
    const get = (b: Body): PlanckBody => {
        const p = inner.get(b);
        if (!p) throw new Error("that body is not in this world");
        return p;
    };
    const bit = (name: string): number => {
        const had = groups.get(name);
        if (had !== undefined) return had;
        if (groups.size >= 15) throw new Error("a world holds at most fifteen named groups");
        // bit one is every body without a group
        const next = 1 << (groups.size + 1);
        groups.set(name, next);
        return next;
    };
    const filter = (k: Kind) => ({
        filterCategoryBits: k.group ? bit(k.group) : 1,
        filterMaskBits: 0xffff & ~(k.ignores ?? []).reduce((m, g) => m | bit(g), 0),
    });
    const sensorOf = (f: Fixture): Body | null => {
        const b = f.isSensor() ? outer.get(f.getBody()) : undefined;
        return b && inside.has(b) ? b : null;
    };
    world.on("post-solve", (_contact, impulse) => {
        hardest = Math.max(hardest, ...impulse.normalImpulses, 0);
    });
    world.on("begin-contact", (c: Contact) => {
        const fa = c.getFixtureA(),
            fb = c.getFixtureB();
        const a = outer.get(fa.getBody()),
            b = outer.get(fb.getBody());
        if (!a || !b) return;
        const sa = sensorOf(fa),
            sb = sensorOf(fb);
        if (sa) inside.get(sa)?.add(b);
        if (sb) inside.get(sb)?.add(a);
        if (sa || sb) return;
        const va = fa.getBody().getLinearVelocity(),
            vb = fb.getBody().getLinearVelocity();
        const n = c.getWorldManifold(null)?.normal ?? { x: 0, y: 1 };
        found.push({ a, b, speed: Math.abs((vb.x - va.x) * n.x + (vb.y - va.y) * n.y) });
    });
    world.on("end-contact", (c: Contact) => {
        const fa = c.getFixtureA(),
            fb = c.getFixtureB();
        const a = outer.get(fa.getBody()),
            b = outer.get(fb.getBody());
        const sa = sensorOf(fa),
            sb = sensorOf(fb);
        if (sa && b) inside.get(sa)?.delete(b);
        if (sb && a) inside.get(sb)?.delete(a);
    });
    const make = (at: Pt, angle: number, k: Kind & { fast?: boolean }): PlanckBody =>
        world.createBody({
            type: k.fixed || k.sensor ? "static" : k.carried ? "kinematic" : "dynamic",
            position: new Vec2(at.x, at.y),
            angle,
            bullet: k.fast === true,
            fixedRotation: k.upright === true,
            linearDamping: k.damping?.move ?? 0,
            angularDamping: k.damping?.turn ?? 0,
        });
    const fixture = (body: PlanckBody, shape: Shape, m: Material & Kind, rub: number) =>
        body.createFixture({
            shape,
            density: m.density ?? 1,
            friction: m.friction ?? rub,
            restitution: m.restitution ?? 0,
            isSensor: m.sensor === true,
            ...filter(m),
        });
    const noticed = (b: Body, k: Kind): Body => {
        if (k.sensor) inside.set(b, new Set());
        return b;
    };
    const vec = (p: Pt) => new Vec2(p.x, p.y);
    // the world's own body, which a joint to nothing is made against, made when one first is so a
    // world without such joints holds its bodies in the order it always did
    let anchor: PlanckBody | null = null;
    const orWorld = (b: Body | null): PlanckBody => {
        if (b) return get(b);
        anchor ??= world.createBody();
        return anchor;
    };
    const joined = (kind: Joint["kind"], j: PlanckJoint | null, breaks = Infinity): Joint => {
        const out: Joint = { kind };
        if (j) joints.set(out, { j, breaks });
        return out;
    };
    const pieceShape = (p: Piece): Shape => {
        if ("box" in p) {
            const b = p.box;
            return new Box(b.w / 2, b.h / 2, new Vec2(b.x, b.y), b.angle ?? 0);
        }
        if ("poly" in p) return new Polygon(p.poly.map(vec));
        return new Circle(new Vec2(p.ball.x, p.ball.y), p.ball.r);
    };
    const corners = (body: PlanckBody, shape: Shape): Pt[] => {
        if (shape instanceof PolygonShape)
            return shape.m_vertices.slice(0, shape.m_count).map((v) => {
                const w = body.getWorldPoint(v);
                return { x: w.x, y: w.y };
            });
        if (shape instanceof CircleShape) {
            const c = body.getWorldPoint(shape.getCenter());
            return ring({ x: c.x, y: c.y }, shape.getRadius());
        }
        return [];
    };
    const outlineOf = (body: PlanckBody): Pt[][] => {
        const out: Pt[][] = [];
        for (let f = body.getFixtureList(); f; f = f.getNext())
            if (!f.isSensor()) {
                const c = corners(body, f.getShape());
                if (c.length) out.push(c);
            }
        return out;
    };
    const line = (w: Water, poly: Pt[]): number | [Pt, Pt] => {
        if (!w.at) return w.y;
        const xs = poly.map((p) => p.x),
            a = Math.min(...xs),
            b = Math.max(...xs);
        return [
            { x: a, y: w.at(a) },
            { x: b, y: w.at(b) },
        ];
    };
    const wetOf = (body: PlanckBody): { area: number; under: number } => {
        let area = 0,
            under = 0;
        const x = body.getPosition().x;
        const w = waters.find((v) => x >= v.from && x <= v.to);
        for (const poly of outlineOf(body)) {
            let a = 0;
            for (let i = 0; i < poly.length; i++) {
                const p = poly[i],
                    q = poly[(i + 1) % poly.length];
                if (p && q) a += p.x * q.y - q.x * p.y;
            }
            area += Math.abs(a) / 2;
            if (w) under += submerged(poly, line(w, poly)).area;
        }
        return { area, under };
    };
    const float = () => {
        if (!waters.length) return;
        const g = world.getGravity(),
            pull = Math.hypot(g.x, g.y);
        for (let body = world.getBodyList(); body; body = body.getNext()) {
            if (!body.isDynamic()) continue;
            const x = body.getPosition().x;
            const w = waters.find((v) => x >= v.from && x <= v.to);
            if (!w) continue;
            for (const poly of outlineOf(body)) {
                const under = submerged(poly, line(w, poly));
                if (under.area < 1e-6) continue;
                const at = vec(under.centre);
                body.applyForce(new Vec2(0, -w.density * under.area * pull), at, true);
                const v = body.getLinearVelocityFromWorldPoint(at);
                body.applyForce(
                    new Vec2(-v.x * w.drag * under.area, -v.y * w.drag * under.area),
                    at,
                    true,
                );
            }
        }
    };
    const api: Bodies = {
        box(b) {
            // The peg a hinge turns on is made first, so the world holds its bodies in the order a
            // see-saw is built in and a replay steps them in the same order.
            const peg = b.hinge
                ? world.createBody({ position: new Vec2(b.hinge.at.x, b.hinge.at.y) })
                : null;
            const body = make(b, b.angle ?? 0, b);
            fixture(body, new Box(b.w / 2, b.h / 2), b, 0.7);
            if (peg && b.hinge) {
                const h = b.hinge;
                // The limits are angles from level, whatever angle the box is made at.
                const at = new Vec2(h.at.x, h.at.y);
                world.createJoint(
                    new RevoluteJoint({
                        bodyA: peg,
                        bodyB: body,
                        localAnchorA: peg.getLocalPoint(at),
                        localAnchorB: body.getLocalPoint(at),
                        referenceAngle: 0,
                        enableLimit: true,
                        lowerAngle: h.lower,
                        upperAngle: h.upper,
                    }),
                );
                if (h.spring)
                    springs.push({ body, k: h.spring.k, damping: h.spring.damping, rest: 0 });
            }
            return noticed(wrap("box", body), b);
        },
        poly(b) {
            const body = make(b, b.angle ?? 0, b);
            fixture(body, new Polygon(b.points.map(vec)), b, 0.7);
            return noticed(wrap("poly", body), b);
        },
        compound(b) {
            const body = make(b, b.angle ?? 0, b);
            for (const part of b.parts) fixture(body, pieceShape(part), b, 0.7);
            return noticed(wrap("compound", body), b);
        },
        ball(b) {
            const body = make(b, 0, b);
            fixture(body, new Circle(b.r), b, 0.6);
            return noticed(wrap("ball", body), b);
        },
        ground(g) {
            const body = world.createBody();
            body.createFixture({
                shape: new Edge(new Vec2(g.from, g.y), new Vec2(g.to, g.y)),
                friction: g.friction ?? 0.9,
            });
            return wrap("ground", body);
        },
        rayDown(x, from, to) {
            let best: { y: number; body: Body } | null = null;
            world.rayCast(new Vec2(x, from), new Vec2(x, to), (f, point, _normal, fraction) => {
                if (f.isSensor()) return -1;
                const body = outer.get(f.getBody());
                if (!body) return -1;
                best = { y: point.y, body };
                return fraction;
            });
            return best;
        },
        rope(a, b, r) {
            const pa = get(a),
                pb = get(b);
            return joined(
                "rope",
                world.createJoint(
                    new RopeJoint({
                        bodyA: pa,
                        bodyB: pb,
                        localAnchorA: pa.getLocalPoint(vec(r.at)),
                        localAnchorB: pb.getLocalPoint(vec(r.to)),
                        maxLength: r.length,
                    }),
                ),
                r.breaks,
            );
        },
        weld(a, b, at, w) {
            return joined(
                "weld",
                world.createJoint(
                    new WeldJoint(
                        w?.give ? { frequencyHz: w.give.hz, dampingRatio: w.give.damping } : {},
                        get(a),
                        get(b),
                        vec(at),
                    ),
                ),
                w?.breaks,
            );
        },
        hinge(a, b, at, h = {}) {
            const pa = orWorld(a),
                pb = get(b);
            const limited = h.lower !== undefined || h.upper !== undefined;
            return joined(
                "hinge",
                world.createJoint(
                    new RevoluteJoint(
                        {
                            enableLimit: limited,
                            lowerAngle: h.lower ?? 0,
                            upperAngle: h.upper ?? 0,
                            enableMotor: h.motor !== undefined,
                            motorSpeed: h.motor?.speed ?? 0,
                            maxMotorTorque: h.motor?.most ?? 0,
                        },
                        pa,
                        pb,
                        vec(at),
                    ),
                ),
                h.breaks,
            );
        },
        slider(a, b, o2) {
            const pa = orWorld(a),
                pb = get(b);
            const limited = o2.lower !== undefined || o2.upper !== undefined;
            const len = Math.hypot(o2.axis.x, o2.axis.y) || 1;
            return joined(
                "slider",
                world.createJoint(
                    new PrismaticJoint(
                        {
                            enableLimit: limited,
                            lowerTranslation: o2.lower ?? 0,
                            upperTranslation: o2.upper ?? 0,
                            enableMotor: o2.motor !== undefined,
                            motorSpeed: o2.motor?.speed ?? 0,
                            maxMotorForce: o2.motor?.most ?? 0,
                        },
                        pa,
                        pb,
                        vec(o2.at),
                        new Vec2(o2.axis.x / len, o2.axis.y / len),
                    ),
                ),
                o2.breaks,
            );
        },
        pulley(a, b, p) {
            return joined(
                "pulley",
                world.createJoint(
                    new PulleyJoint(
                        {},
                        get(a),
                        get(b),
                        vec(p.over),
                        vec(p.overB),
                        vec(p.at),
                        vec(p.to),
                        p.ratio ?? 1,
                    ),
                ),
            );
        },
        spring(a, b, sp) {
            const pa = orWorld(a),
                pb = get(b);
            return joined(
                "spring",
                world.createJoint(
                    new DistanceJoint(
                        {
                            frequencyHz: sp.hz,
                            dampingRatio: sp.damping,
                            ...(sp.length === undefined ? {} : { length: sp.length }),
                        },
                        pa,
                        pb,
                        vec(sp.at),
                        vec(sp.to),
                    ),
                ),
                sp.breaks,
            );
        },
        chain(c) {
            const n = c.sizes?.length || Math.max(1, Math.round(c.links));
            const span = Math.hypot(c.to.x - c.from.x, c.to.y - c.from.y);
            const total = c.sizes?.reduce((a, b) => a + b, 0) ?? c.length ?? span;
            // where each joint falls along the line between the ends, as a share of the way
            const sizes = c.sizes ?? Array.from({ length: n }, () => 1),
                whole = sizes.reduce((a, b) => a + b, 0) || 1;
            let sum = 0;
            const along = [0, ...sizes.map((k) => (sum += k) / whole)];
            // Laid in a sag, down from the line between its ends, deep enough that its links add up to its length.
            const nodes = (sag: number): Pt[] =>
                along.map((t) => ({
                    x: c.from.x + (c.to.x - c.from.x) * t,
                    y: c.from.y + (c.to.y - c.from.y) * t + sag * 4 * t * (1 - t),
                }));
            const run = (pts: Pt[]) =>
                pts.reduce((sum, p, i) => {
                    const q = pts[i - 1];
                    return q ? sum + Math.hypot(p.x - q.x, p.y - q.y) : sum;
                }, 0);
            const want = Math.max(span, total);
            let lo = 0,
                hi = want;
            for (let k = 0; k < 40; k++) {
                const mid = (lo + hi) / 2;
                if (run(nodes(mid)) < want) lo = mid;
                else hi = mid;
            }
            const pts = nodes(lo);
            const group = `chain:${chains++}`;
            const links: Body[] = [];
            for (let i = 0; i < n; i++) {
                const p = pts[i],
                    q = pts[i + 1];
                if (!p || !q) continue;
                const link = api.box({
                    x: (p.x + q.x) / 2,
                    y: (p.y + q.y) / 2,
                    w: Math.max(0.05, Math.hypot(q.x - p.x, q.y - p.y)),
                    h: c.width ?? 0.15,
                    angle: Math.atan2(q.y - p.y, q.x - p.x),
                    density: c.density ?? 1,
                    friction: 0.4,
                    group,
                    ignores: [group],
                    damping: { turn: 0.5 },
                });
                api.hinge(links[i - 1] ?? c.a ?? null, link, p, { breaks: c.breaks });
                links.push(link);
            }
            const last = links[links.length - 1];
            if (last && c.b !== undefined) api.hinge(c.b, last, c.to, { breaks: c.breaks });
            return links;
        },
        drive(j, speed) {
            const p = joints.get(j)?.j;
            if (p instanceof RevoluteJoint || p instanceof PrismaticJoint) {
                p.setMotorSpeed(speed);
                p.getBodyB().setAwake(true);
            }
        },
        travel(j) {
            const p = joints.get(j)?.j;
            if (p instanceof RevoluteJoint) return p.getJointAngle();
            if (p instanceof PrismaticJoint) return p.getJointTranslation();
            return 0;
        },
        unjoin(j) {
            const p = joints.get(j);
            if (!p) return;
            world.destroyJoint(p.j);
            joints.delete(j);
        },
        broken() {
            return snapped;
        },
        water(w) {
            waters.push({ ...w });
        },
        wet(b) {
            const { area, under } = wetOf(get(b));
            return area > 0 ? Math.min(1, under / area) : 0;
        },
        outline(b) {
            return outlineOf(get(b));
        },
        solids() {
            const out: { body: Body; outline: Pt[][]; moving: boolean }[] = [];
            for (const [b, p] of inner) {
                const outline: Pt[][] = [];
                for (let f = p.getFixtureList(); f; f = f.getNext()) {
                    if (f.isSensor()) continue;
                    const shape = f.getShape();
                    if (shape instanceof EdgeShape) {
                        const a = p.getWorldPoint(shape.m_vertex1),
                            c = p.getWorldPoint(shape.m_vertex2);
                        outline.push([
                            { x: a.x, y: a.y },
                            { x: c.x, y: c.y },
                        ]);
                    } else {
                        const c = corners(p, shape);
                        if (c.length) outline.push(c);
                    }
                }
                if (outline.length) out.push({ body: b, outline, moving: p.isDynamic() });
            }
            return out;
        },
        velocityAt(b, at) {
            const v = get(b).getLinearVelocityFromWorldPoint(new Vec2(at.x, at.y));
            return { x: v.x, y: v.y };
        },
        breakable(o) {
            const { x, y, cols, rows, size, breaks, on, ...material } = o;
            const blocks: Body[] = [];
            const x0 = x - (cols * size) / 2 + size / 2,
                y0 = y - (rows * size) / 2 + size / 2;
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols; c++)
                    blocks.push(
                        api.box({
                            x: x0 + c * size,
                            y: y0 + r * size,
                            // a hair apart, so neighbours joined by a weld do not also press on each other
                            w: size * 0.97,
                            h: size * 0.97,
                            ...material,
                        }),
                    );
            const at = (c: number, r: number) => blocks[r * cols + c];
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols; c++) {
                    const b = at(c, r),
                        right = c + 1 < cols ? at(c + 1, r) : undefined,
                        below = r + 1 < rows ? at(c, r + 1) : undefined;
                    if (!b) continue;
                    const cx = x0 + c * size,
                        cy = y0 + r * size;
                    if (right) api.weld(b, right, { x: cx + size / 2, y: cy }, { breaks });
                    if (below) api.weld(b, below, { x: cx, y: cy + size / 2 }, { breaks });
                    if (on && r === rows - 1)
                        api.weld(on, b, { x: cx, y: cy + size / 2 }, { breaks });
                }
            return blocks;
        },
        asleep(b) {
            const p = get(b);
            return p.isDynamic() && !p.isAwake();
        },
        census() {
            let moving = 0,
                awake = 0;
            for (let body = world.getBodyList(); body; body = body.getNext())
                if (body.isDynamic()) {
                    moving++;
                    if (body.isAwake()) awake++;
                }
            return { moving, awake };
        },
        survey() {
            const out: Survey = { bodies: [], joints: [] };
            for (const p of inner.values()) {
                const sensor = p.getFixtureList()?.isSensor() ?? false;
                const state = sensor
                    ? "sensor"
                    : !p.isDynamic()
                      ? "fixed"
                      : p.isAwake()
                        ? "awake"
                        : "asleep";
                out.bodies.push({ outline: outlineOf(p), state });
            }
            for (const [j, { j: p }] of joints) {
                const a = p.getAnchorA(),
                    b = p.getAnchorB();
                out.joints.push({ kind: j.kind, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } });
            }
            return out;
        },
        launch(b, v, spin = 0) {
            const p = get(b);
            p.setLinearVelocity(new Vec2(v.x, v.y));
            p.setAngularVelocity(spin);
        },
        moveTo(b, at, angle) {
            const p = get(b);
            if (angle === undefined) p.setPosition(new Vec2(at.x, at.y));
            else p.setTransform(new Vec2(at.x, at.y), angle);
            p.setLinearVelocity(new Vec2(0, 0));
            p.setAngularVelocity(0);
            p.setAwake(true);
        },
        push(b, f) {
            get(b).applyForceToCenter(new Vec2(f.x, f.y), true);
        },
        pushAt(b, f, at) {
            get(b).applyForce(new Vec2(f.x, f.y), new Vec2(at.x, at.y), true);
        },
        gravity(g) {
            world.setGravity(new Vec2(g.x, g.y));
        },
        remove(b) {
            const p = get(b);
            for (let e = p.getJointList(); e; e = e.next)
                for (const [k, v] of joints) if (v.j === e.joint) joints.delete(k);
            world.destroyBody(p);
            inner.delete(b);
            outer.delete(p);
            inside.delete(b);
            for (const set of inside.values()) set.delete(b);
            const i = springs.findIndex((s) => s.body === p);
            if (i >= 0) springs.splice(i, 1);
        },
        step(dt) {
            hardest = 0;
            found = [];
            snapped = [];
            for (const s of springs)
                s.body.applyTorque(
                    -s.k * (s.body.getAngle() - s.rest) - s.damping * s.body.getAngularVelocity(),
                    true,
                );
            float();
            world.step(dt, 8, 3);
            for (const [k, v] of joints)
                if (v.breaks < Infinity && v.j.getReactionForce(1 / dt).length() > v.breaks) {
                    world.destroyJoint(v.j);
                    joints.delete(k);
                    snapped.push(k);
                }
            return hardest;
        },
        where(b) {
            const p = get(b),
                at = p.getPosition();
            return { x: at.x, y: at.y, angle: p.getAngle() };
        },
        velocity(b) {
            const v = get(b).getLinearVelocity();
            return { x: v.x, y: v.y };
        },
        spin(b) {
            return get(b).getAngularVelocity();
        },
        moving(b, speed = 0.08) {
            const p = get(b),
                v = p.getLinearVelocity();
            return (
                p.isAwake() &&
                (Math.hypot(v.x, v.y) > speed || Math.abs(p.getAngularVelocity()) > speed)
            );
        },
        touching(sensor) {
            return [...(inside.get(sensor) ?? [])];
        },
        hits() {
            return found;
        },
    };
    worlds.add(api);
    return api;
}
