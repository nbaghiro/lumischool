// A lesson's `game` block (.docs/game-cards.md): named by a game and a level or by an activity and a
// version, read against the games the workspace is given, refused with its line and column when the
// game or activity is unknown, the level or version is out of range, the form is mixed, or the game
// does not meet the card standard, and compiled to a pack block that reads back through the pack's checker.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readLesson } from "../../pack";
import { compileLesson } from "../compile";
import { CARD_GAMES, type CardGame } from "../games";
import { Workspace } from "../notation";

const GAMES: CardGame[] = [
    {
        id: "jump",
        title: "Rabbit crossing",
        levels: [
            { title: "Carrots", goal: "Hop to the carrot." },
            { title: "Logs", goal: "Ride the log to 20." },
        ],
        card: true,
        plays: { activity: "jump.land-on", levels: [0, 1] },
    },
    {
        id: "shut",
        title: "Shut the box",
        levels: [{ title: "Up to 6", goal: "Up to 6" }],
        card: false,
        plays: null,
    },
];

const lesson = (body: string): Record<string, string> => ({
    "lessons/hop.lumi": `lesson maths.hop v=1 format=teach grade=1 {
  title "Hops"
  try {
${body}
  }
}
`,
});

const issuesOf = (body: string): { message: string; line: number; col: number }[] => {
    const ws = new Workspace(lesson(body), { games: GAMES });
    return ws.file("lesson", "maths.hop").issues.filter((i) => i.level === "error");
};

const blocksOf = (body: string) => {
    const ws = new Workspace(lesson(body), { games: GAMES });
    const l = ws.lessons.get("maths.hop");
    assert.ok(l);
    return compileLesson(ws, l, () => "h").levels.medium.sections.flatMap((s) => s.blocks);
};

test("a game named with a level from 1 compiles to its level from 0 and the level's own goal", () => {
    assert.deepEqual(issuesOf("    game jump level=2"), []);
    assert.deepEqual(blocksOf("    game jump level=2"), [
        { k: "game", game: "jump", level: 1, asks: 1, goal: "Ride the log to 20." },
    ]);
    assert.deepEqual(blocksOf("    game jump"), [
        { k: "game", game: "jump", level: 0, asks: 1, goal: "Hop to the carrot." },
    ]);
});

test("an activity named with a version opens the level its game plays that version at", () => {
    assert.deepEqual(issuesOf('    game jump.land-on version=2 asks=2 goal="Land on 7."'), []);
    assert.deepEqual(blocksOf('    game jump.land-on version=2 asks=2 goal="Land on 7."'), [
        { k: "game", game: "jump", level: 1, asks: 2, goal: "Land on 7." },
    ]);
});

test("each wrong game block is an error at its own line and column", () => {
    const one = (body: string): string => {
        const issues = issuesOf(body);
        assert.equal(issues.length, 1, body);
        const [i] = issues;
        assert.ok(i);
        assert.equal(i.line, 4, body);
        assert.equal(i.col, 5, body);
        return i.message;
    };
    assert.match(one("    game jumpp"), /no game or activity "jumpp" \(did you mean "jump"\?\)/);
    assert.match(one("    game jump level=3"), /levels 1 to 2, not 3/);
    assert.match(one("    game jump level=0"), /levels 1 to 2, not 0/);
    assert.match(one("    game jump.land-on version=3"), /versions 1 to 2, not 3/);
    assert.match(one("    game jump version=1"), /version= is for an activity/);
    assert.match(one("    game jump.land-on level=1"), /level= is for a game/);
    assert.match(one("    game jump asks=0"), /asks= is a whole number from 1/);
    assert.match(one("    game shut"), /Shut the box does not meet the card standard yet/);
});

test("a refused game block compiles to nothing rather than to a card the page cannot play", () => {
    assert.deepEqual(blocksOf("    game shut"), []);
});

test("a compiled game block reads back through the pack's checker, and a broken one is refused", () => {
    const ws = new Workspace(lesson("    game jump level=2"), { games: GAMES });
    const l = ws.lessons.get("maths.hop");
    assert.ok(l);
    const pack = compileLesson(ws, l, () => "h");
    const read = readLesson(JSON.parse(JSON.stringify(pack)));
    assert.ok(read.ok, read.ok ? "" : read.problem);
    assert.deepEqual(read.lesson, pack);
    const broken: unknown = JSON.parse(
        JSON.stringify(pack).replace('"level":1,"asks":1', '"level":-1,"asks":1'),
    );
    const refused = readLesson(broken);
    assert.equal(refused.ok, false);
    assert.match(refused.ok ? "" : refused.problem, /game block holds its game, a level from 0/);
});

test("the catalogue's games are read with their levels and the activities they play", () => {
    const jump = CARD_GAMES.find((g) => g.id === "jump");
    assert.ok(jump);
    assert.equal(jump.title, "Rabbit crossing");
    assert.ok(jump.levels.length >= 2 && jump.levels.every((l) => l.goal.length > 0));
    assert.equal(jump.plays?.activity, "jump.land-on");
    assert.ok(CARD_GAMES.every((g) => g.levels.length > 0));
});
