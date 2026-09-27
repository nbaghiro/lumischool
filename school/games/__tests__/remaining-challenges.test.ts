import { step as stepRafts, FRONT } from "../rafts";
import { step as stepShove, pileAt } from "../shove";
import type { Piece } from "../pay";
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import {
    remainingChallenge,
    openRemainingConfiguration,
    isRemainingConfiguration,
    REMAINING_CHALLENGE_COUNT,
} from "../remaining-challenges";
import { step as stepCake, cakeX, cutsNeeded } from "../cake";
import { step as stepSeesaw, seesawGame, PIVOT, GAP, type SeesawLevel } from "../seesaw";
import { pilot } from "./firefly-pilot";

test("remaining certified families store distinct reproducible configurations and reject unchecked changes", () => {
    for (const kind of ["cake", "seesaw", "snake", "shove", "rafts"] as const)
        for (let phase = 0; phase < 6; phase++) {
            const seen = new Set<string>();
            for (let seed = 0; seed < REMAINING_CHALLENGE_COUNT; seed++) {
                const config = remainingChallenge(seed, kind, phase);
                assert.deepEqual(config, remainingChallenge(seed, kind, phase));
                const json = JSON.stringify(config);
                seen.add(json);
                const stored: unknown = JSON.parse(json);
                assert.ok(isRemainingConfiguration(stored));
                assert.deepEqual(
                    JSON.parse(JSON.stringify(openRemainingConfiguration(stored).L)),
                    config.level,
                );
                assert.equal(isRemainingConfiguration({ ...config, phase: 99 }), false);
            }
            assert.equal(seen.size, REMAINING_CHALLENGE_COUNT);
        }
});

test("every generated cake can be shared with pointer cuts and a small aiming error", () => {
    for (let phase = 0; phase < 6; phase++)
        for (let seed = 0; seed < 3; seed++)
            for (const error of [-0.1, 0, 0.1]) {
                const s = openRemainingConfiguration(remainingChallenge(seed, "cake", phase));
                assert.ok("cuts" in s);
                const share = s.L.share ?? s.L.whole / s.L.names.length;
                for (let n = 1; n <= cutsNeeded(s.L); n++) {
                    const touch = { x: cakeX(s, share * n + error), y: 20 };
                    stepCake(s, { ...emptyPad(), touch });
                    stepCake(s, { ...emptyPad(), lifted: touch });
                    for (let tick = 0; tick < 20; tick++) stepCake(s, emptyPad());
                }
                for (let tick = 0; tick < 240; tick++) stepCake(s, emptyPad());
                assert.ok(s.won, `cake ${phase}/${seed}/${error}`);
            }
});

function balance(L: SeesawLevel): { bag: number; at: number }[] | null {
    let found: { bag: number; at: number }[] | null = null;
    const search = (bag: number, loads: { bag: number; at: number }[], moment: number): void => {
        if (found) return;
        if (moment === 0 && loads.length) {
            found = loads;
            return;
        }
        if (bag >= L.bags.length) return;
        search(bag + 1, loads, moment);
        for (const at of L.open) {
            if (loads.filter((l) => Math.sign(l.at) === Math.sign(at)).length >= L.most) continue;
            search(bag + 1, [...loads, { bag, at }], moment + (L.bags[bag] ?? 0) * at);
        }
    };
    search(0, [], L.load.kg * L.load.at);
    return found;
}

test("every generated see-saw has a complete balance through pointer bag placement", () => {
    for (let phase = 0; phase < 6; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const s = openRemainingConfiguration(remainingChallenge(seed, "seesaw", phase));
            assert.ok("bags" in s);
            const solution = balance(s.L);
            assert.ok(solution, `seesaw ${phase}/${seed}`);
            if (phase === 1 || phase === 4) assert.equal(solution.length, 2);
            for (const { bag, at } of solution) {
                const from = seesawGame
                    .frame(s)
                    .sprites.find((sprite) => sprite.key === `bag:${bag}`);
                assert.ok(from);
                stepSeesaw(s, { ...emptyPad(), touch: { x: from.x, y: from.y } });
                const touch = { x: PIVOT.x + at * GAP, y: PIVOT.y - 7 };
                for (let tick = 0; tick < 30; tick++) stepSeesaw(s, { ...emptyPad(), touch });
                stepSeesaw(s, { ...emptyPad(), lifted: touch });
                for (let tick = 0; tick < 240; tick++) stepSeesaw(s, emptyPad());
            }
            for (let tick = 0; tick < 240; tick++) stepSeesaw(s, emptyPad());
            assert.ok(s.won, `seesaw ${phase}/${seed}`);
        }
});

