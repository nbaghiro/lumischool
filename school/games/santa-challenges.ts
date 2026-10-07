import { emptyPad, type Pad } from "../../engine/motion/pad";
import { SANTA_LEVELS, santaPreview, startSanta, stepSanta, type SantaState } from "./santa";

export interface SantaConfiguration {
    phase: number;
    variant: number;
}

export function santaChallenge(seed: number, phase: number): SantaConfiguration {
    return {
        phase: Number.isInteger(phase) && SANTA_LEVELS[phase] ? phase : 0,
        variant: (seed >>> 0) % 3,
    };
}

export function isSantaConfiguration(v: unknown, phase: number): v is SantaConfiguration {
    return (
        typeof v === "object" &&
        v !== null &&
        "phase" in v &&
        "variant" in v &&
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        SANTA_LEVELS[phase] !== undefined &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < 3
    );
}

export const openSantaConfiguration = (c: SantaConfiguration): SantaState =>
    startSanta(c.phase, c.variant);

/** A pilot observes the same physical drop as the guide, then presses once per delivery. */
export function santaHand(s: SantaState, mode: "keys" | "touch"): Pad {
    const p = emptyPad();
    const hit = santaPreview(s).house,
        h = s.L.houses[hit];
    const waiting = s.gifts.some((g) => !g.returning && !g.bounced);
    const drop = h !== undefined && (s.got[hit] ?? 0) < h.want && !waiting && s.cooldown === 0;
    if (mode === "keys") p.tapped = drop;
    else if (drop && s.touchStart) p.lifted = { x: s.x, y: 9 };
    else p.touch = { x: s.x, y: 9 };
    return p;
}

export function santaWay(c: SantaConfiguration, mode: "keys" | "touch"): Pad[] | null {
    const s = openSantaConfiguration(c),
        pads: Pad[] = [];
    for (let i = 0; i < 60 * 300 && !s.won; i++) {
        const p = santaHand(s, mode);
        pads.push(p);
        stepSanta(s, p);
    }
    return s.won ? pads : null;
}
