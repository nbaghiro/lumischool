import { test } from "node:test";
import assert from "node:assert/strict";
import type { PackItem, PackQuestion } from "../../pack";
import type { Scene, SceneNode } from "../../scene";
import {
    answeredWords,
    asksWhatItDoes,
    codingTarget,
    endWords,
    gridOf,
    playOf,
    pressToy,
    readableListing,
    saidAt,
    sceneTarget,
    settingsAt,
    stepWords,
    toyButtons,
    toyOf,
    touchedBy,
    type CodingTarget,
    type Play,
} from "../coding";

const item = (name: string, settings: Record<string, string> = {}): PackItem => ({
    id: "test",
    hash: "hash",
    title: "Test",
    skills: [],
    check: { name, settings },
});

const question = (nodes: SceneNode[]): PackQuestion => ({
    n: 1,
    variant: "",
    env: {},
    answers: {},
    labels: null,
    ask: "",
    hints: [],
    feedback: [],
    scene: {
        size: [20, 12],
        nodes,
        arrows: [],
        marks: [],
        boxes: { maze: { x: 0, y: 0, w: 8, h: 6 } },
    },
    arranged: null,
    explain: null,
});

test("selects an explicit coding world and its readable listing", () => {
    const q = question([
        { type: "program", id: "listing", v: { code: ["right 1"] }, place: null },
        {
            type: "maze",
            id: "maze",
            v: { code: ["right 1"], cols: 3, rows: 2, flag: [2, 1] },
            place: null,
        },
    ]);
    const target = codingTarget(q, item("coding.runs", { of: "maze" }));
    assert.equal(target?.mode, "run");
    assert.equal(target?.node.id, "maze");
    assert.equal(target?.listing?.id, "listing");
    assert.deepEqual(target && gridOf(target), { cols: 3, rows: 2 });
});

test("holds Run back from a question that asks what its program does, until it is answered", () => {
    const listing = {
        type: "program",
        id: "p",
        v: { code: ["set n to 2", "change n by 3", "say n"] },
        place: null,
    };
    const maze = {
        type: "maze",
        id: "maze",
        v: { code: ["right 1"], cols: 3, rows: 2, flag: [2, 1] },
        place: null,
    };
    const choice = { type: "choice", id: "answer", v: {}, place: null };
    const noCheck: PackItem = { ...item("x"), check: null };
    const ask = (nodes: SceneNode[], answers: Record<string, string>): PackQuestion => ({
        ...question(nodes),
        answers,
    });
    const runs = ask([maze], { col: "2" });
    assert.equal(
        asksWhatItDoes(
            runs,
            item("coding.runs", { of: "maze" }),
            codingTarget(runs, item("coding.runs", { of: "maze" })),
        ),
        true,
    );
    const said = ask([listing], { answer: "5" });
    assert.equal(
        asksWhatItDoes(said, noCheck, codingTarget(said, noCheck)),
        true,
        "a number about a listing",
    );
    const picked = ask([listing, choice], { answer: "yes" });
    assert.equal(
        asksWhatItDoes(picked, noCheck, codingTarget(picked, noCheck)),
        true,
        "a pick about a listing",
    );
    const written = ask([listing], { answer: "a list of names" });
    assert.equal(
        asksWhatItDoes(written, noCheck, codingTarget(written, noCheck)),
        false,
        "words written about it",
    );
    const build = item("coding.builds", { of: "maze", goal: "flag" });
    const built = ask([maze], { answer: "right 1" });
    assert.equal(
        asksWhatItDoes(built, build, codingTarget(built, build)),
        false,
        "a build runs to be marked",
    );
    const plain = ask([], { answer: "4" });
    assert.equal(
        asksWhatItDoes(plain, noCheck, codingTarget(plain, noCheck)),
        false,
        "nothing to play",
    );
    assert.equal(answeredWords(said, { answer: " 7 " }), "Your answer was 7.");
    assert.equal(
        answeredWords(picked, { answer: "yes" }, () => "Yes, it can"),
        "Your answer was Yes, it can.",
    );
    assert.equal(answeredWords(said, {}), "");
});

test("does not treat an illustrative listing as a runnable target", () => {
    const q = question([
        { type: "program", id: "listing", v: { code: ["define square size"] }, place: null },
    ]);
    const node = q.scene?.nodes[0];
    assert.equal(node ? readableListing(node) : true, false);
    assert.equal(codingTarget(q, item("coding.runs", { of: "listing" })), null);
});

test("selects build mode before ordinary playback and recognizes toys", () => {
    const build = question([
        { type: "maze", id: "maze", v: { code: ["right 1"], cols: 2, rows: 1 }, place: null },
    ]);
    assert.equal(codingTarget(build, item("coding.builds", { of: "maze" }))?.mode, "build");
    const toy = question([{ type: "lamps", id: "lamps", v: { bits: 4, n: 3 }, place: null }]);
    assert.equal(codingTarget(toy, item("coding.runs"))?.mode, "toy");
});

