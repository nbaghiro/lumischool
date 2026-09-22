import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChosenWorlds } from "../../../school/family/chosen";
import { termsFor } from "../../../school/worlds/choice";
import { yearOf } from "../../../school/worlds/worlds";
import { choiceFor, chooseWorlds, openChoices, termsToChoose } from "../worlds";

const NONE: ChosenWorlds = { terms: {}, tweaks: {}, begun: {}, kept: [] };

const read = (worlds: Partial<ChosenWorlds> = {}, grades: number[] = [1]) => ({
    worlds: { ...NONE, ...worlds },
    years: grades.map((grade) => ({
        grade,
        progress: { done: {}, current: "", week: 1, unlocked: [] },
    })),
});

const rosie = { id: "kid", name: "Rosie", grade: 1 };
const writing = {
    newId: () => "00000000-0000-4000-8000-000000000009",
    at: "2026-09-18T09:00:00.000Z",
};

describe("a child's worlds as the grown-ups' pages read and change them", () => {
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

    it("offers the terms a world was made for from the child's own year on, and none in the fourth year", () => {
        const terms = termsToChoose(rosie, read({ begun: { "1.1": "2026-08-31" } }));
        assert.deepEqual(
            terms.map((t) => [`${t.grade}.${t.term}`, t.options.map((o) => o.id), t.since]),
            [
                ["1.1", ["meadow", "valley-farm"], "2026-08-31"],
                ["1.2", ["harbour", "winter-fair"], null],
                ["2.2", ["kitchen", "winter-fair"], null],
                ["2.3", ["town", "valley-farm"], null],
                ["3.2", ["sports-ground", "winter-fair"], null],
            ],
        );
        assert.deepEqual(termsToChoose({ name: "Ivy", grade: 4 }, read({}, [4])), []);
        assert.deepEqual(
            termsToChoose({ name: "Leo", grade: 3 }, read({}, [3])).map((t) => t.term),
            [2],
        );
    });

    it("lists for a choice only the terms with no work yet in the child's grade and the next", () => {
        const terms = openChoices(rosie, read({ begun: { "1.1": "2026-08-31" } }));
        assert.deepEqual(
            terms.map((t) => `${t.grade}.${t.term}`),
            ["1.2", "2.2", "2.3"],
        );
        assert.deepEqual(
            openChoices({ name: "Leo", grade: 3 }, read({}, [3])).map(
                (t) => `${t.grade}.${t.term}`,
            ),
            ["3.2"],
        );
    });

    it("writes the whole choice again with the picked term in its new world and the tweaks as the latest choice left them", () => {
        const r = read({
            terms: { "1": ["valley-farm", null, null] },
            tweaks: { meadow: { weather: "breezy" } },
            begun: { "1.1": "2026-08-31" },
        });
        const draft = chooseWorlds(writing, rosie, r, new Map([["2.3", "valley-farm"]]));
        assert.deepEqual(draft, {
            id: writing.newId(),
            kid_id: "kid",
            kind: "world-chosen",
            at: writing.at,
            data: {
                terms: {
                    "1": ["valley-farm", "harbour", "railway"],
                    "2": ["woods", "kitchen", "valley-farm"],
                },
                tweaks: { meadow: { weather: "breezy" } },
            },
        });
    });

    it("writes nothing for a term with work in it, or for a pick that is the world already there", () => {
        const r = read({ begun: { "1.2": "2026-11-02" } });
        assert.equal(chooseWorlds(writing, rosie, r, new Map([["1.2", "winter-fair"]])), null);
        assert.equal(chooseWorlds(writing, rosie, r, new Map([["2.2", "kitchen"]])), null);
    });

    it("puts a term back in its own world by leaving it out of what is written", () => {
        const r = read({ terms: { "2": [null, "winter-fair", null] } });
        const draft = chooseWorlds(writing, rosie, r, new Map([["2.2", "kitchen"]]));
        assert.deepEqual(draft?.data, { terms: {}, tweaks: {} });
    });
});
