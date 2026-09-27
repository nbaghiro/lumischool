import assert from "node:assert/strict";
import { test } from "node:test";
import { score } from "../../motion/beat";
import type { Cue } from "../../motion/cues";
import type { Frame, Scene, Sprite } from "../../motion/scene";
import { defineDrawing } from "../../parts/drawing";
import type { FieldView } from "../game-view";
import { INK, SceneView } from "../scene-view";

class FakeStyle {
    private readonly props = new Map<string, string>();
    cursor = "";
    width = "";
    transform = "";

    setProperty(name: string, value: string): void {
        this.props.set(name, value);
    }

    getPropertyValue(name: string): string {
        return this.props.get(name) ?? "";
    }
}

/** Just enough of a document for the scene view: elements that hold children, classes and a style. */
class FakeElement {
    readonly tagName: string;
    readonly children: FakeElement[] = [];
    readonly style = new FakeStyle();
    readonly dataset: Record<string, string> = {};
    readonly classList = { add: (): void => undefined };
    className = "";
    textContent = "";
    hidden = false;
    clientWidth = 800;

    constructor(tagName: string) {
        this.tagName = tagName;
    }

    setAttribute(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}

    appendChild(child: FakeElement): FakeElement {
        this.children.push(child);
        return child;
    }

    remove(): void {}

    querySelectorAll(): FakeElement[] {
        return [];
    }
}

Object.assign(globalThis, {
    document: { createElement: (tag: string) => new FakeElement(tag) },
    getComputedStyle: (_e: Element) => new FakeStyle(),
});

const box = defineDrawing({
    id: "box",
    family: "page",
    title: "Box",
    group: "Props",
    about: "A box as wide as it is asked to be.",
    params: { w: 2 },
    settings: { w: { kind: "number", min: 1, max: 10, step: 1 } },
    takes: [{ label: "Two", params: { w: 2 } }],
    box: (p) => ({ w: p.w, h: 4 }),
    draw: () => ({}),
    describe: (p) => `a box ${p.w} squares wide`,
});

/** A view that keeps the frames it is given, in place of the GPU's. */
function fakeView(): FieldView & {
    frames: { f: Frame; dt: number }[];
    preloaded: Sprite[];
    preload(sprites: readonly Sprite[]): void;
} {
    const frames: { f: Frame; dt: number }[] = [];
    const preloaded: Sprite[] = [];
    return {
        el: document.createElement("div"),
        sq: 20,
        stats: { drawings: 0, drawMs: 0, sprites: 0, moving: 0, frameMs: 0, pages: 0, bytes: 0 },
        frames,
        preloaded,
        fit: () => undefined,
        clear: () => undefined,
        draw: (f, dt) => {
            frames.push({ f, dt });
        },
        puff: () => undefined,
        burst: () => undefined,
        shake: () => undefined,
        toWorld: () => ({ x: 0, y: 0 }),
        px: 20,
        preload: (sprites: readonly Sprite[]) => {
            preloaded.push(...sprites);
        },
    };
}

