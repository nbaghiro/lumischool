// Which language lessons each phrasebook can fill, written to .docs/language-coverage.md as a table
// and printed. A lesson is offered in a language only when its phrasebook has every phrase the lesson
// names, and its own version of any part written per language (.docs/notation.md, "Phrasebooks").
//
//   node --import ./tools/scripts/resolve.ts tools/scripts/language-coverage.ts

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGES } from "../../engine/answer";
import type { Coverage } from "../../engine/notation/languages";
import { Workspace } from "../../engine/notation/notation";
import { curriculum } from "../pack";

const OUT = join(import.meta.dirname, "..", "..", ".docs", "language-coverage.md");

/** How many missing phrases a table cell names before it only counts the rest. */
const SHOWN = 4;

/** The coverage of every language lesson as a Markdown table, a column per language. */
export function coverageTable(coverage: readonly Coverage[], languages: readonly string[]): string {
    const lessons = [...new Set(coverage.map((c) => c.lesson))].sort();
    const cell = (lesson: string, language: string): string => {
        const c = coverage.find((x) => x.lesson === lesson && x.language === language);
        if (!c) return "no phrasebook";
        if (!c.missing.length) return "offered";
        const named = c.missing.slice(0, SHOWN).join(", ");
        return c.missing.length > SHOWN ? `${named} and ${c.missing.length - SHOWN} more` : named;
    };
    return [
        `| Lesson | ${languages.join(" | ")} |`,
        `|---|${languages.map(() => "---").join("|")}|`,
        ...lessons.map((l) => `| ${l} | ${languages.map((g) => cell(l, g)).join(" | ")} |`),
    ].join("\n");
}

if (import.meta.main) {
    const ws = new Workspace(curriculum(), { verify: "when read" });
    const table = coverageTable(ws.coverage, LANGUAGES);
    const offered = LANGUAGES.map(
        (g) =>
            `${g}: ${ws.coverage.filter((c) => c.language === g && !c.missing.length).length} of ${new Set(ws.coverage.map((c) => c.lesson)).size}`,
    );
    writeFileSync(
        OUT,
        [
            "# Language lessons by language",
            "",
            "Written by `tools/scripts/language-coverage.ts` from the phrasebooks in `content/curriculum/languages/`; do not edit it by hand. A cell is `offered` when the language's phrasebook has every phrase the lesson names and its own version of any part written per language, `no phrasebook` when the language has none yet, and otherwise the keys it lacks.",
            "",
            table,
            "",
        ].join("\n"),
    );
    process.stdout.write(`Language lessons offered: ${offered.join("; ")}. Table in ${OUT}.\n`);
}
