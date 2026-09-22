import assert from "node:assert/strict";
import { test } from "node:test";
import { PRINT } from "../../../paper";
import { loaderOf } from "../../catalog";
import { drawn, everyMark } from "../../__tests__/check";
import { EXCALIDRAW, STROKES, SVG } from "../files";

const FILES = [...SVG, ...EXCALIDRAW, ...STROKES];

test("every hand-drawn file is a drawing, found by its id and by the loader's file name", async () => {
    for (const f of FILES) {
        const load = loaderOf(`file:${f.name}`);
        assert.ok(load, `content/art/ has ${f.file} and the catalogue has no drawing for it`);
        const d = await load();
        assert.equal(loaderOf(d.id), load, `${d.id} and file:${f.name} load different drawings`);
        assert.equal(d.group, "Imported", d.id);
    }
});

test("an SVG file is drawn as one mark, its anchors taken out and its lines and fills resolved", async () => {
    const load = loaderOf("file:cat");
    assert.ok(load);
    const cat = await load();
    for (const paper of [false, true]) {
        const { marks, anchors } = drawn(cat, cat.params, { paper });
        const files = [...everyMark(marks)].flatMap(({ mark }) =>
            mark.kind === "imported" ? [mark.f] : [],
        );
        assert.equal(files.length, 1, "one mark holds the file");
        const shapes = files[0]?.shapes ?? [];
        const attr = (k: string): (string | { hatch: string })[] =>
            shapes.flatMap((s) => s.attrs.filter(([a]) => a === k).map(([, v]) => v));
        assert.deepEqual(
            attr("data-anchor"),
            [],
            "the anchor markers are taken out of what is drawn",
        );
        assert.deepEqual(anchors.head, [80, 20, "up"]);
        assert.ok(
            attr("stroke").every((v) => v !== "#000"),
            "the file's black lines are re-inked",
        );
        const fills = attr("fill");
        assert.ok(fills.length > 0, "a named fill is painted");
        if (paper) {
            assert.ok(
                fills.some((v) => typeof v !== "string" && v.hatch === "tang"),
                "a colour prints as its hatch",
            );
            assert.ok(fills.includes("#FFFFFF"), "card prints white");
        } else assert.ok(fills.includes(PRINT.ink) === false && fills.includes("none"));
    }
});

test("a mirrored file is drawn in a turned group, with its anchors mirrored and its sides swapped", async () => {
    const load = loaderOf("file:cup");
    assert.ok(load);
    const cup = await load();
    const box = cup.box({ flip: true });
    const asDrawn = drawn(cup, { flip: false }, { paper: false });
    const mirrored = drawn(cup, { flip: true }, { paper: false });
    const turns = [...everyMark(mirrored.marks)].flatMap(({ within }) =>
        within.flatMap((o) => o.turn ?? []),
    );
    assert.deepEqual(turns[0], ["matrix", -1, 0, 0, 1, box.w * 20, 0]);
    const [x, y, side] = asDrawn.anchors.handle ?? [];
    assert.equal(side, "right");
    assert.deepEqual(mirrored.anchors.handle, [box.w * 20 - (x ?? 0), y, "left"]);
});
