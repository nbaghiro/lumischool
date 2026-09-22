import assert from "node:assert/strict";
import { test } from "node:test";
import {
    aimCamera,
    aimKey,
    OPENING,
    placeStill,
    stillFor,
    type MapAim,
    type Snapshot,
} from "../snapshot";

/** The harbour aimed straight at: the point is the place, its box of 1000 by 800 drawn with 360 units of ground round it. */
const HARBOUR = { x: 7200, y: 4500, w: 1720, h: 1520 };
/** The point 45% along the road from the harbour toward the meadow: the harbour stands up and right of it. */
const TOWARD_MEADOW = { x: 5300, y: 5800, w: 1720, h: 1520, place: { x: 7200, y: 4500 } };

const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({
    src: "test.webp",
    sample: false,
    across: 14400,
    world: { x: 0, y: 0, w: 14400, h: 9000 },
    aims: {
        [aimKey({ place: "harbour" })]: HARBOUR,
        [aimKey({ place: "harbour", along: 0.45, toward: "meadow" })]: TOWARD_MEADOW,
    },
    ...over,
});

const BOX = { left: 0, top: 0, width: 1440, height: 900 };
const MIDDLE = { place: "harbour", at: { x: 0.5, y: 0.5 }, across: 14400 };
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

test("the aimed point lands at its share of the box, at the zoom the aim gives", () => {
    const at = placeStill(snapshot(), { ...OPENING.wide, place: "harbour" }, BOX, null, []);
    assert.ok(at);
    const z = BOX.width / OPENING.wide.across;
    assert.ok(near(at.width, 14400 * z) && near(at.height, 9000 * z));
    assert.ok(near(at.left + HARBOUR.x * z, 0.545 * BOX.width));
    assert.ok(near(at.top + HARBOUR.y * z, 0.47 * BOX.height));
});

test("the share is of the band when a page gives one", () => {
    const band = { left: 0, top: 500, width: 1440, height: 400 };
    const at = placeStill(snapshot(), MIDDLE, BOX, band, []);
    assert.ok(at);
    assert.ok(near(at.top + HARBOUR.y * 0.1, 700));
});

test("a box over the place moves the picture sideways until the place, with its ground, is 24 px clear of it", () => {
    const card = { left: 600, top: 400, width: 300, height: 100 };
    const at = placeStill(snapshot(), MIDDLE, BOX, null, [card]);
    assert.ok(at);
    const z = 0.1;
    const right = at.left + HARBOUR.x * z + (HARBOUR.w * z) / 2;
    assert.ok(near(right, card.left - 24));
    assert.ok(near(at.top + HARBOUR.y * z, 450), "only sideways");
});

test("the place at the road's end is kept inside the window, the edge winning over a card's clearance", () => {
    // the card's foot just catches the point's picture, so the shove takes the point far to the right
    // and the harbour, up and right of it, would run past the window's edge
    const card = { left: 370, top: 96, width: 700, height: 270 };
    const aim = {
        place: "harbour",
        along: 0.45,
        toward: "meadow",
        at: { x: 0.545, y: 0.47 },
        across: 14400,
    };
    const c = aimCamera(TOWARD_MEADOW, aim, BOX, null, [card]);
    const z = 0.1;
    const right = (HARBOUR.x - c.x) * z + BOX.width / 2 + (HARBOUR.w * z) / 2;
    assert.ok(near(right, BOX.width - 24), `the place's right edge is ${right}`);
    const px = (TOWARD_MEADOW.x - c.x) * z + BOX.width / 2;
    assert.ok(
        px < card.left + card.width + 24 + 50,
        "the point's picture gave up some of its clearance",
    );
    assert.ok(near(c.y, aimCamera(TOWARD_MEADOW, aim, BOX, null, []).y), "only sideways");
});

test("a place under a card comes out to the side with room, the wider column when the near one is too narrow", () => {
    // at 1280 the point clears the card's foot, so nothing moves it, and the harbour lands under the
    // card; it comes out to the right, the side away from the card's middle
    const box = { left: 0, top: 0, width: 1280, height: 900 };
    const card = { left: 290, top: 96, width: 700, height: 260 };
    const aim = {
        place: "harbour",
        along: 0.45,
        toward: "meadow",
        at: { x: 0.545, y: 0.47 },
        across: 14400,
    };
    const z = box.width / aim.across;
    const plain = aimCamera(TOWARD_MEADOW, aim, box, null, []);
    const under = (HARBOUR.x - plain.x) * z + box.width / 2;
    assert.ok(
        under > card.left && under < card.left + card.width,
        "the fixture puts it under the card",
    );
    const c = aimCamera(TOWARD_MEADOW, aim, box, null, [card]);
    const left = (HARBOUR.x - c.x) * z + box.width / 2 - (HARBOUR.w * z) / 2;
    assert.ok(left >= card.left + card.width + 24, `the place's left edge is ${left}`);
    assert.ok(left + HARBOUR.w * z <= box.width - 24 + 1e-9, "and it is inside the window");
    // a card reaching near the right edge leaves a column narrower than the place there, so it goes
    // left although it stands right of the card's middle
    const wide = { left: 400, top: 96, width: 750, height: 260 };
    const d = aimCamera(TOWARD_MEADOW, aim, box, null, [wide]);
    const right = (HARBOUR.x - d.x) * z + box.width / 2 + (HARBOUR.w * z) / 2;
    assert.ok(near(right, wide.left - 24), `the place's right edge is ${right}`);
});