function rig(still: boolean) {
    const queue: ((nowMs: number) => void)[] = [];
    let clock = 0;
    const view = fakeView();
    const board = new SceneView({
        host: document.createElement("div"),
        art: new Map([["box", box]]),
        still: () => still,
        view,
        now: () => clock,
        schedule: (f) => {
            queue.push(f);
        },
    });
    return {
        board,
        view,
        /** Runs the frames the board asked for, sixteen milliseconds apart, until it asks for no more. */
        run: (): number => {
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
        last: (): Frame => {
            const f = view.frames[view.frames.length - 1];
            assert.ok(f, "a frame was drawn");
            return f.f;
        },
        sprite: (key: string): Sprite => {
            const f = view.frames[view.frames.length - 1];
            const s = f?.f.sprites.find((x) => x.key === key);
            assert.ok(s, `${key} was drawn`);
            return s;
        },
    };
}

const bench = (x: number, extra: Partial<Scene["parts"][number]> = {}): Scene => ({
    parts: [
        { art: "box", key: "a", at: { x, y: 0 }, params: { w: 2 }, ...extra },
        { art: "box", key: "b", at: { x: 12, y: 0 }, params: { w: 3 } },
    ],
    size: { w: 20, h: 6 },
});

test("a part is a sprite at the middle of its box, sized by its drawing and stacked in the scene's order", () => {
    const { board, run, sprite } = rig(true);
    board.show(bench(0));
    run();
    assert.deepEqual(board.rect("b"), { x: 12, y: 0, w: 3, h: 4 });
    assert.equal(board.z("a"), 10);
    assert.equal(board.z("b"), 11);
    const a = sprite("a");
    assert.deepEqual([a.x, a.y, a.z], [1, 2, 10]);
    assert.equal(a.seed, 4127);
});

test("a turned part turns about its pivot, and a grown one about its foot", () => {
    const { board, run, sprite } = rig(true);
    board.show(bench(0, { angle: Math.PI / 2, pivot: { x: 0, y: 0 } }));
    run();
    const a = sprite("a");
    // the box's middle, a square across and two down from its corner, is turned a quarter clockwise
    assert.ok(Math.abs(a.x - -2) < 1e-9 && Math.abs(a.y - 1) < 1e-9, `${a.x}, ${a.y}`);
    board.show(bench(0, { scale: 0.5 }));
    run();
    const b = sprite("a");
    assert.equal(b.scale, 0.5);
    assert.equal(b.y + (4 * 0.5) / 2, 4, "its foot stays on the line");
});

test("a lifted part is drawn over the pen's marks, and a ghost is seen through", () => {
    const { board, run, sprite } = rig(true);
    board.show(bench(0));
    board.lift("a", true);
    board.tag("b", "ghost", true);
    run();
    assert.ok((sprite("a").z ?? 0) > INK);
    assert.equal(sprite("a").scale, 1.08);
    assert.equal(sprite("b").alpha, 0.42);
    assert.ok(board.z("a") > board.z("b"), "a press picks up the lifted one");
});

test("with motion on a moved part glides, and the last frame is drawn at rest exactly where the scene says", () => {
    const { board, run, view, sprite } = rig(false);
    board.show(bench(0));
    run();
    board.show(bench(6));
    assert.deepEqual(board.at("a"), { x: 0, y: 0 }, "it has not jumped");
    assert.ok(run() > 2);
    assert.deepEqual(board.at("a"), { x: 6, y: 0 });
    assert.equal(view.frames[view.frames.length - 1]?.dt, 0);
    assert.equal(sprite("a").x, 7);
});

test("a morphed setting is drawn from the stepped looks while it moves, and exactly once it rests", () => {
    const { board, run, view, sprite } = rig(false);
    board.show(bench(0));
    run();
    board.show(bench(0, { params: { w: 6 } }), { morph: { w: { hz: 3, zeta: 0.8 } } });
    run();
    assert.ok(view.frames.some((f) => f.f.sprites.some((s) => s.key === "a" && s.live)));
    assert.equal(sprite("a").live, undefined);
    assert.deepEqual(sprite("a").params, { w: 6 });
    assert.deepEqual(board.rect("a"), { x: 0, y: 0, w: 6, h: 4 });
});

test("a beat plays its cues and marks, asks for its looks first, and leaves the scene it ends on", () => {
    const { board, run, view, last } = rig(false);
    board.show(bench(0));
    run();
    const s = score();
    s.track("a", "x", 0, 0, 6, { ease: "out" }, 0.4);
    s.track("a", "param:w", 0, 2, 5, { ease: "linear" }, 0.4);
    s.mark(0, 0.3, [{ kind: "ring", x: 1, y: 1, r: 1 }]);
    s.cue(0.2, "place");
    const heard: Cue[] = [];
    board.play(s.beat(), bench(6, { params: { w: 5 } }), (c) => heard.push(c));
    assert.ok(board.busy);
    assert.ok(view.preloaded.some((p) => p.key === "a" && p.live));
    run();
    assert.equal(board.busy, false);
    assert.deepEqual(heard, ["place"]);
    assert.ok(view.frames.some((f) => f.f.marks.some((m) => m.kind === "ring")));
    assert.deepEqual(last().marks, []);
    assert.deepEqual(board.at("a"), { x: 6, y: 0 });
});

test("under reduced motion a beat is only its sounds, and the scene is drawn at once", () => {
    const { board, run } = rig(true);
    board.show(bench(0));
    run();
    const s = score();
    s.track("a", "x", 0, 0, 6, { ease: "out" }, 0.4);
    s.cue(0.2, "place");
    const heard: Cue[] = [];
    board.play(s.beat(), bench(6), (c) => heard.push(c));
    assert.deepEqual(heard, ["place"]);
    assert.equal(board.busy, false);
    assert.deepEqual(board.at("a"), { x: 6, y: 0 });
});

test("the win's star is the shelf's sticker, scaled by the page, and gone at nought", () => {
    const { board, run, last } = rig(true);
    board.show(bench(0));
    board.sticker({ x: 4, y: 3 }, 0.5);
    run();
    const star = last().sprites.find((s) => s.key === "sticker");
    assert.equal(star?.art, "stickers");
    assert.deepEqual([star?.x, star?.y, star?.scale], [4, 3 - 1.3, 0.5]);
    board.sticker({ x: 0, y: 0 }, 0);
    run();
    assert.equal(
        last().sprites.some((s) => s.key === "sticker"),
        false,
    );
});
