import assert from "node:assert/strict";
import { test } from "node:test";
import { rigid, type Animation } from "../../motion/animation";
import {
    DEFAULTS,
    STILL,
    defineDrawing,
    kindOf,
    motionOf,
    type Drawing,
    type Family,
} from "../drawing";

const square = (
    o: {
        family?: Family;
        group?: Drawing<{ n: number }>["group"];
        motion?: Animation;
        reads?: true;
    } = {},
): Drawing<{ n: number }> =>
    defineDrawing({
        id: "square",
        family: o.family ?? "animals",
        title: "Square",
        group: o.group ?? "Props",
        about: "One square, for the rules a drawing's motion follows.",
        params: { n: 1 },
        settings: { n: { kind: "whole", min: 1, max: 3 } },
        takes: [
            { label: "One", params: { n: 1 } },
            { label: "Three", params: { n: 3 } },
        ],
        box: (p) => ({ w: p.n, h: 1 }),
        draw: (c, p) => {
            c.pen.rect(c.g, 0, 0, p.n * 20, 20, "ruler");
            return {};
        },
        describe: () =>
            "A row of plain squares drawn in ink along one line of the squared paper, each one square wide and one square tall.",
        ...(o.motion === undefined ? {} : { motion: o.motion }),
        ...(o.reads === undefined ? {} : { reads: o.reads }),
    });

test("a drawing that declares nothing moves as its family's things do, or as its paper does", () => {
    assert.deepEqual(motionOf(square()), {
        anim: DEFAULTS.animals.thing,
        from: "family",
        reads: false,
        still: null,
    });
    assert.deepEqual(motionOf(square({ group: "Structures" })).anim, DEFAULTS.animals.paper);
    assert.equal(motionOf(square({ family: "apps" })).still, STILL.control);
    assert.equal(motionOf(square({ family: "places", group: "Marks" })).still, STILL.building);
});

test("a place a child writes or taps holds still, whatever its family", () => {
    for (const family of ["animals", "counting", "music"] as const) {
        assert.equal(motionOf(square({ family, group: "Inputs" })).still, STILL.input);
    }
});

test("paper on a maths shelf carries a reading, so it only travels or is still", () => {
    const counted = motionOf(square({ family: "counting", group: "Structures" }));
    assert.equal(counted.reads, true);
    assert.deepEqual(counted.anim, rigid(DEFAULTS.counting.paper));
    const measured = motionOf(square({ family: "measuring", group: "Structures" }));
    assert.deepEqual([measured.reads, measured.still], [true, STILL.instrument]);
    assert.equal(
        motionOf(square({ family: "counting" })).reads,
        false,
        "a counting thing is not a reading",
    );
});

test("a drawing's own declaration stands in for its family's, and one that reads keeps only its travel", () => {
    const float: Animation = {
        body: { is: "float", lift: 0.04, deg: 3 },
        parts: { wing: { is: "flap" } },
    };
    const own = motionOf(square({ motion: float }));
    assert.deepEqual([own.from, own.anim, own.still], ["drawing", float, null]);
    const reads = motionOf(square({ motion: float, reads: true }));
    assert.deepEqual([reads.from, reads.reads, reads.anim], ["drawing", true, rigid(float)]);
    assert.deepEqual(
        Object.keys(reads.anim.parts ?? {}),
        [],
        "a part not marked free may be the reading",
    );
});

test("a drawing's kind is read off its group", () => {
    assert.equal(kindOf("Inputs"), "input");
    assert.equal(kindOf("Structures"), "paper");
    assert.equal(kindOf("Marks"), "paper");
    assert.equal(kindOf("Characters"), "thing");
    assert.equal(kindOf(undefined), "thing");
});
