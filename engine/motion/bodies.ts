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
    Edge,
    RevoluteJoint,
    Vec2,
    World,
    type Body as PlanckBody,
    type Contact,
    type Fixture,
} from "planck";
import type { Pt } from "./geometry";

/** A body in the world. The game holds it and passes it back; what is inside is this file's business. */
export interface Body {
    readonly shape: "box" | "ball" | "ground";
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
    /** Touches nothing and is touched by nothing: it only notices what passes through it. */
    sensor?: boolean;
    /** Never turns, however it is hit, like a rocket that stays upright on its legs. */
    upright?: boolean;
    /** How fast its moving and its turning die away by themselves, per second. */
    damping?: { move?: number; turn?: number };
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

/** Two bodies that began touching in the last step, and how fast they were closing when they did. */
export interface Hit {
    a: Body;
    b: Body;
    speed: number;
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
    /** A ball. A fast one is checked along its whole path each step, so it cannot pass through a thin rod. */
    ball(o: { x: number; y: number; r: number; fast?: boolean } & Material & Kind): Body;
    /** A flat ground from `from` to `to` at height `y`, which nothing falls through. */
    ground(o: { y: number; from: number; to: number; friction?: number }): Body;
    /** Sets a body moving at `v` squares a second, turning at `spin` radians a second. */
    launch(b: Body, v: Pt, spin?: number): void;
    /** Puts a body at a place, still, as a level laid out by hand or a test's own arrangement does. */
    moveTo(b: Body, at: Pt): void;
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
    /** Whether a body is still moving faster than `speed` squares, or radians, a second. */
    moving(b: Body, speed?: number): boolean;
    /** The bodies inside a sensor now. */
    touching(sensor: Body): Body[];
    /** The hits that began in the last step, in the order the world found them. */
    hits(): Hit[];
}

export function bodies(o: { gravity: Pt }): Bodies {
    const world = new World({ gravity: new Vec2(o.gravity.x, o.gravity.y) });
    const inner = new Map<Body, PlanckBody>();
    const outer = new Map<PlanckBody, Body>();
    const inside = new Map<Body, Set<Body>>();
    const springs: { body: PlanckBody; k: number; damping: number; rest: number }[] = [];
    let found: Hit[] = [];
    let hardest = 0;
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
            type: k.fixed || k.sensor ? "static" : "dynamic",
            position: new Vec2(at.x, at.y),
            angle,
            bullet: k.fast === true,
            fixedRotation: k.upright === true,
            linearDamping: k.damping?.move ?? 0,
            angularDamping: k.damping?.turn ?? 0,
        });
    const noticed = (b: Body, k: Kind): Body => {
        if (k.sensor) inside.set(b, new Set());
        return b;
    };
    return {
        box(b) {
            // The peg a hinge turns on is made first, so the world holds its bodies in the order a
            // see-saw is built in and a replay steps them in the same order.
            const peg = b.hinge
                ? world.createBody({ position: new Vec2(b.hinge.at.x, b.hinge.at.y) })
                : null;
            const body = make(b, b.angle ?? 0, b);
            body.createFixture({
                shape: new Box(b.w / 2, b.h / 2),
                density: b.density ?? 1,
                friction: b.friction ?? 0.7,
                restitution: b.restitution ?? 0,
                isSensor: b.sensor === true,
            });
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
        ball(b) {
            const body = make(b, 0, b);
            body.createFixture({
                shape: new Circle(b.r),
                density: b.density ?? 1,
                friction: b.friction ?? 0.6,
                restitution: b.restitution ?? 0,
                isSensor: b.sensor === true,
            });
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
        launch(b, v, spin = 0) {
            const p = get(b);
            p.setLinearVelocity(new Vec2(v.x, v.y));
            p.setAngularVelocity(spin);
        },
        moveTo(b, at) {
            const p = get(b);
            p.setPosition(new Vec2(at.x, at.y));
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
            for (const s of springs)
                s.body.applyTorque(
                    -s.k * (s.body.getAngle() - s.rest) - s.damping * s.body.getAngularVelocity(),
                    true,
                );
            world.step(dt, 8, 3);
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
}