const node = (type: string, id: string, v: SceneNode["v"]): SceneNode => ({
    type,
    id,
    v,
    place: null,
});
const scene = (nodes: SceneNode[]): Scene => ({
    size: [36, 20],
    nodes,
    arrows: [],
    marks: [],
    boxes: {},
});
const playing = (target: CodingTarget | null, seed = 1): Play => {
    assert.ok(target?.setup, "the scene has a program to play");
    return playOf(target.setup, target.setup.code, seed);
};

test("plays a readable listing on its own, and lights only a listing of the same program", () => {
    const die = node("program", "p", { code: ["set roll to random 1 to 6", "say roll"] });
    const alone = sceneTarget(scene([die, node("die", "d", { face: 3 })]));
    assert.equal(alone?.mode, "run");
    assert.equal(alone?.node.id, "p");
    const other = node("program", "other", { code: ["right 2"] });
    const maze = node("maze", "m", { code: ["right 1"], cols: 3, rows: 1 });
    assert.equal(sceneTarget(scene([maze, other]))?.listing, null);
    const two = [
        node("program", "a", { code: ["say hi"] }),
        node("program", "b", { code: ["say ho"] }),
    ];
    assert.equal(sceneTarget(scene(two)), null, "two listings are two programs, and neither plays");
});

test("draws fresh random numbers each play, and hands the drawings the same run", () => {
    const s = scene([
        node("program", "p", { code: ["set roll to random 1 to 6", "say roll"] }),
        node("die", "d", { face: 3 }),
    ]);
    const target = sceneTarget(s);
    const rolls = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
        const play = playing(target, seed);
        const [roll] = play.draws;
        assert.ok(roll !== undefined && roll >= 1 && roll <= 6);
        rolls.add(roll);
        assert.deepEqual(play.shown, [`set roll to ${roll}`, "say roll"]);
        assert.equal(
            saidAt(play, play.length),
            String(roll),
            "say roll says the number roll holds",
        );
        const die = s.nodes[1];
        assert.ok(die && target);
        assert.deepEqual(
            touchedBy(s, target, play).map((n) => n.id),
            ["p", "d"],
        );
        assert.deepEqual(settingsAt(die, play, play.length, false), { face: roll });
        assert.match(
            endWords(play, target?.setup ?? assert.fail()),
            new RegExp(`random gave ${roll}`),
        );
    }
    assert.ok(rolls.size >= 5, `forty plays gave only ${[...rolls].join(", ")}`);
});

test("fills a list's cells and rings the item a for each is on", () => {
    const code = ["set hops to list 2, 3, 1", "for each h in hops", "  right h"];
    const s = scene([
        node("maze", "m", { cols: 8, rows: 1, code }),
        node("program", "p", { code }),
        node("listbox", "l", { name: "hops", code: ["set hops to list 2, 3, 1"] }),
    ]);
    const target = sceneTarget(s);
    assert.equal(target?.listing?.id, "p");
    const play = playing(target);
    assert.ok(target);
    assert.deepEqual(
        touchedBy(s, target, play).map((n) => n.id),
        ["m", "p", "l"],
    );
    const list = s.nodes[2];
    assert.ok(list);
    assert.equal(settingsAt(list, play, 0, false), null, "before the run the list is as written");
    const rings = Array.from(
        { length: play.length },
        (_, k) => settingsAt(list, play, k + 1, false)?.mark ?? 0,
    );
    assert.deepEqual(rings, [0, 1, 1, 2, 2, 3, 3]);
    const maze = s.nodes[0];
    assert.ok(maze);
    assert.deepEqual(settingsAt(maze, play, 3, false), { code, upto: 3 });
});

test("writes a name's numbers as the program gives them, a step at a time", () => {
    const code = ["set n to 4", "repeat 2", "  add 3 to n"];
    const s = scene([
        node("program", "p", { code }),
        node("variable", "v", { name: "n", code, blank: true }),
    ]);
    const target = sceneTarget(s);
    assert.equal(target?.node.id, "v", "the box is the drawing the program runs in");
    const play = playing(target);
    const box = s.nodes[1];
    assert.ok(box);
    assert.deepEqual(settingsAt(box, play, 2, false)?.code, ["set n to 4"]);
    assert.deepEqual(settingsAt(box, play, play.length, false)?.code, [
        "set n to 4",
        "set n to 7",
        "set n to 10",
    ]);
});

