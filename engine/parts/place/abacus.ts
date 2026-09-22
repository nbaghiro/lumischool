import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap } from "../lettering";
import { SHORT, PLACE_FILL } from "./columns";

export const abacus = defineDrawing({
    id: "abacus",
    family: "place",
    title: "Spike abacus",
    group: "Structures",
    about: "One spike per column and one bead per unit, so a ten that has to be exchanged is a spike with ten beads on it. Counting the beads and reading the digits have to give the same answer.",
    params: { value: "247" },
    settings: { value: { kind: "text", most: 5 } },
    takes: [
        { label: "247", params: { value: "247" } },
        { label: "A ten to exchange", params: { value: "19" } },
        { label: "Thousands", params: { value: "1305" } },
        { label: "Nothing on the spikes", params: { value: "000" } },
    ],
    box: (p) => ({ w: Array.from(p.value).length * 3 + 1, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            digits = Array.from(p.value),
            n = digits.length,
            a: RawAnchors = {};
        const base = 9 * U,
            heads = SHORT.slice(SHORT.length - n);
        pen.rect(
            g,
            U / 2,
            base,
            n * 3 * U,
            0.7 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.6 },
        );
        digits.forEach((d, i) => {
            const x = U / 2 + i * 3 * U + 1.5 * U,
                count = Number(d) || 0;
            pen.line(g, x, base, x, 0.9 * U, "ruler", { strokeWidth: 3 });
            pen.circle(g, x, 0.8 * U, 10, "ruler", pen.fill("ink-soft"), { strokeWidth: 1 });
            for (let k = 0; k < count; k++) {
                pen.ellipse(
                    g,
                    x,
                    base - 12 - k * 18,
                    34,
                    17,
                    "ruler",
                    pen.fill(PLACE_FILL[(n - 1 - i) % PLACE_FILL.length]),
                    { strokeWidth: 1.4 },
                );
            }
            cap(c, x, base + 1.5 * U, heads[i] ?? "More", 11);
            a[`spike(${i})`] = [x, 0.9 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A spike abacus: a base with upright spikes, each named for its place underneath, and coloured beads threaded on the spikes.",
});
