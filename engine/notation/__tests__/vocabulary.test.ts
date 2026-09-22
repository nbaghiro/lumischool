// The vocabulary is read off the catalogue, so every drawing a lesson places is a scene type, and the
// four art moves in flight when the notation moved in (C7 game pieces, C8 food and page, D2 painting,
// D3 chemistry) each landed with the ids the corpus already wrote.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loaderOf } from "../../parts/catalog";
import { parse, type Node } from "../notation";
import { PARTS, REGISTRY, SCENE_TYPES } from "../vocabulary";
import { content } from "./helpers";

/** The drawings the four moves brought in, from .scratchpad/leftover/parts-move/briefs/. */
const MOVED = {
    C7: "crane fulcrum pegboard rocket arcade.ground arcade.puff arcade.road arcade.sling tap catchscale fx.drop fish hoop meadow scalepole sea sheep sheeppen fx.sparkle tackle die shutbox shuttile cakeknife longcake seesawplank shoveboard seesawprops raft joindots dig goalposts grandstand longjump medalrow podium racecar racecircuit racetrack scoreboard target teamgrid bufferstop coupling liftpit orderboard railway yardlever current mooringbuoy riverpost rowboat carrot reeds steppingstone swimmingrabbit",
    C8: "bakingtray chocolate eggbox pile spoons mixingbowl pizza recipe worktop oven callout divider pinned steps stickers choice pattern",
    D2: "arttools collage colourwheel dots layers linewalk lines mirrorpick mixingtray oneline paintbox paintpots paintsheet palette printrow radial rubbing stamps stencil stilllife sunprint tilerepeat tintladder tonescale",
    D3: "atombox beaker beforeafter cabbage candle condense crystalstring cylinder dish dropper fizz flame flask fossilsteps funnel heatcurve icemelt magnifier materials mixture molecule nails particles rocks safety sieve soiljar squash testtubes watercycle",
};

test("the four art moves landed every id they were briefed with, and each is a scene type", () => {
    const missing: string[] = [];
    for (const [move, ids] of Object.entries(MOVED))
        for (const id of ids.split(" ")) {
            if (!loaderOf(id)) missing.push(`${move}: ${id} is not in the catalogue`);
            else if (id.includes(".")) continue;
            else if (!REGISTRY[id]?.scene) missing.push(`${move}: ${id} is not a scene type`);
        }
    assert.equal(Object.values(MOVED).flatMap((ids) => ids.split(" ")).length, 127);
    assert.deepEqual(missing, []);
});

test("every drawing the catalogue names by a word is a part, and a hand-written node keeps its own shape", () => {
    for (const [id, part] of PARTS) {
        assert.equal(part.d.id, id);
        assert.ok(REGISTRY[id]?.scene, `${id} is not a scene type`);
    }
    for (const t of SCENE_TYPES) assert.ok(REGISTRY[t], t);
    // a hand-written entry wins over the drawing of the same id
    assert.deepEqual(REGISTRY.balance?.anchors, [
        "pivot",
        "left-pan",
        "right-pan",
        "base",
        "beam-l",
        "beam-r",
    ]);
    assert.ok(PARTS.size > 500, `only ${PARTS.size} parts`);
});

test("every scene node the corpus writes is a type the vocabulary knows", () => {
    const used = new Set<string>();
    const walk = (nodes: Node[]): void => {
        for (const n of nodes) {
            used.add(n.type);
            if (n.children) walk(n.children);
        }
    };
    for (const src of Object.values(content())) walk(parse(src).doc.nodes);
    assert.deepEqual([...used].filter((t) => !REGISTRY[t]).sort(), []);
});
