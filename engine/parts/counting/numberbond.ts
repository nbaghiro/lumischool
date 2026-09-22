import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { numOnFill } from "./numonfill";

interface NumberBondParams {
    whole: number | "?";
    parts: [number | "?", number | "?"];
}

export const numberBond = defineDrawing<NumberBondParams>({
    id: "numberbond",
    family: "counting",
    title: "Number bond",
    group: "Structures",
    about: "Whole on top, two parts below, as in Singapore Primary 1.",
    params: { whole: 10, parts: [4, "?"] },
    settings: { whole: { kind: "fixed" }, parts: { kind: "fixed" } },
    takes: [
        { label: "Whole 10, one part", params: { whole: 10, parts: [4, "?"] } },
        { label: "Whole unknown", params: { whole: "?", parts: [3, 5] } },
        { label: "Whole 20", params: { whole: 20, parts: ["?", 13] } },
    ],
    box: () => ({ w: 8, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            W: [number, number] = [80, 36],
            P: [number, number][] = [
                [36, 122],
                [124, 122],
            ],
            r = 22;
        P.forEach(([x, y]) => {
            const dx = x - W[0],
                dy = y - W[1],
                L = Math.hypot(dx, dy);
            pen.line(
                g,
                W[0] + (dx / L) * r,
                W[1] + (dy / L) * r,
                x - (dx / L) * r,
                y - (dy / L) * r,
                "ruler",
                { strokeWidth: 1.8 },
            );
        });
        pen.circle(g, W[0], W[1], r * 2, "ruler", pen.fill("glow"));
        numOnFill(c, W[0], W[1] + 6, p.whole, 19);
        P.forEach(([x, y], i) => {
            pen.circle(g, x, y, r * 2, "ruler", pen.fill("card"));
            num(c, x, y + 6, p.parts[i] ?? "?", 19);
        });
        return {
            whole: [W[0], W[1] - r, "up"],
            "part(0)": [(P[0] ?? [0, 0])[0], (P[0] ?? [0, 0])[1] + r, "down"],
            "part(1)": [(P[1] ?? [0, 0])[0], (P[1] ?? [0, 0])[1] + r, "down"],
        };
    },
    describe: () =>
        "A number bond: a yellow circle on top joined by two lines to two white circles below, each with a value or a question mark in it.",
});
