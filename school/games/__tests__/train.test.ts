import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { ACTIVITIES } from "../activities";
import { levelOf } from "../catalogue";
import { challengeFor, openChallenge } from "../challenges";
import { spell } from "../spell";
import {
    coupled,
    loose,
    startTrain,
    stepTrain,
    trainFrame,
    trainGame,
    TRAIN_LEVELS,
    uncouple,
    type TrainState,
} from "../train";
import { replay, trainConfigurations, trainWay } from "../train-challenges";

const pad = (more: Partial<Pad> = {}): Pad => ({ ...emptyPad(), ...more });

const pick = (s: TrainState, tile: string) => {
    for (let k = 0; k < s.shed.length && s.shed[s.chosen] !== tile; k++)
        stepTrain(s, pad({ pressed: ["right"] }));
    assert.equal(s.shed[s.chosen], tile);
};

/** Pushes the loose wagon at `power` squares a second and waits for it to settle; returns what it asked to hear. */
const push = (s: TrainState, power: number) => {
    const w = loose(s);
    assert.ok(w);
    w.v = -power;
    s.pushes++;
    const heard = [];
    for (let i = 0; i < 60 * 15 && Math.abs(loose(s)?.v ?? 0) > 1e-6; i++)
        heard.push(...stepTrain(s, pad()));
    return heard;
};

test("every word of every level is one the spelling mechanic accepts", () => {
    for (const level of TRAIN_LEVELS)
        for (const word of level.words)
            assert.deepEqual(
                spell.accepts({ ...word, picture: { ...word.picture } }),
                [],
                word.word,
            );
});

test("every word of every level is won by recorded pads, by a finger or the keys, and replays to the same win", () => {
    for (let phase = 0; phase < TRAIN_LEVELS.length; phase++)
        for (const c of trainConfigurations(phase)) {
            const way = trainWay(startTrain(phase, c.word));
            assert.ok(way, `${phase} ${c.word.word}`);
            assert.equal(replay(startTrain(phase, c.word), way), true);
            assert.equal(replay(startTrain(phase, c.word), way.slice(0, -120)), false);
            for (const how of [{ sure: true }, { by: "keys" as const }]) {
                const other = trainWay(startTrain(phase, c.word), how);
                assert.ok(other && replay(startTrain(phase, c.word), other), JSON.stringify(how));
            }
        }
});

test("a gentle push couples, a hard one knocks and rolls back, and a short one waits for a nudge", () => {
    const hard = startTrain(0);
    pick(hard, "b");
    const heard = push(hard, 11);
    assert.equal(coupled(hard).length, 0);
    assert.ok(heard.some((h) => "cue" in h && h.cue === "bump"));
    assert.match(hard.note, /./);
    const short = startTrain(0);
    pick(short, "b");
    push(short, 5);
    assert.equal(coupled(short).length, 0);
    assert.match(short.note, /short|nudge/);
    const gentle = startTrain(0);
    pick(gentle, "b");
    const clank = push(gentle, 7.1);
    assert.deepEqual(coupled(gentle), ["b"]);
    assert.ok(clank.some((h) => "cue" in h && h.cue === "place"));
});

test("a weak push does not get over the hump, and rolls back to where it can be pushed again", () => {
    const s = startTrain(1);
    pick(s, "s");
    push(s, 5.5);
    const w = loose(s);
    assert.ok(w && w.x > 38, `stopped at ${w?.x}`);
});

test("a wrong wagon couples but does not win, and uncoupling rolls it back to be changed", () => {
    const s = startTrain(0);
    for (const tile of ["b", "o", "s"]) {
        pick(s, tile);
        push(s, 3);
        for (let i = 0; i < 8 && coupled(s).at(-1) !== tile; i++) push(s, 3);
    }
    assert.deepEqual(coupled(s), ["b", "o", "s"]);
    assert.equal(s.won, false);
    assert.ok(uncouple(s));
    for (let i = 0; i < 60 * 10; i++) stepTrain(s, pad());
    assert.deepEqual(coupled(s), ["b", "o"]);
    assert.ok(uncouple(s));
    for (let i = 0; i < 60 * 10; i++) stepTrain(s, pad());
    pick(s, "u");
    for (let i = 0; i < 8 && coupled(s).length < 2; i++) push(s, 3);
    pick(s, "s");
    for (let i = 0; i < 8 && !s.won; i++) push(s, 3);
    assert.equal(s.won, true);
});

test("the keys skip wagons already coupled, and the brake uncouples once a press", () => {
    const s = startTrain(0);
    pick(s, "b");
    push(s, 7.1);
    const seen = new Set<string>();
    for (let k = 0; k < 8; k++) {
        stepTrain(s, pad({ pressed: ["right"] }));
        seen.add(s.shed[s.chosen] ?? "");
    }
    assert.equal(seen.has("b"), false);
    const w = loose(s);
    if (w) w.v = 0;
    stepTrain(s, pad({ brake: true }));
    stepTrain(s, pad({ brake: true }));
    assert.equal(coupled(s).length, 0);
});

test("a finger pulled back from the wagon and let go pushes it by how far it pulled", () => {
    const s = startTrain(0);
    pick(s, "b");
    const w = loose(s);
    assert.ok(w);
    const x = w.x;
    stepTrain(s, pad({ touch: { x, y: 17.5 } }));
    stepTrain(s, pad({ touch: { x: x + 4, y: 17.5 } }));
    stepTrain(s, pad({ lifted: { x: x + 4, y: 17.5 } }));
    assert.ok((loose(s)?.v ?? 0) < -5);
    assert.equal(s.pushes, 1);
});

test("the state stays plain data, and the frame draws the banks, the preview and the sound boxes", () => {
    const s = startTrain(1);
    pick(s, "s");
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
    const f = trainFrame(s);
    assert.ok(f.sprites.some((p) => p.art === "railbank"));
    assert.ok(f.sprites.some((p) => p.art === "soundboxes"));
    assert.ok(f.marks.some((m) => m.kind === "dots"));
    const blind = startTrain(4);
    pick(blind, "s");
    assert.equal(
        trainFrame(blind).marks.some((m) => m.kind === "dots"),
        false,
    );
});

test("each version of the spelling activity opens the level whose word it is", () => {
    const a = ACTIVITIES.find((x) => x.id === "spell.the-picture");
    assert.ok(a);
    a.versions.forEach((_, i) => {
        const at = levelOf("spell.the-picture", i);
        assert.equal(at?.game.id, "spell");
        const level = TRAIN_LEVELS[at?.level ?? -1];
        const round = a.round(i);
        assert.ok(level && round.values.includes(level.words[0]?.word ?? "?"), round.values);
    });
});

test("a generated challenge is certified by the solver and opens the word it names", () => {
    for (let phase = 0; phase < TRAIN_LEVELS.length; phase++) {
        const c = challengeFor(trainGame, phase, 1234 + phase, true);
        assert.equal(c.source, "generated");
        const game = openChallenge(trainGame, c);
        assert.equal(game.group, "action");
        if (game.group === "action") {
            const s = game.start(phase);
            assert.ok(s && typeof s === "object");
        }
    }
});