test("every stored firefly layout is flown to the end by a held finger", () => {
    for (let phase = 0; phase < 6; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const s = openRemainingConfiguration(remainingChallenge(seed, "snake", phase));
            assert.ok("layout" in s);
            pilot(s, "pointer");
            assert.ok(s.won, `firefly ${phase}/${seed}: ${s.next} caught, ${s.beads} beads`);
        }
});

const SHOVE_WITNESSES: {
    phase: number;
    index: number;
    seq: { kind: Piece; x: number; y: number }[];
}[] = [
    { phase: 0, index: 0, seq: [{ kind: "dime", x: -3.7496553190015356, y: 0.05084278398646154 }] },
    {
        phase: 0,
        index: 1,
        seq: [
            { kind: "dime", x: -3.7496553190015356, y: 0.05084278398646154 },
            { kind: "nickel", x: -4.929692788172318, y: -0.835541150537681 },
        ],
    },
    {
        phase: 0,
        index: 2,
        seq: [
            { kind: "dime", x: -3.7496553190015356, y: 0.05084278398646154 },
            { kind: "nickel", x: -4.929692788172318, y: -0.835541150537681 },
            { kind: "nickel", x: -3.6972695911292384, y: -0.6266558629032607 },
        ],
    },
    {
        phase: 1,
        index: 0,
        seq: [
            { kind: "dime", x: -3.7343913027592754, y: 0.34179174635423887 },
            { kind: "dime", x: -4.853602048426476, y: -1.2010608458818057 },
        ],
    },
    {
        phase: 1,
        index: 1,
        seq: [{ kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 }],
    },
    {
        phase: 1,
        index: 2,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "nickel", x: -4.730228983495082, y: -0.4329362120487023 },
        ],
    },
    {
        phase: 2,
        index: 0,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "nickel", x: -4.921207207974385, y: 0.8841490916021778 },
        ],
    },
    {
        phase: 2,
        index: 1,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "dime", x: -3.6402015363198568, y: -0.9007956344113544 },
        ],
    },
    {
        phase: 2,
        index: 2,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "dime", x: -3.6402015363198568, y: -0.9007956344113544 },
            { kind: "nickel", x: -4.921207207974385, y: 0.8841490916021778 },
        ],
    },
    {
        phase: 3,
        index: 0,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
        ],
    },
    {
        phase: 3,
        index: 1,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "penny", x: -4.829813318461115, y: 1.293407634435349 },
        ],
    },
    {
        phase: 3,
        index: 2,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "penny", x: -4.829813318461115, y: 1.293407634435349 },
            { kind: "penny", x: -3.717652651060196, y: 0.49148628268253425 },
        ],
    },
    {
        phase: 4,
        index: 0,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "quarter", x: -4.989661570401554, y: -0.32136803334789643 },
            { kind: "dime", x: -3.6402015363198568, y: -0.9007956344113544 },
            { kind: "dime", x: -4.24587931298635, y: -0.18710654599600848 },
        ],
    },
    {
        phase: 4,
        index: 1,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "quarter", x: -4.989661570401554, y: -0.32136803334789643 },
            { kind: "dime", x: -3.6402015363198568, y: -0.9007956344113544 },
            { kind: "dime", x: -4.24587931298635, y: -0.18710654599600848 },
            { kind: "penny", x: -3.965496161130876, y: 0.5242520348613698 },
        ],
    },
    {
        phase: 4,
        index: 2,
        seq: [
            { kind: "quarter", x: -3.7422461778011655, y: -0.24102602501092235 },
            { kind: "quarter", x: -4.636943522575379, y: -1.870495861649051 },
            { kind: "quarter", x: -4.989661570401554, y: -0.32136803334789643 },
            { kind: "dime", x: -3.6402015363198568, y: -0.9007956344113544 },
            { kind: "dime", x: -4.24587931298635, y: -0.18710654599600848 },
            { kind: "penny", x: -3.965496161130876, y: 0.5242520348613698 },
            { kind: "penny", x: -3.555144751691835, y: 1.1930824759914969 },
        ],
    },
    {
        phase: 5,
        index: 0,
        seq: [
            { kind: "1", x: -3.975944126441789, y: -0.4380277427435869 },
            { kind: "quarter", x: -4.77151775221413, y: -1.4941948802968794 },
            { kind: "quarter", x: -3.5786383141605977, y: -1.1206461602226596 },
            { kind: "quarter", x: -4.496043342448189, y: -0.18866441855135252 },
            { kind: "dime", x: -4.473335485229756, y: -0.48915195653729343 },
        ],
    },
    {
        phase: 5,
        index: 1,
        seq: [
            { kind: "1", x: -3.975944126441789, y: -0.4380277427435869 },
            { kind: "quarter", x: -4.77151775221413, y: -1.4941948802968794 },
            { kind: "quarter", x: -3.5786383141605977, y: -1.1206461602226596 },
            { kind: "quarter", x: -4.496043342448189, y: -0.18866441855135252 },
            { kind: "dime", x: -4.473335485229756, y: -0.48915195653729343 },
            { kind: "penny", x: -4.44162531318541, y: 0.7224711601653104 },
        ],
    },
    {
        phase: 5,
        index: 2,
        seq: [
            { kind: "1", x: -3.975944126441789, y: -0.4380277427435869 },
            { kind: "quarter", x: -4.77151775221413, y: -1.4941948802968794 },
            { kind: "quarter", x: -3.5786383141605977, y: -1.1206461602226596 },
            { kind: "quarter", x: -4.496043342448189, y: -0.18866441855135252 },
            { kind: "dime", x: -4.473335485229756, y: -0.48915195653729343 },
            { kind: "penny", x: -4.44162531318541, y: 0.7224711601653104 },
            { kind: "penny", x: -4.872290361238359, y: 1.122847556787557 },
        ],
    },
];

