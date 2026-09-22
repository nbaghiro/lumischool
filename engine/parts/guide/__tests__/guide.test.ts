import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn, everyMark } from "../../__tests__/check";
import { DEFAULTS } from "../../drawing";
import { POSES, type GuideDrawing } from "../design";
import { firefly } from "../firefly";
import { guideBird } from "../guide.bird";
import { guideDot } from "../guide.dot";
import { guideGlow } from "../guide.glow";
import { guideHand } from "../guide.hand";
import { guideSnail } from "../guide.snail";
import { guideStub } from "../guide.stub";

const GUIDES: GuideDrawing[] = [guideGlow, guideHand, guideStub, guideBird, guideSnail, guideDot];

/** The layers the guide family's motion picks, by class, and the blink's shut frame beside its open one. */
const PICKED = new Set([
    ...Object.values(DEFAULTS.guide.thing.parts ?? {}).map((p) => p.pick?.slice(1) ?? ""),
    "g-shut",
]);

test("every design draws every pose with a hand and a head to attach to, on screen and on paper", () => {
    for (const d of [...GUIDES, { ...guideDot, design: firefly, id: "guide.firefly (design)" }]) {
        for (const pose of POSES) {
            for (const paper of [false, true]) {
                const { anchors } = drawn(d, { pose, aim: undefined }, { paper });
                for (const name of ["hand", "head"])
                    assert.ok(anchors[name], `${d.id} ${pose}${paper ? " on paper" : ""}: ${name}`);
            }
        }
    }
});

test("a design tags only the layers the guide family's motion picks, so the player moves what it drew", () => {
    for (const d of GUIDES) {
        for (const pose of POSES) {
            const { marks } = drawn(d, { pose, aim: undefined }, { paper: false });
            for (const { mark } of everyMark(marks)) {
                if (mark.kind !== "group" || mark.o.layer === undefined) continue;
                assert.ok(PICKED.has(mark.o.layer), `${d.id} ${pose} tags "${mark.o.layer}"`);
            }
        }
    }
});

test("a design's motions are layers it draws in some pose, and it declares no motion of its own", () => {
    for (const d of GUIDES) {
        assert.equal(d.motion, undefined, d.id);
        const tagged = new Set<string>();
        for (const pose of POSES) {
            for (const { mark } of everyMark(
                drawn(d, { pose, aim: undefined }, { paper: false }).marks,
            ))
                if (mark.kind === "group" && mark.o.layer !== undefined) tagged.add(mark.o.layer);
        }
        for (const m of d.design.motions)
            assert.ok(tagged.has(`g-${m === "blink" ? "open" : m}`), `${d.id} says it can ${m}`);
    }
});
