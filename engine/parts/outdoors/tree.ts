import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { drawProp } from "../props";
import { named } from "../stories/pictures";

type Pt = [number, number];

/** What hangs in the tree and what lies under it, never how many of either. */
function describeTree(p: { fruit: number; fallen: number; item: string }): string {
    const up = p.fruit > 0,
        down = p.fallen > 0;
    if (up && down)
        return `A tree with a round green crown on a trunk, ${named(p.item)} hanging in it and some lying on the ground under it.`;
    if (up)
        return `A tree with a round green crown on a trunk, ${named(p.item)} hanging in it, and nothing on the ground.`;
    if (down)
        return `A tree with a round green crown on a trunk, and ${named(p.item)} lying on the ground under it.`;
    return "A tree with a round green crown on a trunk, standing on a line of ground.";
}

export const tree = defineDrawing({
    id: "tree",
    family: "outdoors",
    title: "Tree",
    group: "Props",
    about: "A tree with fruit on it and some on the ground, which is the two-part story a number bond wants: what is still up there and what has fallen add back to what there was.",
    params: { fruit: 6, fallen: 2, item: "apple" },
    settings: {
        fruit: { kind: "whole", min: 0, max: 8 },
        fallen: { kind: "whole", min: 0, max: 8 },
        item: { kind: "text", most: 12 },
    },
    takes: [
        { label: "Six up, two down", params: { fruit: 6, fallen: 2, item: "apple" } },
        { label: "Nothing fallen", params: { fruit: 8, fallen: 0, item: "apple" } },
        { label: "All on the ground", params: { fruit: 0, fallen: 5, item: "ball" } },
    ],
    box: () => ({ w: 10, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 5 * U,
            ground = 10.4 * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${cx - 0.6 * U} ${ground}C${cx - 0.7 * U} ${7 * U} ${cx - 0.5 * U} ${6 * U} ${cx - 0.4 * U} ${5 * U}` +
                `H${cx + 0.4 * U}C${cx + 0.5 * U} ${6 * U} ${cx + 0.7 * U} ${7 * U} ${cx + 0.6 * U} ${ground}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            `M${cx} ${1.1 * U}C${cx + 3.6 * U} ${1.1 * U} ${cx + 4.2 * U} ${5.4 * U} ${cx + 1.6 * U} ${5.6 * U}` +
                `H${cx - 1.6 * U}C${cx - 4.2 * U} ${5.4 * U} ${cx - 3.6 * U} ${1.1 * U} ${cx} ${1.1 * U}Z`,
            "doodle",
            pen.fill("mint", "solid", { hachureGap: 8, fillWeight: 0.7 }),
            { strokeWidth: 2.4 },
        );
        const spots: Pt[] = [
            [-2.1, 2.4],
            [0, 1.9],
            [2.1, 2.4],
            [-1.2, 3.8],
            [1.2, 3.8],
            [0, 3.1],
            [-2.6, 3.5],
            [2.6, 3.5],
        ];
        for (let i = 0; i < Math.min(p.fruit, spots.length); i++) {
            const [dx, dy] = spots[i] ?? [0, 0];
            drawProp(c, p.item, cx + dx * U, dy * U, 28);
            a[`fruit(${i})`] = [cx + dx * U, dy * U - 14, "up"];
        }
        for (let i = 0; i < p.fallen; i++) {
            const x = cx + ((i % 4) - 1.5) * 1.6 * U + (i > 3 ? 0.8 * U : 0);
            drawProp(c, p.item, x, ground - 14 - (i > 3 ? 1.2 * U : 0), 28);
            a[`fallen(${i})`] = [x, ground - 30, "up"];
        }
        pen.line(g, 0.4 * U, ground, 9.6 * U, ground, "pencil", { strokeWidth: 2.2 });
        return a;
    },
    describe: (p) => describeTree(p),
});
