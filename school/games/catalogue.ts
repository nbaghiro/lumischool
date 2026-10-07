import { rallyGame } from "./rally";
import { golfGame } from "./golf";
import { poolGame } from "./pool";
import { pinballGame } from "./pinball";
import { curlingGame } from "./curling";
import { hoopsGame } from "./hoops";
import { clearGame } from "./clear";
import { swingsGame } from "./swings";
import { fetchGame } from "./fetch";
import { rescueGame } from "./rescue";
import { lemonadeGame } from "./lemonade";
import { dollhouseGame } from "./dollhouse";
import { gardenGame } from "./garden";
import { climbGame } from "./climb";
import { machineGame } from "./machine";
import { bridgeGame } from "./bridgebuild";
import { feedGame } from "./feedpup";
// Every game, in the order the Games tab shows them, grouped by how each one plays. The hands-on
// games are played by moving things on a board, with a tray that is the keyboard path and the one a
// screen reader reads, and every level of them is gated by the prover; the action games are played
// through the pad. See .docs/games.md.
import { ACTIVITIES } from "./activities";
import type { Game } from "./game";
import { rabbitGame } from "./rabbit";
import { shoveGame } from "./shove";
import { pourGame } from "./pour-hands";
import { ruleGame } from "./rule";
import { rowGame } from "./row";
import { fishingGame } from "./fishing";
import { raftsGame } from "./rafts";
import { planeGame } from "./plane";
import { roadGame } from "./road";
import { cakeGame } from "./cake";
import { yardGame } from "./yard";
import { slingGame } from "./sling";
import { snakeGame } from "./snake";
import { shutGame } from "./shut-hands";
import { seesawGame } from "./seesaw";
import { cargoGame } from "./workshops";
import { marbleGame } from "./marble";
import { trainGame } from "./train";

/**
 * Every game. Adding one is one entry here: the picker groups the list by each game's `group` and
 * keeps this order inside a group, and the page runs a game by its group.
 */
export const GAMES: Game[] = [
    cargoGame,
    marbleGame,
    trainGame,
    ruleGame,
    rabbitGame,
    rowGame,
    yardGame,
    pourGame,
    shutGame,
    slingGame,
    seesawGame,
    shoveGame,
    cakeGame,
    snakeGame,
    roadGame,
    raftsGame,
    fishingGame,
    planeGame,
    golfGame,
    poolGame,
    pinballGame,
    curlingGame,
    hoopsGame,
    rallyGame,
    swingsGame,
    fetchGame,
    rescueGame,
    lemonadeGame,
    dollhouseGame,
    gardenGame,
    climbGame,
    machineGame,
    bridgeGame,
    feedGame,
    clearGame,
];

/** Retired games, by id, and the game an old address that names one opens instead. */
const RETIRED: Partial<Record<string, string>> = { race: "rally" };

/** A game by its id, as `?g=` names it. */
export const gameById = (id: string | null): Game | undefined => {
    const wanted = (id === null ? undefined : RETIRED[id]) ?? id;
    return GAMES.find((g) => g.id === wanted);
};

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
