// Shut the box: the dice a hand can move play only the mechanic's own moves, a throw is fair and
// reproducible, and the odds walk every throw of every box a child can reach.
import { test } from "node:test";
import assert from "node:assert/strict";
import { prove } from "../prove";
import { backChoice, putChoice, readBox, shutGame, throwChoice } from "../shut-hands";
import { odds, SHUT, shut, throwOf, type ShutPos } from "../shut";
import type { Position } from "../games";
import { sampled } from "./positions";

test("every die a hand can move plays only the mechanic's own move, and every move has a die that plays it", () => {
    for (const level of shutGame.levels) {
        const r = level.round();
        let checked = 0;
        for (const pos of sampled(r)) {
            if (pos.won) continue;
            const b = readBox(pos);
            if (!b.live) {
                assert.equal(
                    pos.moves.length,
                    1,
                    `${level.title}: before a throw the only move is the throw`,
                );
                assert.deepEqual(throwChoice(pos).moves, [0]);
                continue;
            }
            const played = new Set<number>();
            b.dice.forEach((face, i) => {
                for (let n = 1; n <= b.count; n++) {
                    const c = putChoice(pos, i, n);
                    for (const m of c.moves) {
                        const move = pos.moves[m];
                        assert.ok(
                            move,
                            `${level.title}: the ${face} on ${n} names move ${m} of ${pos.moves.length}`,
                        );
                        assert.equal(move.say, `Put the ${face} on ${n}`);
                        assert.equal(
                            readBox(move.next()).on[i],
                            n,
                            "the die the hand moved is the one that goes",
                        );
                        played.add(m);
                    }
                    if (!c.moves.length)
                        assert.ok(
                            !c.refuse || (c.refuse.endsWith(".") && !c.refuse.includes("—")),
                            c.refuse,
                        );
                }
                for (const m of backChoice(pos, i).moves) {
                    assert.match(pos.moves[m]?.say ?? "", /^Take the \d off \d+$/);
                    played.add(m);
                }
            });
            assert.equal(
                played.size,
                pos.moves.length,
                `${level.title}: the hand is never poorer than the tray at ${pos.key}`,
            );
            checked++;
        }
        assert.ok(checked > 10, `${level.title}: only ${checked} positions checked`);
    }
});

test("a throw is fair: every face comes up a sixth of the time, and two dice make 7 most often", () => {
    const faces = [0, 0, 0, 0, 0, 0, 0];
    const totals = new Map<number, number>();
    let throws = 0;
    for (let seed = 1; seed <= 40; seed++)
        for (let open = 1; open < 512; open += 3)
            for (let misses = 0; misses < 3; misses++) {
                const d = throwOf(seed, open, misses);
                for (const f of d) faces[f] = (faces[f] ?? 0) + 1;
                const two = (d[0] ?? 0) + (d[1] ?? 0);
                totals.set(two, (totals.get(two) ?? 0) + 1);
                throws++;
            }
    const each = (throws * 2) / 6;
    for (let f = 1; f <= 6; f++)
        assert.ok(
            Math.abs((faces[f] ?? 0) - each) < each * 0.03,
            `${f} came up ${faces[f]} times against ${each.toFixed(0)}`,
        );
    const most = [...totals].sort((a, b) => b[1] - a[1])[0]?.[0];
    assert.equal(most, 7);
});

test("a throw is the same throw again: a take-back cannot fish for better dice, and a move log rebuilds the game", () => {
    for (const level of shutGame.levels) {
        const r = level.round();
        const first = r.start.moves[0]?.next();
        assert.ok(first);
        assert.equal(
            r.start.moves[0]?.next().say,
            first.say,
            `${level.title}: the first throw differs when thrown again`,
        );
        // Put the first die somewhere, take it back, and the dice are still the ones thrown.
        const put = first.moves.findIndex((m) => m.say.startsWith("Put "));
        const putMove = first.moves[put];
        if (putMove) assert.deepEqual(readBox(putMove.next()).dice, readBox(first).dice);
        // The same moves, played twice, make the same positions.
        const walk = (): string[] => {
            const keys: string[] = [];
            let p: Position = r.start;
            for (let k = 0; k < 40 && !p.won; k++) {
                const move = p.moves[(k * 7) % p.moves.length];
                if (!move) break;
                p = move.next();
                keys.push(p.key);
            }
            return keys;
        };
        assert.deepEqual(walk(), walk());
    }
});

test("the odds walk every throw of every box a child can reach, and every level keeps them", () => {
    const all = SHUT.versions.map((x) => odds(x.v));
    for (const [i, o] of all.entries()) {
        assert.deepEqual(o.stuck, [], `${shutGame.levels[i]?.title}: a box that can never be shut`);
        assert.ok(
            o.random > o.best && o.wasted.random > o.wasted.best,
            `${shutGame.levels[i]?.title}: choosing well is no better than choosing at random`,
        );
    }
    assert.deepEqual(
        all.map((o) => o.best.toFixed(2)),
        ["6.84", "11.99", "13.08", "12.60", "14.74"],
        "throws to shut the box, choosing well",
    );
    assert.deepEqual(
        all.map((o) => o.random.toFixed(2)),
        ["7.07", "13.48", "14.98", "15.14", "17.64"],
        "the same, choosing at random",
    );
    assert.deepEqual(
        all.map((o) => o.long),
        [10, 19, 20, 20, 23],
        "nine games in ten, choosing well, take no more throws than this",
    );
    for (const l of shutGame.levels) assert.ok(prove(l.round()).ok, l.title);
});

test("the odds are worked out on the mechanic's own moves: walking its puts gives the same best throws", () => {
    // Every throw of two dice, in order, so repeated faces are counted as often as they come up.
    const throws: number[][] = [];
    for (let a = 1; a <= 6; a++)
        for (let b = 1; b <= 6; b++) throws.push([a, b].sort((x, y) => x - y));
    for (const version of SHUT.versions.slice(0, 2)) {
        const v = version.v,
            N = 1 << v.tiles;
        const best = new Float64Array(N);
        const order = Array.from({ length: N }, (_, i) => i).sort(
            (a, b) =>
                a.toString(2).replace(/0/g, "").length - b.toString(2).replace(/0/g, "").length,
        );
        for (const T of order) {
            if (!T) continue;
            let sum = 1,
                miss = 0;
            for (const faces of throws) {
                const ends = new Set<number>();
                const walk = (s: ShutPos): void => {
                    if (!s.live) {
                        if (s.open !== T) ends.add(s.open);
                        return;
                    }
                    for (const m of shut.moves(s, v)) if (m.k === "put") walk(shut.apply(s, m, v));
                };
                walk({
                    open: T,
                    dice: faces,
                    on: faces.map(() => 0),
                    live: true,
                    misses: 0,
                    thrown: 1,
                });
                if (!ends.size) {
                    miss++;
                    continue;
                }
                sum += Math.min(...[...ends].map((e) => best[e] ?? 0)) / throws.length;
            }
            best[T] = sum / (1 - miss / throws.length);
        }
        assert.ok(
            Math.abs((best[N - 1] ?? 0) - odds(v).best) < 1e-9,
            `${version.values}: ${best[N - 1]} against ${odds(v).best}`,
        );
    }
});

test("a rolling die only passes through faces that sit side by side on a real die", async () => {
    const { ROLLING } = await import("../../../engine/parts/sport/dice");
    assert.deepEqual(
        [...ROLLING].sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6],
    );
    ROLLING.forEach((f, i) =>
        assert.notEqual(f + (ROLLING[(i + 1) % 6] ?? 0), 7, `${f} rolls onto its opposite`),
    );
});
