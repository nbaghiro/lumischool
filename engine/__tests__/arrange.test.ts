import assert from "node:assert/strict";
import { test } from "node:test";
import { parseExpr, showValue, type Env } from "../expr";
import {
    barBoard,
    barHeights,
    barsOf,
    cutAreas,
    cutBoard,
    cutLayout,
    cuttingOf,
    judge,
    plankAreas,
    plankBoard,
    plankLayout,
    plankOf,
    plankStacks,
    MOST,
    prove,
    type Arrangement,
    type Ruled,
} from "../arrange";

const shown = (env: Env): Record<string, string> =>
    Object.fromEntries(Object.entries(env).map(([k, v]) => [k, showValue(v)]));

type Settings = Record<string, number | number[]>;
const plank = (v: Settings) => {
    const p = plankOf(v);
    if (typeof p === "string") throw new Error(p);
    return p;
};
const cutting = (v: Settings) => {
    const s = cuttingOf(v);
    if (typeof s === "string") throw new Error(s);
    return s;
};

test("a plank lists every way its weights can stand, and weighs them by the see-saw rule", () => {
    const b = plankBoard(
        plank({ steps: 3, load: 7, "load-at": -3, bags: [3, 4, 5], open: [3], most: 2 }),
    );
    const all = b.arrangements();
    // one, two or none of three weights on the one step, never three: 3 + 3, and the empty plank is not an answer
    assert.equal(all.length, 6);
    const both = all.find((a) => a.length === 2 && a.every((x) => x.piece !== "bag(2)"));
    assert.ok(both);
    assert.deepEqual(shown(b.measure(both)), {
        turning: "0",
        left: "21",
        right: "21",
        leftkg: "7",
        rightkg: "7",
        onleft: "0",
        onright: "2",
        placed: "2",
        grass: "1",
    });
    assert.equal(
        b.say(both),
        "A 7 kilogram weight stands on step 3 on the left. On the plank: 3 and 4 kilograms on step 3 on the right. On the grass: 5 kilograms.",
    );
    assert.equal(b.after(both), "The plank stays level.");
    assert.equal(b.placing([{ piece: "bag(2)", at: 3 }]), "5 kilograms on step 3 on the right");
});

test("a plank refuses a weight in two places, a step that is not open, and a step that is full", () => {
    const b = plankBoard(
        plank({ steps: 3, load: 7, "load-at": -3, bags: [3, 4, 5], open: [-1, 3], most: 1 }),
    );
    assert.equal(b.legal([]), "nothing is on the plank");
    assert.match(
        String(
            b.legal([
                { piece: "bag(0)", at: 3 },
                { piece: "bag(0)", at: -1 },
            ]),
        ),
        /two places/,
    );
    assert.match(String(b.legal([{ piece: "bag(1)", at: 2 }])), /cannot stand on step 2/);
    assert.match(
        String(
            b.legal([
                { piece: "bag(0)", at: 3 },
                { piece: "bag(1)", at: 3 },
            ]),
        ),
        /holds 1/,
    );
    assert.ok(b.arrangements().every((a) => b.legal(a) === null));
    assert.equal(typeof plankOf({ steps: 3, load: 7, "load-at": 0, bags: [3] }), "string");
    assert.equal(
        typeof plankOf({ steps: "3", load: 7, "load-at": -3, bags: [3] }),
        "string",
        "a setting that is not a number",
    );
});

test("a cake lists every set of cuts up to its most, and measures its pieces exactly", () => {
    const b = cutBoard(cutting({ whole: 10, into: 3 }));
    // nine places a cut can go, and up to three cuts
    assert.equal(b.count, 9 + 36 + 84);
    assert.equal(b.arrangements().length, b.count);
    const cuts = [
        { piece: "cut", at: 3 },
        { piece: "cut", at: 6 },
    ];
    assert.deepEqual(shown(b.measure(cuts)), {
        pieces: "3",
        cuts: "2",
        share: "10/3",
        smallest: "3",
        biggest: "4",
        off: "2/3",
    });
    assert.equal(b.after(cuts), "3 pieces, 3, 3 and 4 squares long.");
    const halves = cutBoard(cutting({ whole: 9, into: 2, snap: 0.5 }));
    assert.deepEqual(shown(halves.measure([{ piece: "cut", at: 4.5 }])), {
        pieces: "2",
        cuts: "1",
        share: "9/2",
        smallest: "9/2",
        biggest: "9/2",
        off: "0",
    });
    assert.equal(typeof cuttingOf({ whole: 10, into: 3, most: 1 }), "string");
});

