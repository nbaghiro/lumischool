import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const TONES = ["berry", "sky", "tang", "glow", "mint"] as const;
type Tone = (typeof TONES)[number];
const STATES = ["plain", "lit", "wilted"] as const;
type State = (typeof STATES)[number];

const toneOf = (v: string): Tone => TONES.find((t) => t === v) ?? "berry";
const stateOf = (v: string): State => STATES.find((s) => s === v) ?? "plain";

export const flowerBumper = defineDrawing<{
    n: number;
    tone: string;
    state: string;
    bloom: number;
}>({
    id: "flowerbumper",
    family: "sport",
    title: "Flower bumper",
    group: "Props",
    about: "A pinball bumper drawn as a flower seen from above: eight round petals round a yellow middle that carries its number. It opens out when struck, glows when lit and droops grey when wilted.",
    params: { n: 5, tone: "berry", state: "plain", bloom: 0 },
    settings: {
        n: { kind: "whole", min: 0, max: 20 },
        tone: { kind: "one of", of: TONES },
        state: { kind: "one of", of: STATES },
        bloom: { kind: "number", min: 0, max: 1, step: 0.25 },
    },
    takes: [
        { label: "A pink five", params: { n: 5, tone: "berry", state: "plain", bloom: 0 } },
        { label: "A lit blue two", params: { n: 2, tone: "sky", state: "lit", bloom: 1 } },
        { label: "A wilted ten", params: { n: 10, tone: "tang", state: "wilted", bloom: 0 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            state = stateOf(p.state),
            tone = toneOf(p.tone),
            open = Math.max(0, Math.min(1, p.bloom)),
            // the petals reach further as the flower opens, and stay inside the box when they do
            reach = (0.5 + 0.08 * open) * U,
            petal = (0.62 + 0.06 * open) * U;
        if (state === "lit")
            pen.circle(g, U, U, 1.94 * U, "pencil", null, {
                strokeWidth: 2,
                stroke: c.t.glow,
                roughness: 0.3,
            });
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + (state === "wilted" ? 0.2 : 0),
                droop = state === "wilted" ? 0.82 : 1;
            pen.circle(
                g,
                U + Math.cos(a) * reach * droop,
                U + Math.sin(a) * reach * droop,
                petal * droop,
                "pencil",
                state === "wilted" ? pen.fill("ink-soft", "hachure") : pen.fill(tone, "solid"),
                { strokeWidth: 1.1, roughness: 0.35 },
            );
        }
        pen.circle(
            g,
            U,
            U,
            0.92 * U,
            "pencil",
            pen.fill(state === "wilted" ? "card" : "glow", "solid"),
            {
                strokeWidth: 1.3,
                roughness: 0.2,
            },
        );
        const n = Math.max(0, Math.min(20, Math.round(p.n)));
        if (n > 0) num(c, U, 1.18 * U, n, n > 9 ? 12 : 14);
        return { middle: [U, U, "up"] };
    },
    describe: (p) =>
        stateOf(p.state) === "wilted"
            ? "A pinball bumper drawn as a drooping grey flower seen from above, eight wilted petals round a pale middle with its number written in it."
            : "A pinball bumper drawn as a flower seen from above, eight round coloured petals round a yellow middle with its number written in it.",
    motion: {
        still: "A bumper is fixed to the table; it opens out only when the game strikes it.",
    },
});
