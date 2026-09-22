// The one list of games the Games tab shows: what every entry has to carry, that every level of
// every turn game passes the prover, that no activity was dropped when the tabs became one, and
// that every drawing a game names is on the art shelf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent } from "../../../engine/motion/pad";
import type { Frame } from "../../../engine/motion/scene";
import { ACTIVITIES } from "../activities";
import { prove } from "../prove";
import { GROUPS } from "../game";
import { GAMES, gameById, levelOf } from "../catalogue";
import { snakeGame, SNAKE_LEVELS } from "../snake";
import { roadGame, ROAD, ROAD_LEVELS } from "../road";
import { SLING_LEVELS, slingGame } from "../sling";
import { planeGame } from "../plane";
import { seesawGame } from "../seesaw";
import { cakeGame } from "../cake";
import { shoveGame } from "../shove";

test("every game has an id, a group, a hint and levels, each with a title and the grades it is for", () => {
    const ids = GAMES.map((g) => g.id);
    assert.deepEqual([...new Set(ids)], ids, "two games share an id");
    for (const g of GAMES) {
        assert.ok(
            GROUPS.some((x) => x.id === g.group),
            `${g.id} is in no group`,
        );
        assert.ok(g.title.length > 3 && g.hint.length > 10 && !g.hint.includes("—"), g.id);
        assert.ok(g.levels.length >= 1, `${g.id} has no levels`);
        for (const l of g.levels) {
            assert.ok(
                l.title.length > 2 && !l.title.includes("—"),
                `${g.id}: a level with no title`,
            );
            assert.ok(
                l.grades[0] >= 1 && l.grades[1] <= 4 && l.grades[0] <= l.grades[1],
                `${g.id}: ${l.title} is for grades ${l.grades[0]} to ${l.grades[1]}`,
            );
        }
    }
    for (const x of GROUPS)
        assert.ok(
            GAMES.some((g) => g.group === x.id),
            `nothing in ${x.name}`,
        );
});

test("every level of every puzzle and hands-on game keeps the promise, which is the gate", () => {
    for (const g of GAMES) {
        if (g.group === "action") continue;
        for (const l of g.levels) {
            const p = prove(l.round());
            assert.ok(p.ok, `${g.id}, ${l.title}: ${p.problems.join("; ")}`);
        }
    }
});

test("every version of every activity is a level of some game, so nothing was dropped when the tabs became one", () => {
    for (const a of ACTIVITIES) {
        for (let v = 0; v < a.versions.length; v++)
            assert.ok(levelOf(a.id, v), `${a.id} version ${v} is not played anywhere`);
    }
    assert.equal(
        levelOf("race", 1)?.game.id,
        "straight",
        "a link naming a mechanic opens its first activity, as the old page did",
    );
});

test("the see-saw and the cake are off the Games tab's list, and still open by their address and by the activity they play", () => {
    for (const id of ["weigh", "share"])
        assert.equal(gameById(id)?.listed, false, `${id} opens by its address and is off the list`);
    assert.equal(levelOf("weigh.same-weight", 0)?.game.id, "weigh");
    assert.equal(levelOf("share.fair-shares", 2)?.game.id, "share");
    for (const g of GAMES)
        if (g.id !== "weigh" && g.id !== "share")
            assert.notEqual(g.listed, false, `${g.id} is on the list`);
});

test("every game the old Engine and Arcade links name is on the Games tab, with the levels they named", () => {
    const old: [string, number][] = [
        ["weigh", 2],
        ["shunt", 5],
        ["race", 4],
        ["straight", 1],
        ["snake", 2],
        ["road", 2],
        ["sling", 2],
    ];
    for (const [id, levels] of old) assert.ok((gameById(id)?.levels.length ?? 0) >= levels, id);
});

test("the road steers between the lanes its drawing draws", async () => {
    const { ROAD_LANES } = await import("../../../engine/parts/travel/arcade.road");
    assert.deepEqual(
        [ROAD.top, ROAD.lane, ROAD.lanes, ROAD.view.h],
        [ROAD_LANES.top, ROAD_LANES.lane, ROAD_LANES.lanes, ROAD_LANES.h],
    );
});

test("every drawing a game draws is on the shelf", async () => {
    const known = SHELF_IDS;
    const frames: Frame[] = [
        ...SNAKE_LEVELS.map((_, l) => snakeGame.frame(snakeGame.start(l))),
        ...ROAD_LEVELS.map((_, l) => roadGame.frame(roadGame.start(l))),
        ...SLING_LEVELS.map((_, l) => slingGame.frame(slingGame.start(l))),
    ];
    // The new games draw more of the shelf the longer they run: birds cross, a turtle swims by, the course comes round.
    for (const g of [planeGame] as const) {
        for (let l = 0; l < g.levels.length; l++) {
            const s = g.start(l),
                pad = emptyPad();
            for (let i = 0; i <= 60 * 70; i++) {
                if (i % 600 === 0) frames.push(g.frame(s), g.frame(s, true));
                g.step(s, pad);
                spent(pad);
            }
        }
    }
    // The games built to one direction draw their whole scene from the start, and their finish from what is already there.
    for (const g of [seesawGame, cakeGame, shoveGame] as const)
        for (let l = 0; l < g.levels.length; l++)
            frames.push(g.frame(g.start(l) as never), g.frame(g.start(l) as never, true));
    for (const f of frames)
        for (const s of f.sprites)
            assert.ok(known.has(s.art), `${s.key} asks for ${s.art}, which is not on the shelf`);
    // The drawings a hands-on game adds to its mechanic's board, beside the mechanic's own.
    for (const art of [
        "rabbits",
        "tap",
        "flowers",
        "money",
        "divider",
        "fraction.circle",
        "till",
        "arcade.puff",
        "shuttile",
        "die",
    ])
        assert.ok(known.has(art), art);
    for (const g of GAMES) {
        if (g.group === "action") continue;
        for (const l of g.levels)
            for (const p of l.round().start.board.parts)
                assert.ok(known.has(p.art), `${g.id} draws ${p.art}`);
    }
});
