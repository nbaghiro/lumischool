import { type Fill } from "../../ink/pen";
import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { cap, num } from "../lettering";
import { fernPaths } from "./kit";

/**
 * Plants laid on paper that turns blue in the sun, and the print left when they are lifted: white
 * shapes on blue. Anna Atkins printed her book of seaweeds this way in 1843.
 */
export const sunPrint = defineDrawing({
    id: "sunprint",
    family: "art",
    title: "Sun print",
    group: "Structures",
    about: "Ferns laid on paper that turns blue where the sun reaches it, and the print they leave: each fern a white shape on blue, the way Anna Atkins printed plants in the 1840s. The ferns have different numbers of leaflets, so which one made a print is found by counting.",
    params: { pairs: [3, 5, 4], made: 1, show: "match" },
    settings: {
        pairs: { kind: "numbers", min: 2, max: 9, most: 3 },
        made: { kind: "whole", min: 0, max: 2 },
        show: { kind: "one of", of: ["match", "print"] },
    },
    takes: [
        { label: "Which fern, B", params: { pairs: [3, 5, 4], made: 1, show: "match" } },
        { label: "A print of three ferns", params: { pairs: [4, 6, 3], made: 0, show: "print" } },
    ],
    box: (p) => ({ w: p.show === "print" ? 16 : 23, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            blue = c.paper ? c.t.ink : "#2F5C9E";
        const frond = (
            cx: number,
            top: number,
            size: number,
            pairs: number,
            fill: Fill,
            outline: boolean,
        ) => {
            const k = size / 100,
                gg = group(c, {
                    turn: [
                        ["translate", cx - size / 2, top],
                        ["scale", k],
                    ],
                }).g;
            for (const d of fernPaths(pairs))
                pen.path(gg, d, "ruler", fill, {
                    strokeWidth: outline ? 1.6 / k : 0,
                    hachureGap: 4 / k,
                    fillWeight: 1 / k,
                });
        };
        const green = c.paper
            ? c.pen.fill("mint")
            : { fill: panColour("green"), fillStyle: "solid" as const };
        const print = (x: number, w: number, list: number[]) => {
            pen.rect(
                g,
                x,
                0.5 * U,
                w,
                8.6 * U,
                "pencil",
                c.paper
                    ? { fill: c.t.ink, fillStyle: "hachure", hachureGap: 3, hachureAngle: -45 }
                    : { fill: blue, fillStyle: "solid" },
                { strokeWidth: 1.8 },
            );
            list.forEach((pairs, i) => {
                const cx = x + ((i + 0.5) * w) / list.length;
                frond(cx, 1.1 * U, 6.6 * U, pairs, c.pen.fill("card"), c.paper);
            });
            cap(c, x + w / 2, 9.8 * U, "print", 10);
        };
        if (p.show === "print") {
            print(0.5 * U, 15 * U, p.pairs);
            a.print = [8 * U, 0.5 * U, "up"];
            return a;
        }
        p.pairs.slice(0, 3).forEach((pairs, i) => {
            const cx = (2.2 + i * 4.2) * U;
            frond(cx, 0.6 * U, 6.8 * U, pairs, green, true);
            num(c, cx, 9.6 * U, "ABC"[i] ?? "", 16);
            a[`fern(${i})`] = [cx, 0.6 * U, "up"];
        });
        const made = p.pairs[Math.max(0, Math.min(p.pairs.length - 1, Math.round(p.made)))] ?? 3;
        print(13.4 * U, 8.6 * U, [made]);
        a.print = [17.7 * U, 0.5 * U, "up"];
        return a;
    },
    describe: (p) =>
        p.show === "print"
            ? "A deep blue sheet with white fern shapes printed on it side by side, each with a different number of leaflets, named print underneath."
            : "Three green ferns lettered A, B and C, each with a different number of leaflets, and a deep blue print with one white fern shape on it.",
});
