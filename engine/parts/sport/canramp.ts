import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["sky", "mint"] as const;
const toneOf = (v: string): (typeof TONES)[number] => TONES.find((t) => t === v) ?? "sky";

export const canRamp = defineDrawing<{ tone: string }>({
    id: "canramp",
    family: "sport",
    title: "Watering can ramp",
    group: "Props",
    about: "A watering can lying on its side on a pinball table as a ramp: a round body, a handle over the top and a long spout with a rose, which the ball runs up and round.",
    params: { tone: "sky" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A blue can", params: { tone: "sky" } },
        { label: "A green can", params: { tone: "mint" } },
    ],
    box: () => ({ w: 4, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            tone = toneOf(p.tone);
        pen.path(g, `M${0.9 * U} ${1.9 * U}L${3.1 * U} ${0.7 * U}`, "pencil", null, {
            strokeWidth: 3.2,
            stroke: c.t.ink,
            roughness: 0.3,
        });
        pen.path(g, `M${0.9 * U} ${1.9 * U}L${3.1 * U} ${0.7 * U}`, "pencil", null, {
            strokeWidth: 1.6,
            stroke: c.t[tone],
            roughness: 0.3,
        });
        pen.ellipse(g, 3.25 * U, 0.65 * U, 0.8 * U, 0.6 * U, "pencil", pen.fill(tone, "solid"), {
            strokeWidth: 1.1,
            roughness: 0.3,
        });
        pen.rect(g, 0.25 * U, 1.3 * U, 1.7 * U, 1.4 * U, "pencil", pen.fill(tone, "solid"), {
            strokeWidth: 1.4,
            roughness: 0.3,
        });
        pen.path(
            g,
            `M${0.45 * U} ${1.3 * U}Q${1.1 * U} ${0.45 * U} ${1.75 * U} ${1.3 * U}`,
            "pencil",
            null,
            { strokeWidth: 1.3, stroke: c.t.ink, roughness: 0.3 },
        );
        return { spout: [3.25 * U, 0.65 * U, "up"] };
    },
    describe: () =>
        "A watering can lying on a pinball table as a ramp, a square body with a handle over the top and a long spout ending in a round rose.",
    motion: { still: "A ramp is fixed to the table; only the ball runs along it." },
});
