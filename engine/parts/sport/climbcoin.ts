import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

const VALUES = [1, 2, 3, 5, 10] as const;

/** A coin a climber picks up, with what it is worth written on it. */
export const climbCoin = defineDrawing<{ value: number }>({
    id: "climbcoin",
    family: "sport",
    title: "Climbing coin",
    group: "Props",
    about: "A round gold coin with a rim and the number it is worth on its face, 1, 2, 3, 5 or 10, for a climber to pick up and count.",
    params: { value: 1 },
    settings: { value: { kind: "one of", of: VALUES } },
    takes: VALUES.map((value) => ({ label: `Worth ${value}`, params: { value } })),
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.circle(g, U, U, 1.7 * U, "pencil", pen.fill("glow", "solid"), {
            strokeWidth: 1.6,
            roughness: 0.25,
        });
        pen.circle(g, U, U, 1.25 * U, "pencil", null, {
            strokeWidth: 1,
            roughness: 0.25,
            stroke: c.t["glow-ink"],
        });
        const v = VALUES.find((x) => x === Number(p.value)) ?? 1;
        say(c, U, 1.35 * U, String(v), v === 10 ? 17 : 20);
        return { middle: [U, U, "up"] };
    },
    describe: () =>
        "A round gold coin with a thin rim and the number it is worth written large on its face, waiting to be picked up and counted.",
    motion: { still: "A coin hangs still where it lies, bobbing gently in the game." },
});
