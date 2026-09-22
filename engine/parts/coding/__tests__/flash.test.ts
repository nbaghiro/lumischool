import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { parse } from "../../../coding";
import { drawn, letteringIn } from "../../__tests__/check";
import { blocks } from "../blocks";
import { kindOfLine } from "../listing";
import { program } from "../program";

const CONTENT = new URL("../../../../content/curriculum/", import.meta.url);

/** Every line the lamp world's lessons and items write for a program: each quoted flash, and the waits between. */
function lampLines(): string[] {
    const lines = new Set<string>();
    for (const dir of ["lessons", "items"]) {
        for (const f of readdirSync(new URL(`${dir}/`, CONTENT))) {
            const text = readFileSync(new URL(`${dir}/${f}`, CONTENT), "utf8");
            if (!/"flash (long|short)"/.test(text)) continue;
            for (const [, s] of text.matchAll(/"((?:flash|wait)[^"{}]*)"/g)) if (s) lines.add(s);
        }
    }
    return [...lines].sort();
}

test("the lamp world's programs read without a problem and draw every line", () => {
    const lines = lampLines();
    assert.ok(lines.includes("flash long") && lines.includes("flash short"), lines.join(", "));
    for (const line of lines)
        assert.deepEqual(
            parse([line]).problems.map((p) => p.message),
            [],
            line,
        );
    const code = [...lines, "repeat 2", ...lines.map((l) => `  ${l}`)];
    assert.deepEqual(parse(code).problems, []);
    for (const paper of [false, true]) {
        const listed = letteringIn(
            drawn(program, { ...program.params, code, title: "Lamp 1" }, { paper }).marks,
        ).map((l) => l.s);
        const blocked = letteringIn(
            drawn(blocks, { ...blocks.params, code, words: true }, { paper }).marks,
        ).map((l) => l.s);
        for (const line of lines) {
            assert.ok(
                listed.some((s) => s.includes(line)),
                `the listing writes "${line}" on ${paper ? "paper" : "screen"}`,
            );
            assert.ok(
                blocked.some((s) => s.includes(line.split(" ")[0] ?? line)),
                `the blocks write "${line}" on ${paper ? "paper" : "screen"}`,
            );
        }
    }
    assert.equal(kindOfLine("flash long"), "sound");
});
