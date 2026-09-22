import { type RawAnchors } from "../../ink/surface";
import { type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOnFill } from "./numonfill";

interface BarModelParams {
    whole: number | "?";
    parts: (number | "?")[];
}

export const barModel = defineDrawing<BarModelParams>({
    id: "barmodel",
    family: "counting",
    title: "Bar model",
    group: "Structures",
    about: 'Part widths follow the numbers and snap to whole squares. "?" marks the unknown.',
    params: { whole: 12, parts: [5, "?"] },
    settings: { whole: { kind: "fixed" }, parts: { kind: "fixed" } },
    takes: [
        { label: "One part missing", params: { whole: 12, parts: [5, "?"] } },
        { label: "Whole missing", params: { whole: "?", parts: [6, 6] } },
        { label: "Three parts", params: { whole: 20, parts: [8, 7, 5] } },
        { label: "Hundreds", params: { whole: 100, parts: [60, "?"] } },
    ],
    box: () => ({ w: 14, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = 12;
        const known = p.parts.filter((v): v is number => v !== "?");
        const total = p.whole === "?" ? known.reduce((s, v) => s + v, 0) : p.whole;
        const unknownCount = p.parts.length - known.length;
        const rest = Math.max(0, total - known.reduce((s, v) => s + v, 0));
        let widths = p.parts.map((v) =>
            Math.max(
                2,
                Math.round(((v === "?" ? rest / Math.max(1, unknownCount) : v) / total) * W),
            ),
        );
        const drift = W - widths.reduce((s, v) => s + v, 0);
        widths[widths.length - 1] = (widths[widths.length - 1] ?? 0) + drift;
        const fills: Marker[] = ["sky", "mint", "tang", "berry"];
        pen.rect(g, 20, 20, W * 20, 40, "ruler", pen.fill("glow", "solid"), { strokeWidth: 2 });
        numOnFill(c, 20 + W * 10, 46, p.whole);
        const a: RawAnchors = { whole: [20 + W * 10, 20, "up"] };
        let x = 20;
        p.parts.forEach((v, i) => {
            const w = (widths[i] ?? 0) * 20;
            pen.rect(
                g,
                x,
                80,
                w,
                40,
                "ruler",
                v === "?" ? null : pen.fill(fills[i % fills.length], "hachure", { hachureGap: 6 }),
                { strokeWidth: 2 },
            );
            numOnFill(c, x + w / 2, 106, v);
            a[`part(${i})`] = [x + w / 2, 120, "down"];
            x += w;
        });
        return a;
    },
    describe: () =>
        "A bar model: one long yellow bar on top and parts drawn under it, each part a box with a value or a question mark written in it.",
});
