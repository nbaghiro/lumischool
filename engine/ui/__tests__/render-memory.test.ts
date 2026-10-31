import assert from "node:assert/strict";
import { test } from "node:test";
import { resourceBudget } from "../render-memory";

test("all scenes share admission and reclaim disposable pixels before refusing a replacement", () => {
    const budget = resourceBudget(100);
    let spare: (() => void) | null = null;
    const a = budget.owner(() => {
        spare?.();
        spare = null;
    });
    const b = budget.owner(() => {});
    const visible = a.reserve(40);
    spare = a.reserve(30);
    assert.ok(visible && spare);
    const next = b.reserve(50);
    assert.ok(next);
    assert.equal(budget.stats().bytes, 90);
    assert.equal(b.reserve(20), null);
    assert.equal(budget.stats().bytes, 90);
    visible();
    visible();
    next();
    next();
    assert.equal(budget.stats().bytes, 0);
    a.stop();
    b.stop();
    assert.equal(budget.stats().owners, 0);
});

test("stopping an owner balances late releases and rejects further reservations", () => {
    const budget = resourceBudget(100);
    const owner = budget.owner(() => {});
    const release = owner.reserve(80);
    assert.ok(release);
    owner.stop();
    release();
    assert.equal(budget.stats().bytes, 0);
    assert.equal(owner.reserve(1), null);
    assert.equal(budget.stats().highWater, 80);
});
