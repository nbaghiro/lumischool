export interface Vehicle {
    x: number;
    y: number;
    angle: number;
    vx: number;
    vy: number;
    steering: number;
}

export interface VehicleTuning {
    acceleration: number;
    braking: number;
    topSpeed: number;
    reverseSpeed: number;
    wheelbase: number;
    grip: number;
    drag: number;
    steeringLimit: number;
    steeringRate: number;
}

export interface VehicleInput {
    /** Signed drive: negative reverses, while brake only slows towards rest. */
    throttle: number;
    brake: number;
    steer: number;
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const headingError = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function vehicleStep(
    v: Vehicle,
    input: VehicleInput,
    tune: VehicleTuning,
    dt: number,
): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1)
        throw new Error("Vehicle step must be at most 100 ms");
    const target = clamp(input.steer, -1, 1) * tune.steeringLimit;
    v.steering += clamp(target - v.steering, -tune.steeringRate * dt, tune.steeringRate * dt);
    let forward = v.vx * Math.cos(v.angle) + v.vy * Math.sin(v.angle);
    v.angle = headingError(v.angle + (forward / tune.wheelbase) * Math.tan(v.steering) * dt);
    const c = Math.cos(v.angle),
        s = Math.sin(v.angle);
    forward = v.vx * c + v.vy * s;
    const sideways = (-v.vx * s + v.vy * c) * Math.exp(-tune.grip * dt);
    forward += clamp(input.throttle, -1, 1) * tune.acceleration * dt;
    forward =
        Math.sign(forward) *
        Math.max(0, Math.abs(forward) - clamp(input.brake, 0, 1) * tune.braking * dt);
    forward *= Math.exp(-tune.drag * dt);
    forward = clamp(forward, -tune.reverseSpeed, tune.topSpeed);
    if (Math.abs(forward) < 0.015 && input.throttle === 0) forward = 0;
    v.vx = forward * c - sideways * s;
    v.vy = forward * s + sideways * c;
    if (Math.hypot(v.vx, v.vy) < 0.015 && input.throttle === 0) {
        v.vx = 0;
        v.vy = 0;
    }
    v.x += v.vx * dt;
    v.y += v.vy * dt;
}
