import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { sayOn, soft } from "../lettering";
import { drawProp } from "../props";

interface Sorted {
    prop: string;
    ring: number;
}

export const sortingRings = defineDrawing({
    id: "rings",
    family: "data",
    title: "Sorting rings",
    group: "Structures",
    about: "Two hoops on the carpet with the things to sort drawn as pictures. A thing can be left outside both hoops, which is the case a table quietly hides and a hoop does not.",
    params: {
        labels: ["Round", "Red"],
        items: [
            { prop: "ball", ring: 0 },
            { prop: "circle", ring: 0 },
            { prop: "apple", ring: 1 },
            { prop: "triangle", ring: 1 },
            { prop: "star", ring: -1 },
        ] as Sorted[],
    },
    settings: { labels: { kind: "words", most: 2 }, items: { kind: "fixed" } },
    takes: [
        {
            label: "Round and red",
            params: {
                labels: ["Round", "Red"],
                items: [
                    { prop: "ball", ring: 0 },
                    { prop: "circle", ring: 0 },
                    { prop: "apple", ring: 1 },
                    { prop: "triangle", ring: 1 },
                    { prop: "star", ring: -1 },
                ],
            },
        },
        {
            label: "Nothing left out",
            params: {
                labels: ["Curved", "Straight"],
                items: [
                    { prop: "circle", ring: 0 },
                    { prop: "square", ring: 1 },
                    { prop: "hexagon", ring: 1 },
                ],
            },
        },
        { label: "Empty hoops", params: { labels: ["Big", "Small"], items: [] } },
    ],
    box: () => ({ w: 17, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cy = 5.6 * U,
            rx = 3.4 * U,
            ry = 2.8 * U,
            a: RawAnchors = {};
        (
            [
                [4.2 * U, "sky"],
                [12.4 * U, "mint"],
            ] as const
        ).forEach(([cx, fill], k) => {
            pen.ellipse(
                g,
                cx,
                cy,
                rx * 2,
                ry * 2,
                "pencil",
                pen.fill(fill, "solid", { hachureGap: 10, fillWeight: 0.5 }),
                { strokeWidth: 2.6 },
            );
            sayOn(c, cx, cy - ry - 14, p.labels[k] ?? "", 16);
            a[`ring(${k})`] = [cx, cy - ry, "up"];
        });
        const counts = [0, 0, 0];
        p.items.forEach((item, i) => {
            const k = item.ring === 0 ? 0 : item.ring === 1 ? 1 : 2;
            const n = counts[k] ?? 0;
            counts[k] = n + 1;
            const spot: [number, number] =
                k === 2
                    ? [5.6 * U + n * 2.6 * U, 9.8 * U]
                    : [
                          (k ? 12.4 : 4.2) * U + (n % 2 ? 1.4 : -1.4) * U,
                          cy + (n > 1 ? 1.2 : -0.4) * U,
                      ];
            drawProp(c, item.prop, spot[0], spot[1], 44);
            a[`item(${i})`] = [spot[0], spot[1] - 24, "up"];
        });
        if (counts[2]) soft(c, U, 9.9 * U, "left out", 14, "start");
        return a;
    },
    describe: () =>
        "Two sorting rings overlapping, each labelled, with small pictures placed inside one ring, in the overlap, or outside both.",
});
