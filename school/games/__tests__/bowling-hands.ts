import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { BOWLING_START, BOWLING_THROW, stepBowling, type BowlingState } from "../bowling";

export function settleBowl(s: BowlingState): void {
    for (let k = 0; k < 1500 && s.mode === "roll"; k++) stepBowling(s, emptyPad());
    if (s.mode === "roll") throw new Error("Bowl did not settle");
}
export function bowlWith(s: BowlingState, offset: number, mode: "keys" | "touch"): Pad[] {
    const pads: Pad[] = [];
    const send = (p: Pad) => {
        pads.push(p);
        stepBowling(s, p);
    };
    const angle = -Math.PI / 2 + offset;
    if (mode === "touch") {
        send({ ...emptyPad(), touch: { ...BOWLING_START } });
        send({
            ...emptyPad(),
            lifted: {
                x: BOWLING_START.x - Math.cos(angle) * 4,
                y: BOWLING_START.y - Math.sin(angle) * 4,
            },
        });
    } else {
        const direction = angle < s.aim.angle ? "left" : "right";
        const count = Math.round(Math.abs(angle - s.aim.angle) / (BOWLING_THROW.turn / 60));
        for (let i = 0; i < count; i++)
            send({ ...emptyPad(), holding: [direction], held: direction });
        send({ ...emptyPad(), tapped: true });
    }
    while (s.mode === "roll" && pads.length < 1500) send(emptyPad());
    return pads;
}
export function findBowls(s: BowlingState, mode: "keys" | "touch"): number[] | null {
    const seen = new Set<string>();
    for (let k = 0; k <= 48; k++) {
        const a = -0.36 + k * 0.015,
            first = structuredClone(s);
        bowlWith(first, a, mode);
        if (first.mode === "won") return [a];
        const key = first.counted.join(",");
        if (first.mode !== "aim" || first.total === 0 || seen.has(key)) continue;
        seen.add(key);
        for (let j = 0; j <= 48; j++) {
            const b = -0.36 + j * 0.015,
                second = structuredClone(first);
            bowlWith(second, b, mode);
            if (second.mode === "won") return [a, b];
        }
    }
    return null;
}
