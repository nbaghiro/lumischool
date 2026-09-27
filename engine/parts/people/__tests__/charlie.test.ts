import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn, partsIn } from "../../__tests__/check";
import { MOODS } from "../../speech";
import { CHARLIE_HAIRS, charlie, type CharlieParams } from "../charlie";
import { CLOTH, FEET, PATTERNS, POSES, PRINTS, SLEEVES, WEAR } from "../figure";

const words = (s: string) => s.split(/\s+/).length;

test("Charlie's box is whole squares and fits a page in every pose", () => {
    for (const pose of POSES) {
        const b = charlie.box({ ...charlie.params, pose });
        assert.ok(Number.isInteger(b.w) && Number.isInteger(b.h), `${pose}: ${b.w} by ${b.h}`);
        assert.ok(b.w <= 6 && b.h <= 6, `${pose} is ${b.w} by ${b.h}`);
    }
});

test("every outfit is described in fifteen to thirty words that never name a feeling", () => {
    for (const pose of POSES)
        for (const mood of MOODS)
            for (const hair of CHARLIE_HAIRS)
                for (const wear of WEAR)
                    for (const pattern of PATTERNS)
                        for (const sleeves of SLEEVES)
                            for (const feet of FEET) {
                                const p: CharlieParams = {
                                    ...charlie.params,
                                    pose,
                                    mood,
                                    hair,
                                    wear,
                                    pattern,
                                    sleeves,
                                    feet,
                                    print: PRINTS[words(pose) % PRINTS.length] ?? "none",
                                    top: CLOTH[MOODS.indexOf(mood) % CLOTH.length] ?? "white",
                                    holding: pose === "hold" ? "umbrella" : "",
                                };
                                const d = charlie.describe(p) ?? "";
                                const n = words(d);
                                assert.ok(n >= 15 && n <= 30, `${n} words: ${d}`);
                                assert.ok(!/[—!]/.test(d), d);
                                assert.ok(!new RegExp(`\\b${mood}\\b`, "i").test(d), d);
                            }
});

test("a pose that is a movement is drawn inside the part that moves it, and only then", () => {
    const whole: Record<string, string> = {
        cheer: "hop",
        jump: "hop",
        balance: "wobble",
        walk: "step",
        run: "step",
    };
    for (const pose of POSES) {
        const parts = partsIn(drawn(charlie, { ...charlie.params, pose }, { paper: false }).marks);
        for (const name of ["hop", "wobble", "step"])
            assert.equal(
                parts.includes(name),
                whole[pose] === name,
                `${pose}: ${parts.join(", ")}`,
            );
    }
});

test("loose hair and a skirt swing as parts of their own, and a bun does not", () => {
    const parts = (p: Partial<CharlieParams>) =>
        partsIn(drawn(charlie, { ...charlie.params, ...p }, { paper: false }).marks);
    assert.ok(parts({}).includes("hair"));
    assert.ok(parts({}).includes("skirt"));
    assert.ok(parts({ hair: "ponytail" }).includes("hair"));
    assert.ok(!parts({ hair: "bun" }).includes("hair"));
    assert.ok(!parts({ wear: "shorts" }).includes("skirt"));
});

test("her feet stay on the floor's anchor when she jumps, so a scene can stand her on a line", () => {
    const stand = drawn(charlie, { ...charlie.params, pose: "stand" }, { paper: false }).anchors;
    const jump = drawn(charlie, { ...charlie.params, pose: "jump" }, { paper: false }).anchors;
    assert.deepEqual(jump.feet, stand.feet);
    assert.ok((jump.head?.[1] ?? 0) < (stand.head?.[1] ?? 0), "the head goes up in a jump");
});
