import { inside, type Rect } from "./geometry";

export interface RollingBall {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    sunk: boolean;
}
export interface RollingWorld {
    bounds: Rect;
    walls: Rect[];
    /** Overlapping zones use the strongest friction, including the base surface. */
    surfaces: { area: Rect; deceleration: number }[];
    deceleration: number;
    restitution: number;
    restSpeed: number;
    cup?: { x: number; y: number; r: number; maxSpeed: number };
}
export interface RollingResult {
    hits: number;
    captured: boolean;
    /** True only on the transition from moving to rest (capture also stops the ball). */
    stopped: boolean;
}

export const ROLLING_MAX_SPEED = 120;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** A launch changes velocity only. Sunk balls stay in their cup until a new round starts. */
export function launchRolling(
    ball: RollingBall,
    vx: number,
    vy: number,
    maxSpeed = ROLLING_MAX_SPEED,
): void {
    if (ball.sunk) return;
    if (![vx, vy, maxSpeed].every(Number.isFinite) || maxSpeed < 0)
        throw new Error("Invalid rolling launch");
    const speed = Math.hypot(vx, vy),
        scale = speed ? Math.min(1, Math.min(maxSpeed, ROLLING_MAX_SPEED) / speed) : 0;
    ball.vx = vx * scale;
    ball.vy = vy * scale;
}

function reflect(ball: RollingBall, nx: number, ny: number, restitution: number): number {
    const towards = ball.vx * nx + ball.vy * ny;
    if (towards >= 0) return 0;
    ball.vx -= (1 + restitution) * towards * nx;
    ball.vy -= (1 + restitution) * towards * ny;
    return 1;
}

/** Circle/rectangle contact includes the rounded corners, rather than enlarged square corners. */
function wallContact(ball: RollingBall, wall: Rect, restitution: number): number {
    const x = clamp(ball.x, wall.x, wall.x + wall.w),
        y = clamp(ball.y, wall.y, wall.y + wall.h);
    const dx = ball.x - x,
        dy = ball.y - y,
        distance = Math.hypot(dx, dy);
    if (distance >= ball.r) return 0;
    if (distance > 1e-12) {
        const nx = dx / distance,
            ny = dy / distance;
        ball.x = x + nx * ball.r;
        ball.y = y + ny * ball.r;
        return reflect(ball, nx, ny, restitution);
    }
    // Defensive recovery for an initially overlapping ball. Authored starts should be clear.
    const sides = [
        { distance: ball.x - wall.x, x: wall.x - ball.r, y: ball.y, nx: -1, ny: 0 },
        {
            distance: wall.x + wall.w - ball.x,
            x: wall.x + wall.w + ball.r,
            y: ball.y,
            nx: 1,
            ny: 0,
        },
        { distance: ball.y - wall.y, x: ball.x, y: wall.y - ball.r, nx: 0, ny: -1 },
        {
            distance: wall.y + wall.h - ball.y,
            x: ball.x,
            y: wall.y + wall.h + ball.r,
            nx: 0,
            ny: 1,
        },
    ];
    const side = sides.reduce((best, next) => (next.distance < best.distance ? next : best));
    ball.x = side.x;
    ball.y = side.y;
    return reflect(ball, side.nx, side.ny, restitution);
}

function crossesCup(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cup: NonNullable<RollingWorld["cup"]>,
): boolean {
    const dx = bx - ax,
        dy = by - ay,
        length = dx * dx + dy * dy;
    const u = length ? clamp(((cup.x - ax) * dx + (cup.y - ay) * dy) / length, 0, 1) : 0;
    return Math.hypot(ax + u * dx - cup.x, ay + u * dy - cup.y) <= cup.r;
}

/**
 * Deterministic fixed-step rolling in board units. dt must be 0..0.25 seconds, radius >=0.025,
 * finite velocities and a valid clear start in a bounds rectangle wider than the ball.
 * Speed is capped at 120. Substeps travel at most r/4 and last at most 1/240 second, preventing
 * a disk crossing even a thin solid wall between contacts. Narrower-than-diameter passages and
 * overlapping solids are invalid world geometry. Friction is sampled at each substep's start.
 */
