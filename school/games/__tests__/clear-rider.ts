// Riders for Clear round's tests: a steady tapper on the screen, or the keys to a plan found by
// clear-challenges.ts, riding a round through the game itself and keeping what was pressed on a tape.
import type { Pad } from "../../../engine/motion/pad";
import { recordStep, type Tape } from "../../../engine/motion/tape";
import { clearGame, type ClearState } from "../clear";
import { ridePlan, skilful, steady } from "../clear-challenges";

/** The keys to the plan for this round's course, or null when there is none. */
export function keysFor(s: ClearState): ((s: ClearState) => Pad) | null {
    const plan = ridePlan(s.course);
    return plan ? (t) => skilful(t, plan) : null;
}

/** Rides to the end of the round or `most` steps, and says whether every fence was jumped. */
export function ride(
    s: ClearState,
    rider: ((s: ClearState) => Pad) | null = steady,
    tape?: Tape,
    most = 60 * 120,
): boolean {
    for (let i = 0; rider && i < most && !s.done; i++) {
        const pad = rider(s);
        if (tape) recordStep(tape, pad);
        clearGame.step(s, pad);
    }
    return clearGame.won(s);
}
