// A fixed-timestep loop ("Fix Your Timestep", Fiedler, 2004), and the ticker that drives one from a
// browser's frames or a test's own clock. A simulation stepped this way gives the same states for the
// same inputs whatever the frame rate, because the step never varies.

interface Loop {
    /** Seconds per step. */
    readonly step: number;
    /** Seconds owed but not yet stepped. */
    acc: number;
    /** Seconds, advanced only by whole steps. */
    time: number;
    steps: number;
}

export const loop = (stepsPerSecond = 120): Loop => ({
    step: 1 / stepsPerSecond,
    acc: 0,
    time: 0,
    steps: 0,
});

/** Seconds: the longest frame a ticker hands on. A longer gap is a tab that was hidden. */
const LONGEST = 0.1;

/**
 * Returns the fraction of a step still owed, for a renderer to interpolate with. The steps taken in
 * one call are capped, so a tab hidden for a minute drops the time it cannot simulate rather than
 * running seven thousand steps on its return. The cap is never less than the ticker's longest frame,
 * or a device at ten frames a second would play slowly. A time that is not finite counts as none.
 */
export function advance(
    l: Loop,
    elapsed: number,
    onStep: (time: number, dt: number) => void,
    maxSteps = 8,
): number {
    l.acc += Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    const most = Math.max(maxSteps, Math.ceil(LONGEST / l.step - 1e-9));
    let n = 0;
    while (l.acc >= l.step && n < most) {
        l.time += l.step;
        l.steps++;
        l.acc -= l.step;
        onStep(l.time, l.step);
        n++;
    }
    if (n === most && l.acc >= l.step) l.acc = 0;
    return l.acc / l.step;
}

export interface Ticker {
    /** Safe to call while running. */
    start(): void;
    stop(): void;
    readonly running: boolean;
    /** Seconds since the ticker first started, as of the last frame. */
    readonly time: number;
    /**
     * Seconds since the ticker first started, as of now. A motion that begins between frames is
     * stamped with this rather than with `time`, or its first frame would find it already over.
     */
    now(): number;
    /** One frame at a wall-clock time in milliseconds; a test calls it with times of its own. */
    frame(nowMs: number): void;
}

interface TickerOptions {
    /** Milliseconds: performance.now, or a test's own clock. */
    now(): number;
    /** requestAnimationFrame, or a test's own queue. */
    schedule(f: (nowMs: number) => void): void;
    /** Seconds since the start and the frame's length. Returning false stops the ticker. */
    onFrame(time: number, dt: number): boolean;
}

export function ticker(o: TickerOptions): Ticker {
    let running = false,
        started = -1,
        last = -1,
        time = 0,
        pending = false;
    const ask = (): void => {
        if (pending) return;
        pending = true;
        o.schedule((t) => {
            pending = false;
            self.frame(t);
        });
    };
    const self: Ticker = {
        get running() {
            return running;
        },
        get time() {
            return time;
        },
        now() {
            return started < 0 ? 0 : (o.now() - started) / 1000;
        },
        start() {
            if (started < 0) started = o.now();
            if (running) return;
            running = true;
            last = -1;
            ask();
        },
        stop() {
            running = false;
        },
        frame(nowMs) {
            if (!running) return;
            // The first frame after a start has nothing to measure from, so it is zero long rather
            // than counting the whole time since the last stop.
            const dt = last < 0 ? 0 : Math.min(LONGEST, Math.max(0, (nowMs - last) / 1000));
            last = nowMs;
            time = (nowMs - started) / 1000;
            let again = false;
            // A frame that throws stops the ticker, so a later start() asks for frames again.
            try {
                again = o.onFrame(time, dt);
            } finally {
                if (again) ask();
                else running = false;
            }
        },
    };
    return self;
}
