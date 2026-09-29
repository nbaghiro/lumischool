import assert from "node:assert/strict";
import { test } from "node:test";
import { parse, run, textOf, world } from "../../../coding";
import { drawn, letteringIn } from "../../__tests__/check";
import { blocks } from "../blocks";
import { program } from "../program";

const PROGRAMS = [
    [
        "set t to 84",
        "repeat until t is less than 25",
        "  set gap to t - 20",
        "  take gap / 2 from t",
    ],
    [
        "define tree size",
        "  forward size",
        "  if size is more than 1",
        "    turn left",
        "    tree size / 2",
        "    turn around",
        "    tree size / 2",
        "    turn left",
        "  back size",
        "tree 4",
    ],
    [
        "set temp to -12",
        "if temp is less than 0",
        "  if temp is less than -10",
        "    say stay in",
        "  otherwise",
        "    say go",
        "otherwise",
        "  say go",
    ],
];

test("a program printed as text is the blocks' own words, two spaces a level, and runs the same", () => {
    const open = world({ cols: 99, rows: 99, start: { col: 50, row: 50 } });
    for (const code of PROGRAMS) {
        const messy = code.map((l) =>
            l
                .replace(/^((?: {2})*)/, (lead) => "\t".repeat(lead.length / 2))
                .replace(/ to /, "  to "),
        );
        const text = textOf(messy);
        assert.deepEqual(text, code, "text is two spaces a level and one space between words");
        assert.deepEqual(parse(text).problems, []);
        const a = run(parse(messy), open),
            b = run(parse(text), open);
        assert.deepEqual(
            b.frames.map((f) => [f.line, f.kind]),
            a.frames.map((f) => [f.line, f.kind]),
            "the text runs line for line as the program it prints",
        );
    }
});

test("the same program prints as blocks or as text, with the same words in the same order", () => {
    for (const code of PROGRAMS) {
        for (const paper of [false, true]) {
            const typed = letteringIn(
                drawn(program, { ...program.params, code, text: true }, { paper }).marks,
            ).map((l) => l.s);
            for (const line of textOf(code))
                assert.ok(
                    typed.includes(line.trim()),
                    `the text writes "${line.trim()}" on ${paper ? "paper" : "screen"}`,
                );
            const built = letteringIn(
                drawn(blocks, { ...blocks.params, code, words: true }, { paper }).marks,
            )
                .map((l) => l.s)
                .join(" ");
            for (const line of code)
                assert.ok(
                    built.includes(line.trim().split(" ")[0] ?? ""),
                    `the blocks write "${line.trim()}" on ${paper ? "paper" : "screen"}`,
                );
        }
    }
});

test("text is set in by its depth alone, where the listing adds chips and brackets", () => {
    const code = PROGRAMS[2] ?? [];
    const at = (text: boolean) =>
        letteringIn(drawn(program, { ...program.params, code, text }, { paper: true }).marks);
    const typed = at(true).filter((l) => /[a-z]/.test(l.s));
    const x = (s: string) => typed.find((l) => l.s === s)?.x ?? NaN;
    assert.equal(x("if temp is less than 0") - x("set temp to -12"), 0);
    assert.ok(Math.abs(x("if temp is less than -10") - x("if temp is less than 0") - 20) < 0.5);
    assert.ok(Math.abs(x("say stay in") - x("if temp is less than 0") - 40) < 0.5);
    const shapes = (text: boolean) =>
        drawn(program, { ...program.params, code, text }, { paper: true }).marks.length;
    assert.ok(shapes(true) < shapes(false), "no chip or bracket is drawn for text");
});
