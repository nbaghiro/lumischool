import assert from "node:assert/strict";
import { test } from "node:test";
import { defineDrawing } from "../parts/drawing";
import { paramsOf, pyramidRows, sceneProblem, shown, valuesOf, wrap } from "../scene";

const scene = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    size: [20, 6],
    nodes: [
        {
            type: "row",
            id: "r",
            v: { gap: 1 },
            place: { rel: "at", x: 1, y: 1 },
            contains: ["a", "b"],
        },
        {
            type: "numcard",
            id: "a",
            v: { value: 3, shaded: [1, null, 2] },
            place: { rel: "in", of: "r", index: 0 },
        },
        {
            type: "choice",
            id: "b",
            v: { options: [{ kind: "num", label: "3", value: "3" }], words: ["one", "two"] },
            place: { rel: "right-of", of: "a", gap: 1 },
        },
    ],
    arrows: [{ from: "a", to: "b" }],
    marks: [{ type: "tick", target: "a", solution: true, v: {} }],
    boxes: { r: { x: 1, y: 1, w: 10, h: 3 } },
    ...over,
});

test("a laid out scene with rows, lists, options and marks is a scene", () => {
    assert.equal(sceneProblem(scene()), null);
});

test("a scene's parts, sizes, boxes and settings are each checked, and the problem says where", () => {
    assert.match(sceneProblem(scene({ size: [20] })) ?? "", /width and height/);
    assert.match(sceneProblem(scene({ boxes: { r: { x: 1 } } })) ?? "", /boxes\.r/);
    assert.match(
        sceneProblem(
            scene({ nodes: [{ type: "t", id: "t", v: { odd: { big: true } }, place: null }] }),
        ) ?? "",
        /nodes\[0\]: odd:/,
    );
    assert.match(sceneProblem(scene({ arrows: [{ from: "a" }] })) ?? "", /arrows\[0\]/);
});

test("a part's settings read as plain values: a line as what it filled to, options as their labels", () => {
    assert.deepEqual(
        valuesOf({
            cols: 5,
            robot: false,
            face: "down",
            flag: [2, null],
            code: ["right 1"],
            map: [
                { kind: "text", label: "S . .", value: "S . ." },
                { kind: "text", label: "# . F", value: "# . F" },
            ],
            ask: { pieces: [], parts: ["Go to the flag."], filled: "Go to the flag.", blanks: [] },
        }),
        {
            cols: 5,
            robot: false,
            face: "down",
            flag: [2, null],
            code: ["right 1"],
            map: ["S . .", "# . F"],
            ask: "Go to the flag.",
        },
    );
});

test("text wraps to a width in squares by the glyph estimate the layout sizes it with", () => {
    // ten squares hold 21 glyphs of the estimate, one short of "How many stars balance"
    assert.deepEqual(wrap("How many stars balance one cube?", 10), [
        "How many stars",
        "balance one cube?",
    ]);
    assert.deepEqual(wrap("", 8), [""]);
    assert.deepEqual(wrap("one", 1), ["one"]);
    assert.equal(pyramidRows(6), 3);
    assert.equal(pyramidRows(10), 4);
});

test("a setting reads back as text: a line as what it filled to, options as their labels", () => {
    assert.equal(shown(undefined), "");
    assert.equal(shown(7), "7");
    assert.equal(shown(true), "true");
    assert.equal(shown(["a", "b"]), "a,b");
    assert.equal(shown([{ kind: "text", label: "Yes", value: "Yes" }]), "Yes");
    assert.equal(shown({ pieces: [], parts: ["Go."], filled: "Go.", blanks: [] }), "Go.");
});

const jar = defineDrawing({
    id: "jar",
    family: "food",
    title: "Jar",
    group: "Props",
    about: "A jar.",
    params: {
        count: 6,
        lit: false,
        label: "sweets",
        tags: [] as string[],
        rows: [2, 3],
        pairs: [] as number[],
    },
    settings: {
        count: { kind: "whole", min: 0, max: 24 },
        lit: { kind: "flag" },
        label: { kind: "text", most: 12 },
        tags: { kind: "words", most: 4 },
        rows: { kind: "numbers", min: 1, max: 9, most: 4 },
        pairs: { kind: "fixed" },
    },
    takes: [],
    box: () => ({ w: 4, h: 4 }),
    draw: () => ({}),
    describe: () => null,
});

test("a part's settings are what the scene wrote over the drawing's defaults, each in the shape the drawing expects", () => {
    assert.deepEqual(paramsOf(jar, {}), jar.params);
    assert.deepEqual(
        paramsOf(jar, {
            count: 9,
            lit: "true",
            label: { pieces: [], parts: ["jelly beans"], filled: "jelly beans", blanks: [] },
            tags: [{ kind: "text", label: "red", value: "red" }],
            rows: [4, null],
            pairs: [1, 2],
        }),
        { count: 9, lit: true, label: "jelly beans", tags: ["red"], rows: [4, 0], pairs: [] },
    );
    // a setting the notation cannot spell (an empty list of nothing in particular) keeps the drawing's own
    assert.deepEqual(paramsOf(jar, { pairs: [3] }).pairs, []);
});
