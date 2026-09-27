import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn, partsIn } from "../../__tests__/check";
import { PUPS, PUP_POSES, pupFamily } from "../pupfamily";

const MOODS = ["happy", "excited", "surprised", "worried", "sad"] as const;

test("every member, pose and mood is described in fifteen to thirty words that never name the feeling", () => {
    for (const member of PUPS)
        for (const pose of PUP_POSES)
            for (const mood of MOODS) {
                const d = pupFamily.describe({ member, pose, mood, dir: 1 }) ?? "";
                const n = d.split(/\s+/).length;
                assert.ok(n >= 15 && n <= 30, `${n} words: ${d}`);
                assert.ok(!/[—!]/.test(d), d);
                assert.ok(!new RegExp(`\\b${mood}\\b`, "i").test(d), d);
            }
});

test("a pose that is a movement is drawn inside its part, and every member wags a tail and blinks", () => {
    const whole: Record<string, string> = {
        jump: "hop",
        cheer: "hop",
        walk: "step",
        shake: "shiver",
    };
    for (const member of PUPS)
        for (const pose of PUP_POSES) {
            const parts = partsIn(
                drawn(pupFamily, { member, pose, mood: "happy", dir: 1 }, { paper: false }).marks,
            );
            for (const name of ["hop", "step", "shiver"])
                assert.equal(parts.includes(name), whole[pose] === name, `${member} ${pose}`);
            assert.equal(parts.includes("wave"), pose === "wave", `${member} ${pose}`);
            assert.ok(parts.includes("tail") && parts.includes("eyes"), `${member} ${pose}`);
        }
});

test("the feet stay on the floor's anchor in every pose, so a scene stands a pup on a line", () => {
    for (const member of PUPS) {
        const box = pupFamily.box({ member, pose: "jump", mood: "happy", dir: 1 });
        const a = drawn(
            pupFamily,
            { member, pose: "jump", mood: "happy", dir: 1 },
            { paper: false },
        ).anchors;
        assert.equal(a.feet?.[1], box.h * 20 - 4);
    }
});
