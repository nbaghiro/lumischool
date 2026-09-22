import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, say } from "../lettering";

interface Bag {
    kg: number;
    label: string;
}

/** A bag grows by the cube root of its mass, the way a real box of things does: twice the mass is
 *  about a quarter again as tall, not twice as tall. Small bags stop shrinking so they stay drawn. */
const bagS = (kg: number): number => Math.cbrt(Math.max(0.5, kg) / 20);

const bagW = (kg: number): number => Math.max(1.8, 3.6 * bagS(kg));

const bagH = (kg: number): number => Math.max(2.2, 4.8 * bagS(kg));

const bagsSpan = (bags: Bag[]): number =>
    bags.reduce((s, b) => s + bagW(b.kg), 0) + Math.max(0, bags.length - 1) * 0.8;

const bagsTall = (bags: Bag[]): number => Math.max(2.2, ...bags.map((b) => bagH(b.kg)));

const bagsNamed = (bags: Bag[]): boolean => bags.some((b) => !!b.label);

const bagsBox = (bags: Bag[]): { w: number; h: number } => ({
    w: Math.ceil(bagsSpan(bags)) + 2,
    h: Math.ceil(bagsTall(bags) + (bagsNamed(bags) ? 4.7 : 3.6)),
});

const SKINS: Marker[] = ["sky", "berry"];

export const suitcases = defineDrawing({
    id: "suitcases",
    family: "travel",
    title: "Suitcases",
    group: "Props",
    about: "A row of cases on the floor with the mass on the tag of each one. Size follows the cube root of the mass, so a twenty kilogram bag is a little bigger than a ten and nothing like twice as tall.",
    params: {
        bags: [
            { kg: 12, label: "" },
            { kg: 20, label: "" },
            { kg: 7, label: "" },
        ] as Bag[],
    },
    settings: { bags: { kind: "fixed" } },
    takes: [
        {
            label: "Three bags",
            params: {
                bags: [
                    { kg: 12, label: "" },
                    { kg: 20, label: "" },
                    { kg: 7, label: "" },
                ],
            },
        },
        {
            label: "Labelled",
            params: {
                bags: [
                    { kg: 15, label: "A" },
                    { kg: 9, label: "B" },
                ],
            },
        },
    ],
    box: (p) => bagsBox(p.bags),
    draw: (c, p) => {
        const { pen, g } = c,
            box = bagsBox(p.bags),
            w = box.w * U;
        const floor = (box.h - (bagsNamed(p.bags) ? 2.4 : 1.3)) * U,
            a: RawAnchors = {};
        let x = (w - bagsSpan(p.bags) * U) / 2;
        p.bags.forEach((b, i) => {
            const bw = bagW(b.kg) * U,
                bh = bagH(b.kg) * U,
                bot = floor - 0.45 * U,
                top = bot - bh,
                cx = x + bw / 2;
            pen.arc(g, cx, top, 1.2 * U, 0.8 * U, Math.PI, 2 * Math.PI, "pencil", {
                strokeWidth: 2.4,
            });
            pen.path(
                g,
                roundedRect(x, top, bw, bh, 9),
                "pencil",
                pen.fill(SKINS[i % SKINS.length], "solid", { hachureGap: 8, fillWeight: 0.6 }),
                { strokeWidth: 2.4 },
            );
            pen.line(g, x + 6, top + 0.5 * U, x + bw - 6, top + 0.5 * U, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            for (const s of [0.5, bagW(b.kg) - 0.5]) {
                pen.circle(
                    g,
                    x + s * U,
                    floor - 0.25 * U,
                    0.5 * U,
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                    { strokeWidth: 1.4 },
                );
            }
            // The tag hangs off the handle onto the face of the case, which is where a real one ends up.
            pen.line(g, cx, top, cx, top + 0.7 * U, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            const tw = Math.min(bw - 0.5 * U, 2.4 * U);
            pen.path(
                g,
                roundedRect(cx - tw / 2, top + 0.68 * U, tw, 1.05 * U, 5),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.5 },
            );
            numOn(c, cx, top + 1.45 * U, `${b.kg} kg`, 13);
            if (b.label) say(c, cx, floor + 1.1 * U, b.label, 15);
            a[`bag(${i})`] = [cx, top - 0.8 * U, "up"];
            x += bw + 0.8 * U;
        });
        pen.line(g, 0.4 * U, floor, w - 0.4 * U, floor, "pencil", { strokeWidth: 2.2 });
        return a;
    },
    describe: (p) =>
        `${p.bags.length === 1 ? "A suitcase" : "Suitcases in a row"} on the floor, blue and pink, each with a handle on top, two wheels and a tag with the mass written on it.`,
    motion: { body: { is: "breathe", amt: 0.03, period: 3.8 } },
});