test("a box away from the place leaves the picture where the aim puts it", () => {
    const card = { left: 0, top: 0, width: 200, height: 100 };
    assert.deepEqual(
        placeStill(snapshot(), MIDDLE, BOX, null, [card]),
        placeStill(snapshot(), MIDDLE, BOX, null, []),
    );
});

test("a nudge moves the aimed point by the map units it names", () => {
    const at = placeStill(snapshot(), { ...MIDDLE, nudge: { x: 500, y: -200 } }, BOX, null, []);
    const plain = placeStill(snapshot(), MIDDLE, BOX, null, []);
    assert.ok(at && plain);
    assert.ok(near(at.left, plain.left - 50) && near(at.top, plain.top + 20));
});

test("a snapshot stands in only for the aims and the zoom it was made for", () => {
    assert.equal(placeStill(snapshot(), { ...MIDDLE, place: "meadow" }, BOX, null, []), null);
    assert.equal(
        placeStill(snapshot(), { ...MIDDLE, along: 0.45, toward: "railway" }, BOX, null, []),
        null,
    );
    assert.equal(stillFor([snapshot()], { ...MIDDLE, across: 4600 }, BOX, null, []), null);
    assert.equal(placeStill(snapshot(), MIDDLE, { ...BOX, width: 0 }, null, []), null);
});

test("of the snapshots made for an aim, the one that needs least growth to cover the box is chosen", () => {
    const half = snapshot({ src: "half.webp", world: { x: 7200, y: 0, w: 7200, h: 9000 } });
    const whole = snapshot({ src: "whole.webp" });
    assert.equal(stillFor([half, whole], MIDDLE, BOX, null, [])?.snapshot.src, "whole.webp");
    assert.equal(stillFor([whole, half], MIDDLE, BOX, null, [])?.snapshot.src, "whole.webp");
});

test("a still that covers its box is shown where the live map draws", () => {
    const aim = { ...OPENING.wide, place: "harbour" };
    const wide = snapshot({ world: { x: -3000, y: -3000, w: 22000, h: 16000 } });
    const shown = stillFor([wide], aim, BOX, null, [])?.at;
    const exact = placeStill(wide, aim, BOX, null, []);
    assert.ok(shown && exact);
    for (const k of ["left", "top", "width", "height"] as const)
        assert.ok(near(shown[k], exact[k]), k);
});

test("a still that stops short of its box grows about the aimed point until it covers the box", () => {
    // placed exactly, this picture leaves 100 px of bare paper down the left of a wide, short box
    const box = { left: 0, top: 0, width: 1920, height: 900 };
    const aim = { ...MIDDLE, across: 19200 };
    const world = { x: -1400, y: -500, w: 20000, h: 10000 };
    const short = snapshot({ across: 19200, world });
    const exact = placeStill(short, aim, box, null, []);
    const shown = stillFor([short], aim, box, null, [])?.at;
    assert.ok(exact && shown);
    assert.ok(near(exact.left, 100), "the exact picture stops 100 px short");
    const aimed = {
        x: exact.left + (HARBOUR.x - world.x) * 0.1,
        y: exact.top + (HARBOUR.y - world.y) * 0.1,
    };
    assert.ok(near(aimed.x, 960) && near(aimed.y, 450));
    const k = shown.width / exact.width;
    assert.ok(near(shown.height / exact.height, k), "it keeps its proportions");
    assert.ok(near(shown.left + (aimed.x - exact.left) * k, aimed.x), "the aimed point stays put");
    assert.ok(near(shown.top + (aimed.y - exact.top) * k, aimed.y));
    assert.ok(near(shown.left, 0), "grown by no more than covering takes");
    assert.ok(shown.top <= 0 && shown.left + shown.width >= box.width - 1e-9);
    assert.ok(shown.top + shown.height >= box.height - 1e-9);
});

test("the live map's camera and the still picture agree: under both, the aimed point stands at the same pixel, clear of the same card", () => {
    const card = { left: 600, top: 400, width: 300, height: 100 };
    const band = { left: 0, top: 500, width: 1440, height: 400 };
    const aims: MapAim[] = [
        MIDDLE,
        { ...OPENING.wide, place: "harbour", nudge: { x: 300, y: -100 } },
        { ...OPENING.wide, place: "harbour", along: 0.45, toward: "meadow" },
    ];
    for (const aim of aims) {
        const aimed = aim.along ? TOWARD_MEADOW : HARBOUR;
        for (const [b, k] of [
            [null, []],
            [band, [card]],
        ] as const) {
            const c = aimCamera(aimed, aim, BOX, b, k);
            const at = placeStill(snapshot(), aim, BOX, b, k);
            assert.ok(at);
            const p = { x: aimed.x + (aim.nudge?.x ?? 0), y: aimed.y + (aim.nudge?.y ?? 0) };
            assert.ok(near(at.left + p.x * c.z, (p.x - c.x) * c.z + BOX.width / 2));
            assert.ok(near(at.top + p.y * c.z, (p.y - c.y) * c.z + BOX.height / 2));
            assert.ok(near(c.z, BOX.width / aim.across));
        }
    }
});
