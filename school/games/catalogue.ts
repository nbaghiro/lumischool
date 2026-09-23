// Every game, in the order the Games tab shows them, grouped by how each one plays.
//
// Two mechanics are played as puzzles from a tray of moves, because the question in them is which
// move to make: which number to feed the machine, and which sound goes in the next box. The rule
// machine is drawn as a machine the balls and cards can also be put into (rule-hands.ts), and stays a
// puzzle because doing so changes none of the thinking. Nine are played by hand, three of them
// rebuilt that way first (the balance, the yard and the race), five after (the number line, the
// till, the plates, the jugs, and the straight, which is the race one lane deep), and shut the box,
// a dice game built for the hand from the start. Three are action games. Every turn game still has
// its tray, which is the keyboard path and the one a screen reader reads, and every level of every
// turn game is gated by the prover. See .docs/games.md.
import { ACTIVITIES, type Listed } from "./activities";
import { puzzle, type Game, type TurnLevel } from "./game";
import { rabbitGame } from "./rabbit";
import { shoveGame } from "./shove";
import { pourGame } from "./pour-hands";
import { ruleGame } from "./rule-hands";
import { raceGame } from "./race-hands";
import { rowGame } from "./row";
import { castGame } from "./cast";
import { raftsGame } from "./rafts";
import { planeGame } from "./plane";
import { roadGame } from "./road";
import { cakeGame } from "./cake";
import { yardGame } from "./yard";
import { slingGame } from "./sling";
import { snakeGame } from "./snake";
import { shutGame } from "./shut-hands";
import { seesawGame } from "./seesaw";
import { cargoGame, marbleGame } from "./workshops";

const activity = (kind: string): Listed => {
    const a = ACTIVITIES.find((x) => x.kind === kind);
    if (!a) throw new Error(`no activity plays ${kind}`);
    return a;
};

/** The levels of a listed activity. The titles do not say the version's values, because for these two the values are the answer. */
const listedLevels = (a: Listed, titles: string[]): TurnLevel[] =>
    a.versions.map((_, i) => ({
        title: titles[i] ?? `Level ${i + 1}`,
        grades: a.grades,
        round: () => a.round(i),
    }));

export const spellGame = puzzle({
    id: "spell",
    title: "Spell the picture",
    hint: "Tap a sound to put it in the next box",
    cover: { art: "soundboxes", params: { boxes: 3, filled: ["sh", "i", "p"], counters: false } },
    levels: listedLevels(activity("spell"), [
        "Three sounds",
        "Three sounds, four letters",
        "Four sounds",
        "Four sounds, and a choice",
    ]),
    ends: {
        won: "That is how it is spelled.",
        stuck: "Every box is full. Take the last sound out.",
    },
});

/**
 * Every game. Adding one is one entry here: the picker groups the list by each game's `group` and
 * keeps this order inside a group, and the page runs a game by its group.
 */
export const GAMES: Game[] = [
    cargoGame,
    marbleGame,
    spellGame,
    ruleGame,
    rabbitGame,
    rowGame,
    yardGame,
    pourGame,
    raceGame,
    shutGame,
    slingGame,
    seesawGame,
    shoveGame,
    cakeGame,
    snakeGame,
    roadGame,
    raftsGame,
    castGame,
    planeGame,
];

/** A game by its id, as `?g=` names it. */
export const gameById = (id: string | null): Game | undefined => GAMES.find((g) => g.id === id);

/**
 * The game and level an activity's version is played at, for an address that names an activity by
 * its id or its mechanic, as the journal's links and the old Games page's did.
 */
export function levelOf(activity: string, version: number): { game: Game; level: number } | null {
    for (const g of GAMES) {
        if (g.group === "action") {
            const a = g.plays ? ACTIVITIES.find((x) => x.id === g.plays?.activity) : undefined;
            const level =
                a && (a.id === activity || a.kind === activity)
                    ? g.plays?.levels[version]
                    : undefined;
            if (level !== undefined) return { game: g, level };
            continue;
        }
        const i = g.levels.findIndex((l) => {
            const r = l.round();
            return (r.id === activity || r.kind === activity) && r.version === version;
        });
        if (i >= 0) return { game: g, level: i };
    }
    return null;
}
