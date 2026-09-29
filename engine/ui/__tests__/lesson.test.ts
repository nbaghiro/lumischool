import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PAGE_SIZES, PRINT_MARGIN_MM, SCENE_COLS, SQUARE_MM } from "../../paper";

/** The body of the stylesheet's `@media print` block, comments taken out. */
function printBlock(css: string): string {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const at = bare.indexOf("@media print");
    assert.ok(at >= 0, "lesson.css has a print block");
    const open = bare.indexOf("{", at);
    let depth = 0;
    for (let i = open; i < bare.length; i++) {
        if (bare[i] === "{") depth++;
        else if (bare[i] === "}" && --depth === 0) return bare.slice(open + 1, i);
    }
    throw new Error("the print block is not closed");
}

/** The declarations of the rule whose selector list includes `selector`. */
function declarations(block: string, selector: string): Record<string, string> {
    for (const [, selectors = "", body = ""] of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!selectors.split(",").some((s) => s.replace(/\s+/g, " ").trim() === selector)) continue;
        const set: Record<string, string> = {};
        for (const [, name = "", value = ""] of body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g))
            set[name] = value.trim();
        return set;
    }
    throw new Error(`the print block has no rule for ${selector}`);
}

/** A length written in squares, `var(--sq)` or `calc(n * var(--sq))`, as a number of squares. */
function squares(value: string | undefined): number {
    if (value === "0") return 0;
    if (value === "var(--sq)") return 1;
    const n = /^calc\(([\d.]+) \* var\(--sq\)\)$/.exec(value ?? "")?.[1];
    if (n === undefined) throw new Error(`${value} is not a length in squares`);
    return Number(n);
}

const block = printBlock(readFileSync(new URL("../lesson.css", import.meta.url), "utf8"));

test("a printed sheet's square is the paper's square", () => {
    assert.equal(declarations(block, ".ls-sheet")["--sq"], `${SQUARE_MM}mm`);
});

test("the widest scene and its question's number fit inside the printer's margins at full size", () => {
    const sheet = declarations(block, ".ls-sheet");
    assert.equal(sheet.padding, "0", "the printer's margin is the sheet's margin");
    const section = declarations(block, ".ls-sheet .ls-sec");
    assert.equal(section.padding?.split(" ")[1] ?? "0", "0", "a section has no margin of its own");
    const number = squares(declarations(block, ".ls-sheet .ls-q")["padding-left"]);
    for (const [name, paper] of Object.entries(PAGE_SIZES)) {
        if (name !== "A4" && name !== "Letter") continue;
        const across = Math.floor((paper.w - 2 * PRINT_MARGIN_MM) / SQUARE_MM);
        assert.ok(
            number + SCENE_COLS <= across,
            `${name} has ${across} squares across, and a question takes ${number + SCENE_COLS}`,
        );
    }
});

test("a printed page is a whole number of rows deep, so a sheet that runs on stays on the squares", () => {
    const margin = declarations(block, "@page lesson").margin?.split(" ") ?? [];
    const [top = "", side = top] = margin;
    const mm = (v: string): number => Number(/^([\d.]+)mm$/.exec(v)?.[1] ?? NaN);
    assert.equal(
        mm(side),
        PRINT_MARGIN_MM,
        "the sides keep the margin the widest scene is held to",
    );
    for (const [name, paper] of Object.entries(PAGE_SIZES)) {
        if (name !== "A4") continue;
        const rows = (paper.h - 2 * mm(top)) / SQUARE_MM;
        assert.equal(rows, Math.round(rows), `${name} is ${rows} rows deep`);
    }
});
