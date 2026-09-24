import { test } from "node:test";
import assert from "node:assert/strict";
import { isPicture, isPainting, type Picture } from "../painting";

const picture: Picture = {
    version: 1,
    id: "picture-one",
    title: "A butterfly",
    activity: "colour",
    idea: "butterfly",
    fills: { "0-0": "#123abc" },
    step: 0,
    guides: true,
    painting: {
        k: "painting",
        paper: "plain",
        w: 30,
        h: 20,
        marks: [
            {
                k: "stroke",
                brush: "marker",
                paint: [{ pigment: "blue", parts: 1 }],
                size: 1,
                mirror: "none",
                points: [1, 2, 0.5, 3, 4, 0.5],
            },
        ],
    },
};
test("versioned pictures preserve template fills and marks through serialization", () => {
    const restored: unknown = JSON.parse(JSON.stringify(picture));
    assert.ok(isPicture(restored, ["butterfly"]));
    assert.deepEqual(restored, picture);
});
test("unrecognized document versions, templates and malformed fill colours are rejected", () => {
    for (const change of [
        { version: 2 },
        { idea: "missing" },
        { fills: { x: "url(example)" } },
        { step: -1 },
        { title: "x".repeat(71) },
    ])
        assert.equal(isPicture({ ...picture, ...change }, ["butterfly"]), false);
});
test("invalid and oversized paint operations are rejected before rendering", () => {
    for (const marks of [
        [
            {
                k: "stamp",
                stamp: "leaf",
                paint: [],
                size: NaN,
                mirror: "none",
                x: 1,
                y: 1,
                flip: false,
            },
        ],
        [{ ...picture.painting.marks[0], points: [1, 2] }],
        [{ ...picture.painting.marks[0], points: [Infinity, 2, 0.5] }],
        [{ ...picture.painting.marks[0], points: Array(300003).fill(1) }],
    ])
        assert.equal(isPainting({ ...picture.painting, marks }), false);
});

test("stored pictures reject unknown materials, regions and oversized serialized documents", async () => {
    const { isStoredPicture, PICTURE_BYTES } = await import("../painting");
    assert.ok(isStoredPicture(picture));
    assert.equal(isStoredPicture({ ...picture, template_version: 2 }), false);
    assert.equal(isStoredPicture({ ...picture, fills: { "0-99": "#123abc" } }), false);
    assert.equal(
        isStoredPicture({
            ...picture,
            painting: {
                ...picture.painting,
                marks: [
                    {
                        k: "stamp",
                        stamp: "missing",
                        paint: [],
                        size: 2,
                        x: 2,
                        y: 2,
                        mirror: "none",
                        flip: false,
                    },
                ],
            },
        }),
        false,
    );
    const large = {
        ...picture,
        painting: {
            ...picture.painting,
            marks: [
                {
                    k: "stroke",
                    brush: "marker",
                    paint: [],
                    size: 1,
                    mirror: "none",
                    points: Array.from({ length: 180000 }, () => 1.123456789),
                },
            ],
        },
    };
    assert.ok(new TextEncoder().encode(JSON.stringify(large)).length > PICTURE_BYTES);
    assert.equal(isStoredPicture(large), false);
});
