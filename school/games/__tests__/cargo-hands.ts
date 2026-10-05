// Harbour cargo's hands for tests: the harbour stepped with a pad that is kept, and every crate dragged
// to its planned place and let go, as a finger on the field does it.
import assert from "node:assert/strict";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { stepWorkshop, type WorkshopState } from "../workshops";
import { cargoPlan } from "../workshop-challenges";

/** Steps the harbour with a pad, keeping the pad it was given so a run can be played back. */
export function driver(s: WorkshopState) {
    const tape: Pad[] = [];
    const go = (more: Partial<Pad> = {}) => {
        const pad = { ...emptyPad(), ...more };
        tape.push(pad);
        stepWorkshop(s, pad);
    };
    const settle = () => {
        for (let k = 0; k < 900 && (s.held || s.placing); k++) go();
        for (let k = 0; k < 30; k++) go();
    };
    return { tape, go, settle };
}

/** Drags every crate to its planned place on the barge and lets go, then waits for the boat to sail. */
export function dragAll(s: WorkshopState): Pad[] {
    const { tape, go, settle } = driver(s),
        plan = cargoPlan(s.definition);
    for (let k = 0; k < 60; k++) go();
    for (const [i, p] of s.definition.pieces.entries()) {
        const body = s.objects.get(p.id);
        assert.ok(body);
        const at = s.world.where(body),
            x = plan[i] ?? 30;
        go({ touch: { x: at.x, y: at.y } });
        assert.equal(s.held, p.id);
        for (let k = 0; k < 90; k++) go({ touch: { x, y: 10 } });
        go({ lifted: { x, y: 10 } });
        settle();
    }
    for (let k = 0; k < 600 && s.phase !== "won"; k++) go();
    return tape;
}
