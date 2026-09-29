import assert from "node:assert/strict";
import { test } from "node:test";
import type { Scene } from "../../scene";
import { drawingsOf, inputBoxes, renderLaidOut, scenes } from "../scene";
import { el } from "../svg";

/** Just enough of a document for el() and rough.js's SVG renderer. */
class FakeElement {
    readonly tagName: string;
    readonly ownerDocument: FakeDocument;
    readonly attributes = new Map<string, string>();
    readonly children: FakeElement[] = [];
    readonly style = { setProperty: (): void => undefined };
    textContent = "";

    constructor(tagName: string, ownerDocument: FakeDocument) {
        this.tagName = tagName;
        this.ownerDocument = ownerDocument;
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    removeAttribute(name: string): void {
        this.attributes.delete(name);
    }

    appendChild(child: FakeElement): FakeElement {
        this.children.push(child);
        return child;
    }

    /** Every element under this one, itself first. */
    all(): FakeElement[] {
        return [this, ...this.children.flatMap((c) => c.all())];
    }
}

class FakeDocument {
    createElementNS(_ns: string, tag: string): FakeElement {
        return new FakeElement(tag, this);
    }
}

Object.assign(globalThis, { document: new FakeDocument() });

/** The page's element, made through el() so it is the fake: the renderer reads nothing off it on paper. */
const host = el("svg");

/** What the renderer returned, read as the fake it is. */
const fake = (svg: SVGSVGElement): FakeElement => {
    assert.ok(svg instanceof FakeElement);
    return svg;
};

/** A scene as the pack carries one: a ten frame, a question and a box, an arrow and a mark. */
const SCENE: Scene = {
    size: [26, 8],
    nodes: [
        {
            type: "tenframe",
            id: "frame",
            v: { count: 7, color: "berry" },
            place: { rel: "at", x: 1, y: 1 },
        },
        {
            type: "text",
            id: "ask",
            v: {
                text: {
                    pieces: [{ k: "text", v: "How many?" }],
                    parts: ["How many?"],
                    filled: "How many?",
                    blanks: [],
                },
                narrate: true,
            },
            place: { rel: "right-of", of: "frame", gap: 1 },
        },
        {
            type: "number-input",
            id: "answer",
            v: { width: 4 },
            place: { rel: "below", of: "ask", gap: 1 },
        },
        { type: "sweetjar", id: "jar", v: { count: 3 }, place: { rel: "at", x: 18, y: 1 } },
    ],
    arrows: [{ from: "ask", to: "frame.cell(2)" }],
    marks: [{ type: "tick", target: "frame", solution: true, v: {} }],
    boxes: {
        frame: { x: 1, y: 1, w: 12, h: 6 },
        ask: { x: 14, y: 1, w: 6, h: 2 },
        answer: { x: 14, y: 4, w: 4, h: 2 },
        jar: { x: 18, y: 1, w: 6, h: 6 },
    },
};

const texts = (svg: FakeElement): string[] =>
    svg
        .all()
        .filter((e) => e.tagName === "text")
        .map((e) => e.textContent);
const drawn = (svg: FakeElement): string[] =>
    svg
        .all()
        .flatMap((e) => (e.tagName === "svg" ? [e.attributes.get("data-visual") ?? ""] : []))
        .filter(Boolean);

test("a scene draws its parts at the pack's boxes, the question's words, and the answer only with the key", () => {
    const paper = fake(renderLaidOut(host, SCENE, { output: "paper" }));
    assert.equal(paper.attributes.get("viewBox"), "0 0 520 160");
    assert.deepEqual(drawn(paper), ["tenframe"]);
    const frame = paper.all().find((e) => e.attributes.get("data-visual") === "tenframe");
    assert.deepEqual([frame?.attributes.get("x"), frame?.attributes.get("y")], ["20", "20"]);
    assert.ok(texts(paper).includes("How many?"));
    assert.ok(!texts(paper).includes("7"));
    const keyed = fake(renderLaidOut(host, SCENE, { output: "paper", key: { answer: "7" } }));
    assert.ok(texts(keyed).includes("7"));
    // the solution mark is drawn only with the key, over the drawings
    assert.ok(keyed.all().length > paper.all().length);
});

test("an answer field uses the same box as its printed input, including blanks a drawing owns", () => {
    assert.deepEqual(inputBoxes(SCENE), { answer: { x: 14, y: 4, w: 4, h: 2 } });
    const sequence: Scene = {
        size: [18, 12],
        nodes: [
            {
                type: "sequence",
                id: "order",
                v: { items: ["18", "5", "8", "14"], blanks: ["p1", "p2", "p3", "p4"] },
                place: null,
            },
        ],
        arrows: [],
        marks: [],
        boxes: { order: { x: 1, y: 1, w: 10, h: 12 } },
    };
    assert.deepEqual(inputBoxes(sequence), {
        p1: { x: 1.1, y: 1.1, w: 1.8, h: 1.8 },
        p2: { x: 1.1, y: 4.1, w: 1.8, h: 1.8 },
        p3: { x: 1.1, y: 7.1, w: 1.8, h: 1.8 },
        p4: { x: 1.1, y: 10.1, w: 1.8, h: 1.8 },
    });
});

test("a part read off the shelf is named for the page to load, and drawn once it has been", async () => {
    assert.deepEqual(drawingsOf(SCENE), ["sweetjar"]);
    const draw = await scenes([SCENE]);
    const svg = fake(draw(host, SCENE, { output: "paper" }));
    assert.deepEqual(drawn(svg), ["tenframe", "sweetjar"]);
});

test("a chart whose bars the child sets has handles only while they are being set, and stands each bar where it was set", () => {
    const opt = (label: string) => ({ kind: "text" as const, label, value: label });
    const chart: Scene = {
        size: [12, 10],
        nodes: [
            {
                type: "bargraph",
                id: "chart",
                v: { labels: [opt("A"), opt("B")], values: [2, 0], max: 4, set: 1 },
                place: { rel: "at", x: 1, y: 1 },
            },
        ],
        arrows: [],
        marks: [],
        boxes: { chart: { x: 1, y: 1, w: 10, h: 8 } },
    };
    // on the screen the palette is read off the page, which here has none set, so it reads as print's
    Object.assign(globalThis, { getComputedStyle: () => ({ getPropertyValue: () => "" }) });
    const size = (o: Parameters<typeof renderLaidOut>[2]): number =>
        fake(renderLaidOut(host, chart, o)).all().length;
    const read = size({});
    const setting = size({ arranged: { chart: { places: [], checked: false } } });
    const set = size({
        arranged: { chart: { places: [{ piece: "bar(1)", at: 3 }], checked: false } },
    });
    const checked = size({
        arranged: { chart: { places: [{ piece: "bar(1)", at: 3 }], checked: true } },
    });
    // read or printed, the columns are there to shade and no handle is drawn
    assert.ok(setting > read);
    // a bar set above nought is drawn filled
    assert.ok(set > setting);
    // let go, the handles go and the bars stay
    assert.ok(checked < set && checked > read);
    // on paper there are no handles, even while nothing is set
    assert.equal(
        size({ output: "paper", arranged: { chart: { places: [], checked: false } } }),
        read,
    );
});
