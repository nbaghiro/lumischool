import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyLine, groupsOf, insert, remove, step, unhook, type Line, type Rules } from "../rail";
import { seeded } from "../spawn";

const DT = 1 / 60;
const RULES: Rules = { ends: [0, 60], gaps: [], couple: 3, give: 0.3, rebound: 0.4 };

const car = (id: string, x: number, v = 0, slows = 2) => ({ id, x, v, length: 5, mass: 1, slows });
const engine = (x: number, v = 0) => ({ id: "loco", x, v, length: 5, mass: 3, slows: 30 });

function lineOf(...vehicles: ReturnType<typeof car>[]): Line {
    const line = emptyLine();
    for (const x of vehicles) insert(line, { ...x });
    return line;
}

const run = (line: Line, seconds: number, rules = RULES, driven: string | null = null) => {
    const events = [];
    for (let i = 0; i < seconds * 60; i++) events.push(...step(line, DT, rules, driven));
    return events;
};

const edgesOf = (line: Line) =>
    line.vehicles.map((v) => [v.x - v.length / 2, v.x + v.length / 2] as [number, number]);

function sound(line: Line, rules = RULES): void {
    const e = edgesOf(line);
    for (let i = 0; i < e.length; i++) {
        const [l, r] = e[i] ?? [0, 0];
        assert.ok(
            l >= rules.ends[0] - 1e-6 && r <= rules.ends[1] + 1e-6,
            `${line.vehicles[i]?.id} is off the line`,
        );
        const next = e[i + 1];
        if (next)
            assert.ok(
                r <= next[0] + 1e-6,
                `${line.vehicles[i]?.id} overlaps ${line.vehicles[i + 1]?.id}`,
            );
        for (const [a, b] of rules.gaps)
            assert.ok(r <= a + 1e-6 || l >= b - 1e-6, `${line.vehicles[i]?.id} is in a gap`);
    }
}

test("vehicles are kept in order of place, and the coupled runs are the groups", () => {
    const line = lineOf(car("b", 20), car("a", 10), car("c", 30));
    assert.deepEqual(
        line.vehicles.map((v) => v.id),
        ["a", "b", "c"],
    );
    assert.deepEqual(groupsOf(line), [
        [0, 0],
        [1, 1],
        [2, 2],
    ]);
    line.hooked[0] = true;
    assert.deepEqual(groupsOf(line), [
        [0, 1],
        [2, 2],
    ]);
    assert.equal(remove(line, "b")?.id, "b");
    assert.deepEqual(groupsOf(line), [
        [0, 0],
        [1, 1],
    ]);
    assert.equal(remove(line, "zz"), null);
});

test("a carriage that closes gently hooks on and the pair then moves as one", () => {
    const line = lineOf(car("a", 10, 2, 0), car("b", 20));
    const events = run(line, 6);
    const met = events.find((e) => e.kind === "couple");
    assert.ok(
        met &&
            met.kind === "couple" &&
            met.left === "a" &&
            met.right === "b" &&
            met.speed <= RULES.couple,
    );
    assert.ok(line.hooked[0]);
    assert.ok(!events.some((e) => e.kind === "knock"));
    const [a, b] = line.vehicles;
    assert.ok(a && b && Math.abs(b.x - a.x - 5) < 1e-6, "coupled buffers touch");
    sound(line);
});

test("a carriage that closes fast knocks the next on, which rolls away faster than it and slows by itself", () => {
    const line = lineOf(car("a", 10, 9), car("b", 20));
    const events = run(line, 1);
    const hit = events.find((e) => e.kind === "knock");
    assert.ok(hit && hit.kind === "knock" && hit.speed > RULES.couple);
    assert.ok(!line.hooked[0]);
    const [a, b] = line.vehicles;
    assert.ok(a && b && b.v > a.v && b.v > 0, "the knocked carriage rolls on ahead");
    const before = b.v;
    run(line, 1);
    assert.ok(b.v < before, "it slows as it rolls");
    run(line, 20);
    assert.equal(b.v, 0);
    assert.equal(a.v, 0);
    sound(line);
});

