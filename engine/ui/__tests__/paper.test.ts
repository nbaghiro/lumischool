// The paper near the camera: drawn once when near, let go of when not, its height kept, and paper that
// lands late or after a forget let go of rather than kept.
import assert from "node:assert/strict";
import { test } from "node:test";
import { nearPaper, preparedPaper } from "../paper";

interface Fake {
    lesson: string;
    height: number;
    gone: boolean;
    dispose(): void;
}

/** A drawer whose draws land when the test says, one at a time in the order asked. */
function drawer(): {
    draw: (lesson: string) => Promise<Fake | null>;
    land: (lesson: string, height?: number) => Promise<void>;
    asked: string[];
    made: Fake[];
} {
    const waiting = new Map<string, (p: Fake | null) => void>();
    const asked: string[] = [];
    const made: Fake[] = [];
    return {
        asked,
        made,
        draw: (lesson) =>
            new Promise((ok) => {
                asked.push(lesson);
                waiting.set(lesson, ok);
            }),
        land: async (lesson, height = 500) => {
            const ok = waiting.get(lesson);
            if (!ok) throw new Error(`${lesson} was not asked for`);
            waiting.delete(lesson);
            const p: Fake = {
                lesson,
                height,
                gone: false,
                dispose() {
                    this.gone = true;
                },
            };
            made.push(p);
            ok(lesson === "missing" ? null : p);
            await new Promise((r) => setTimeout(r, 0));
        },
    };
}

test("paper is drawn once when near, kept while near, let go of when not, and its height stays known", async () => {
    const d = drawer();
    let drawn = 0;
    const near = nearPaper({ draw: d.draw, drawn: () => drawn++ });
    near.lookBack(["a", "b"]);
    near.lookBack(["a", "b"]);
    assert.deepEqual(
        d.asked,
        ["a", "b"],
        "a lesson is asked for once while its draw is on its way",
    );
    assert.equal(near.sheet("a"), null);
    await d.land("a", 700);
    assert.equal(drawn, 1, "ready paper is published while the other lesson is still loading");
    await d.land("b", 600);
    assert.equal(near.sheet("a")?.height, 700);
    assert.equal(near.height("b"), 600);
    assert.equal(drawn, 2);
    const a = near.sheet("a");
    near.lookBack(["b"]);
    assert.equal(near.sheet("a"), null);
    assert.equal(a?.gone, true, "paper no longer near is let go of");
    assert.equal(near.height("a"), 700, "what it measured is kept");
    assert.equal(drawn, 3);
    near.lookBack(["b", "a"]);
    assert.deepEqual(d.asked, ["a", "b", "a"], "paper that comes near again is drawn again");
});

test("paper that lands once it is no longer near, or after a forget, is let go of; a draw that fails leaves nothing", async () => {
    const d = drawer();
    let drawn = 0;
    const near = nearPaper({ draw: d.draw, drawn: () => drawn++ });
    near.lookBack(["a", "missing"]);
    near.lookBack([]);
    await d.land("a");
    assert.equal(near.sheet("a"), null, "landed after the camera left it");
    assert.equal(drawn, 0);
    await d.land("missing");
    assert.equal(near.sheet("missing"), null);
    near.lookBack(["c"]);
    near.forget();
    await d.land("c", 400);
    assert.equal(near.sheet("c"), null, "landed after a forget");
    assert.equal(near.height("c"), null, "a forget forgets the heights too");
    near.lookBack(["c"]);
    assert.deepEqual(
        d.asked,
        ["a", "missing", "c", "c"],
        "after a forget the paper is asked for again",
    );
    await d.land("c", 450);
    assert.equal(near.height("c"), 450);
    near.forget();
    assert.equal(near.sheet("c"), null);
});

test("near paper bounds concurrent work and skips queued lessons the camera left", async () => {
    const d = drawer();
    const near = nearPaper({ draw: d.draw, drawn: () => {} });
    near.lookBack(["a", "b", "c", "d"]);
    assert.deepEqual(d.asked, ["a", "b"]);
    near.lookBack(["b", "e"]);
    await d.land("a");
    assert.deepEqual(d.asked, ["a", "b", "e"]);
    await d.land("b");
    await d.land("e");
    near.forget();
});

test("prepared paper is shared with navigation, transferred once, and bounded", async () => {
    const shelf = preparedPaper<Fake>(1);
    const d = drawer();
    const a = shelf.read("a", () => d.draw("a"));
    await new Promise((r) => setTimeout(r, 5));
    const take = shelf.read(
        "a",
        () => {
            throw new Error("must share the pending draw");
        },
        true,
    );
    assert.equal(a, take);
    await d.land("a");
    const owned = await take;
    const b = shelf.read("b", () => d.draw("b"));
    await new Promise((r) => setTimeout(r, 5));
    await d.land("b");
    const cached = await b;
    const c = shelf.read("c", () => d.draw("c"));
    await new Promise((r) => setTimeout(r, 5));
    await d.land("c");
    await c;
    assert.equal(cached?.gone, true, "the old unused sheet is evicted");
    shelf.dispose();
    assert.equal(owned?.gone, false, "the reader owns transferred paper");
    owned?.dispose();
});

test("navigation bypasses a slow background read; abandoned paper is disposed and failures retry", async () => {
    const shelf = preparedPaper<Fake>();
    const d = drawer();
    const background = shelf.read("slow", () => d.draw("slow"));
    await new Promise((r) => setTimeout(r, 5));
    const wanted = shelf.read("now", () => d.draw("now"), true);
    await new Promise((r) => setTimeout(r, 5));
    assert.deepEqual(d.asked, ["slow", "now"]);
    await d.land("now");
    (await wanted)?.dispose();
    shelf.keep([]);
    assert.equal(await background, null);
    await d.land("slow");
    assert.equal(d.made.find((p) => p.lesson === "slow")?.gone, true);
    assert.equal(await shelf.read("retry", () => Promise.reject(new Error("offline")), true), null);
    const retry = shelf.read("retry", () => d.draw("retry"), true);
    await new Promise((r) => setTimeout(r, 5));
    await d.land("retry");
    assert.equal((await retry)?.lesson, "retry");
    (await retry)?.dispose();
    shelf.dispose();
});

test("two readers cannot claim the same pending prepared sheet", async () => {
    const shelf = preparedPaper<Fake>();
    const d = drawer();
    const prepared = shelf.read("lesson", () => d.draw("first"));
    await new Promise((r) => setTimeout(r, 5));
    const first = shelf.read("lesson", () => d.draw("unused"), true);
    const second = shelf.read("lesson", () => d.draw("second"), true);
    assert.equal(first, prepared);
    assert.notEqual(first, second);
    await new Promise((r) => setTimeout(r, 5));
    await d.land("first");
    await d.land("second");
    const a = await first;
    const b = await second;
    assert.ok(a && b);
    assert.notEqual(a, b);
    shelf.dispose();
    a.dispose();
    assert.equal(b.gone, false, "closing one reader cannot destroy another reader's paper");
    b.dispose();
});

test("disposing preparation releases both claimed pending draws when they arrive late", async () => {
    const shelf = preparedPaper<Fake>();
    const d = drawer();
    const a = shelf.read("same", () => d.draw("a"), true);
    const b = shelf.read("same", () => d.draw("b"), true);
    await new Promise((r) => setTimeout(r, 5));
    shelf.dispose();
    assert.deepEqual(await Promise.all([a, b]), [null, null]);
    await d.land("a");
    await d.land("b");
    assert.ok(d.made.every((p) => p.gone));
});
