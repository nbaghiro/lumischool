import assert from "node:assert/strict";
import { test } from "node:test";
import { HAIR_COLOURS, MARKERS } from "../../../paper";
import { drawn, partsIn } from "../../__tests__/check";
import { MOODS } from "../../speech";
import { AGES, AIDS, HAIRS, HEARING, POSES, WEAR } from "../figure";
import { person } from "../person";

const clean = (s: string, where: string): void => {
    assert.ok(!s.includes("—"), `${where} has an em-dash: ${s}`);
    assert.ok(!s.includes("!"), `${where} has an exclamation mark: ${s}`);
};

test("a person's box is whole squares and fits a page, in every pose, age and aid", () => {
    for (const pose of POSES)
        for (const age of AGES)
            for (const aid of AIDS) {
                const b = person.box({ ...person.params, pose, age, aid });
                for (const side of ["w", "h"] as const) {
                    const n = b[side];
                    assert.ok(
                        Number.isInteger(n) && n > 0,
                        `${pose} ${age} ${aid}: ${side} is ${n}`,
                    );
                }
                assert.ok(b.w <= 8 && b.h <= 8, `${pose} ${age} ${aid} is ${b.w} by ${b.h}`);
            }
});

test("every look is one of the declared settings, so a lesson can choose it by name", () => {
    const of = (name: keyof typeof person.settings): unknown => {
        const s = person.settings[name];
        return "of" in s ? s.of : undefined;
    };
    assert.deepEqual(of("pose"), POSES);
    assert.deepEqual(of("age"), AGES);
    assert.deepEqual(of("hair"), HAIRS);
    assert.deepEqual(of("colour"), HAIR_COLOURS);
    assert.deepEqual(of("aid"), AIDS);
    assert.deepEqual(of("hearing"), HEARING);
    assert.deepEqual(of("wear"), WEAR);
    assert.deepEqual(of("top"), MARKERS);
    assert.deepEqual(of("mood"), MOODS);
});

test("a person's description says what is seen and never names the feeling", () => {
    for (const mood of MOODS)
        for (const hair of HAIRS)
            for (const aid of AIDS) {
                const colour = HAIR_COLOURS[HAIRS.indexOf(hair) % HAIR_COLOURS.length] ?? "brown";
                const d = person.describe({ ...person.params, mood, hair, aid, colour }) ?? "";
                clean(d, `${mood} ${hair} ${aid}`);
                assert.ok(
                    !new RegExp(`\\b${mood}\\b`, "i").test(d),
                    `the description names the feeling "${mood}": ${d}`,
                );
                assert.ok(d.split(/\s+/).length <= 30, `too long to say before the question: ${d}`);
            }
    assert.match(person.describe({ ...person.params, aid: "wheelchair" }) ?? "", /in a wheelchair/);
    assert.match(
        person.describe({ ...person.params, pose: "hold", holding: "apple" }) ?? "",
        /holding an apple/,
    );
});

test("the eyes are a part in every mood that shows them, and a wave is one on the waving arm", () => {
    for (const take of person.takes) {
        const parts = partsIn(drawn(person, take.params, { paper: false }).marks);
        const eyes = take.params.mood !== "tired" && take.params.mood !== "excited";
        assert.equal(parts.includes("eyes"), eyes, `${take.label}: ${parts.join(", ")}`);
        assert.equal(parts.includes("wave"), take.params.pose === "wave", take.label);
    }
});
