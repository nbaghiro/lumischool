import { type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

export interface CardParams {
    kind: "card" | "coin";
    tone: Marker;
}

const KINDS = ["card", "coin"] as const;
const toneOf = (v: unknown): Marker => MARKERS.find((m) => m === v) ?? "sky";

/** A catalogue card is three squares a side, in step with CARD in school/games/dollhouse.ts. */
export const CARD_SIDE = 3;

export const dollCard = defineDrawing<CardParams>({
    id: "dollcard",
    family: "home",
    title: "Catalogue card",
    group: "Props",
    about: "A square card from a dollhouse catalogue with a strip of tape across the top and a coin in the corner for its price, for a room or a piece of furniture to stand on; or the coin alone.",
    params: { kind: "card", tone: "sky" },
    settings: {
        kind: { kind: "one of", of: KINDS },
        tone: { kind: "one of", of: MARKERS },
    },
    takes: [
        { label: "A blue card", params: { kind: "card", tone: "sky" } },
        { label: "A pink card", params: { kind: "card", tone: "berry" } },
        { label: "A coin", params: { kind: "coin", tone: "glow" } },
    ],
    box: (p) => (p.kind === "coin" ? { w: 1, h: 1 } : { w: CARD_SIDE, h: CARD_SIDE }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        if (p.kind === "coin") {
            pen.circle(g, U / 2, U / 2, 0.9 * U, "pencil", pen.fill("glow"), { strokeWidth: 1.4 });
            pen.circle(g, U / 2, U / 2, 0.55 * U, "pencil", null, { strokeWidth: 1 });
            return { middle: [U / 2, U / 2, "up"] };
        }
        const s = CARD_SIDE * U;
        pen.rect(g, 2, 2, s - 4, s - 4, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        pen.rect(g, 2, 2, s - 4, 0.35 * U, "pencil", pen.fill(toneOf(p.tone), "hachure"), {
            strokeWidth: 1,
        });
        pen.rect(g, s / 2 - 0.5 * U, -1, U, 0.4 * U, "pencil", pen.fill("glow", "hachure"), {
            strokeWidth: 0.8,
        });
        pen.circle(g, s - 0.5 * U, s - 0.5 * U, 0.6 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 1.2,
        });
        return { middle: [s / 2, s / 2, "up"], price: [s - 0.5 * U, s - 0.5 * U, "up"] };
    },
    describe: (p) =>
        p.kind === "coin"
            ? "A round yellow coin with a ring pressed into its face, the money a dollhouse room or a piece of furniture costs."
            : `A white square card from a dollhouse catalogue with a ${MARKER_WORD[toneOf(p.tone)]} band and a strip of tape across the top, and a yellow coin in the corner.`,
    motion: { still: "A catalogue card lies on the tray until something is picked up from it." },
});
