// The worlds of the run against the whole curriculum as the pack's index holds it: every world has a
// landmark that a lesson of its own term lights, and every lesson lands in its unit's term
// (.docs/grades-5-6.md, "Tests").
import assert from "node:assert/strict";
import { before, test } from "node:test";
import { factsOf, type LessonFacts } from "../../engine/pack";
import { topicsOf } from "../../school/worlds/lessons";
import { reachOf } from "../../school/worlds/rewards";
import { termOf } from "../../school/worlds/roll";
import { DEFAULT_YEARS, offeredGrades, worldById } from "../../school/worlds/worlds";
import { yearOf } from "../../school/year";
import { compileLessons } from "../pack";

let facts: LessonFacts[] = [];

before(() => {
    facts = compileLessons().map((l) => factsOf(l, "", null));
});

test("every world of the run has a reach that a lesson of its own term lights, the term read from the lesson's own unit", () => {
    const byId = new Map(facts.map((f) => [f.id, f]));
    const dark: string[] = [];
    const grades = offeredGrades(facts);
    assert.deepEqual(grades, [1, 2, 3, 4, 5, 6], "every grade of the run is checked");
    for (const grade of grades) {
        const year = yearOf(facts, grade, "", "2026-08-31");
        (DEFAULT_YEARS[grade] ?? []).forEach((id, i) => {
            const world = worldById(id);
            const lit = year.lessons.some((l) => {
                const f = byId.get(l.id);
                return termOf(year, l.unit) === i + 1 && !!f && !!reachOf(world, topicsOf(f));
            });
            if (!lit) dark.push(`${id}, grade ${grade} term ${i + 1}`);
        });
    }
    assert.deepEqual(dark, [], "no lesson of its own term lights any of these worlds' landmarks");
});

test("every lesson of the curriculum lands in the term its own unit names", () => {
    const off: string[] = [];
    for (const grade of offeredGrades(facts)) {
        const year = yearOf(facts, grade, "", "2026-08-31");
        const units = year.units.map((u) => u.n);
        const termOfUnit = (n: number) =>
            Math.floor(Math.max(0, units.filter((u) => u <= n).length - 1) / 3) + 1;
        for (const f of facts.filter((x) => x.grade === grade && x.unit !== null)) {
            const l = year.lessons.find((x) => x.id === f.id);
            const own = termOfUnit(f.unit ?? 1);
            if (!l || termOf(year, l.unit) !== own) off.push(`${f.id}, grade ${grade} term ${own}`);
        }
    }
    assert.deepEqual(off, [], "these lessons land outside the term their unit names");
});

test("every lesson of grades five and six lights a landmark of its own term's world", () => {
    const dark: string[] = [];
    for (const grade of [5, 6]) {
        const year = yearOf(facts, grade, "", "2026-08-31");
        for (const f of facts.filter((x) => x.grade === grade)) {
            const l = year.lessons.find((x) => x.id === f.id);
            const world = DEFAULT_YEARS[grade]?.[termOf(year, l?.unit ?? 1) - 1];
            if (!world || !reachOf(worldById(world), topicsOf(f))) dark.push(`${f.id} in ${world}`);
        }
    }
    assert.deepEqual(dark, [], "these lessons light nothing in their term's world");
});
