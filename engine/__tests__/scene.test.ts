import assert from "node:assert/strict";
import { test } from "node:test";
import { defineDrawing } from "../parts/drawing";
import {
    narrowed,
    paramsOf,
    pyramidRows,
    sceneProblem,
    shown,
    valuesOf,
    wrap,
    type Box,
    type Scene,
    type SceneNode,
} from "../scene";

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

const said = (s: string) => ({ pieces: [], parts: [s], filled: s, blanks: [] });
const ASK = "Ada rolls a dice on the garden path. Look quickly: how many dots?";
/** k.dice-glance as the pack lays it out: the dice, the question right of it, and the box below. */
const dice = (more: { node: SceneNode; box: Box }[] = []): Scene => ({
    size: [30, 10],
    nodes: [
        { type: "dice", id: "d", v: { faces: [3] }, place: { rel: "at", x: 1, y: 1 } },
        {
            type: "text",
            id: "q",
            v: { text: said(ASK), width: 18 },
            place: { rel: "right-of", of: "d", gap: 2 },
        },
        { type: "number-input", id: "answer", v: {}, place: { rel: "below", of: "q", gap: 1 } },
        ...more.map((m) => m.node),
    ],
    arrows: [],
    marks: [],
    boxes: {
        d: { x: 1, y: 1, w: 3, h: 3 },
        q: { x: 6, y: 1, w: 18, h: 4 },
        answer: { x: 6, y: 6, w: 4, h: 2 },
        ...Object.fromEntries(more.map((m) => [m.node.id, m.box])),
    },
});

test("a scene too wide for a phone's column puts the words under the drawing and wraps them there", () => {
    const narrow = narrowed(dice(), 12);
    const lines = wrap(ASK, 10).length;
    // one square of margin round it, as the scene was written with
    assert.deepEqual(narrow.size, [12, 5 + 2 * lines + 1 + 2 + 1]);
    assert.deepEqual(narrow.boxes.q, { x: 1, y: 5, w: 10, h: 2 * lines });
    assert.equal(narrow.nodes.find((n) => n.id === "q")?.v.width, 10);
    // the box still hangs under the words, wherever they went
    assert.deepEqual(narrow.boxes.answer, {
        x: 1,
        y: 5 + 2 * lines + 1,
        w: 4,
        h: 2,
    });
    // a column it fits is left as it was
    const wide = dice();
    assert.equal(narrowed(wide, 30), wide);
});

test("a narrow scene stands what was below a part under what moved beneath it, and gives up rather than overlap", () => {
    const hint: SceneNode = { type: "text", id: "h", v: { text: said("Count.") }, place: null };
    const withSpare = dice([
        {
            node: {
                type: "number-input",
                id: "spare",
                v: {},
                place: { rel: "below", of: "d", gap: 1 },
            },
            box: { x: 1, y: 5, w: 4, h: 2 },
        },
    ]);
    // the box under the dice, and nothing under the words
    const { answer: _answer, ...boxes } = withSpare.boxes;
    const below = narrowed(
        { ...withSpare, nodes: withSpare.nodes.filter((n) => n.id !== "answer"), boxes },
        12,
    );
    const q = below.boxes.q;
    assert.ok(q);
    assert.equal(below.boxes.spare?.y, q.y + q.h + 1);
    const stuck = dice([
        { node: { ...hint, place: { rel: "at", x: 1, y: 5 } }, box: { x: 1, y: 5, w: 4, h: 2 } },
    ]);
    assert.equal(narrowed(stuck, 12), stuck);
});

test("a narrow scene stacks a row of cards and runs a row of parts on to another line", () => {
    const cards = ["one", "two", "three"].map((label) => ({
        kind: "text" as const,
        label,
        value: label,
    }));
    const scene: Scene = {
        size: [26, 9],
        nodes: [
            {
                type: "choice",
                id: "pick",
                v: { options: cards, stack: "row" },
                place: { rel: "at", x: 1, y: 1 },
            },
            {
                type: "row",
                id: "r",
                v: { space: 1 },
                place: { rel: "below", of: "pick", gap: 1 },
                contains: ["a", "b"],
            },
            { type: "dice", id: "a", v: {}, place: { rel: "in", of: "r", index: 0 } },
            { type: "dice", id: "b", v: {}, place: { rel: "in", of: "r", index: 1 } },
        ],
        arrows: [],
        marks: [],
        boxes: {
            pick: { x: 1, y: 1, w: 17, h: 3 },
            r: { x: 1, y: 5, w: 15, h: 3 },
            a: { x: 1, y: 5, w: 7, h: 3 },
            b: { x: 9, y: 5, w: 7, h: 3 },
        },
    };
    const narrow = narrowed(scene, 12);
    assert.equal(narrow.nodes.find((n) => n.id === "pick")?.v.stack, "column");
    assert.deepEqual(narrow.boxes.pick, { x: 1, y: 1, w: 5, h: 11 });
    assert.deepEqual(narrow.boxes.a, { x: 1, y: 13, w: 7, h: 3 });
    assert.deepEqual(narrow.boxes.b, { x: 1, y: 17, w: 7, h: 3 });
    assert.deepEqual(narrow.boxes.r, { x: 1, y: 13, w: 7, h: 7 });
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
