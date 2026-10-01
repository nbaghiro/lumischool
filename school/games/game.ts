// Every game in one shape, whichever way it plays.
//
// There are three ways a game plays, and the Games tab groups them that way. A puzzle is a mechanic
// played from a tray of moves, where the question is what to do next. A hands-on game is a mechanic
// with real controls on the board: a drag, a push along a rail, an aim let go, each of which chooses
// one of the moves the mechanic already lists, so the prover's guarantee holds for the game a child
// plays. An action game moves on its own at a fixed rate and reads the child's hands every step;
// it has no position graph, and its gate is a set of named invariants and a seeded replay. The
// first two share one runtime and the prover as their gate. All three declare their levels the same
// way: a title, the grades a level is for, and for a turn game the round the prover walks.
import type { Hum, Kit } from "../../engine/sound/kit";
import type { Ctx, Session } from "./hands";
import type { Pt } from "../../engine/motion/geometry";
import type { Dir, Pad } from "../../engine/motion/pad";
import type { Frame, Happening } from "../../engine/motion/scene";
import type { Timeline } from "../../engine/motion/timeline";
import type { Tuning } from "../../engine/motion/tune";
import { bind, type Activity, type Mechanic, type Position, type Round } from "./games";
import type { IconName } from "../../engine/parts/apps/icon";

export type Group = "hands" | "action";

export const GROUPS: { id: Group; name: string; blurb: string }[] = [
    {
        id: "hands",
        name: "Hands on",
        blurb: "Pick things up and put them where they go. Every move is also a button.",
    },
    {
        id: "action",
        name: "Action",
        blurb: "Things move by themselves. There is no clock and nothing to lose.",
    },
];

export interface Level {
    /** What the picker calls it. */
    title: string;
    /** The grades it is for, from one to four. */
    grades: [number, number];
}

/** A level of a turn game: the round the prover walks before the level may ship. */
export interface TurnLevel extends Level {
    round(): Round;
    /** What the guide says as the level opens, while the goal is shown on the board: an authored line that never gives the answer. */
    intro?: string;
}

/** A level of an action game: the one sentence that says what winning means. */
export interface ActionLevel extends Level {
    goal: string;
}

/**
 * The levels a game declares, with the first written as its own member: every game has a level one,
 * so a level number nothing answers falls back to it rather than to nothing.
 */
export type Levels<L extends Level> = [L, ...L[]];

/** A drawing from the shelf, named by id, that stands for a game where games are chosen. */
export interface Cover {
    art: string;
    params?: Record<string, unknown>;
    /** A part of the drawing, in squares from its top-left corner, shown instead of the whole. */
    crop?: { x: number; y: number; w: number; h: number };
}

interface Base {
    /** What `?g=` names in the address. */
    id: string;
    title: string;
    /** How to play, with the keys, in one line. */
    hint: string;
    cover: Cover;
    /**
     * False for a game kept off the Games tab's list: it still opens by its address and by the activity it
     * plays, for the pages and lessons that link to it, and nothing else about it changes.
     */
    listed?: false;
    /** The game's own sounds for the cues it wants different from everyone's. */
    sounds?: Kit;
}

/** A puzzle or a hands-on game: a mechanic, a view of its board, and the tray of its moves. */
export interface TurnGame extends Base {
    group: "hands";
    levels: TurnLevel[];
    /** The sentence that replaces the goal when a round is won, and the one that says why nothing is left to play. */
    ends: { won: string; stuck: string };
    win?: Timeline;
    open(round: Round, ctx: Ctx): Session<Position>;
}

