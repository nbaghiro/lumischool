import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, type Drawing } from "../drawing";
import { ghost, say, soft } from "../lettering";
import { cottage } from "../places/cottage";
import { lighthouse } from "../places/lighthouse";
import { windmill } from "../places/windmill";
import { ship } from "../travel/ship";

/**
 * The drawings a labelled diagram can label, each with the points its labels lead to, in squares
 * inside the drawing and in the order the labels are given, and which side each label sits.
 */
interface Diagram {
    box: () => { w: number; h: number };
    draw: <G>(c: Ctx<G>) => void;
    parts: [number, number, "left" | "right"][];
}
/** A drawing with the numbers it is drawn with here, so the table holds drawings of different kinds. */
const of = <P>(d: Drawing<P>, params: P, parts: Diagram["parts"]): Diagram => ({
    box: () => d.box(params),
    draw: (c) => {
        d.draw(c, params);
    },
    parts,
});
const LIGHTHOUSE = of(lighthouse, { stripes: 3, beam: 0 }, [
    [4.5, 2.4, "right"],
    [3.2, 3.6, "left"],
    [5.7, 8.5, "right"],
    [4.5, 13.5, "left"],
    [7.4, 15, "right"],
]);
const DIAGRAMS: Record<string, Diagram> = {
    lighthouse: LIGHTHOUSE,
    windmill: of(windmill, { sails: 4, turn: 0 }, [
        [6.6, 3.8, "right"],
        [5, 2.6, "right"],
        [4, 5.9, "left"],
        [4, 9, "left"],
        [5.3, 7.6, "right"],
    ]),
    ship: of(ship, { sails: 3, portholes: 5 }, [
        [7.7, 1.2, "right"],
        [3.9, 5.4, "left"],
        [4.6, 10.35, "left"],
        [10.6, 11.2, "right"],
        [1.6, 12.3, "left"],
    ]),
    cottage: of(cottage, { windows: 2, lit: 1 }, [
        [6.4, 1.9, "right"],
        [2.4, 2.8, "left"],
        [2.1, 5.3, "left"],
        [4.6, 6.6, "right"],
        [7.8, 6, "right"],
    ]),
};

const SIDE = 8;

export const labelled = defineDrawing({
    id: "labelled",
    family: "stories",
    title: "A labelled diagram",
    group: "Structures",
    about: "A drawing from the shelf with labels in boxes either side and a line from each label to the part it names: a lighthouse, a windmill, a ship or a cottage. It has a heading and a caption the way an information book does, and one label can be left empty for the child to fill from what the text says.",
    params: {
        of: "lighthouse",
        labels: ["lamp", "rail", "tower", "door", "rocks"],
        blank: -1,
        title: "",
        caption: "",
    },
    settings: {
        of: { kind: "one of", of: ["lighthouse", "windmill", "ship", "cottage"] },
        labels: { kind: "words", most: 5 },
        blank: { kind: "whole", min: -1, max: 4 },
        title: { kind: "text", most: 30 },
        caption: { kind: "text", most: 60 },
    },
    takes: [
        {
            label: "A lighthouse",
            params: {
                of: "lighthouse",
                labels: ["lamp", "rail", "tower", "door", "rocks"],
                blank: -1,
                title: "A lighthouse",
                caption: "The lamp can be seen far out at sea.",
            },
        },
        {
            label: "A windmill, one to fill",
            params: {
                of: "windmill",
                labels: ["sail", "cap", "window", "door", "tower"],
                blank: 1,
                title: "",
                caption: "",
            },
        },
        {
            label: "A ship",
            params: {
                of: "ship",
                labels: ["flag", "sail", "porthole", "hull", "waves"],
                blank: -1,
                title: "A sailing ship",
                caption: "",
            },
        },
    ],
    box: (p) => {
        const d = DIAGRAMS[p.of] ?? LIGHTHOUSE,
            b = d.box();
        return { w: SIDE * 2 + b.w, h: b.h + (p.title ? 2 : 0) + (p.caption ? 2 : 0) + 1 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            d = DIAGRAMS[p.of] ?? LIGHTHOUSE,
            b = d.box(),
            a: RawAnchors = {};
        const ox = SIDE * U,
            oy = (p.title ? 2.2 : 0.5) * U;
        if (p.title) say(c, (SIDE + b.w / 2) * U, 1.4 * U, p.title, 19);
        d.draw(group(c, { turn: [["translate", ox, oy]] }));
        const placed: Record<"left" | "right", number[]> = { left: [], right: [] };
        p.labels.slice(0, d.parts.length).forEach((label, i) => {
            const [px, py, side] = d.parts[i] ?? [0, 0, "left"];
            const tx = ox + px * U,
                ty = oy + py * U;
            let ly = ty;
            for (const other of placed[side].sort((m, n) => m - n))
                if (Math.abs(other - ly) < 1.9 * U) ly = other + 1.9 * U;
            placed[side].push(ly);
            const w = Math.max(3.4, Math.ceil(label.length * 0.55 + 1.4)) * U;
            const bx = side === "left" ? ox - 0.8 * U - w : ox + b.w * U + 0.8 * U;
            const edge = side === "left" ? bx + w : bx;
            pen.line(g, edge, ly, tx, ty, "ruler", { strokeWidth: 1.2 });
            pen.circle(
                g,
                tx,
                ty,
                6,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.5 },
            );
            if (i === p.blank || !label)
                ghost(c, roundedRect(bx, ly - 0.75 * U, w, 1.5 * U, 5), "ruler");
            else {
                pen.path(
                    g,
                    roundedRect(bx, ly - 0.75 * U, w, 1.5 * U, 5),
                    "ruler",
                    pen.fill("card"),
                    { strokeWidth: 1.4 },
                );
                say(c, bx + w / 2, ly + 0.3 * U, label, 15);
            }
            a[`label(${i})`] = [bx + w / 2, ly - 0.75 * U, "up"];
        });
        if (p.caption) soft(c, (SIDE + b.w / 2) * U, oy + (b.h + 1.2) * U, p.caption, 13);
        return a;
    },
    describe: (p) =>
        `A ${p.of} drawn in the middle with labels in boxes down either side and a line from each label to the part it names${p.title ? ", under a heading" : ""}.`,
});
