// A painting is an answer the event log accepts, and the mirror repeats a mark (the mixing and the
// mirror halves themselves are held in engine/parts/art/__tests__/kit.test.ts, and the verifier's
// colour, shape, line and print questions in engine/notation/__tests__/verify.test.ts). The canvas
// itself needs a page, so the brushes are looked at on the Paint tab.
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../../answer";

import { mirrored, Surface } from "../painting-surface";

test("a mirror repeats a mark across the middle, or across both", () => {
    assert.deepEqual(
        mirrored("two", 20, 10).map((f) => f(3, 4)),
        [
            [3, 4],
            [17, 4],
        ],
    );
    assert.deepEqual(
        mirrored("four", 20, 10).map((f) => f(3, 4)),
        [
            [3, 4],
            [17, 4],
            [3, 6],
            [17, 6],
        ],
    );
    assert.equal(mirrored("none", 20, 10).length, 1);
});

test("a painting is an answer the log accepts, and a malformed one is refused with a reason", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const envelope = (given: unknown) => ({
        id,
        family_id: id,
        kid_id: id,
        kind: "answered",
        actor: null,
        device: id,
        seq: 1,
        at: "2026-09-14T09:12:00.000Z",
        data: {
            sitting: "s1",
            given,
            timing: { k: "screen", toFirstInput: 900, toAnswer: 60000, leftPage: false },
            right: null,
            tries: 1,
            rule: null,
            hints: 0,
            q: {
                lesson: "art-mixing-the-secondaries",
                lessonHash: "h",
                section: "try",
                n: 1,
                item: "art.paint-with-three",
                itemHash: "h",
                variant: "",
                ask: "Paint a picture",
                skills: ["art.painting"],
            },
        },
    });
    const painting = {
        k: "painting",
        paper: "squared",
        w: 20,
        h: 11,
        marks: [
            {
                k: "stroke",
                brush: "water",
                paint: [
                    { pigment: "yellow", parts: 1 },
                    { pigment: "blue", parts: 1 },
                ],
                size: 1,
                mirror: "none",
                points: [1, 1, 0, 2, 1.5, 0],
            },
            { k: "fill", paint: [{ pigment: "red", parts: 1 }], x: 5, y: 5, mirror: "two" },
            {
                k: "stamp",
                stamp: "leaf",
                paint: [{ pigment: "green", parts: 1 }],
                x: 8,
                y: 3,
                size: 3.2,
                flip: false,
                mirror: "none",
            },
            {
                k: "stroke",
                brush: "eraser",
                paint: [],
                size: 0.9,
                mirror: "four",
                points: [3, 3, 0],
            },
        ],
    };
    assert.equal(check(envelope(painting)).ok, true);
    const bad = (change: Record<string, unknown>) => check(envelope({ ...painting, ...change }));
    assert.equal(bad({ paper: "canvas" }).ok, false);
    assert.equal(
        bad({
            marks: [
                {
                    k: "stroke",
                    brush: "water",
                    paint: [],
                    size: 1,
                    mirror: "none",
                    points: [1, 1, 0],
                },
            ],
        }).ok,
        false,
        "a brush stroke needs paint",
    );
    assert.equal(
        bad({
            marks: [
                {
                    k: "stroke",
                    brush: "water",
                    paint: [{ pigment: "red", parts: 1 }],
                    size: 1,
                    mirror: "none",
                    points: [1, 1],
                },
            ],
        }).ok,
        false,
        "points come in threes",
    );
    assert.equal(bad({ marks: [{ k: "splash", mirror: "none" }] }).ok, false);
});

test("a stencil keeps paint off the paper it covers, and two laid at once keep it off both", () => {
    // a square stencil of side px, whatever shape is asked for
    const square = (_shape: string, px: number) => ({
        w: px,
        h: px,
        a: new Float32Array(px * px).fill(1),
    });
    const s = new Surface({ w: 20, h: 10, scale: 4, shapes: square });
    const blue = [{ pigment: "blue" as const, parts: 1 }];
    s.apply({ k: "stencil", shape: "leaf", x: 5, y: 5, size: 4, hole: false, mirror: "none" }, 0);
    s.apply({ k: "stencil", shape: "leaf", x: 15, y: 5, size: 4, hole: false, mirror: "none" }, 1);
    assert.equal(s.laid.length, 2);
    // a pour, since a stroke is rasterised on a canvas the tests do not have; it stops at what a stencil covers
    s.apply({ k: "fill", paint: blue, x: 10, y: 5, mirror: "none" }, 2);
    s.apply({ k: "lift" }, 3);
    assert.equal(s.laid.length, 0);
    assert.equal(s.paintAtPoint(5, 5), null, "under the first shape the paper is bare");
    assert.equal(s.paintAtPoint(15, 5), null, "under the second too");
    assert.deepEqual(s.paintAtPoint(10, 5), blue, "and between them the pour is blue");
});

test("a card with a hole is only as big as its card, so two cards side by side each let paint through", () => {
    const square = (_shape: string, px: number) => ({
        w: px,
        h: px,
        a: new Float32Array(px * px).fill(1),
    });
    const s = new Surface({ w: 30, h: 10, scale: 4, shapes: square });
    const red = [{ pigment: "red" as const, parts: 1 }];
    s.apply({ k: "stencil", shape: "leaf", x: 6, y: 5, size: 3, hole: true, mirror: "none" }, 0);
    s.apply({ k: "stencil", shape: "leaf", x: 20, y: 5, size: 3, hole: true, mirror: "none" }, 1);
    for (const [x, n] of [
        [6, 2],
        [20, 3],
        [13, 4],
    ] as const)
        s.apply({ k: "fill", paint: red, x, y: 5, mirror: "none" }, n);
    s.apply({ k: "lift" }, 5);
    assert.deepEqual(s.paintAtPoint(6, 5), red, "through the first hole");
    assert.deepEqual(s.paintAtPoint(20, 5), red, "through the second");
    assert.deepEqual(s.paintAtPoint(13, 5), red, "and on the paper between the cards");
    assert.equal(s.paintAtPoint(8, 5), null, "but not under the card round a hole");
});

test("version-one picture templates and print blocks keep their saved geometry", async () => {
    const { createHash } = await import("node:crypto");
    const { IDEAS, regions } = await import("../painting-ideas");
    const { MOTIFS } = await import("../../parts/art/kit");
    const { isStoredPicture } = await import("../../painting");
    // A changed shape needs a new template version and a retained version-one renderer.
    assert.equal(
        createHash("sha256")
            .update(JSON.stringify({ ideas: IDEAS, motifs: MOTIFS }))
            .digest("hex"),
        "219269eb701bec924c9666c13a338b0494bdab8b5822386bab2f766765e20b2b",
    );
    for (const idea of IDEAS) {
        assert.ok(
            isStoredPicture({
                version: 1,
                id: "test",
                title: idea.name,
                painting: { k: "painting", paper: "plain", w: 30, h: 20, marks: [] },
                activity: "colour",
                idea: idea.id,
                fills: Object.fromEntries(regions(idea).map((region) => [region.id, "#123abc"])),
                step: 0,
                guides: true,
            }),
        );
    }
});
