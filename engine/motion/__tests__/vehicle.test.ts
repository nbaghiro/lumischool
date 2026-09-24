import assert from "node:assert/strict";
import { it } from "node:test";
import { vehicleStep, type Vehicle, type VehicleTuning } from "../vehicle";
const tune: VehicleTuning = {
    acceleration: 5,
    braking: 12,
    topSpeed: 7,
    reverseSpeed: 2.6,
    wheelbase: 1.5,
    grip: 7,
    drag: 0.3,
    steeringLimit: 0.62,
    steeringRate: 2.8,
};
const car = (): Vehicle => ({ x: 0, y: 0, angle: 0, vx: 0, vy: 0, steering: 0 });
it("a parked car does not move, acceleration builds speed and braking stops it", () => {
    const v = car();
    for (let i = 0; i < 120; i++) vehicleStep(v, { throttle: 0, brake: 0, steer: 1 }, tune, 1 / 60);
    assert.equal(v.x, 0);
    assert.equal(v.angle, 0);
    for (let i = 0; i < 120; i++) vehicleStep(v, { throttle: 1, brake: 0, steer: 0 }, tune, 1 / 60);
    assert.ok(v.x > 4 && v.vx > 4 && v.vx <= tune.topSpeed);
    for (let i = 0; i < 120; i++) vehicleStep(v, { throttle: 0, brake: 1, steer: 0 }, tune, 1 / 60);
    assert.equal(v.vx, 0);
});
it("reverse has a bounded speed, opposite steering and brakes to rest", () => {
    const v = car();
    for (let i = 0; i < 120; i++)
        vehicleStep(v, { throttle: -1, brake: 0, steer: 0 }, tune, 1 / 60);
    assert.ok(v.x < -2 && v.vx < 0 && v.vx >= -tune.reverseSpeed);
    vehicleStep(v, { throttle: -1, brake: 0, steer: 1 }, tune, 1 / 60);
    assert.ok(v.angle < 0);
    for (let i = 0; i < 120; i++) vehicleStep(v, { throttle: 0, brake: 1, steer: 0 }, tune, 1 / 60);
    assert.equal(v.vx, 0);
    assert.equal(v.vy, 0);
});
it("steering needs motion and tyre grip dissipates lateral slip rather than snapping velocity", () => {
    const v = { ...car(), vx: 5, vy: 3 };
    vehicleStep(v, { throttle: 0, brake: 0, steer: 1 }, tune, 1 / 60);
    assert.ok(v.angle > 0 && v.angle < 0.1);
    assert.ok(v.vy > 0 && v.vy < 3);
    assert.ok(v.steering < tune.steeringLimit);
    assert.throws(() => vehicleStep(v, { throttle: 0, brake: 0, steer: 0 }, tune, 1));
});
