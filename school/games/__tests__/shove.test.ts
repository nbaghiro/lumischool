// Penny shove, on planck behind bodies.ts: every level's amount can be made on the felt, a handful
// shoved at random makes it seldom, and nothing is lost off the counter whatever the pulls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";

const SHOVE_KINDS = ["5", "1", "quarter", "dime", "nickel", "penny"] as const;

/** Every handful a drawer can give, as a count of each piece, leaving out the empty one. */
function handfuls(
    drawer: Partial<Record<(typeof SHOVE_KINDS)[number], number>>,
): Record<string, number>[] {
    let out: Record<string, number>[] = [{}];
    for (const k of SHOVE_KINDS) {
        const most = drawer[k] ?? 0,
            next: Record<string, number>[] = [];
        for (const h of out) for (let n = 0; n <= most; n++) next.push({ ...h, [k]: n });
        out = next;
    }
    return out.filter((h) => Object.values(h).some((n) => n > 0));
}

test("every penny shove level's amount can be made on the felt in no more pieces than it takes, from its drawer", async () => {
    const { SHOVE_LEVELS, targetOf } = await import("../shove");
    const { WORTH } = await import("../pay");
    for (const L of SHOVE_LEVELS) {
        const made = handfuls(L.drawer).some((h) => {
            const n = Object.values(h).reduce((a, b) => a + b, 0),
                total = Object.entries(h).reduce(
                    (sum, [k, c]) => sum + WORTH[k as (typeof SHOVE_KINDS)[number]] * c,
                    0,
                );
            return total === targetOf(L) && n <= L.most;
        });
        assert.ok(made, `${L.title} cannot be made`);
    }
});

test("a felt filled with any handful from the drawer makes the amount at most one time in five", async () => {
    const { SHOVE_LEVELS, targetOf } = await import("../shove");
    const { WORTH } = await import("../pay");
    for (const L of SHOVE_LEVELS) {
        const all = handfuls(L.drawer);
        const wins = all.filter(
            (h) =>
                Object.values(h).reduce((a, b) => a + b, 0) <= L.most &&
                Object.entries(h).reduce(
                    (sum, [k, c]) => sum + WORTH[k as (typeof SHOVE_KINDS)[number]] * c,
                    0,
                ) === targetOf(L),
        );
        assert.ok(wins.length / all.length <= 0.2, `${L.title}: ${wins.length} of ${all.length}`);
    }
});

test("the chalk total is what lies at rest on the felt, and a coin off the felt counts nothing", async () => {
    const shove = await import("../shove");
    const s = shove.start(2),
        pad = emptyPad(),
        mid = { x: shove.BOX.x + shove.BOX.w / 2, y: shove.BOX.y + shove.BOX.h / 2 };
    assert.ok(
        shove.lay(s, "quarter", mid) &&
            shove.lay(s, "dime", { x: mid.x + 3, y: mid.y }) &&
            shove.lay(s, "nickel", { x: shove.LINE + 5, y: mid.y }),
    );
    for (let i = 0; i < 30; i++) {
        shove.step(s, pad);
        spent(pad);
    }
    assert.equal(shove.boxTotal(s), 35);
    assert.ok(
        shove.frame(s).marks.some((m) => m.kind === "word" && m.text === "35¢"),
        "the chalk says 35¢",
    );
    assert.match(shove.say(s), /35¢ in 2 pieces/);
    const art = await import("../../../engine/parts/money/shoveboard");
    assert.deepEqual(
        shove.BOARD,
        art.BOARD,
        "the walls, the line and the felt are the drawing's own",
    );
});

