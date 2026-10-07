import { test } from "node:test";
import assert from "node:assert/strict";
import {
    crowding,
    healthy,
    settled,
    stepQuality,
    type Quality,
    type TankLife,
} from "../waterquality";

const life = (o: Partial<TankLife> = {}): TankLife => ({
    litres: 12,
    needs: 6,
    plants: 0,
    snails: 0,
    filter: false,
    ...o,
});

function settle(q: Quality, l: TankLife, seconds: number): Quality {
    for (let i = 0; i < seconds * 60; i++) stepQuality(q, l, 1 / 60);
    return q;
}

test("plants or a filter give a tank its oxygen, and a bare tank is short of it", () => {
    assert.ok(settled(life(), 0).oxygen < 0.6);
    assert.ok(settled(life({ plants: 2 }), 0).oxygen >= 0.6);
    assert.ok(settled(life({ filter: true }), 0).oxygen >= 0.6);
    assert.ok(settled(life({ plants: 2 }), 0).oxygen > settled(life({ plants: 1 }), 0).oxygen);
});

test("crowding takes oxygen and cleanness by degrees", () => {
    assert.equal(crowding(life({ needs: 18 })), 1.5);
    const fine = settled(life({ plants: 2 }), 0),
        crowded = settled(life({ plants: 2, needs: 18 }), 0);
    assert.ok(crowded.oxygen < fine.oxygen && crowded.clean < fine.clean);
    assert.ok(!healthy(settle({ oxygen: 1, clean: 1, haze: 0 }, life({ needs: 24 }), 30)));
});

test("food left uneaten clouds the water, and snails and the filter clear it", () => {
    const alone = settle({ oxygen: 0.7, clean: 0.9, haze: 4 }, life({ plants: 2 }), 3);
    const helped = settle(
        { oxygen: 0.7, clean: 0.9, haze: 4 },
        life({ plants: 2, snails: 1, filter: true }),
        3,
    );
    assert.ok(helped.haze < alone.haze);
    assert.ok(helped.clean > alone.clean);
    assert.ok(settle(helped, life({ plants: 2, snails: 1, filter: true }), 30).haze === 0);
});

test("readings ease towards where they settle rather than jumping, and a tank put right comes back", () => {
    const q: Quality = { oxygen: 0.2, clean: 0.3, haze: 0 };
    stepQuality(q, life({ plants: 3, filter: true }), 1 / 60);
    assert.ok(q.oxygen < 0.25);
    settle(q, life({ plants: 3, filter: true }), 20);
    assert.ok(healthy(q));
});

test("an empty tank has nothing to breathe", () => {
    assert.deepEqual(settled(life({ litres: 0 }), 0), { oxygen: 0, clean: 0 });
});