export function stepRolling(ball: RollingBall, world: RollingWorld, dt: number): RollingResult {
    if (
        !Number.isFinite(dt) ||
        dt < 0 ||
        dt > 0.25 ||
        !Number.isFinite(ball.r) ||
        ball.r < 0.025 ||
        ![
            ball.x,
            ball.y,
            ball.vx,
            ball.vy,
            world.deceleration,
            world.restitution,
            world.restSpeed,
        ].every(Number.isFinite) ||
        world.deceleration < 0 ||
        world.restSpeed < 0
    )
        throw new Error("Invalid rolling step");
    const wasMoving = Math.hypot(ball.vx, ball.vy) > 0;
    const result: RollingResult = { hits: 0, captured: false, stopped: false };
    if (ball.sunk || dt === 0) return result;
    launchRolling(ball, ball.vx, ball.vy);
    const restitution = clamp(world.restitution, 0, 1),
        bounds = world.bounds;
    let remaining = dt;
    while (remaining > 1e-12 && !ball.sunk) {
        const speed = Math.hypot(ball.vx, ball.vy);
        const h = Math.min(remaining, 1 / 240, speed ? ball.r / (4 * speed) : remaining);
        remaining -= h;
        let friction = world.deceleration;
        for (const surface of world.surfaces)
            if (inside(surface.area, ball)) friction = Math.max(friction, surface.deceleration);
        const movingFor = friction > 0 ? Math.min(h, speed / friction) : h;
        const distance = speed * movingFor - (friction * movingFor * movingFor) / 2;
        const endSpeed = Math.max(0, speed - friction * h);
        const x = ball.x,
            y = ball.y;
        const nx = speed ? ball.vx / speed : 0,
            ny = speed ? ball.vy / speed : 0;
        ball.x += nx * distance;
        ball.y += ny * distance;
        ball.vx = nx * endSpeed;
        ball.vy = ny * endSpeed;
        const cup = world.cup;
        // Only the slow portion of this path is eligible: a fast pass over a cup does not sink.
        if (cup && endSpeed <= cup.maxSpeed) {
            const eligibleAt =
                friction > 0 ? clamp((speed - cup.maxSpeed) / friction, 0, movingFor) : 0;
            const skip = speed * eligibleAt - (friction * eligibleAt * eligibleAt) / 2;
            if (crossesCup(x + nx * skip, y + ny * skip, ball.x, ball.y, cup)) {
                ball.x = cup.x;
                ball.y = cup.y;
                ball.vx = 0;
                ball.vy = 0;
                ball.sunk = true;
                result.captured = true;
                break;
            }
        }
        // Multiple passes resolve corners where an obstacle meets the outside boundary.
        for (let pass = 0; pass < 3; pass++) {
            if (ball.x < bounds.x + ball.r) {
                ball.x = bounds.x + ball.r;
                result.hits += reflect(ball, 1, 0, restitution);
            }
            if (ball.x > bounds.x + bounds.w - ball.r) {
                ball.x = bounds.x + bounds.w - ball.r;
                result.hits += reflect(ball, -1, 0, restitution);
            }
            if (ball.y < bounds.y + ball.r) {
                ball.y = bounds.y + ball.r;
                result.hits += reflect(ball, 0, 1, restitution);
            }
            if (ball.y > bounds.y + bounds.h - ball.r) {
                ball.y = bounds.y + bounds.h - ball.r;
                result.hits += reflect(ball, 0, -1, restitution);
            }
            for (const wall of world.walls) result.hits += wallContact(ball, wall, restitution);
        }
        if (Math.hypot(ball.vx, ball.vy) <= world.restSpeed) {
            ball.vx = 0;
            ball.vy = 0;
        }
    }
    result.stopped = wasMoving && ball.vx === 0 && ball.vy === 0;
    return result;
}
