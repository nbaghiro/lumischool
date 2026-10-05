// The games a lesson may play as a card (.docs/game-cards.md), as the compiler reads them: plain data
// taken from the catalogue, so a workspace can be handed another list and a test need not load a game.
import { GAMES } from "../../school/games/catalogue";
import type { Game } from "../../school/games/game";

export interface CardGame {
    id: string;
    title: string;
    /** Each level's title and the line its card shows over the field, in the game's order from 0. */
    levels: { title: string; goal: string }[];
    /** Whether the game declares how it plays as a card, which is what the card standard holds it to. */
    card: boolean;
    /** The activity the game plays, and the level each of its versions opens, from 0. */
    plays: { activity: string; levels: number[] } | null;
}

export const cardGame = (g: Game): CardGame => ({
    id: g.id,
    title: g.title,
    levels: g.levels.map((l) => ({
        title: l.title,
        goal: "goal" in l && typeof l.goal === "string" ? l.goal : l.title,
    })),
    // a game that cannot meet the card standard declares `card: null`, and cannot go in a lesson
    card: g.card !== null,
    plays:
        "plays" in g && g.plays
            ? { activity: g.plays.activity, levels: [...g.plays.levels] }
            : null,
});

export const CARD_GAMES: readonly CardGame[] = GAMES.map(cardGame);

/** A game block resolved: the game, its level from 0, how many asks the round plays and its goal line. */
export interface CardRound {
    game: CardGame;
    level: number;
    asks: number;
    goal: string;
}

/** What a `game` block writes, before it is read against the games. */
export interface GameBlock {
    of: string;
    level?: number;
    version?: number;
    asks?: number;
    goal?: string;
}

const whole = (n: number): boolean => Number.isInteger(n) && n >= 1;

/**
 * The round a `game` block names, or what is wrong with it. A block names a game by its id and a level
 * from 1, or an activity by its id and a version from 1, which the game playing it opens at its level.
 */
export function roundOf(
    b: GameBlock,
    games: readonly CardGame[],
    near: (name: string, options: readonly string[]) => string,
): { round: CardRound } | { problem: string } {
    const byGame = games.find((g) => g.id === b.of);
    const byActivity = byGame ? undefined : games.find((g) => g.plays?.activity === b.of);
    let game: CardGame;
    let level: number;
    if (byGame) {
        if (b.version !== undefined)
            return { problem: `version= is for an activity; name a level of ${b.of} with level=` };
        const n = b.level ?? 1;
        if (!whole(n) || n > byGame.levels.length)
            return {
                problem: `${byGame.title} has levels 1 to ${byGame.levels.length}, not ${n}`,
            };
        game = byGame;
        level = n - 1;
    } else if (byActivity?.plays) {
        if (b.level !== undefined)
            return { problem: `level= is for a game; name a version of ${b.of} with version=` };
        const n = b.version ?? 1;
        const opens = byActivity.plays.levels[n - 1];
        if (!whole(n) || opens === undefined)
            return {
                problem: `${b.of} has versions 1 to ${byActivity.plays.levels.length}, not ${n}`,
            };
        game = byActivity;
        level = opens;
    } else {
        const names = [
            ...games.map((g) => g.id),
            ...games.flatMap((g) => (g.plays ? [g.plays.activity] : [])),
        ];
        return { problem: `there is no game or activity "${b.of}"${near(b.of, names)}` };
    }
    if (!game.card)
        return {
            problem: `${game.title} does not meet the card standard yet, so it cannot be played in a lesson (.docs/game-cards.md)`,
        };
    const asks = b.asks ?? 1;
    if (!whole(asks)) return { problem: `asks= is a whole number from 1, not ${asks}` };
    const goal = b.goal ?? game.levels[level]?.goal ?? game.title;
    return { round: { game, level, asks, goal } };
}