test("every penny-shove target is reached through complete pointer shoves, with the piece limit respected", () => {
    for (const witness of SHOVE_WITNESSES) {
        const s = openRemainingConfiguration(
            remainingChallenge(witness.index, "shove", witness.phase),
        );
        assert.ok("coins" in s);
        for (const shot of witness.seq) {
            const from = pileAt(s.L, shot.kind);
            stepShove(s, { ...emptyPad(), touch: from });
            const touch = { x: from.x + shot.x, y: from.y + shot.y };
            stepShove(s, { ...emptyPad(), touch });
            stepShove(s, { ...emptyPad(), lifted: touch });
            for (let tick = 0; tick < 800 && !s.won; tick++) stepShove(s, emptyPad());
        }
        assert.ok(s.won, `shove ${witness.phase}/${witness.index}`);
    }
});

const RAFT_WITNESSES: { phase: number; seed: number; shots: [number, number][] }[] = [
    {
        phase: 0,
        seed: 0,
        shots: [
            [35, 2.25],
            [35, 2.625],
            [35, 3],
            [35, 2.25],
            [35, 2.25],
        ],
    },
    {
        phase: 0,
        seed: 1,
        shots: [
            [35, 3],
            [35, 3],
            [35, 3],
            [35, 3],
            [35, 3],
        ],
    },
    {
        phase: 0,
        seed: 2,
        shots: [
            [35, 2.375],
            [35, 2.75],
            [35, 3.125],
            [35, 2.375],
            [35, 2.375],
        ],
    },
    {
        phase: 1,
        seed: 0,
        shots: [
            [45, 1.375],
            [25, 1.875],
            [25, 2.125],
            [35, 2.125],
            [40, 2.25],
            [25, 2.75],
            [35, 2.625],
            [50, 3.375],
            [55, 3.5],
            [25, 4.125],
        ],
    },
    {
        phase: 1,
        seed: 1,
        shots: [
            [35, 3.375],
            [35, 3.375],
            [35, 3.5],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
        ],
    },
    {
        phase: 1,
        seed: 2,
        shots: [
            [35, 3.5],
            [35, 3.625],
            [35, 3.5],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2.125],
            [35, 2.375],
            [35, 2.125],
        ],
    },
    {
        phase: 2,
        seed: 0,
        shots: [
            [35, 3.625],
            [35, 3.875],
            [35, 3.625],
            [35, 3.625],
            [35, 2.625],
            [35, 2.625],
            [35, 2.625],
            [35, 2.625],
            [35, 2],
            [35, 2.25],
            [35, 2.375],
            [35, 2.125],
        ],
    },
    {
        phase: 2,
        seed: 1,
        shots: [
            [35, 2.25],
            [35, 1.875],
            [45, 2.125],
            [45, 2.25],
            [35, 3],
            [35, 3],
            [35, 3],
            [45, 3],
            [45, 3.625],
            [45, 3.625],
            [45, 3.875],
            [45, 3.625],
        ],
    },
    {
        phase: 2,
        seed: 2,
        shots: [
            [35, 1.625],
            [35, 1.875],
            [45, 2],
            [35, 2.25],
            [40, 2.875],
            [40, 3],
            [40, 3.125],
            [40, 3.25],
            [30, 4],
            [45, 3.75],
            [35, 4],
            [40, 4],
        ],
    },
    {
        phase: 3,
        seed: 0,
        shots: [
            [30, 2.125],
            [35, 1.625],
            [30, 2.125],
            [30, 2.125],
            [30, 3],
            [35, 2.625],
            [30, 3],
            [30, 3],
            [40, 3.25],
            [40, 3.25],
            [45, 3.25],
            [40, 3.25],
        ],
    },
    {
        phase: 3,
        seed: 1,
        shots: [
            [35, 2.125],
            [45, 1.75],
            [30, 2.25],
            [30, 2.25],
            [30, 3],
            [30, 2.875],
            [35, 3],
            [35, 3],
            [45, 3.25],
            [45, 3.25],
            [45, 3.25],
            [45, 3.25],
        ],
    },
    {
        phase: 3,
        seed: 2,
        shots: [
            [35, 2.125],
            [35, 1.875],
            [40, 2.125],
            [30, 2.25],
            [35, 3],
            [35, 2.875],
            [35, 3],
            [35, 3],
            [40, 3.375],
            [40, 3.375],
            [35, 3.5],
            [40, 3.375],
        ],
    },
    {
        phase: 4,
        seed: 0,
        shots: [
            [35, 3.875],
            [35, 3.875],
            [35, 2.875],
            [35, 2.875],
            [35, 2.875],
            [35, 2],
            [35, 2.125],
            [35, 2],
            [35, 2],
            [35, 2],
        ],
    },
    {
        phase: 4,
        seed: 1,
        shots: [
            [40, 1.5],
            [40, 1.75],
            [35, 2],
            [45, 2.125],
            [35, 2.375],
            [45, 3],
            [40, 3.125],
            [40, 3.25],
            [30, 4.125],
            [35, 4],
        ],
    },
    {
        phase: 4,
        seed: 2,
        shots: [
            [35, 3.875],
            [35, 4.125],
            [35, 3],
            [35, 3],
            [35, 3],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
        ],
    },
    {
        phase: 5,
        seed: 0,
        shots: [
            [30, 1.5],
            [30, 1.625],
            [45, 1.75],
            [30, 2.125],
            [35, 2.25],
            [35, 2.375],
            [30, 2.875],
            [40, 2.875],
            [45, 3],
            [40, 3.125],
            [40, 3.25],
            [35, 3.375],
            [30, 3.875],
            [30, 4],
            [45, 3.75],
            [35, 4],
            [40, 4],
            [45, 4],
        ],
    },
    {
        phase: 5,
        seed: 1,
        shots: [
            [45, 1.375],
            [25, 1.875],
            [25, 2.125],
            [35, 2.125],
            [40, 2.25],
            [40, 2.375],
            [50, 2.75],
            [25, 3.25],
            [45, 3],
            [30, 3.375],
            [30, 3.5],
            [55, 3.375],
            [50, 3.625],
            [45, 3.75],
            [25, 4.375],
            [25, 4.5],
            [35, 4.125],
            [30, 4.375],
        ],
    },
    {
        phase: 5,
        seed: 2,
        shots: [
            [35, 3.625],
            [35, 3.875],
            [35, 4],
            [35, 4.125],
            [35, 3.75],
            [35, 3.75],
            [35, 2.625],
            [35, 3],
            [35, 3],
            [35, 2.75],
            [35, 2.75],
            [35, 2.625],
            [35, 2],
            [35, 2],
            [40, 2.625],
            [35, 2.625],
            [35, 2.125],
            [35, 2],
        ],
    },
];

test("every generated raft arrangement can be completed by pointer jumps without placing sheep internally", () => {
    for (const witness of RAFT_WITNESSES) {
        const s = openRemainingConfiguration(
            remainingChallenge(witness.seed, "rafts", witness.phase),
        );
        assert.ok("rafts" in s);
        for (const [degrees, pull] of witness.shots) {
            if (s.won) break;
            stepRafts(s, { ...emptyPad(), touch: { ...FRONT } });
            const radians = (degrees * Math.PI) / 180;
            const touch = {
                x: FRONT.x - Math.cos(radians) * pull,
                y: FRONT.y + Math.sin(radians) * pull,
            };
            stepRafts(s, { ...emptyPad(), touch });
            stepRafts(s, { ...emptyPad(), lifted: touch });
            for (let tick = 0; tick < 360 && !s.won; tick++) stepRafts(s, emptyPad());
        }
        assert.ok(s.won, `rafts ${witness.phase}/${witness.seed}`);
    }
});