test("a rolling carriage bounces off the end with the rebound share of its speed and never passes it", () => {
    const line = lineOf(car("a", 50, 8, 0));
    let bounced = false;
    for (let i = 0; i < 120; i++) {
        const events = step(line, DT, RULES, null);
        sound(line);
        const stop = events.find((e) => e.kind === "stop");
        if (stop && stop.kind === "stop") {
            bounced = true;
            assert.ok(Math.abs(line.vehicles[0]?.v ?? 0) - 8 * RULES.rebound < 1e-6);
            assert.ok((line.vehicles[0]?.v ?? 0) < 0);
        }
    }
    assert.ok(bounced);
});

test("a driven engine cannot push a carriage through the end: both stop against it and nothing overlaps", () => {
    const line = lineOf(engine(40), car("a", 48));
    const loco = line.vehicles[0];
    assert.ok(loco);
    for (let i = 0; i < 180; i++) {
        loco.v = 12;
        step(line, DT, RULES, "loco");
        sound(line);
    }
    const a = line.vehicles[1];
    assert.ok(a && Math.abs(a.x + 2.5 - 60) < 1e-6, "the carriage is against the end");
    assert.ok(Math.abs(loco.x + 2.5 - (a.x - 2.5)) < 1e-6, "the engine is against the carriage");
    assert.equal(loco.v, 0);
    assert.equal(a.v, 0);
});

test("a gap in the line stops a carriage at its edge from either side", () => {
    const rules: Rules = { ...RULES, gaps: [[27, 33]] };
    const left = lineOf(car("a", 15, 10, 0));
    run(left, 2, rules);
    sound(left, rules);
    assert.ok((left.vehicles[0]?.x ?? 0) + 2.5 <= 27 + 1e-6);
    const right = lineOf(car("b", 45, -10, 0));
    run(right, 2, rules);
    sound(right, rules);
    assert.ok((right.vehicles[0]?.x ?? 0) - 2.5 >= 33 - 1e-6);
});

test("a pair let go by hand shoves along without a hook until they have parted, and then hooks on again", () => {
    const line = lineOf(engine(10), car("a", 15));
    run(line, 0.1);
    line.hooked[0] = true;
    assert.ok(unhook(line, 0));
    assert.ok(!unhook(line, 0));
    assert.ok(line.parted[0]);
    const loco = line.vehicles[0];
    assert.ok(loco);
    const before = line.vehicles[1]?.x ?? 0;
    for (let i = 0; i < 30; i++) {
        loco.v = 2;
        step(line, DT, RULES, "loco");
    }
    assert.ok((line.vehicles[1]?.x ?? 0) > before + 0.5, "shoved along");
    assert.ok(!line.hooked[0], "but not hooked");
    for (let i = 0; i < 60; i++) {
        loco.v = -2;
        step(line, DT, RULES, "loco");
    }
    assert.ok(!line.parted[0], "parted, once they are apart");
    for (let i = 0; i < 120; i++) {
        loco.v = 2;
        step(line, DT, RULES, "loco");
    }
    assert.ok(line.hooked[0], "hooked on again");
});

test("whatever is driven, nothing passes anything or leaves the line, and the same driving gives the same line", () => {
    const play = (seed: number) => {
        const rand = seeded(seed);
        const line = lineOf(engine(4), car("a", 12), car("b", 20), car("c", 30), car("d", 52));
        const loco = line.vehicles[0];
        assert.ok(loco);
        for (let i = 0; i < 60 * 30; i++) {
            if (i % 45 === 0) loco.v = (rand() - 0.4) * 30;
            if (i % 200 === 100) for (let k = 0; k < 4; k++) if (rand() < 0.3) unhook(line, k);
            step(line, DT, RULES, rand() < 0.9 ? "loco" : null);
            sound(line);
            assert.deepEqual(
                line.vehicles.map((v) => v.id),
                ["loco", "a", "b", "c", "d"],
            );
        }
        return line.vehicles.map((v) => `${v.x.toFixed(6)}:${v.v.toFixed(6)}`).join(" ");
    };
    for (const seed of [1, 2, 3]) assert.equal(play(seed), play(seed));
    assert.notEqual(play(1), play(2));
});
