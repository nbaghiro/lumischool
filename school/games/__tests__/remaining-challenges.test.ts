import { step as stepRafts, FRONT } from "../rafts";
import { step as stepCast, back as returnFish, start as startCast } from "../cast";
import { step as stepShove, pileAt } from "../shove";
import type { Piece } from "../pay";
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, DIRS, type Dir } from "../../../engine/motion/pad";
import {
    remainingChallenge,
    openRemainingConfiguration,
    isRemainingConfiguration,
    REMAINING_CHALLENGE_COUNT,
} from "../remaining-challenges";
import { step as stepCake, cakeX, cutsNeeded } from "../cake";
import { step as stepSeesaw, seesawGame, PIVOT, GAP, type SeesawLevel } from "../seesaw";
import { step as stepSnake, type SnakeState } from "../snake";

function towards(s: SnakeState): Dir | null {
    const want = s.cards.find((c) => c.n === s.count + s.L.by);
    if (!want) return null;
    const key = (x: number, y: number) => y * s.L.cols + x;
    const blocked = new Set(s.body.slice(0, -1).map((c) => key(c.x, c.y)));
    const from = new Map<number, [number, Dir]>();
    const q: [number, number][] = [[s.body[0].x, s.body[0].y]];
    const seen = new Set([key(s.body[0].x, s.body[0].y)]);
    while (q.length) {
        const [x, y] = q.shift() ?? [0, 0];
        if (x === want.x && y === want.y) break;
        for (const d of Object.keys(DIRS) as Dir[]) {
            const nx = x + DIRS[d].x,
                ny = y + DIRS[d].y,
                k = key(nx, ny);
            if (
                nx < 0 ||
                ny < 0 ||
                nx >= s.L.cols ||
                ny >= s.L.rows ||
                seen.has(k) ||
                blocked.has(k)
            )
                continue;
            seen.add(k);
            from.set(k, [key(x, y), d]);
            q.push([nx, ny]);
        }
    }
    let k = key(want.x, want.y),
        first: Dir | null = null;
    for (let hop = from.get(k); hop; hop = from.get(k)) {
        first = hop[1];
        k = hop[0];
    }
    return first;
}

test("remaining certified families store distinct reproducible configurations and reject unchecked changes", () => {
    for (const kind of ["cake", "seesaw", "snake", "shove", "cast", "rafts"] as const)
        for (let phase = 0; phase < (kind === "snake" ? 2 : 6); phase++) {
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

test("every stored bead-string layout can be completed using the shared directional controls", () => {
    for (let phase = 0; phase < 2; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const s = openRemainingConfiguration(remainingChallenge(seed, "snake", phase));
            assert.ok("cards" in s);
            for (let tick = 0; !s.won && tick < 18000; tick++) {
                const direction = s.tick === s.every - 1 || s.stopped ? towards(s) : null;
                stepSnake(s, { ...emptyPad(), pressed: direction ? [direction] : [] });
            }
            assert.ok(s.won, `snake ${phase}/${seed}`);
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

test("every authored and generated fishing challenge reaches its full target through cast, reel and return controls", () => {
    for (let phase = 0; phase < 6; phase++)
        for (let seed = -1; seed < 3; seed++) {
            const s =
                seed < 0
                    ? startCast(phase)
                    : openRemainingConfiguration(remainingChallenge(seed, "cast", phase));
            assert.ok("fish" in s);
            const possible = (values: number[], count: number, target: number): boolean => {
                if (!count) return Math.abs(target) < 0.0001;
                return values.some((v, i) => possible(values.slice(i + 1), count - 1, target - v));
            };
            for (let tick = 0; !s.won && tick < 60000; tick++) {
                if (s.phase === "rest" && !s.home && !s.flights.length) {
                    const sum = s.pan.reduce(
                        (n, i) => n + (s.L.kinds[s.fish[i]?.kind ?? 0]?.value ?? 0),
                        0,
                    );
                    const available = s.fish
                        .filter((f) => f.at === "sea")
                        .map((f) => s.L.kinds[f.kind]?.value ?? 0);
                    if (!possible(available, s.L.holds - s.pan.length, s.L.target - sum))
                        returnFish(s);
                }
                const tapped =
                    !s.home && !s.flights.length && (s.phase === "rest" || s.phase === "bed");
                stepCast(s, { ...emptyPad(), tapped, go: s.phase === "reel" });
            }
            assert.ok(s.won, `fish ${phase}/${seed}`);
            assert.equal(s.pan.length, s.L.holds);
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
            [35, 2.25],
            [35, 2.625],
            [35, 3],
            [35, 2.25],
            [35, 2.375],
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
            [35, 3.375],
            [35, 3.625],
            [35, 3.75],
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
            [35, 3.625],
            [35, 3.875],
            [35, 3.625],
            [35, 4],
            [35, 2.625],
            [35, 2.75],
            [35, 2.75],
            [35, 2.75],
            [35, 2],
            [35, 2],
            [35, 2.5],
            [35, 2.125],
        ],
    },
    {
        phase: 2,
        seed: 2,
        shots: [
            [35, 3.75],
            [35, 4],
            [35, 3.75],
            [35, 3.75],
            [35, 2.75],
            [35, 2.75],
            [35, 2.75],
            [35, 2.75],
            [35, 2],
            [35, 2.125],
            [35, 2],
            [35, 2],
        ],
    },
    {
        phase: 3,
        seed: 0,
        shots: [
            [35, 3.125],
            [35, 3.375],
            [35, 3.25],
            [35, 3.25],
            [35, 2.25],
            [35, 2.25],
            [35, 2.375],
            [35, 2.375],
            [35, 2],
            [35, 2.25],
            [35, 2.125],
            [35, 2],
        ],
    },
    {
        phase: 3,
        seed: 1,
        shots: [
            [35, 3.25],
            [35, 3.375],
            [35, 3.25],
            [35, 3.25],
            [35, 2.375],
            [35, 2.375],
            [35, 2.375],
            [35, 2.375],
            [35, 2],
            [35, 2.25],
            [35, 2.375],
            [35, 2],
        ],
    },
    {
        phase: 3,
        seed: 2,
        shots: [
            [35, 3.25],
            [35, 3.25],
            [35, 3.375],
            [35, 3.375],
            [35, 2.375],
            [35, 2.75],
            [35, 2.875],
            [35, 2.5],
            [35, 2],
            [35, 2.25],
            [35, 2.375],
            [35, 2],
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
            [35, 3.875],
            [35, 4],
            [35, 2.875],
            [35, 2.875],
            [35, 3],
            [35, 2],
            [35, 2.125],
            [35, 2],
            [35, 2],
            [35, 2],
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
            [35, 3.5],
            [35, 3.875],
            [35, 3.625],
            [35, 3.625],
            [35, 3.625],
            [35, 3.625],
            [35, 2.5],
            [35, 2.875],
            [35, 2.875],
            [35, 2.875],
            [35, 2.625],
            [35, 2.625],
            [35, 2],
            [35, 2],
            [65, 2],
            [35, 2.875],
            [35, 2],
            [35, 2],
        ],
    },
    {
        phase: 5,
        seed: 1,
        shots: [
            [35, 3.625],
            [35, 3.875],
            [35, 4],
            [35, 3.625],
            [35, 3.625],
            [35, 3.625],
            [35, 2.625],
            [35, 3],
            [35, 2.625],
            [35, 2.625],
            [35, 2.625],
            [35, 2.625],
            [35, 2],
            [35, 2.125],
            [35, 2],
            [35, 2],
            [35, 2],
            [35, 2],
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