test("fills a trace table only as far as the rows it gave, unless the sheet is read", () => {
    const code = ["right 1", "right 1", "right 1"];
    const table = node("tracetable", "t", { code, filled: 1 });
    const target = sceneTarget(scene([table]));
    const play = playing(target);
    assert.equal(settingsAt(table, play, 3, false)?.filled, 1);
    assert.equal(settingsAt(table, play, 3, true)?.filled, 3);
});

test("plays a lamp row until it is full, and says so", () => {
    const row = node("pixels", "px", {
        cols: 6,
        rows: 1,
        code: ["repeat for ever", "  light red", "  light blue"],
    });
    const target = sceneTarget(scene([row]));
    const play = playing(target);
    assert.ok(play.length < play.run.frames.length);
    assert.match(endWords(play, target?.setup ?? assert.fail()), /^The row is full: 6 lights/);
});

test("plays the four toys a tap at a time", () => {
    const lamps = node("lamps", "l", { bits: 4, n: 5 });
    let toy = toyOf(lamps);
    assert.deepEqual(
        toyButtons(lamps, toy).map((b) => b.pressed),
        [false, true, false, true],
    );
    toy = pressToy(lamps, toy, 0);
    assert.equal(toy.settings.n, 13);
    assert.equal(toy.said, "The 8 lamp is on. The lamps show 13.");

    const cards = node("sortcards", "c", { cards: [5, 2, 7] });
    toy = pressToy(cards, toyOf(cards), 0);
    assert.deepEqual(toy.settings, { cards: [2, 5, 7], compare: 1, swap: true });
    assert.match(toy.said, /The cards are in order\.$/);
    toy = pressToy(cards, toy, 1);
    assert.equal(toy.settings.swap, false);
    assert.equal(toy.moves, 1, "a pair already in order is not a swap");

    const cups = node("cups", "u", { cards: [2, 5, 8, 11, 14], target: 11 });
    toy = pressToy(cups, toyOf(cups), 2);
    assert.match(toy.said, /^Cup 3 hides 8\. 11 is bigger/);
    toy = pressToy(cups, toy, 3);
    assert.equal(toy.said, "Cup 4 hides 11. That is 11, found in 2 lifts.");
    assert.deepEqual(toy.settings.open, [3, 4]);

    const net = node("sortnet", "n", {
        inputs: [4, 1, 3, 2],
        pairs: [1, 2, 3, 4, 1, 3, 2, 4, 2, 3],
    });
    toy = toyOf(net);
    for (let i = 0; i < 5; i++) toy = pressToy(net, toy, 0);
    assert.equal(toy.settings.upto, 5);
    assert.match(toy.said, /They come out as 1, 2, 3, 4\.$/);
    assert.equal(pressToy(net, toy, 0), toy, "past the last bridge nothing moves");
});

test("draws a sensor's reading and what the program switched at every step", () => {
    const code = [
        "repeat 6",
        "  if temp is less than 14",
        "    switch heater on",
        "  if temp is more than 15",
        "    switch heater off",
        "  wait 1",
    ];
    const sense = ["temp starts 15 changes -1 heater 2"];
    const s = scene([
        node("program", "p", { code, sense }),
        node("flowchart", "f", { code, sense }),
        node("thermometer", "th", { from: 0, to: 30, step: 10, value: 15 }),
        node("jug", "j", { max: 1000, step: 200, level: 350 }),
        node("switched", "sw", { names: ["heater"], on: [] }),
    ]);
    const target = sceneTarget(s);
    assert.equal(target?.node.id, "p", "a listing and its flowchart are one program");
    assert.ok(target);
    const play = playing(target);
    assert.deepEqual(
        touchedBy(s, target, play).map((n) => n.id),
        ["p", "f", "th", "sw"],
        "the jug shows no reading the program takes",
    );
    const [, chart, th, , sw] = s.nodes;
    assert.ok(chart && th && sw);
    assert.deepEqual(settingsAt(th, play, 0, false), { value: 15 });
    const minutes = play.run.frames.flatMap((f, i) =>
        f.kind === "rest" ? [settingsAt(th, play, i + 1, false)?.value] : [],
    );
    assert.deepEqual(minutes, [14, 13, 14, 15, 16, 15], "cools, warms by 1 with the heater on");
    const on = play.run.frames.flatMap((f, i) =>
        f.kind === "switch" ? [settingsAt(sw, play, i + 1, false)?.on] : [],
    );
    assert.deepEqual(on[0], ["heater"]);
    assert.deepEqual(on.at(-1), []);
    const lit = play.run.frames[1];
    assert.ok(lit);
    assert.deepEqual(settingsAt(chart, play, 2, false), { run: lit.line });
    assert.match(
        stepWords(play, "program", play.length),
        /Minute 6: temp reads \d+ and the heater is (on|off)\./,
    );
});