test("more than the felt takes never wins, and the amount in few enough pieces, all at rest, wins", async () => {
    const shove = await import("../shove");
    const B = shove.BOX,
        at = (dx: number, dy: number) => ({ x: B.x + dx, y: B.y + dy });
    const five = shove.start(2),
        pad = emptyPad();
    for (const [k, p] of [
        ["quarter", at(3, 3)],
        ["quarter", at(8, 3)],
        ["nickel", at(3, 8)],
        ["nickel", at(8, 8)],
        ["nickel", at(5.5, 11)],
    ] as const)
        shove.lay(five, k, p);
    for (let i = 0; i < 240; i++) {
        shove.step(five, pad);
        spent(pad);
    }
    assert.equal(shove.boxTotal(five), 65);
    assert.ok(!five.won, "65¢ in five pieces is not a win when the felt takes four");
    assert.match(five.said, /takes 4/);
    const four = shove.start(2);
    for (const [k, p] of [
        ["quarter", at(3, 3)],
        ["quarter", at(8, 3)],
        ["dime", at(3, 8)],
        ["nickel", at(8, 8)],
    ] as const)
        shove.lay(four, k, p);
    for (let i = 0; i < 120; i++) {
        shove.step(four, pad);
        spent(pad);
    }
    assert.ok(four.won, "65¢ in four pieces at rest wins");
});

/** Shoves from the piles with the hand: a press on a pile, a pull back to a point, and a lift, then everything left to come to rest. */
async function shoveAll(
    level: number,
    shots: { kind: (typeof SHOVE_KINDS)[number]; pull: { x: number; y: number } }[],
) {
    const shove = await import("../shove");
    const s = shove.start(level),
        pad = emptyPad();
    const run = (n: number) => {
        for (let i = 0; i < n; i++) {
            shove.step(s, pad);
            spent(pad);
        }
    };
    for (const shot of shots) {
        const from = shove.pileAt(s.L, shot.kind);
        pad.touch = { ...from };
        run(2);
        pad.touch = { x: from.x + shot.pull.x, y: from.y + shot.pull.y };
        run(3);
        pad.lifted = pad.touch;
        pad.touch = null;
        run(1);
        for (let i = 0; i < 60 * 12 && shove.moving(s); i++) run(1);
        run(40);
    }
    return { shove, s };
}

test("the same pulls give the same counter, body for body", async () => {
    const shots = [
        { kind: "quarter" as const, pull: { x: -3.6, y: 0.3 } },
        { kind: "dime" as const, pull: { x: -3.9, y: 0.9 } },
        { kind: "quarter" as const, pull: { x: -5, y: 0.2 } },
    ];
    const lay = async () => {
        const { s } = await shoveAll(2, shots);
        return JSON.stringify(
            s.coins
                .map((c) => [c.kind, c.on, c.at.x.toFixed(6), c.at.y.toFixed(6)])
                .concat([Object.values(s.wells).map(String)]),
        );
    };
    assert.equal(await lay(), await lay());
});

