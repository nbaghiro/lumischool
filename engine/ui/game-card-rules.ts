// A game card's rules, apart from the page: one live card a page, the card's states, the round it opens,
// whether it shows its game's buttons, and the result it reports. See .docs/game-cards.md.
import type { GameChallenge } from "../answer";
import { challengeFor, openChallenge } from "../../school/games/challenges";
import type { Game } from "../../school/games/game";

/** A card is a still picture until it is played, then live, then won or stopped back to its picture. */
export type CardState = "poster" | "live" | "won";

/** What a page's live card must let go of when another card starts. */
export interface Live {
    still(): void;
}

let live: Live | null = null;

/**
 * Makes `card` the page's one live card: a browser keeps about sixteen WebGL contexts, so a lesson with
 * several cards gives the GPU to the one being played and turns the one before back to its picture.
 */
export function claim(card: Live): void {
    if (live && live !== card) live.still();
    live = card;
}

export function release(card: Live): void {
    if (live === card) live = null;
}

export const liveCard = (): Live | null => live;

export type CardEvent = "play" | "still" | "won" | "restart";

/** Where a card goes on an event; a won round stays won until it is restarted or stilled. */
export function next(state: CardState, event: CardEvent): CardState {
    if (event === "still") return "poster";
    if (event === "play" || event === "restart") return "live";
    return state === "live" ? "won" : state;
}

/**
 * The round a card plays: one variation of the level, generated where the game has variations and a
 * seed is given, and the authored level otherwise. A level past the end plays the last, and a level of
 * several asks plays the first `asks` of them where the game declares how.
 */
export function roundOf(
    game: Game,
    level: number,
    seed?: number,
    asks?: number,
): { game: Game; challenge: GameChallenge; level: number; asks: number | null } {
    const at = Math.max(0, Math.min(game.levels.length - 1, Math.round(level)));
    let challenge = challengeFor(game, at, seed ?? 1);
    if (seed !== undefined)
        try {
            const generated = challengeFor(game, at, seed, true);
            openChallenge(game, generated);
            challenge = generated;
        } catch {
            // a level with no certified pool yet plays as authored
        }
    const opened = openChallenge(game, challenge);
    // a level of several asks plays only its first few on a card, where the game can start that way
    const few = asks ?? game.card?.round.asks;
    if (few !== undefined && opened.group === "action" && opened.round) {
        const round = opened.round.bind(opened);
        return {
            game: { ...opened, start: (l) => round(l, few) },
            challenge,
            level: at,
            asks: few,
        };
    }
    return { game: opened, challenge, level: at, asks: null };
}

/**
 * Whether a card shows its game's buttons under the field. A game the field plays by itself (a finger
 * it follows, or a pull from a thing on the field) needs none on a card; one played only by its
 * buttons shows them, as does every turn game, whose tray is how its moves are chosen.
 */
export function showsButtons(game: Game): boolean {
    if (game.group !== "action") return true;
    return game.touch !== true && game.pullFrom === undefined;
}

/** The goal line a card shows: the lesson's own words where it gave some, the level's otherwise. */
export function goalOf(game: Game, level: number, goal?: string): string {
    const own = goal?.trim();
    if (own) return own;
    if (game.group === "action") return game.levels[level]?.goal ?? game.title;
    return game.levels[level]?.round().goal ?? game.title;
}

/** One round played on a card, as the lesson records it. */
export interface CardResult {
    game: string;
    rulesVersion: string;
    challenge: string;
    won: boolean;
    /** Rounds started on this card, the first included. */
    tries: number;
    seconds: number;
    assistance: number;
}

export function resultOf(o: {
    challenge: GameChallenge;
    won: boolean;
    tries: number;
    activeMs: number;
    assistance: number;
}): CardResult {
    return {
        game: o.challenge.game,
        rulesVersion: o.challenge.rulesVersion,
        challenge: o.challenge.id,
        won: o.won,
        tries: Math.max(1, o.tries),
        seconds: Math.round(o.activeMs / 100) / 10,
        assistance: o.assistance,
    };
}
