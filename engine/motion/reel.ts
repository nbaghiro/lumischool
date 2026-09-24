export interface Reel {
    speed: number;
    tension: number;
}

/** A forgiving winch: load slows the line; easing the handle relaxes tension without losing cargo. */
export function reelStep(
    reel: Reel,
    effort: number,
    resistance: number,
    speed: number,
    dt: number,
): number {
    if (
        ![effort, resistance, speed, dt, reel.speed, reel.tension].every(Number.isFinite) ||
        speed < 0 ||
        dt < 0 ||
        dt > 0.25
    )
        throw new Error("Invalid reel step");
    const drive = Math.max(0, Math.min(1, effort));
    const load = Math.max(0, Math.min(1, resistance));
    const tension = drive * load;
    reel.tension += (tension - reel.tension) * (1 - Math.exp(-dt * 6));
    const target = (speed * drive) / (1 + load * 0.6 + reel.tension * 0.4);
    const previous = reel.speed;
    reel.speed += (target - reel.speed) * (1 - Math.exp(-dt * 8));
    return (previous + reel.speed) * 0.5 * dt;
}
