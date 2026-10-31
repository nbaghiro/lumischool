import assert from "node:assert/strict";
import { test } from "node:test";
import { renderDensity, terrainCoverage } from "../terrain-coverage";

const a = { x: 0, y: 0, w: 100, h: 100 };
const b = { x: 100, y: 0, w: 100, h: 100 };
const view = { ...a, w: 200 };

test("a missing neighbor does not demote a detailed region", () => {
    const coverage = terrainCoverage([a, b]);
    coverage.frame(view, [b], 2, 10, false);
    assert.deepEqual(
        coverage.frame(view, [b], 2, 160, false).map((s) => s.mix),
        [1, 0],
    );
    assert.deepEqual(
        coverage.frame(view, [b], 2, 200, false).map((s) => s.mix),
        [1, 0],
    );
    assert.deepEqual(
        coverage.frame(view, [], 2, 350, false).map((s) => s.mix),
        [1, 1],
    );
});

test("missing overflow falls back only where its ink can land", () => {
    const coverage = terrainCoverage([a, b]);
    const regions = coverage.frame(view, [{ x: 90, y: 0, w: 20, h: 100 }], 2, 10, true);
    assert.equal(
        regions.filter((s) => s.mix === 0).reduce((n, s) => n + s.rect.w * s.rect.h, 0),
        2000,
    );
    assert.equal(
        regions.filter((s) => s.mix === 1).reduce((n, s) => n + s.rect.w * s.rect.h, 0),
        18000,
    );
    assert.ok(coverage.frame(view, [], 2, 20, true).every((s) => s.mix === 1));
});

test("panning into a missing part of a cell preserves the already detailed part", () => {
    const coverage = terrainCoverage([view]);
    coverage.frame(a, [b], 2, 10, true);
    const next = coverage.frame(view, [b], 2, 20, true);
    assert.deepEqual(next.find((s) => s.mix === 1)?.rect, a);
    assert.equal(
        next.some((s) => s.lost),
        false,
    );
    assert.equal(
        next.reduce((n, s) => n + s.rect.w * s.rect.h, 0),
        20000,
    );
});

test("changing missing regions coalesce after recovery", () => {
    const coverage = terrainCoverage([view]);
    for (let i = 1; i < 200; i++) {
        const regions = coverage.frame(view, [{ x: i, y: 20, w: 1, h: 50 }], 2, i * 200, false);
        assert.equal(
            regions.reduce((n, s) => n + s.rect.w * s.rect.h, 0),
            20000,
        );
        assert.ok(regions.length < 30);
    }
    coverage.frame(view, [], 2, 50000, true);
    assert.equal(coverage.frame(view, [], 2, 50200, true).length, 1);
});

test("zoom hysteresis retains detail, explicit zoom-out demotes and context loss resets", () => {
    const coverage = terrainCoverage([a]);
    assert.equal(coverage.frame(a, [], 1.4, 10, true)[0]?.mix, 1);
    assert.equal(coverage.frame(a, [], 1.2, 20, true)[0]?.mix, 1);
    assert.equal(coverage.frame(a, [], 1, 30, true)[0]?.mix, 0);
    coverage.frame(a, [], 2, 40, true);
    coverage.reset();
    assert.equal(coverage.frame(a, [a], 2, 50, true)[0]?.mix, 0);
});

test("render density caps large backing stores and is shared by terrain and art", () => {
    assert.equal(renderDensity({ w: 390, h: 844 }, 3), 2);
    assert.ok(
        Math.abs(renderDensity({ w: 1440, h: 900 }, 2) - Math.sqrt(4_000_000 / 1_296_000)) < 1e-9,
    );
    assert.equal(renderDensity({ w: 4000, h: 4000 }, 2), 0.5);
});
