import { test } from "node:test";
import assert from "node:assert/strict";
import { bodies } from "../bodies";
import { PHYSICAL_MATERIALS } from "../physical-materials";

test("stone has three times timber mass for the same footprint, measured by equal force", () => {
    const world = bodies({ gravity: { x: 0, y: 0 } });
    const timber = world.box({ x: 0, y: 0, w: 2, h: 1, ...PHYSICAL_MATERIALS.timber });
    const stone = world.box({ x: 0, y: 4, w: 2, h: 1, ...PHYSICAL_MATERIALS.stone });
    world.push(timber, { x: 12, y: 0 });
    world.push(stone, { x: 12, y: 0 });
    world.step(1 / 60);
    assert.ok(Math.abs(world.velocity(timber).x / world.velocity(stone).x - 3) < 1e-10);
    assert.ok(Object.isFrozen(PHYSICAL_MATERIALS));
    assert.ok(Object.isFrozen(PHYSICAL_MATERIALS.stone));
});
