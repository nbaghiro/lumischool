import type { Drawing } from "../parts/drawing";
import type { Cue } from "../motion/cues";
import type { Tuning } from "../motion/tune";
import type { GuidePose } from "../parts/guide/design";

export interface Shell {
    $<T extends HTMLElement = HTMLElement>(this: void, id: string): T;
    art: Map<string, Drawing<unknown>>;
    still(): boolean;
    paused(): boolean;
    hear(this: void, cue: Cue): void;
    guide(this: void, pose: GuidePose): void;
    keys(text: string): void;
    rows(
        n: 1 | 2 | 3 | 4,
        title: string,
        rows: [string, string][],
        notes?: string[],
        bad?: boolean,
    ): void;
    tuning(t: Tuning | null, note: string): void;
    room(): { w: number; h: number; side: boolean };
}

export interface Runtime {
    frame?(t: number): void;
    key(e: KeyboardEvent): void;
    undo?(): void;
    release?(): void;
    command?(id: string): void;
    checkpoint?(): unknown;
    restore?(value: unknown): boolean;
    redraw(): void;
    resize(): void;
    stop(): void;
}
