import assert from "node:assert/strict";
import { test } from "node:test";
import { refineImages } from "../map-refinement";
import { IDENTITY, type GlImage } from "../gl";
import { overlap } from "../map-tile-layout";

const image = (x: number, w: number): GlImage => ({
    kind: "image",
    texture: { kind: "texture", w: 256, h: 256, bytes: 262144 },
    rect: { x, y: 0, w, h: 100 },
    at: IDENTITY,
    alpha: 1,
});

test("LOD refinement joins different tile grids without overlap or losing UV crops", () => {
    const old = [image(0, 50), image(50, 50)];
    const next = [{ ...image(0, 100), source: { x: 0.1, y: 0.2, w: 0.8, h: 0.6 } }];
    const draws = refineImages(next, old, 0.5);
    assert.equal(draws.length, 2);
    assert.deepEqual(
        draws.map((d) => d.source),
        [
            { x: 0.1, y: 0.2, w: 0.4, h: 0.6 },
            { x: 0.5, y: 0.2, w: 0.4, h: 0.6 },
        ],
    );
    assert.equal(
        draws.reduce((sum, d) => sum + d.rect.w * d.rect.h, 0),
        10000,
    );
    const a = draws[0],
        b = draws[1];
    assert.ok(a && b);
    assert.equal(overlap(a.rect, b.rect), null);
    assert.equal(a.previous?.texture, old[0]?.texture);
    assert.equal(b.previous?.texture, old[1]?.texture);
    assert.deepEqual(refineImages(next, old, 1), next);
});

test("newly exposed areas draw their available tile without inventing old coverage", () => {
    const draws = refineImages([image(0, 100)], [image(0, 50)], 0.25);
    assert.equal(draws.filter((d) => d.previous).length, 1);
    assert.equal(draws.filter((d) => !d.previous).length, 1);
    assert.equal(
        draws.reduce((sum, d) => sum + d.rect.w * d.rect.h, 0),
        10000,
    );
});
