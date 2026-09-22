// The four hand bindings against their mechanics' own moves: the circuit, the jugs, the rule
// machine and shut the box's dice. The claim that matters most is the gate for a game played by
// hand: a hand on the board can choose only a move the mechanic listed, from every reachable
// position of every level, and every move the mechanic offers has a hand that plays it, so the hand
// is never poorer than the tray. The beats are here too, since a beat has to end exactly on the
// scene of the position the move led to.
import { test } from "node:test";
import assert from "node:assert/strict";
import { followedBy, jumps, mismatches } from "../../../engine/motion/beat";
import { ACTIVITIES, type Listed } from "../activities";
import { explore, nudge, prove } from "../prove";
import { type TurnGame } from "../game";
import type { Ctx } from "../hands";
import { aimHandle, cellCentre, perCellOf, raceGame, readCar, velocityOf } from "../race-hands";
import { pourChoice, pourGame, readJugs } from "../pour-hands";
import { benchOf, ruleGame } from "../rule-hands";
import { reachable, sampled } from "./positions";

/** An activity by its id, which the levels below are bound from. */
function activity(id: string): Listed {
    const a = ACTIVITIES.find((x) => x.id === id);
    assert.ok(a, `no activity ${id}`);
    return a;
}

test("the ghost stands where the move goes: every landing is the cell the mechanic's own next position reports", () => {
    for (const level of raceGame.levels) {
        const r = level.round();
        const ex = explore(r);
        const perCell = perCellOf(r);
        let checked = 0;
        for (const node of ex.nodes.values()) {
            const pos = node.pos;
            const car = readCar(pos, perCell);
            assert.ok(car, `${level.title}: no car on the board`);
            const h = aimHandle(pos, car, { minTarget: 2, perCell });
            const targets = h.targets ?? [];
            assert.equal(targets.length, pos.moves.length);
            pos.moves.forEach((m, i) => {
                const t = targets[i];
                assert.ok(t, `${level.title}: no landing for ${m.say}`);
                assert.deepEqual(t.carries.moves, [i]);
                const after = readCar(m.next(), perCell);
                assert.ok(after, `${level.title}: no car after ${m.say}`);
                const v = velocityOf(m.say, car.lanes, perCell);
                assert.deepEqual(
                    { vx: v.vx, vy: v.vy },
                    { vx: after.vx, vy: after.vy },
                    `${level.title}: ${m.say}`,
                );
                if (!car.lanes) {
                    const c = cellCentre(after.x, after.y);
                    assert.ok(
                        "r" in t.shape &&
                            Math.abs(t.shape.cx - c.x) < 1e-9 &&
                            Math.abs(t.shape.cy - c.y) < 1e-9,
                        `${level.title}: landing off the cell for ${m.say}`,
                    );
                }
                checked++;
            });
        }
        assert.ok(checked > 0, level.title);
    }
});

test("the circuit's levels climb, the activities' own among them, and each keeps the promise", () => {
    const proofs = raceGame.levels.map((l) => prove(l.round()));
    assert.deepEqual(
        proofs.map((p) => p.shortest),
        [15, 17, 13, 14],
    );
    assert.deepEqual(
        proofs.map((p) => p.wins),
        [44, 2, 11, 1],
        "stopping on the finish is the second constraint: far fewer ways to win",
    );
    for (const [i, p] of proofs.entries()) assert.ok(p.ok, raceGame.levels[i]?.title);
    // The two levels bound from the activities are the same rounds, so the same numbers.
    const corner = activity("race.take-the-corner");
    assert.deepEqual(prove(corner.round(0)), proofs[0]);
    assert.deepEqual(prove(corner.round(1)), proofs[2]);
    // The straight's two rounds are played by Row to the jetty now, and still prove.
    const straight = activity("race.stop-on-the-line");
    assert.equal(prove(straight.round(0)).shortest, 7);
    assert.ok(prove(straight.round(1)).ok);
});

test("a jug put under the tap, on the flowers or on another jug plays only the mechanic's own move, and every move has a place to put a jug", () => {
    for (const level of pourGame.levels) {
        const r = level.round();
        for (const pos of reachable(r)) {
            const jugs = readJugs(pos);
            const played = new Set<number>();
            jugs.forEach((jug, i) => {
                const onto: (number | "tap" | "flowers")[] = [
                    "tap",
                    "flowers",
                    ...jugs.map((_, j) => j).filter((j) => j !== i),
                ];
                for (const place of onto) {
                    const c = pourChoice(pos, i, place);
                    for (const m of c.moves) {
                        const move = pos.moves[m];
                        assert.ok(move, `${level.title}: jug ${i} on ${place} names move ${m}`);
                        const L = "ABC"[i];
                        if (place === "tap") assert.match(move.say, new RegExp(`^Fill jug ${L} `));
                        else if (place === "flowers")
                            assert.match(move.say, new RegExp(`^Tip jug ${L} `));
                        else
                            assert.match(
                                move.say,
                                new RegExp(`^Pour jug ${L} .* into jug ${"ABC"[place]} `),
                            );
                        played.add(m);
                    }
                    if (!c.moves.length)
                        assert.ok(
                            c.refuse,
                            `${level.title}: jug ${i} on ${place} is refused without a reason`,
                        );
                }
                assert.ok(jug.max > 0);
            });
            if (!pos.won)
                assert.equal(
                    played.size,
                    pos.moves.length,
                    `${level.title}: the hand is never poorer than the tray at ${pos.key}`,
                );
        }
    }
});

