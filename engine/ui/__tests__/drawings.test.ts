import assert from "node:assert/strict";
import { test } from "node:test";
import { U } from "../../paper";
import { loaderOf } from "../../parts/catalog";
import { drawingOf, loadDrawings } from "../drawings";

test("a ref the catalogue holds is loaded, one it lacks is not, and each is asked for once", async () => {
    assert.ok(
        loaderOf("tree") && loaderOf("cottage"),
        "the catalogue holds the tree and the cottage",
    );
    const shelf = await loadDrawings(["tree", "cottage", "not-in-the-catalogue"]);
    assert.equal(shelf.drawing("tree")?.id, "tree");
    assert.equal(shelf.drawing("cottage")?.id, "cottage");
    assert.equal(shelf.drawing("not-in-the-catalogue"), undefined);
    const again = await loadDrawings(["tree", "not-in-the-catalogue"]);
    assert.equal(
        again.drawing("tree"),
        shelf.drawing("tree"),
        "a ref is loaded once, for every later page",
    );
    assert.equal(again.drawing("not-in-the-catalogue"), undefined);
});

test("a size is the drawing's box in world units at the scale, with its own numbers and any given; an unknown ref takes no room", async () => {
    const shelf = await loadDrawings(["tree"]);
    const tree = shelf.drawing("tree");
    assert.ok(tree);
    const b = tree.box(tree.params);
    assert.deepEqual(shelf.size("tree", 1.5), { w: b.w * U * 1.5, h: b.h * U * 1.5 });
    assert.deepEqual(shelf.size("nothing", 2), { w: 0, h: 0 });
});

test("a hand-drawn file loads by the file's name and is found again by its own id, which it draws under", async () => {
    const shelf = await loadDrawings(["file:cat"]);
    const cat = shelf.drawing("file:cat");
    assert.equal(cat?.id, "svg.cat", "the drawing keeps the shelf's id for the page's data-visual");
    assert.equal(drawingOf("svg.cat"), cat, "a painter finds it again by the id it drew under");
    assert.equal(drawingOf("file:cat"), cat);
    assert.deepEqual(cat?.params, { flip: false }, "a file takes the mirror a world may ask for");
});
