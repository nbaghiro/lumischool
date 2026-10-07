import { emptyPad, type Pad } from "../../engine/motion/pad";
import {
    PAPER_BOAT_LEVELS,
    paperBoatTarget,
    startPaperBoat,
    stepPaperBoat,
    type PaperBoatState,
} from "./paperboat";

export interface PaperBoatConfiguration {
    phase: number;
    variant: number;
}
export function paperBoatChallenge(seed: number, phase: number): PaperBoatConfiguration {
    return {
        phase: Number.isInteger(phase) && PAPER_BOAT_LEVELS[phase] ? phase : 0,
        variant: (seed >>> 0) % 3,
    };
}
export function isPaperBoatConfiguration(v: unknown, phase: number): v is PaperBoatConfiguration {
    return (
        typeof v === "object" &&
        v !== null &&
        "phase" in v &&
        "variant" in v &&
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        PAPER_BOAT_LEVELS[phase] !== undefined &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < 3
    );
}
export const openPaperBoatConfiguration = (c: PaperBoatConfiguration): PaperBoatState =>
    startPaperBoat(c.phase, c.variant);

export function paperBoatWay(c: PaperBoatConfiguration, mode: "keys" | "touch"): Pad[] | null {
    let s = openPaperBoatConfiguration(c);
    const pads: Pad[] = [];
    for (let reach = 0; reach < 3; reach++) {
        let found = false;
        const target = [6, 11, 16][paperBoatTarget(s)] ?? 6;
        for (const start of [target, 11, 6, 16, 8, 14]) {
            const trial = structuredClone(s),
                attempt: Pad[] = [];
            const play = (p: Pad) => {
                attempt.push(p);
                stepPaperBoat(trial, p);
            };
            if (mode === "touch") {
                play({ ...emptyPad(), touch: { x: 3, y: start } });
                play({ ...emptyPad(), lifted: { x: 8, y: start } });
            } else {
                for (let i = 0; i < 180 && Math.abs(trial.y - start) > 0.05; i++) {
                    const dir = trial.y < start ? "down" : "up";
                    play({ ...emptyPad(), holding: [dir] });
                }
                for (let i = 0; i < 115; i++) play({ ...emptyPad(), holding: ["right"] });
                play({ ...emptyPad(), tapped: true });
            }
            for (let i = 0; i < 730 && trial.boat; i++) {
                const b = trial.boat;
                const turn = (target - b.y) * 1.8 - b.vy;
                const p = emptyPad();
                p.go = true;
                if (mode === "touch") p.touch = { x: b.x, y: target };
                else if (Math.abs(turn) > 0.12) p.holding = [turn > 0 ? "down" : "up"];
                play(p);
            }
            if (trial.reach > s.reach) {
                s = trial;
                pads.push(...attempt);
                found = true;
                break;
            }
        }
        if (!found) return null;
    }
    return s.won ? pads : null;
}