/** A stage a session can be opened on in node: it draws nothing and remembers nothing. */
const quiet: Ctx = {
    stage: {
        show() {},
        anchor: () => null,
        at: () => null,
        turned: () => 0,
        rect: () => null,
        z: () => 0,
        place() {},
        glide() {},
        follow() {},
        nudge() {},
        lift() {},
        tag() {},
        remove() {},
        marks() {},
        room: 1024,
    },
    minTarget: () => 44 / 20,
};

/**
 * Every move from the first `most` positions of every level: its beat starts on the scene before it,
 * ends exactly on the scene after it, and still ends there with the finish played after a winning move.
 */
function beatsLand(game: TurnGame, most: number): number {
    let checked = 0;
    for (const level of game.levels) {
        const r = level.round();
        const session = game.open(r, quiet);
        for (const from of sampled(r, most)) {
            from.moves.forEach((move, i) => {
                const was = session.parts(from),
                    to = move.next(),
                    now = session.parts(to);
                const beat = session.beat?.(from, to, { was, now, hand: null, seed: i });
                assert.ok(
                    beat && beat.length > 0,
                    `${game.id}, ${level.title}: ${move.say} has no beat`,
                );
                const where = `${game.id}, ${level.title}: ${move.say} from ${from.key}`;
                assert.deepEqual(
                    mismatches(beat, now),
                    [],
                    `${where} does not end on the next position's scene`,
                );
                assert.deepEqual(jumps(beat, now, was), [], `${where} jumps at its start`);
                if (to.won && session.finish)
                    assert.deepEqual(
                        mismatches(
                            followedBy(beat, session.finish(to, { scene: now, seed: i })),
                            now,
                        ),
                        [],
                        `${where}, with its finish`,
                    );
                checked++;
            });
        }
    }
    return checked;
}

test("every move of the jugs pours, fills or tips in a beat that ends exactly on the next position's scene", () => {
    assert.ok(beatsLand(pourGame, 40) > 300);
});

test("the same moves played again give the same beats, and another seed changes how they look but not where they end", () => {
    for (const game of [pourGame]) {
        const last = game.levels[game.levels.length - 1];
        assert.ok(last, `${game.id}: no levels`);
        const r = last.round();
        const ex = explore(r);
        const run = (seed: number) => {
            const session = game.open(r, quiet),
                out = [];
            let pos = r.start,
                was = session.parts(pos);
            for (let i = 0; i < 12 && !pos.won; i++) {
                const k = nudge(ex, pos);
                if (k === null) break;
                const move = pos.moves[k];
                assert.ok(move, `${game.id}: the nudge names a move it has`);
                const to = move.next(),
                    now = session.parts(to);
                out.push({
                    beat: session.beat?.(pos, to, { was, now, hand: null, seed: seed + i }),
                    now,
                });
                pos = to;
                was = now;
            }
            assert.ok(pos.won, `${game.id}: the nudges win the last level`);
            return out;
        };
        const a = run(1),
            b = run(1),
            c = run(99);
        assert.deepEqual(a, b, `${game.id}: a replay is the same beats`);
        assert.notDeepEqual(
            a.map((x) => x.beat),
            c.map((x) => x.beat),
            `${game.id}: the seed shows`,
        );
        c.forEach((x, i) => {
            const then = a[i];
            assert.ok(then, `${game.id}: the two runs are the same length`);
            assert.deepEqual(
                x.beat && mismatches(x.beat, then.now),
                [],
                `${game.id}: move ${i} ends in the same place`,
            );
        });
    }
});

test("every move of the rule machine feeds a ball or posts a card in a beat that ends exactly on the next position's scene", () => {
    assert.ok(beatsLand(ruleGame, 60) > 300);
});

test("every ball and card on the rule machine's board plays only the mechanic's own move, and every move has one that plays it", () => {
    for (const level of ruleGame.levels) {
        const r = level.round();
        const bench = benchOf(r);
        assert.equal(
            bench.cards.length,
            r.start.moves[0]?.next().moves.filter((m) => m.say.startsWith("The rule is ")).length,
            level.title,
        );
        const session = ruleGame.open(r, quiet);
        for (const pos of reachable(r)) {
            const played = new Set<number>();
            for (const h of session.handles(pos)) {
                for (const choice of [
                    ...(h.targets ?? []).map((t) => t.carries),
                    ...(h.tap ? [h.tap] : []),
                ]) {
                    for (const m of choice.moves) {
                        const move = pos.moves[m];
                        assert.ok(move, `${level.title}: ${h.key} names move ${m}`);
                        const want = h.key.startsWith("ball:")
                            ? `Feed in ${h.key.slice("ball:".length)}`
                            : `The rule is ${bench.cards[Number(h.key.slice("card:".length))]}`;
                        assert.equal(move.say, want, `${level.title}: ${h.key}`);
                        played.add(m);
                    }
                    if (!choice.moves.length)
                        assert.ok(
                            choice.refuse || !pos.moves.length,
                            `${level.title}: ${h.key} plays nothing and says nothing at ${pos.key}`,
                        );
                }
            }
            assert.equal(
                played.size,
                pos.moves.length,
                `${level.title}: the board is never poorer than the tray at ${pos.key}`,
            );
        }
    }
});
