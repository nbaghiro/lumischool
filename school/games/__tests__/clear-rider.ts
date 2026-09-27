// A rider for Clear round's tests: it rides a plan from clear-challenges.ts through the game itself,
// choosing each stride before the fall it starts at, and holding each gather for its steps so that the
// hand comes off in the stride before the leap. What it pressed is kept on a tape, for the replay.
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { recordStep, type Tape } from "../../../engine/motion/tape";
import { canter, clearGame, GATHER, RATE, type ClearState } from "../clear";
import type { Fall } from "../clear-challenges";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** The pad for this step of riding the plan. */
export function riding(s: ClearState, plan: readonly Fall[]): Pad {
    const pad = emptyPad();
    const leapt = s.flight
        ? plan.find((f) => f.hold !== undefined && near(f.at, s.flight?.from ?? NaN))
        : undefined;
    const here = s.flight ? undefined : plan.find((f) => near(f.at, s.fall));
    const want = leapt ? leapt.after : here?.hold === undefined ? here?.want : undefined;
    if (want !== undefined && want !== s.want) pad.pressed.push(want < s.want ? "left" : "right");
    if (s.flight || s.turn) return pad;
    const leap = plan.find((f) => f.hold !== undefined && f.at > s.fall + 1e-6);
    if (!leap?.hold) return pad;
    const full = GATHER * RATE;
    if (s.holding) {
        pad.go = s.power < leap.hold / full - 1e-9;
        return pad;
    }
    if (s.asked !== null) return pad;
    pad.go = stepsTo(s, plan, leap.at) <= leap.hold + 2;
    return pad;
}

/** Steps until the pony's hooves fall at `at`, cantering on as the plan chooses its strides. */
function stepsTo(s: ClearState, plan: readonly Fall[], at: number): number {
    const pony = { ...s.pony };
    let fall = s.fall,
        stride = s.stride,
        want = s.want;
    for (let n = 1; n < 60 * 20; n++) {
        canter(pony, stride);
        while (pony.x >= fall + stride - 1e-9) {
            if (near(fall + stride, at)) return n;
            fall += stride;
            stride = want;
            want = plan.find((f) => near(f.at, fall))?.want ?? want;
        }
    }
    return Infinity;
}

/** Rides the plan to the end of the round or `most` steps, and says whether the round was clear. */
export function ride(s: ClearState, plan: readonly Fall[], tape?: Tape, most = 60 * 90): boolean {
    for (let i = 0; i < most && !s.done; i++) {
        const pad = riding(s, plan);
        if (tape) recordStep(tape, pad);
        clearGame.step(s, pad);
    }
    return clearGame.won(s);
}
