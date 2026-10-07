import type { Pt } from "./geometry";

export interface Drifter extends Pt {
    vx: number;
    vy: number;
}
export interface Current {
    speed: number;
    bend: number;
    phase: number;
    top: number;
    bottom: number;
    rocks: { x: number; y: number; r: number }[];
}

export function currentAt(c: Current, p: Pt, time: number): Pt {
    let x = c.speed * (0.7 + 0.3 * Math.sin(((p.y - c.top) / (c.bottom - c.top)) * Math.PI)),
        y = c.bend * Math.sin(p.x * 0.27 + c.phase) + 0.18 * Math.sin(time * 0.8 + p.x * 0.2);
    for (const r of c.rocks) {
        const dx = p.x - r.x,
            dy = p.y - r.y,
            influence = Math.exp(-(dx * dx + dy * dy) / 13);
        y += (dy >= 0 ? 1 : -1) * influence * 0.6;
        if (dx > 0) {
            x -= influence * 1.8;
            y += Math.sin(dx * 0.8) * influence * 0.8;
        }
    }
    return { x, y };
}

export function driftStep(b: Drifter, c: Current, time: number, dt: number): boolean {
    const flow = currentAt(c, b, time),
        blend = 1 - Math.exp(-dt * 0.65);
    b.vx += (flow.x - b.vx) * blend;
    b.vy += (flow.y - b.vy) * blend;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let hit = false;
    for (const r of c.rocks) {
        const dx = b.x - r.x,
            dy = b.y - r.y,
            d = Math.hypot(dx, dy),
            radius = r.r + 0.45;
        if (d >= radius) continue;
        const nx = d > 0.001 ? dx / d : -1,
            ny = d > 0.001 ? dy / d : 0,
            into = b.vx * nx + b.vy * ny;
        b.x = r.x + nx * radius;
        b.y = r.y + ny * radius;
        if (into < 0) {
            b.vx -= 1.45 * into * nx;
            b.vy -= 1.45 * into * ny;
        }
        hit = true;
    }
    if (b.y < c.top || b.y > c.bottom) {
        b.y = Math.max(c.top, Math.min(c.bottom, b.y));
        b.vy *= -0.5;
        hit = true;
    }
    return hit;
}
