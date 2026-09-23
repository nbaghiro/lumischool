import { advance, loop } from "./loop";

export function session(
    rate: number,
    step: () => void,
): {
    frame(seconds: number): void;
    pause(paused: boolean): void;
    dispose(): void;
    readonly ticks: number;
} {
    const clock = loop(rate);
    let paused = false,
        disposed = false;
    return {
        frame(seconds) {
            if (!paused && !disposed) advance(clock, seconds, step);
        },
        pause(value) {
            paused = value;
            clock.acc = 0;
        },
        dispose() {
            disposed = true;
            clock.acc = 0;
        },
        get ticks() {
            return clock.steps;
        },
    };
}
