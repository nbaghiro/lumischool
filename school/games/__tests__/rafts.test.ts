// Rafts, on planck behind bodies.ts: every level can be completed from its flock, every sheep is
// always on a raft, swimming back or on the bank, and a raft carries one layer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";

/** Every way a flock of `n` can be shared out, as how many stand on each of `r` rafts, with the rest left on the bank. */
function sharings(n: number, r: number): number[][] {
    const out: number[][] = [];
    const walk = (left: number, on: number[]): void => {
        if (on.length === r) {
            out.push(on);
            return;
        }
        for (let k = 0; k <= left; k++) walk(left - k, [...on, k]);
    };
    walk(n, []);
    return out;
}

const loadRafts = () => import("../rafts");

/** A sheep jumped by a finger: pressed on the front of the flock, pulled back `len` squares at `deg` above level, and let go. */
function raftsJump(
    R: Awaited<ReturnType<typeof loadRafts>>,
    s: ReturnType<Awaited<ReturnType<typeof loadRafts>>["start"]>,
    len: number,
    deg: number,
): void {
    const pad = emptyPad(),
        r = (deg * Math.PI) / 180,
        pull = { x: -Math.cos(r) * len, y: Math.sin(r) * len };
    pad.touch = { ...R.FRONT };
    R.step(s, pad);
    spent(pad);
    for (let k = 1; k <= 10; k++) {
        pad.touch = { x: R.FRONT.x + (pull.x * k) / 10, y: R.FRONT.y + (pull.y * k) / 10 };
        R.step(s, pad);
        spent(pad);
    }
    pad.lifted = pad.touch;
    pad.touch = null;
    R.step(s, pad);
    spent(pad);
}

test("every rafts level can be completed from its flock, a raft is right only with its number, and unnumbered rafts must match", async () => {
    const { RAFT_LEVELS, judge } = await loadRafts();
    for (const L of RAFT_LEVELS) {
        const right = sharings(L.sheep, L.rafts.length).filter(
            (on) => judge(L, on, L.sheep - on.reduce((a, b) => a + b, 0)).right,
        );
        assert.ok(right.length > 0, `${L.title} cannot be completed`);
        for (const on of right) {
            const bank = L.sheep - on.reduce((a, b) => a + b, 0);
            if (L.rule === "flags")
                L.rafts.forEach((r, i) => {
                    if (r.want !== null) assert.equal(on[i], r.want, L.title);
                });
            if (L.rule === "same")
                assert.ok(
                    on.every((x) => x === on[0]) && bank === 0,
                    `${L.title}: ${on.join(", ")}`,
                );
            if (L.rule === "groups") {
                const per = L.per;
                assert.ok(per, `${L.title}: a groups level says how many go on a raft`);
                assert.ok(
                    on.every((x) => x === 0 || x === per) &&
                        bank < per + per * on.filter((x) => x === 0).length,
                    `${L.title}: ${on.join(", ")}`,
                );
            }
        }
    }
});

test("sheep put on the rafts at random make every raft right at most one time in five, counted over the ways the flock can be shared", async () => {
    const { RAFT_LEVELS, judge } = await loadRafts();
    for (const L of RAFT_LEVELS) {
        const ways = sharings(L.sheep, L.rafts.length).filter((on) => on.some((x) => x > 0));
        const right = ways.filter(
            (on) => judge(L, on, L.sheep - on.reduce((a, b) => a + b, 0)).right,
        );
        assert.ok(
            right.length / ways.length <= 0.2,
            `${L.title}: ${right.length} of ${ways.length}`,
        );
    }
});

test("every sheep is always on a raft, in the river on its way back, or on the bank, whatever the jumps", async () => {
    const R = await loadRafts();
    const L = R.RAFT_LEVELS[5];
    assert.ok(L);
    const s = R.start(5),
        rnd = seeded(4242);
    for (let j = 0; j < 12; j++) {
        raftsJump(R, s, 1 + rnd() * 3.5, 15 + rnd() * 65);
        for (let i = 0; i < 90; i++) {
            R.step(s, emptyPad());
            assert.equal(s.sheep.length, L.sheep);
            assert.equal(new Set(s.flock).size, s.flock.length);
            for (const sh of s.sheep) {
                assert.ok(
                    sh.at.x > -5 && sh.at.x < R.RIVER.world.w + 5 && sh.at.y < R.RIVER.world.h + 3,
                    `sheep ${sh.id} is at ${sh.at.x}, ${sh.at.y}`,
                );
                assert.equal(
                    sh.on === "bank",
                    s.flock.includes(sh.id),
                    `sheep ${sh.id} is ${sh.on}`,
                );
            }
        }
    }
    for (let i = 0; i < 60 * 30 && R.busy(s); i++) R.step(s, emptyPad());
    assert.equal(
        s.sheep.filter((x) => x.on === "swim" || x.on === "walk").length,
        0,
        "every sheep in the river has come back",
    );
    const away = s.sheep.filter((x) => x.on === "hop" || x.on === "far").length;
    assert.equal(
        s.flock.length + R.counts(s).reduce((a, b) => a + b, 0) + away,
        s.sheep.length,
        "nothing is lost",
    );
});

