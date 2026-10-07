import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export const gridPost = defineDrawing<{ mark: string }>({
    id: "gridpost",
    family: "travel",
    title: "Map post",
    group: "Props",
    about: "A wooden stake knocked into the ground with a small white board on top, painted with one letter or number of a map's grid, so the squares on the ground can be named as the map names them.",
    params: { mark: "C" },
    settings: { mark: { kind: "text", most: 2 } },
    takes: [
        { label: "The C column", params: { mark: "C" } },
        { label: "Row four", params: { mark: "4" } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        pen.rect(g, 0.82 * U, 1.4 * U, 0.36 * U, 1.4 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.3,
        });
        pen.rect(g, 0.15 * U, 0.15 * U, 1.7 * U, 1.35 * U, "pencil", pen.fill("card", "solid"), {
            strokeWidth: 1.5,
        });
        say(c, 1 * U, 1.17 * U, String(p.mark).slice(0, 2), 22);
        a.foot = [1 * U, 2.8 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A wooden stake in the ground with a small white board on top painted with ${String(p.mark).slice(0, 2)}, naming a column or a row of a map's grid.`,
    motion: { still: "A post is knocked into the ground and holds its place on the grid." },
});
