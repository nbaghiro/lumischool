import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, say } from "../lettering";
import { price } from "./price";

interface Line {
    name: string;
    cents: number;
}

export const receipt = defineDrawing({
    id: "receipt",
    family: "money",
    title: "Receipt",
    group: "Structures",
    about: "A till slip with the items down one side and the prices down the other, and a total that may be left blank. Reading down a column and adding is the whole of a money problem at this age.",
    params: {
        shop: "Corner Shop",
        items: [
            { name: "Bread", cents: 210 },
            { name: "Milk", cents: 145 },
            { name: "Apples", cents: 320 },
        ] as Line[],
        total: true,
    },
    settings: {
        shop: { kind: "text", most: 16 },
        items: { kind: "fixed" },
        total: { kind: "flag" },
    },
    takes: [
        {
            label: "Three items, totalled",
            params: {
                shop: "Corner Shop",
                items: [
                    { name: "Bread", cents: 210 },
                    { name: "Milk", cents: 145 },
                    { name: "Apples", cents: 320 },
                ],
                total: true,
            },
        },
        {
            label: "Total to work out",
            params: {
                shop: "Corner Shop",
                items: [
                    { name: "Pens", cents: 135 },
                    { name: "Pad", cents: 240 },
                ],
                total: false,
            },
        },
        {
            label: "A longer slip",
            params: {
                shop: "School Fair",
                items: [
                    { name: "Cake", cents: 75 },
                    { name: "Juice", cents: 60 },
                    { name: "Badge", cents: 120 },
                    { name: "Raffle", cents: 50 },
                ],
                total: true,
            },
        },
    ],
    box: (p) => ({ w: 12, h: p.items.length * 2 + 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x = U,
            w = 10 * U,
            top = U,
            bottom = (p.items.length * 2 + 7) * U;
        // The torn edge is the one part of this drawing that is allowed to be scruffy.
        const teeth = 8,
            step = w / teeth;
        let d = `M${x} ${top}H${x + w}V${bottom}`;
        for (let i = 0; i < teeth; i++)
            d += `l${-step / 2} ${i % 2 ? -9 : 9}l${-step / 2} ${i % 2 ? 9 : -9}`;
        pen.path(g, `${d}Z`, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        say(c, x + w / 2, top + 1.3 * U, p.shop, 16);
        pen.line(g, x + 14, top + 1.9 * U, x + w - 14, top + 1.9 * U, "ruler", {
            strokeWidth: 1.1,
            strokeLineDash: [4, 4],
        });
        const a: RawAnchors = { shop: [x + w / 2, top, "up"] };
        p.items.forEach((item, i) => {
            const y = top + (2.9 + i * 2) * U;
            say(c, x + 16, y, item.name, 15, "start");
            num(c, x + w - 16, y, price(item.cents), 15, "end");
            a[`item(${i})`] = [x + w, y - 5, "right"];
        });
        const ty = top + (2.6 + p.items.length * 2) * U;
        pen.line(g, x + 14, ty, x + w - 14, ty, "ruler", { strokeWidth: 1.6 });
        say(c, x + 16, ty + 26, "Total", 16, "start");
        if (p.total)
            num(c, x + w - 16, ty + 26, price(p.items.reduce((s, q) => s + q.cents, 0)), 17, "end");
        else
            pen.rect(g, x + w - 3.4 * U, ty + 8, 3 * U, 1.4 * U, "ruler", null, {
                strokeWidth: 1.6,
            });
        a.total = [x + w - 1.7 * U, ty + 8, "up"];
        return a;
    },
    describe: () =>
        "A till slip with a torn bottom edge, the shop's name at the top, items down the left and prices down the right, and a total line at the bottom.",
    motion: { still: STILL.text },
});
