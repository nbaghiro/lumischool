// Every round's end is one the page can show: a round never opens ended, a win always says it ended
// won and an end never says otherwise, and the games that can stop without a win (pinball's balls run
// out, curling's end lost) hold a not-won end until the child starts again.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAMES } from "../catalogue";
import { endOf, type ActionGame } from "../game";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { pinballGame, PIN_LEVELS, type PinState } from "../pinball";
import { openPinConfiguration, pinWay } from "../pinball-challenges";
import { curlingGame, CURL_LEVELS } from "../curling";
import { openCurlConfiguration } from "../curling-challenges";

const random = (seed: number): (() => number) => {
    let t = seed >>> 0;
    return () => {
        t = (Math.imul(t, 1103515245) + 12345) >>> 0;
        return t / 4294967296;
    };
};

/** A press a child might make at any moment: an arrow held, the big buttons, a pull let go. */
function anyPad(r: () => number): Pad {
    const p = emptyPad(),
        x = r();
    const dirs: Dir[] = ["up", "down", "left", "right"];
    if (x < 0.3) {
        const d = dirs[Math.floor(r() * 4)] ?? "up";
        p.holding = [d];
        p.held = d;
    } else if (x < 0.34) {
        p.go = true;
        p.tapped = true;
    } else if (x < 0.36) p.brake = true;
    else if (x < 0.38) p.released = { x: r() * 4 - 2, y: r() * 4 - 2 };
    return p;
}

/** Plays at random, checking at every step that the round's end agrees with its win. */
function agrees<S>(game: ActionGame<S>, level: number, seed: number, steps: number): void {
    const s = game.start(level, 1),
        r = random(seed);
    assert.equal(endOf(game, s), null, `${game.id} ${level}: a round opens ended`);
    for (let i = 0; i < steps; i++) {
        game.step(s, anyPad(r));
        const end = endOf(game, s),
            won = game.won(s);
        if (won) assert.equal(end?.won, true, `${game.id} ${level}: won without saying so`);
        if (end) {
            assert.equal(end.won, won, `${game.id} ${level}: ended ${end.won} at won ${won}`);
            assert.ok(end.words.length > 0, `${game.id} ${level}: an end with no words`);
        }
    }
}

test("every action game's round opens unended, and its end never disagrees with its win", () => {
    for (const g of GAMES) {
        if (g.group !== "action") continue;
        for (let level = 0; level < g.levels.length; level++) agrees(g, level, level + 7, 600);
    }
});

test("every turn game says what a won round and a stuck one are", () => {
    for (const g of GAMES) {
        if (g.group !== "hands") continue;
        assert.ok(g.ends.won.length > 0, `${g.id}: no words for a win`);
        assert.ok(g.ends.stuck.length > 0, `${g.id}: no words for no moves left`);
    }
});

test("pinball won by the solver ends won", () => {
    const c = { phase: 1, variant: 0 },
        way = pinWay(c);
    assert.ok(way);
    const s = openPinConfiguration(c);
    for (const p of way) pinballGame.step(s, { ...p, holding: [...p.holding] });
    assert.deepEqual(endOf(pinballGame, s), { won: true, words: s.note });
});

/** Launches each ball and flips now and then at random, as a child might, until the round ends. */
function playOut(s: PinState, seed: number, most: number): void {
    const r = random(seed);
    let hold: Dir[] = [],
        left = 0,
        pull = 0;
    for (let i = 0; i < most && !endOf(pinballGame, s); i++) {
        const p = emptyPad();
        if (s.resting) {
            if (pull === 0) pull = 20 + Math.floor(r() * 28);
            if (pull > 1) {
                p.holding = ["down"];
                pull--;
            } else pull = 0;
        } else {
            if (left <= 0 && r() < 0.06) {
                hold = [r() < 0.5 ? "left" : "right"];
                left = 8;
            }
            if (left > 0) {
                p.holding = hold;
                left--;
            }
        }
        pinballGame.step(s, p);
    }
}

test("pinball with its balls run out ends not won, and stays so until it starts again", () => {
    const level = PIN_LEVELS.findIndex((L) => L.title === "Three balls to fifty");
    let s = pinballGame.start(level, 1);
    for (let seed = 1; seed < 40; seed++) {
        s = pinballGame.start(level, 1);
        playOut(s, seed, 60 * 60 * 10);
        if (endOf(pinballGame, s)?.won === false) break;
    }
    const end = endOf(pinballGame, s);
    assert.equal(end?.won, false, "the balls never ran out");
    assert.match(end.words, /Out of balls/);
    const balls = s.balls;
    for (let i = 0; i < 60 * 10; i++) {
        const p = emptyPad();
        p.holding = ["down"];
        pinballGame.step(s, p);
    }
    assert.deepEqual(endOf(pinballGame, s), end);
    assert.equal(s.balls, balls);
    assert.equal(pinballGame.still.settling?.(s), false);
});

test("curling played at random loses an end, and the end is held until it starts again", () => {
    let lost = 0;
    for (let phase = 0; phase < CURL_LEVELS.length; phase++) {
        const s = openCurlConfiguration({ phase, variant: 0 }),
            r = random(phase * 31 + 5);
        for (let i = 0; i < 60 * 120 && !endOf(curlingGame, s); i++) curlingGame.step(s, anyPad(r));
        const end = endOf(curlingGame, s);
        if (!end || end.won) continue;
        lost++;
        for (let i = 0; i < 60 * 10; i++) curlingGame.step(s, anyPad(r));
        assert.deepEqual(endOf(curlingGame, s), end, `level ${phase}: the lost end moved on`);
        assert.equal(curlingGame.still.settling?.(s), false);
    }
    assert.ok(lost > 0, "no level was lost at random");
});
