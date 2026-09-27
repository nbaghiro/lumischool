import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChosenWorlds } from "../../../school/family/chosen";
import { termsFor } from "../../../school/worlds/choice";
import { yearOf } from "../../../school/worlds/worlds";
import { choiceFor } from "../worlds";

const NONE: ChosenWorlds = { terms: {}, tweaks: {}, begun: {}, kept: [] };

const read = (worlds: Partial<ChosenWorlds> = {}, grades: number[] = [1]) => ({
    worlds: { ...NONE, ...worlds },
    years: grades.map((grade) => ({
        grade,
        progress: { done: {}, current: "", week: 1, unlocked: [] },
    })),
});

const rosie = { id: "kid", name: "Rosie", grade: 1 };

describe("a child's worlds as the grown-ups' pages read them", () => {
    it("reads a family that never chose as every year in its own worlds", () => {
        const choice = choiceFor(rosie, read());
        for (const grade of [1, 2, 3, 4])
            assert.deepEqual(termsFor(choice, grade), yearOf(grade), `grade ${grade}`);
    });

    it("reads each term as the fold left it, a term it leaves alone in its own world", () => {
        const choice = choiceFor(
            rosie,
            read({
                terms: {
                    "1": [null, "winter-fair", null],
                    "2": ["woods", "kitchen", "valley-farm"],
                },
            }),
        );
        assert.deepEqual(termsFor(choice, 1), ["meadow", "winter-fair", "railway"]);
        assert.deepEqual(termsFor(choice, 2), ["woods", "kitchen", "valley-farm"]);
    });
});
