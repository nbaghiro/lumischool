export interface SkittleBody {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    mass: number;
    spin: number;
    angle: number;
    fallen: boolean;
    out: boolean;
}

export interface SkittleLane {
    left: number;
    right: number;
    top: number;
    bottom: number;
    grip: number;
    hook: number;
    bumpers: boolean;
}

export interface SkittleHit {
    a: number;
    b: number;
    speed: number;
    x: number;
    y: number;
}

export const skittlesMoving = (bodies: readonly SkittleBody[]): boolean =>
    bodies.some((b) => !b.out && Math.hypot(b.vx, b.vy) > 0);

/** Unequal masses exchange momentum; a pin topples only after a meaningful impact. */
export function stepSkittles(bodies: SkittleBody[], lane: SkittleLane, dt: number): SkittleHit[] {
    const hits: SkittleHit[] = [];
    const n = Math.max(1, Math.ceil(dt * 240)),
        h = dt / n;
    for (let k = 0; k < n; k++) {
        for (const b of bodies) {
            if (b.out) continue;
            const speed = Math.hypot(b.vx, b.vy);
            if (speed === 0) continue;
            const drag = b.id === 0 ? lane.grip : 3.4;
            const next = Math.max(0, speed - drag * h);
            if (next < 0.06) {
                b.vx = 0;
                b.vy = 0;
                continue;
            }
            const hook =
                b.id === 0 ? b.spin * lane.hook * Math.min(1, (lane.bottom - b.y) / 12) : 0;
            b.vx = (b.vx * next) / speed + hook * h;
            b.vy *= next / speed;
            b.x += b.vx * h;
            b.y += b.vy * h;
            b.angle += (b.id === 0 ? speed / b.radius : b.spin) * h;
            if (b.x - b.radius < lane.left || b.x + b.radius > lane.right) {
                if (lane.bumpers && b.id === 0) {
                    b.x = Math.max(lane.left + b.radius, Math.min(lane.right - b.radius, b.x));
                    b.vx *= -0.65;
                    b.spin *= 0.5;
                } else b.out = true;
            }
            if (b.y < lane.top || b.y > lane.bottom + 3) b.out = true;
            if (b.out) {
                b.vx = 0;
                b.vy = 0;
            }
        }
        for (let i = 0; i < bodies.length; i++) {
            const a = bodies[i];
            if (!a || a.out) continue;
            for (let j = i + 1; j < bodies.length; j++) {
                const b = bodies[j];
                if (!b || b.out) continue;
                const dx = b.x - a.x,
                    dy = b.y - a.y,
                    d = Math.hypot(dx, dy);
                const reach = a.radius + b.radius;
                if (d >= reach || d < 1e-9) continue;
                const nx = dx / d,
                    ny = dy / d;
                const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                const ia = 1 / a.mass,
                    ib = 1 / b.mass,
                    inv = ia + ib;
                a.x -= (nx * (reach - d) * ia) / inv;
                a.y -= (ny * (reach - d) * ia) / inv;
                b.x += (nx * (reach - d) * ib) / inv;
                b.y += (ny * (reach - d) * ib) / inv;
                if (closing <= 0) continue;
                const impulse = (1.55 * closing) / inv;
                a.vx -= impulse * ia * nx;
                a.vy -= impulse * ia * ny;
                b.vx += impulse * ib * nx;
                b.vy += impulse * ib * ny;
                for (const pin of [a, b])
                    if (pin.id !== 0 && impulse / pin.mass > 0.65) {
                        pin.fallen = true;
                        pin.spin += ((a.vx - b.vx) * ny - (a.vy - b.vy) * nx) * 0.3 + nx * 2;
                        pin.angle = Math.atan2(pin.vy, pin.vx) + Math.PI / 2;
                    }
                hits.push({
                    a: a.id,
                    b: b.id,
                    speed: closing,
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2,
                });
            }
        }
    }
    return hits;
}
