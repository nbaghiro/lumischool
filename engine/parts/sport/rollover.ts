import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const LABELS = ["×2", "+10"] as const;
const labelOf = (v: string): (typeof LABELS)[number] => LABELS.find((l) => l === v) ?? "×2";

export const rollover = defineDrawing<{ label: string; lit: boolean }>({
    id: "rollover",
    family: "sport",
    title: "Rollover lane",
    group: "Props",
    about: "A short lane on a pinball table that counts the ball rolling over it: a rounded strip pointing up with its label painted inside. Lit, it glows yellow.",
    params: { label: "×2", lit: false },
    settings: { label: { kind: "one of", of: LABELS }, lit: { kind: "flag" } },
    takes: [
        { label: "Doubles, dark", params: { label: "×2", lit: false } },
        { label: "Doubles, lit", params: { label: "×2", lit: true } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.path(
            g,
            `M${0.3 * U} ${1.75 * U}L${0.3 * U} ${0.75 * U}L${U} ${0.2 * U}L${1.7 * U} ${0.75 * U}L${1.7 * U} ${1.75 * U}Z`,
            "pencil",
            p.lit ? pen.fill("glow", "solid") : pen.fill("card", "solid"),
            { strokeWidth: 1.4, roughness: 0.3 },
        );
        num(c, U, 1.4 * U, labelOf(p.label), 13);
        return { middle: [U, U, "up"] };
    },
    describe: (p) =>
        `A short rollover lane on a pinball table, a rounded strip pointing up with ${labelOf(p.label) === "×2" ? "times two" : "plus ten"} painted inside it, counted when the ball rolls over.`,
    motion: { still: "A lane lies flat on the table and only lights up." },
});