test("the layouts put every weight, step and cut in a box inside the part's own, and the areas a rule points at", () => {
    const p = plank({ steps: 3, load: 10, "load-at": -3, bags: [3, 1, 7, 5], open: [3], most: 2 });
    const L = plankLayout(p);
    const inside = (b: { x: number; y: number; w: number; h: number }) =>
        b.x >= -0.01 && b.y >= -0.01 && b.x + b.w <= L.box.w + 0.01 && b.y + b.h <= L.box.h + 0.01;
    for (const g of L.grass) assert.ok(inside(g), JSON.stringify(g));
    const a = [
        { piece: "bag(0)", at: 3 },
        { piece: "bag(2)", at: 3 },
    ];
    const stacks = plankStacks(p, L, a);
    assert.deepEqual(
        stacks.map((s) => s.piece),
        ["load", "bag(0)", "bag(2)"],
    );
    // a weight's foot stands on the plank's top line, its box below the sky
    assert.ok(stacks.every((s) => s.box.y >= 0 && s.box.y + s.box.h <= L.top + 1));
    const second = stacks[2],
        first = stacks[1];
    assert.ok(second && first && second.box.y < first.box.y, "a weight put on last stands on top");
    const areas = plankAreas(p, L, a);
    for (const k of ["left", "right", "pivot", "grass", "left(3)", "right(3)", "load", "heavy"])
        assert.ok(areas[k], k);
    assert.equal(areas.heavy, areas.pivot, "level, so the heavy side is the pivot");
    const s = cutting({ whole: 12, into: 3 });
    const C = cutLayout(s);
    const areas2 = cutAreas(s, C, [
        { piece: "cut", at: 4 },
        { piece: "cut", at: 8 },
    ]);
    assert.ok(areas2.biggest && areas2.smallest && areas2.top && areas2.left && areas2.right);
    assert.ok(C.pieceX(8, 2) > C.pieceX(4, 1), "pieces part after each cut");
});

test("a proof walks every arrangement, and judging one gives the rule that speaks to it", () => {
    const p = plank({ steps: 3, load: 10, "load-at": -3, bags: [3, 1, 7, 5], open: [3], most: 2 });
    const b = plankBoard(p);
    const env: Env = {};
    const answer = parseExpr("turning == 0");
    const rules = [
        { when: parseExpr("rightkg < 10"), say: ["Too light."], point: "plank.left", children: [] },
        {
            when: parseExpr("rightkg > 10"),
            say: ["Too heavy."],
            point: "plank.right",
            children: [],
        },
    ];
    const proof = prove(b, env, answer, rules);
    assert.deepEqual(proof.problems, []);
    assert.equal(proof.right, 1, "only 3 and 7 balance 10 on step 3");
    assert.deepEqual(proof.key, [
        { piece: "bag(0)", at: 3 },
        { piece: "bag(2)", at: 3 },
    ]);
    assert.ok(
        proof.spoken / (proof.tried - proof.right) > 0.9,
        "the rules speak to nearly every wrong arrangement",
    );
    assert.equal(proof.onRight.size, 0, "no rule is true for the right arrangement");
    const light = judge(b, env, answer, rules, [{ piece: "bag(1)", at: 3 }]);
    assert.equal(light.right, false);
    assert.equal(light.rule?.point, "plank.left");
    assert.equal(judge(b, env, answer, rules, proof.key ?? []).right, true);
    const lucky = prove(b, env, parseExpr("turning <= 0"), rules);
    assert.match(lucky.problems.join(" "), /more than one in four/);
    assert.match(
        prove(b, env, parseExpr("turning == 100"), rules).problems.join(" "),
        /no arrangement/,
    );
});

const bars = (v: Record<string, unknown>) => {
    const b = barsOf({ set: 1, ...v });
    if (typeof b === "string") throw new Error(b);
    return b;
};
const labelled = (n: number): string[] => Array.from({ length: n }, (_, i) => `L${i + 1}`);

