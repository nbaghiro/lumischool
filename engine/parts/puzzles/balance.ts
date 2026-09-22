import { letter, type Ctx, type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { apple, ball, cube, star } from "../props";

const ITEMS = ["cube", "ball", "star", "apple"] as const;
type Item = (typeof ITEMS)[number];

const drawItem = <G>(c: Ctx<G>, k: Item, x: number, panY: number) => {
    if (k === "cube") cube(c, x - 3, panY - 17, 28);
    else if (k === "ball") ball(c, x, panY - 11);
    else if (k === "apple") apple(c, x, panY - 14, 24);
    else star(c, x, panY - 14);
};

export const balance = defineDrawing({
    id: "balance",
    family: "puzzles",
    title: "Balance",
    group: "Structures",
    about: "Pans hold any props. Tilt is -1, 0 or 1; the beam stays straight at every roughness.",
    params: {
        left: ["cube"] as Item[],
        right: ["ball", "ball", "ball"] as Item[],
        tilt: 0,
        label: "",
    },
    settings: {
        left: { kind: "words", most: 6, of: ITEMS },
        right: { kind: "words", most: 6, of: ITEMS },
        tilt: { kind: "one of", of: [-1, 0, 1] },
        label: { kind: "text", most: 16 },
    },
    takes: [
        {
            label: "Level, 1 against 3",
            params: { left: ["cube"], right: ["ball", "ball", "ball"], tilt: 0, label: "" },
        },
        {
            label: "Level, with a label",
            params: {
                left: ["cube"],
                right: ["ball", "ball", "ball", "ball"],
                tilt: 0,
                label: "1 cube = 4 balls",
            },
        },
        {
            label: "Tipped left",
            params: { left: ["cube", "cube"], right: ["ball"], tilt: -1, label: "" },
        },
        {
            label: "Stars against a ball",
            params: { left: ["ball"], right: ["star", "star", "star"], tilt: 0, label: "" },
        },
        {
            label: "A full pan",
            params: {
                left: ["apple", "apple", "apple", "apple", "apple", "apple"],
                right: ["cube"],
                tilt: 1,
                label: "",
            },
        },
    ],
    box: () => ({ w: 14, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a = p.tilt * 0.14,
            cos = Math.cos(a),
            sin = Math.sin(a);
        const L: [number, number] = [140 - 110 * cos, 62 - 110 * sin],
            R: [number, number] = [140 + 110 * cos, 62 + 110 * sin];
        pen.line(g, 140, 68, 140, 188, "ruler", { strokeWidth: 4 });
        pen.rect(g, 100, 188, 80, 8, "ruler", pen.fill("ink-soft", "hachure", { hachureGap: 3 }), {
            strokeWidth: 1.6,
        });
        pen.line(g, L[0], L[1], R[0], R[1], "ruler", { strokeWidth: 3.2 });
        const anchors: RawAnchors = {
            pivot: [140, 54, "up"],
            base: [140, 196, "down"],
            "beam-l": [L[0], L[1], "left"],
            "beam-r": [R[0], R[1], "right"],
        };
        (
            [
                [L, p.left, "left-pan"],
                [R, p.right, "right-pan"],
            ] as const
        ).forEach(([E, items, name]) => {
            const py = E[1] + 70;
            pen.line(g, E[0], E[1], E[0] - 32, py, "pencil", { strokeWidth: 1.3 });
            pen.line(g, E[0], E[1], E[0] + 32, py, "pencil", { strokeWidth: 1.3 });
            pen.path(
                g,
                `M${E[0] - 36} ${py}L${E[0] + 36} ${py}Q${E[0]} ${py + 28} ${E[0] - 36} ${py}Z`,
                "pencil",
                pen.fill("card"),
            );
            const n = items.length,
                per = Math.min(n, 3);
            items.forEach((k, i) => {
                const row = Math.floor(i / 3),
                    col = i % 3,
                    inRow = Math.min(per, n - row * 3);
                drawItem(c, k, E[0] + (col - (inRow - 1) / 2) * 23, py - row * 21);
            });
            anchors[name] = [E[0], py - 38 - Math.floor((n - 1) / 3) * 21, "up"];
        });
        pen.circle(g, 140, 62, 12, "ruler", { fill: c.t.ink, fillStyle: "solid" });
        if (p.label)
            letter(c, {
                x: 140,
                y: 214,
                s: p.label,
                face: "hand",
                weight: 500,
                size: 16,
                fill: c.t["ink-soft"],
                anchor: "middle",
            });
        return anchors;
    },
    describe: (p) =>
        `A balance with a beam on a stand and a pan hanging from each end, things sitting in the pans${p.label ? " and a label written under it" : " and nothing written under it"}.`,
    motion: { still: "Which way it tips is the answer." },
});
