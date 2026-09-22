import assert from "node:assert/strict";
import { test } from "node:test";
import { score, type Beat } from "../../motion/beat";
import type { Cue } from "../../motion/cues";
import type { Scene } from "../../motion/scene";
import { Stage } from "../stage";

class FakeStyle {
    private readonly props = new Map<string, string>();
    zIndex = "";
    overflow = "";

    setProperty(name: string, value: string): void {
        this.props.set(name, value);
    }

    getPropertyValue(name: string): string {
        return this.props.get(name) ?? "";
    }
}

/** Just enough of a document for the stage: elements that hold children, attributes and a style. */
class FakeElement {
    readonly tagName: string;
    readonly attributes = new Map<string, string>();
    readonly children: FakeElement[] = [];
    readonly style = new FakeStyle();
    readonly dataset: Record<string, string> = {};
    readonly classList = { toggle: (): void => undefined };
    parent: FakeElement | null = null;
    className = "";
    textContent = "";
    hidden = false;

    constructor(tagName: string) {
        this.tagName = tagName;
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    appendChild(child: FakeElement): FakeElement {
        child.parent = this;
        this.children.push(child);
        return child;
    }

    insertBefore(child: FakeElement, before: FakeElement | null): FakeElement {
        const at = before ? this.children.indexOf(before) : -1;
        child.parent = this;
        if (at < 0) this.children.push(child);
        else this.children.splice(at, 0, child);
        return child;
    }

    replaceChildren(): void {
        for (const c of this.children) c.parent = null;
        this.children.length = 0;
    }

    remove(): void {
        const at = this.parent?.children.indexOf(this) ?? -1;
        if (at >= 0) this.parent?.children.splice(at, 1);
        this.parent = null;
    }

    /** Enough of a selector for the stage's two: `[data-x]`, with a tag before it or not. */
    querySelector(selector: string): FakeElement | null {
        const [, tag = "", name = ""] = /^([a-z]*)\[data-([a-z-]+)\]$/.exec(selector) ?? [];
        const wanted = `data-${name}`;
        const under = (e: FakeElement): FakeElement | null => {
            for (const c of e.children) {
                if ((tag === "" || c.tagName === tag) && c.attributes.has(wanted)) return c;
                const found = under(c);
                if (found) return found;
            }
            return null;
        };
        return name === "" ? null : under(this);
    }
}

class FakeDocument {
    createElement(tag: string): FakeElement {
        return new FakeElement(tag);
    }
    createElementNS(_ns: string, tag: string): FakeElement {
        return new FakeElement(tag);
    }
}

Object.assign(globalThis, {
    document: new FakeDocument(),
    // The stage reads `--sq` off the sheet; a stylesheet nobody loaded sets none, so it falls back.
    getComputedStyle: (_e: Element) => new FakeStyle(),
});

/** Two parts on a bench, the first at `x`, so a move is one part changing place. */
const bench = (x: number): Scene => ({
    parts: [
        { art: "box", key: "a", at: { x, y: 0 }, params: {} },
        { art: "box", key: "b", at: { x: 12, y: 0 }, params: {} },
    ],
    size: { w: 20, h: 4 },
});

interface Rig {
    host: HTMLDivElement;
    stage: Stage;
    heard: Cue[];
    /** Runs the frames the stage asked for, sixteen milliseconds apart, until it asks for no more. */
    run: () => number;
    /** How many frames the stage has asked for since it was made. */
    asked: () => number;
}

function rig(still: boolean): Rig {
    const host = document.createElement("div");
    const queue: ((nowMs: number) => void)[] = [];
    let clock = 0;
    let asked = 0;
    const stage = new Stage({
        host,
        art: new Map(),
        still: () => still,
        now: () => clock,
        schedule: (f) => {
            asked++;
            queue.push(f);
        },
    });
    return {
        host,
        stage,
        heard: [],
        run() {
            let frames = 0;
            for (let i = 0; i < 600; i++) {
                const next = queue.shift();
                if (!next) break;
                clock += 16;
                next(clock);
                frames++;
            }
            return frames;
        },
        asked: () => asked,
    };
}

/** The stage's ink layer, read as the fake it is. */
function inkOf(host: HTMLDivElement): FakeElement {
    assert.ok(host instanceof FakeElement);
    const sheet = host.children[0];
    assert.ok(sheet instanceof FakeElement);
    const ink = sheet.children.find((c) => c.tagName === "svg");
    assert.ok(ink instanceof FakeElement);
    return ink;
}

/** A part's element on the sheet. */
function partOf(host: HTMLDivElement, key: string): FakeElement {
    assert.ok(host instanceof FakeElement);
    const sheet = host.children[0];
    assert.ok(sheet instanceof FakeElement);
    const found = sheet.children.find((c) => c.dataset.key === key);
    assert.ok(found instanceof FakeElement);
    return found;
}

test("a part is drawn where the scene puts it, stacked in the scene's order, and says what it wanted", () => {
    const { host, stage } = rig(true);
    stage.show(bench(0));
    assert.deepEqual(stage.at("a"), { x: 0, y: 0 });
    assert.deepEqual(stage.rect("b"), { x: 12, y: 0, w: 1, h: 1 });
    assert.equal(stage.z("a"), 10);
    assert.equal(stage.z("b"), 11);
    // The art map is empty, so each part names the drawing it asked for rather than failing.
    assert.equal(partOf(host, "a").textContent, "no drawing called box");
});

test("under reduced motion a moved part is put where the scene says, and nothing is left moving", () => {
    const { stage, asked } = rig(true);
    stage.show(bench(0));
    stage.show(bench(6));
    assert.deepEqual(stage.at("a"), { x: 6, y: 0 });
    assert.equal(stage.live(), false);
    assert.equal(asked(), 0, "no frame was ever asked for");
});

test("with motion on a moved part glides, and it is exactly where the scene says once it has settled", () => {
    const { stage, run } = rig(false);
    stage.show(bench(0));
    stage.show(bench(6));
    assert.deepEqual(stage.at("a"), { x: 0, y: 0 }, "it has not jumped");
    assert.equal(stage.live(), true);
    assert.ok(run() > 1, "it took more than one frame");
    assert.equal(stage.live(), false);
    assert.deepEqual(stage.at("a"), { x: 6, y: 0 });
    assert.deepEqual(stage.at("b"), { x: 12, y: 0 }, "the part that did not move stayed put");
});

/** A move that carries the first part across and asks for a sound on the way. */
function move(): Beat {
    const s = score();
    s.track("a", "x", 0, 0, 6, { ease: "out" }, 0.4);
    s.burst(0.1, "dust", 3, 1, 4);
    s.cue(0.2, "place");
    return s.beat();
}

test("under reduced motion a beat is its sounds, and the scene it ends on is drawn at once", () => {
    const rg = rig(true);
    rg.stage.show(bench(0));
    rg.stage.play(move(), bench(6), (c) => rg.heard.push(c));
    assert.deepEqual(rg.heard, ["place"]);
    assert.equal(rg.stage.busy, false);
    assert.deepEqual(rg.stage.at("a"), { x: 6, y: 0 });
    assert.equal(rg.stage.live(), false);
    assert.equal(rg.asked(), 0, "no frame was ever asked for");
});

test("with motion on a beat plays each sound once and ends exactly on the scene it was played to", () => {
    const rg = rig(false);
    rg.stage.show(bench(0));
    rg.stage.play(move(), bench(6), (c) => rg.heard.push(c));
    assert.equal(rg.stage.busy, true);
    assert.deepEqual(rg.stage.at("a"), { x: 0, y: 0 }, "a beat starts on the scene before it");
    rg.run();
    assert.equal(rg.stage.busy, false);
    assert.deepEqual(rg.stage.at("a"), { x: 6, y: 0 });
    assert.deepEqual(rg.heard, ["place"], "the cue fired once");
});

test("a layer of marks is drawn into the ink over the parts, and replaced as a whole", () => {
    const { host, stage } = rig(true);
    stage.show(bench(0));
    stage.marks("targets", [
        { kind: "ring", x: 1, y: 1, r: 1 },
        { kind: "word", x: 2, y: 2, text: "six" },
    ]);
    const ink = inkOf(host);
    const layer = ink.children.find((c) => c.attributes.get("data-layer") === "targets");
    assert.ok(layer instanceof FakeElement);
    assert.deepEqual(
        layer.children.map((c) => c.tagName),
        ["circle", "text"],
    );
    assert.equal(layer.children[1]?.textContent, "six");
    stage.marks("targets", []);
    assert.deepEqual(layer.children, [], "the layer is emptied rather than added to");
    assert.equal(ink.children.filter((c) => c.attributes.has("data-layer")).length, 1);
});
