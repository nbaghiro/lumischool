// One-button flight: a thing that climbs while a button is held and glides down when it is let go,
// with its nose along its path. It is a paper plane, a bird or a balloon's burner reduced to a few
// numbers: a pull up while held, a fall that is always there, a most it climbs and sinks by, and a
// forward speed it settles to, which a climb spends and a dive gives back so the flight has weight.
// It is stepped on the fixed loop, in squares and seconds with y growing downwards, so the same
// presses fly the same path.
import { easing } from "./camera";

export interface Flyer {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export interface Wing {
    /** Squares a second along its way, which it settles back to. */
    cruise: number;
    /** Squares a second each second, upwards, while the button is held. */
    lift: number;
    /** Squares a second each second, downwards, always. */
    fall: number;
    /** The fastest it climbs and the fastest it sinks, in squares a second. */
    rise: number;
    sink: number;
    /** How much of its forward speed a steep climb costs and a steep dive gives, from nought to one. */
    trade: number;
    /** How quickly the forward speed comes back to what it wants, per second. */
    settle: number;
}

export function glide(f: Flyer, held: boolean, dt: number, w: Wing): Flyer {
    const pull = (held ? -w.lift : 0) + w.fall;
    const vy = Math.max(-w.rise, Math.min(w.sink, f.vy + pull * dt));
    // A dive is a sink towards `sink` and speeds the flyer up; a climb towards `rise` slows it.
    const steep = vy >= 0 ? vy / Math.max(w.sink, 1e-9) : vy / Math.max(w.rise, 1e-9);
    const want = w.cruise * (1 + w.trade * steep);
    const vx = f.vx + (want - f.vx) * easing(w.settle, dt);
    return { x: f.x + vx * dt, y: f.y + vy * dt, vx, vy };
}

/** The angle of its nose, in radians clockwise from pointing right, which is the angle its drawing turns by. */
export const noseOf = (f: Flyer): number => Math.atan2(f.vy, Math.max(0.01, Math.abs(f.vx)));

/**
 * Kept between a ceiling and a floor: a touch on either turns the flyer back with `give` of the
 * speed it met it at, so a plane that skims the grass hops up again and nothing is lost by it.
 */
export function within(
    f: Flyer,
    top: number,
    floor: number,
    give: number,
): { f: Flyer; touched: "top" | "floor" | null; speed: number } {
    if (f.y > floor && f.vy > 0)
        return { f: { ...f, y: floor, vy: -f.vy * give }, touched: "floor", speed: f.vy };
    if (f.y < top && f.vy < 0)
        return { f: { ...f, y: top, vy: -f.vy * give }, touched: "top", speed: -f.vy };
    return { f, touched: null, speed: 0 };
}