test("nothing is lost off the counter, whatever the pulls", async () => {
    const shove = await import("../shove");
    const rand = seeded(7),
        s = shove.start(5),
        pad = emptyPad(),
        all = shove.pieceCount(s);
    const run = (n: number) => {
        for (let i = 0; i < n; i++) {
            shove.step(s, pad);
            spent(pad);
        }
    };
    for (let shot = 0; shot < 40; shot++) {
        const lying = s.coins.filter((c) => c.on === "board");
        const kinds = SHOVE_KINDS.filter((k) => s.wells[k] > 0);
        const from =
            rand() < 0.4 && lying.length
                ? lying[Math.floor(rand() * lying.length)]?.at
                : kinds.length
                  ? shove.pileAt(s.L, kinds[Math.floor(rand() * kinds.length)] ?? "penny")
                  : undefined;
        if (!from) break;
        const a = rand() * Math.PI * 2,
            len = rand() < 0.15 ? 0.2 : 1 + rand() * 5;
        pad.touch = { ...from };
        run(2);
        pad.touch = { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
        run(2);
        pad.lifted = pad.touch;
        pad.touch = null;
        run(1);
        for (let i = 0; i < 60 * 12 && shove.moving(s); i++) run(1);
        assert.equal(shove.pieceCount(s), all, `shot ${shot} lost a piece`);
        for (const c of s.coins.filter((x) => x.on === "board")) {
            assert.ok(
                c.at.x > shove.INNER.x0 - 0.6 &&
                    c.at.x < shove.INNER.x1 + 0.6 &&
                    c.at.y > shove.INNER.y0 - 0.6 &&
                    c.at.y < shove.INNER.y1 + 0.6,
                `a ${c.kind} left the counter`,
            );
        }
    }
    assert.ok(
        shove.back(s) || s.coins.every((c) => c.on !== "board"),
        "the last piece shoved can be taken back",
    );
});

test("under reduced motion a shove is worked out to rest", async () => {
    const shove = await import("../shove");
    const s = shove.start(0),
        pad = emptyPad(),
        from = shove.pileAt(s.L, "dime");
    const press = () => {
        for (let i = 0; i < shove.shoveGame.still.press(s); i++) {
            shove.step(s, pad);
            spent(pad);
        }
    };
    pad.touch = { ...from };
    press();
    pad.touch = { x: from.x - 3.8, y: from.y - 0.2 };
    press();
    pad.lifted = pad.touch;
    pad.touch = null;
    shove.step(s, pad);
    spent(pad);
    assert.ok(shove.shoveGame.still.settling?.(s), "the dime is on its way");
    let n = 0;
    while (shove.shoveGame.still.settling?.(s) && n++ < 60 * 20) {
        shove.step(s, pad);
        spent(pad);
    }
    assert.ok(!shove.shoveGame.still.settling?.(s), "and comes to rest");
    const dime = s.coins.find((c) => c.kind === "dime");
    assert.ok(
        dime && dime.on === "board" && dime.at.x > shove.LINE,
        "it rests on the counter past the line",
    );
});

test("a piece lying across the start line goes back to its pile, and one wholly over it stays", async () => {
    const shove = await import("../shove");
    const s = shove.start(5),
        pad = emptyPad();
    assert.ok(
        shove.lay(s, "1", { x: shove.LINE + 1, y: 14 }) &&
            shove.lay(s, "quarter", { x: shove.LINE + shove.radius("quarter") + 0.3, y: 20 }),
    );
    for (let i = 0; i < 60; i++) {
        shove.step(s, pad);
        spent(pad);
    }
    assert.equal(
        s.coins
            .filter((c) => c.on === "board")
            .map((c) => c.kind)
            .join(),
        "quarter",
        "the note across the line went back, and the quarter past it stayed",
    );
    assert.equal(s.wells["1"], 2, "the note is in its pile again");
    assert.match(s.said, /stopped on the line/);
});

test("the dollar note's pile keeps clear of the rims, and a hard pull on it reaches the felt, as the keys' pull does", async () => {
    const shove = await import("../shove");
    const L = shove.SHOVE_LEVELS[5];
    assert.ok(L, "there is a sixth level");
    const note = shove.pileAt(L, "1"),
        penny = shove.pileAt(L, "penny");
    assert.ok(
        note.y - 1.25 - shove.INNER.y0 >= 1.5 - 1e-9,
        `the note pile's top is ${(note.y - 1.25 - shove.INNER.y0).toFixed(2)} from the rim`,
    );
    assert.ok(
        shove.INNER.y1 - (penny.y + shove.radius("penny") + 0.72) >= 1.5 - 1e-9,
        "and the penny pile's foot keeps the same margin",
    );
    const s = shove.start(5),
        pad = emptyPad(),
        run = (n: number) => {
            for (let i = 0; i < n; i++) {
                shove.step(s, pad);
                spent(pad);
            }
        };
    const felt = { x: shove.BOX.x + shove.BOX.w / 2, y: shove.BOX.y + shove.BOX.h / 2 },
        d = Math.hypot(felt.x - note.x, felt.y - note.y);
    pad.touch = { ...note };
    run(2);
    pad.touch = {
        x: note.x - ((felt.x - note.x) / d) * 5.5,
        y: note.y - ((felt.y - note.y) / d) * 5.5,
    };
    run(3);
    assert.ok(
        s.held && s.held.at.x > note.x - 5,
        "the note stops at the rim while the hand pulls on",
    );
    pad.lifted = pad.touch;
    pad.touch = null;
    run(1);
    for (let i = 0; i < 60 * 12 && shove.moving(s); i++) run(1);
    run(40);
    assert.equal(shove.boxTotal(s), 100, "the note lies on the felt");
});

test("the felt's count of pieces is drawn in whole rings, not dashed ones", async () => {
    const shove = await import("../shove");
    const s = shove.start(1),
        rings = shove.frame(s).marks.filter((m) => m.kind === "ring");
    assert.equal(rings.length, s.L.most);
    assert.ok(rings.every((m) => m.kind === "ring" && m.solid === true && !m.on));
});
