// Fails when a world's journey is short or empty at a grade it offers, under any setting a family can
// choose: each language or none for the child, each nation or none for the family
// (.docs/world-journeys.md).

import { LANGUAGES, NATIONS } from "../../engine/answer";
import { factsOf } from "../../engine/pack";
import { journeyProblems } from "../../school/worlds/journeys";
import { corpusFrom } from "../../school/worlds/lessons";
import { curriculumLessons } from "../pack";

const facts = curriculumLessons().map((l) => factsOf(l, "", null));
const problems = new Set<string>();
for (const language of [null, ...LANGUAGES])
    for (const nation of [null, ...NATIONS]) {
        const setting = { language, nation };
        const corpus = corpusFrom(facts, "2026-09-01", setting);
        const named = `language ${language ?? "none"}, nation ${nation ?? "none"}`;
        for (const p of journeyProblems(corpus)) problems.add(`${p} (${named})`);
    }
if (problems.size) {
    process.stderr.write(`${[...problems].join("\n")}\n${problems.size} journey problem(s)\n`);
    process.exit(1);
}
process.stdout.write("every world's journey holds its grades under every setting\n");