test("a loaded raft settles still with its deck above the water, and keeps the sheep laid on it", async () => {
    const R = await loadRafts();
    for (const [level, raft, n] of [
        [0, 0, 4],
        [1, 0, 7],
        [5, 1, 6],
    ] as const) {
        const s = R.start(level);
        R.step(s, emptyPad());
        R.lay(s, raft, n);
        for (let i = 0; i < 60 * 6; i++) R.step(s, emptyPad());
        const r = s.rafts[raft];
        assert.ok(r, `${level}: raft ${raft}`);
        assert.ok(!s.world.moving(r.body, 0.06), `level ${level}: the raft has settled`);
        assert.ok(
            s.world.where(r.body).y - (R.RAFT_LINES.keel - R.RAFT_LINES.deck) / 2 < R.RIVER.surface,
            `level ${level}: its deck is above the water`,
        );
        assert.equal(R.counts(s)[raft], n, `level ${level}: every sheep laid on it is still on it`);
        assert.equal(s.won, false);
    }
});

test("a jump short of the raft lands in the river and swims home, one onto the raft stays, and one far past it lands in the river", async () => {
    const R = await loadRafts();
    const land = (len: number) => {
        const s = R.start(0);
        raftsJump(R, s, len, 45);
        for (let i = 0; i < 60 * 1.4; i++) R.step(s, emptyPad());
        const first = s.sheep.find((x) => x.seq === 1);
        return { s, on: first?.on, counts: R.counts(s) };
    };
    assert.equal(land(1.9).on, "swim", "a short jump falls in");
    assert.deepEqual(land(2.75).counts, [1], "a jump of the right strength stays on the raft");
    assert.ok(
        ["swim", "body"].includes(land(3.6).on ?? ""),
        "a jump far past it lands in the river or on the far bank",
    );
    const short = land(1.9).s;
    for (let i = 0; i < 60 * 12 && R.busy(short); i++) R.step(short, emptyPad());
    assert.equal(short.flock.length, 8, "and it swims back to the flock");
});

test("the same jumps give the same river, body for body", async () => {
    const R = await loadRafts();
    const play = () => {
        const s = R.start(2);
        for (const [len, deg] of [
            [3, 45],
            [3.6, 50],
            [2.4, 35],
            [3.3, 55],
        ] as const) {
            raftsJump(R, s, len, deg);
            for (let i = 0; i < 60 * 3; i++) R.step(s, emptyPad());
        }
        return JSON.stringify({
            sheep: s.sheep.map((x) => [x.on, x.at.x, x.at.y, x.angle]),
            rafts: s.rafts.map((r) => s.world.where(r.body)),
            flock: s.flock,
            steps: s.steps,
        });
    };
    assert.equal(play(), play());
});

test("under reduced motion a rafts jump from the keys is worked out to rest", async () => {
    const R = await loadRafts();
    const s = R.start(0),
        pad = emptyPad();
    const press = () => {
        for (let i = 0; i < R.raftsGame.still.press(s); i++) {
            R.step(s, pad);
            spent(pad);
        }
        let n = 0;
        while (R.raftsGame.still.settling?.(s) && n++ < 60 * 30) R.step(s, emptyPad());
    };
    pad.pressed.push("up");
    press();
    pad.pressed.push("down");
    press();
    pad.tapped = true;
    press();
    assert.equal(s.seq, 1, "space jumped the front sheep");
    assert.ok(!R.busy(s), "and what it started has come to rest");
    assert.equal(s.flock.length + R.counts(s).reduce((a, b) => a + b, 0), 8);
});

test("every drawing a rafts frame names over a minute of play is on the shelf, and the raft floats by its drawing's own deck and keel", async () => {
    const known = SHELF_IDS;
    const R = await loadRafts();
    const art = await import("../../../engine/parts/travel/raft");
    assert.deepEqual(
        [R.RAFT_LINES.deck, R.RAFT_LINES.keel, R.RAFT_LINES.box],
        [art.RAFT.deck, art.RAFT.keel, art.RAFT.box],
    );
    for (let level = 0; level < R.RAFT_LEVELS.length; level++) {
        const s = R.start(level);
        for (let i = 0; i < 60 * 60; i++) {
            if (i % 150 === 0) raftsJump(R, s, 2.4 + ((i / 150) % 6) * 0.3, 45);
            else R.step(s, emptyPad());
            if (i % 600 === 0)
                for (const f of [R.raftsGame.frame(s), R.raftsGame.frame(s, true)])
                    for (const sp of f.sprites)
                        assert.ok(
                            known.has(sp.art),
                            `${sp.key} asks for ${sp.art}, which is not on the shelf`,
                        );
        }
    }
});

test("a raft carries one layer: sheep laid on the backs of a full row are on the deck or in the river within five seconds", async () => {
    const R = await loadRafts();
    for (const [level, raft, n, fits] of [
        [5, 0, 9, 6],
        [0, 0, 8, 7],
        [3, 1, 6, 4],
    ] as const) {
        const s = R.start(level);
        R.step(s, emptyPad());
        R.lay(s, raft, n);
        for (let i = 0; i < 3; i++) R.step(s, emptyPad());
        assert.ok(
            R.stacked(s) > 0 || n <= fits,
            `level ${level + 1}: the extra sheep begin on backs`,
        );
        for (let i = 0; i < 60 * 5; i++) R.step(s, emptyPad());
        assert.equal(R.stacked(s), 0, `level ${level + 1}: nobody is left on a back`);
        for (const sh of s.sheep)
            assert.ok(
                sh.on !== "body" || sh.upon === 0,
                `level ${level + 1}: sheep ${sh.id} stands on the deck`,
            );
        assert.ok(
            (R.counts(s)[raft] ?? 0) <= fits,
            `level ${level + 1}: the raft holds one row of at most ${fits}`,
        );
        assert.equal(
            s.flock.length +
                R.counts(s).reduce((a, b) => a + b, 0) +
                s.sheep.filter((x) => x.on === "swim" || x.on === "walk").length,
            n === 8 ? 8 : s.sheep.length,
            `level ${level + 1}: nothing is lost`,
        );
    }
});