/** An action game: stepped at a fixed rate from a Pad, drawn as a Frame, read aloud as a sentence. */
export interface ActionGame<S> extends Base {
    group: "action";
    levels: ActionLevel[];
    /** Steps per second; the page's fixed loop runs at this rate. */
    rate: number;
    /** Extra buttons under the field; one with an `icon` is drawn as that icon alone, its label kept as its name. */
    commands?: readonly { id: string; label: string; key?: string; icon?: IconName }[];
    command?(s: S, id: string): void;
    /**
     * A design to keep, and putting one back: what a build game saves between tries. Returning to a
     * checkpoint in play needs neither, since the player replays the try up to the step that emitted
     * a `checkpoint` event.
     */
    checkpoint?(s: S): unknown;
    restore?(s: S, value: unknown): boolean;
    /** The buttons under the field: what each arrow it uses is called here, and the big buttons. Every one has a key. */
    controls: {
        arrows?: Partial<Record<Dir, string>>;
        go?: string;
        brake?: string;
        /** Icons for the big buttons, drawn alone in place of their words, which stay as their names. */
        icons?: { go?: IconName; brake?: IconName };
    };
    /** The big button's word now, where one button does different things as the game goes on. */
    goLabel?(s: S): string;
    /** The big button's drawing now, beside `goLabel`, for a round button whose picture follows the game. */
    goIcon?(s: S): IconName;
    start(level: number, seed?: number): S;
    step(s: S, pad: Pad): Happening[];
    /** The position in words, for the text form and a screen reader. */
    say(s: S): string;
    /** What just happened, in a sentence or two, for the line under the goal; empty when nothing has. */
    note(s: S): string;
    won(s: S): boolean;
    objectives?(s: S): { completed: number; total: number };
    frame(s: S, rest?: boolean): Frame;
    /** Where a pull starts, in squares, when there is something to pull: the ball in the sling. */
    pullFrom?(s: S): Pt | null;
    /**
     * Set when a finger or the mouse held on the field is a hand the game follows (the crane's hook
     * goes where the finger is) rather than a swipe. The game reads it from the pad's `touch`.
     */
    touch?: true;
    /**
     * Set when the game reads the pad's `intents`: a second finger turning or pinching with the
     * first, and the wheel or a trackpad's pinch as a zoom.
     */
    intents?: true;
    /** Abandon a held gesture on pause or pointer cancellation, without launching it. */
    cancelInput?(s: S): void;
    /** The numbers that make it feel the way it does, which the review drawer can turn while it runs. */
    tuning?: Tuning;
    /** Takes the last thing back, where the game allows it, and says whether there was one. */
    back?(s: S): boolean;
    /** What goes on sounding while it plays: water running, wind, an engine. */
    hum?(s: S): Hum[];
    /**
     * Seen from above, as a table or a course is: room the page has beyond the authored view is shared
     * above and below it. Left out, the scene is side-on and the room goes to the sky, with the ground
     * kept at the foot of the field.
     */
    seen?: "above";
    /** The field shows where things stand, so the line above it says only what just happened. */
    quiet?: true;
    /**
     * On a phone held upright: `keep` is the squares of width the field shows, larger than the whole
     * view would be, following the frame's `focus`; `hint` offers to turn the phone for a scene too wide
     * to crop. See .docs/engine.md.
     */
    portrait?: { keep?: number; hint?: true };
    /** The activity whose versions this game plays, and the level each version opens, for a link that names the activity. */
    plays?: { activity: string; levels: number[] };
    /**
     * How a press moves the game when motion is reduced. Time moves only when the child acts, and
     * each act is drawn once, at rest: `press` is how many steps a press is worth, and `settling`
     * keeps stepping after it while something the press started is still moving, so a launched ball
     * is drawn where it came to rest and never on its way.
     */
    still: { press(s: S): number; settling?(s: S): boolean };
}

export type Game = TurnGame | ActionGame<unknown>;

/** A grade band in words, for the picker and the level line. */
export const gradeWords = ([a, b]: [number, number]): string =>
    a === b ? `grade ${a}` : `grades ${a} to ${b}`;

/**
 * A game's levels from an activity's versions bound to its mechanic: a title for each, and the
 * grades. A new game declares its activity in its own file and needs no entry in activities.ts.
 */
export function levelsOf<V, S, M>(
    m: Mechanic<V, S, M>,
    a: Activity<V>,
    titles: string[],
    grades: [number, number] = a.grades,
): TurnLevel[] {
    return a.versions.map((_, i) => ({
        title: titles[i] ?? `Level ${i + 1}`,
        grades,
        round: () => bind(m, a, i),
    }));
}