test("a chart's bars at nought are the child's to set, and the answer reads each bar's height", () => {
    assert.equal(
        barsOf({ set: 0, labels: ["A"], values: [0] }),
        "set= is 1 for a chart whose bars the child sets",
    );
    assert.equal(
        barsOf({ set: 1, labels: ["A", "B"], values: [2, 3] }),
        "a bar the child sets is drawn at nought, and none is",
    );
    const b = bars({ labels: ["Moon", "Mars"], values: [3, 0], max: 5 });
    assert.deepEqual(b.open, [1]);
    const board = barBoard(b);
    // Mars at 1 to 5; the chart as drawn, with nothing set, is not an answer
    assert.equal(board.count, 5);
    assert.deepEqual(
        board.arrangements().map((a) => a.map((x) => x.at)),
        [[1], [2], [3], [4], [5]],
    );
    const mars = [{ piece: "bar(1)", at: 4 }];
    assert.deepEqual(barHeights(b, mars), [3, 4]);
    assert.deepEqual(shown(board.measure(mars)), {
        bar1: "3",
        bar2: "4",
        bar3: "0",
        bar4: "0",
        bar5: "0",
        bar6: "0",
        total: "7",
    });
    assert.equal(board.legal([]), "no bar has been set");
    assert.match(String(board.legal([{ piece: "bar(0)", at: 2 }])), /drawn at nought/);
    assert.match(String(board.legal([{ piece: "bar(1)", at: 6 }])), /1 to 5/);
    assert.equal(board.placing(mars), "the bar for Mars at 4");
    const proof = prove(board, {}, parseExpr("bar2 == 4"), []);
    assert.deepEqual(proof.problems, []);
    assert.deepEqual(proof.key, mars);
    assert.equal(proof.right, 1);
});

test("a chart too big to walk is proved bar by bar, with the same counts, key and rules as walking it", () => {
    const b = bars({ labels: labelled(5), values: [0, 0, 0, 0, 0], max: 7 });
    const board = barBoard(b);
    assert.ok(board.count > MOST);
    const answer = parseExpr("bar1 == 3 and bar2 >= 2 and bar5 != 7");
    const rule = (when: string): Ruled & { name: string } => ({
        when: parseExpr(when),
        children: [],
        name: when,
    });
    const rules = [rule("bar1 < 3"), rule("bar2 == 5"), rule("bar3 == 9")];
    const proof = prove(board, {}, answer, rules);
    // walked by hand for comparison
    const truth = (e: ReturnType<typeof parseExpr>, a: Arrangement): boolean =>
        judge(board, {}, e, [], a).right;
    let right = 0;
    let spoken = 0;
    const fired = new Set<string>();
    const onRight = new Set<string>();
    for (const a of board.arrangements()) {
        const ok = truth(answer, a);
        const hits = rules.filter((r) => truth(r.when, a));
        if (ok) {
            right++;
            hits.forEach((r) => onRight.add(r.name));
        } else {
            if (hits.length) spoken++;
            hits.forEach((r) => fired.add(r.name));
        }
    }
    assert.equal(proof.tried, board.count);
    assert.equal(proof.right, right);
    assert.equal(proof.spoken, spoken);
    assert.deepEqual(new Set([...proof.fired].map((r) => r.name)), fired);
    assert.deepEqual(new Set([...proof.onRight.keys()].map((r) => r.name)), onRight);
    assert.deepEqual(proof.key, [
        { piece: "bar(0)", at: 3 },
        { piece: "bar(1)", at: 2 },
    ]);
    // the rule true for a right arrangement is the verifier's error to report
    assert.deepEqual(proof.problems, []);
});

test("a chart too big to walk whose answer reads two bars at once is refused, not sampled", () => {
    const board = barBoard(bars({ labels: labelled(5), values: [0, 0, 0, 0, 0], max: 7 }));
    const proof = prove(board, {}, parseExpr("total == 12"), []);
    assert.equal(proof.key, null);
    assert.match(proof.problems[0] ?? "", /reads more than one piece/);
    const pair = prove(board, {}, parseExpr("bar1 == bar2"), []);
    assert.match(pair.problems[0] ?? "", /reads more than one piece/);
});
