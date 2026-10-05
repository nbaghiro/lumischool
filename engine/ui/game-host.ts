import type { Drawing } from "../parts/drawing";
import type { Beat, Voicing } from "../motion/beat";
import type { Cue } from "../motion/cues";
import type { Hum } from "../sound/kit";
import type { Pt } from "../motion/geometry";
import type { Feel, Gesture } from "../motion/gesture";
import type { Frame, Scene } from "../motion/scene";
import type { Tape } from "../motion/tape";
import type { GameEvent } from "../motion/goals";
import type { Surface } from "../../school/games/hands";
import type { RoundEnd } from "../../school/games/game";
import type { Tuning } from "../motion/tune";
import type { GuidePose } from "../parts/guide/design";

export interface Shell {
    $<T extends HTMLElement = HTMLElement>(this: void, id: string): T;
    art: Map<string, Drawing<unknown>>;
    still(): boolean;
    paused(): boolean;
    hear(this: void, cue: Cue, how?: { strength?: number; pitch?: number; pan?: number }): void;
    /** The hums an action game asks for now; an empty list lets them fade. */
    hum?(this: void, hums: readonly Hum[]): void;
    guide(this: void, pose: GuidePose): void;
    keys(text: string): void;
    feedback(text: string, won?: boolean): void;
    /** The round's end as it stands, null while play goes on; the page shows its end card from this. */
    ended?(this: void, end: RoundEnd | null, watch: boolean): void;
    rows(
        n: 1 | 2 | 3 | 4,
        title: string,
        rows: [string, string][],
        notes?: string[],
        bad?: boolean,
    ): void;
    tuning(t: Tuning | null, note: string): void;
    room(): { w: number; h: number; side: boolean };
    /** Set where the game is a card in a lesson: the field shows `keep` squares across, round the frame's focus. */
    card?: { keep: number };
    progress?(completed: number, total: number): void;
    observe?(kind: "move" | "assist" | "won", input?: "keyboard" | "pointer"): void;
}

export interface Runtime {
    frame?(t: number): void;
    key(e: KeyboardEvent): void;
    undo?(): void;
    release?(): void;
    command?(id: string): void;
    checkpoint?(): unknown;
    restore?(value: unknown): boolean;
    /** Back to where the game last said a checkpoint was reached. */
    toCheckpoint?(): void;
    /** The finished try played again. */
    watch?(): void;
    redraw(): void;
    resize(): void;
    stop(): void;
    /** What the developer's tools read and drive, for an action game. */
    probe?(): Probe;
}

/** An action game as the developer's tools see it: its state, its tape, its timings, and a way to scrub the try. */
export interface Probe {
    readonly level: number;
    readonly tuning: Tuning | null;
    state(): unknown;
    frame(): Frame;
    tape(): Tape;
    /** The latest events the game said, newest last, with the step each came on. */
    events(): readonly (GameEvent & { step: number })[];
    objectives(): { completed: number; total: number } | null;
    perf(): {
        stepMs: number;
        frameMs: number;
        fps: number;
        sprites: number;
        drawings: number;
        drawMs: number;
        pages: number;
        bytes: number;
    };
    /** Holds the field on the try as it stood after `step`, or goes back to playing with null. */
    view(step: number | null): void;
    viewing(): number | null;
    /** Cuts the try at the step on view and plays on from there. */
    cut(): void;
    /** Replaces the try with a tape and plays on from its end. */
    load(t: Tape): void;
    /** Plays the try from the level's start at the game's own pace. */
    watch(): void;
    /** Changes every frame before it is drawn, for the inspector's ink; null draws frames as they are. */
    overlay(f: ((frame: Frame) => Frame) | null): void;
    toWorld(clientX: number, clientY: number): { x: number; y: number };
}

export interface PointerHooks {
    /** Which handle a press at this point picks up, or null for nothing. In sheet squares. */
    hit(p: Pt): string | null;
    on(g: Gesture, key: string | null): void;
    feel?: Partial<Feel>;
}

/** What a turn game's runtime asks of the board it is played on: the scene view. */
export interface Board extends Surface {
    /** The element that takes the board's keyboard focus. */
    readonly sheet: HTMLElement;
    /** Pixels to a square. */
    readonly sq: number;
    /** Seconds on the board's clock, which every motion is a function of. */
    readonly time: number;
    readonly bounds: { w: number; h: number };
    readonly busy: boolean;
    readonly stats: { renders: number; ms: number };
    play(beat: Beat, scene: Scene, hear: (c: Cue, how?: Voicing) => void): void;
    settle(): void;
    sticker(at: Pt, scale: number): void;
    wake(): void;
    pointer(hooks: PointerHooks): () => void;
    loaded(art: string): void;
    clear(): void;
    ready?(): Promise<void>;
}
