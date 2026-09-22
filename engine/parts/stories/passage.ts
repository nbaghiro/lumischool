import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, soft } from "../lettering";

/** Characters that fit one square at the reading size used here, matched to lang/layout's wrap. */
const PER_SQUARE = 2.1;

/** Break prose into lines of at most `width` squares, by the same glyph estimate the pages use. */
function passageLines(s: string, width: number): string[] {
    const max = Math.max(8, Math.floor((width - 3) * PER_SQUARE)),
        out: string[] = [];
    let line = "";
    for (const w of s.split(/\s+/).filter(Boolean)) {
        if (line && (line + " " + w).length > max) {
            out.push(line);
            line = w;
        } else line = line ? `${line} ${w}` : w;
    }
    if (line) out.push(line);
    return out.length ? out : [""];
}

export const passage = defineDrawing({
    id: "passage",
    family: "stories",
    title: "A passage to read",
    group: "Structures",
    about: "Prose set on ruled lines on a page, with the lines numbered down the margin and a title at the top. Numbering the lines is what makes a comprehension question able to point at the place the answer came from, which is the habit the lesson is really teaching.",
    params: {
        title: "",
        text: "Sam has a red bike. He rides it to the park every Saturday, and he leaves it by the gate while he plays.",
        width: 30,
        numbers: true,
    },
    settings: {
        title: { kind: "text", most: 30 },
        text: { kind: "text", most: 400 },
        width: { kind: "whole", min: 12, max: 40 },
        numbers: { kind: "flag" },
    },
    takes: [
        {
            label: "With a title",
            params: {
                title: "Ada's hens",
                text: "Ada keeps six hens in the garden. Every morning she opens the hutch and counts them.",
                width: 26,
                numbers: true,
            },
        },
        {
            label: "No numbers",
            params: { title: "", text: "The rain fell all night.", width: 18, numbers: false },
        },
    ],
    box: (p) => ({ w: p.width, h: passageLines(p.text, p.width).length * 2 + (p.title ? 4 : 2) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const lines = passageLines(p.text, p.width);
        const h = lines.length * 2 + (p.title ? 4 : 2);
        const margin = p.numbers ? 2.4 : 1;
        pen.path(
            g,
            roundedRect(0.4 * U, 0.4 * U, (p.width - 0.8) * U, (h - 0.8) * U, 10),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        if (p.numbers)
            pen.line(g, margin * U, 0.8 * U, margin * U, (h - 0.8) * U, "ruler", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
        let y = (p.title ? 3.6 : 1.8) * U;
        if (p.title) {
            say(c, margin * U + 8, 1.9 * U, p.title, 20, "start");
            pen.line(g, margin * U + 6, 2.6 * U, (p.width - 1.2) * U, 2.6 * U, "ruler", {
                strokeWidth: 1.4,
                stroke: c.t["ink-soft"],
            });
        }
        lines.forEach((line, i) => {
            pen.line(g, margin * U + 6, y + 8, (p.width - 1.2) * U, y + 8, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t.grid,
            });
            say(c, margin * U + 8, y + 3, line, 18, "start");
            if (p.numbers) soft(c, margin * U - 8, y + 3, String(i + 1), 13, "end");
            a[`line(${i + 1})`] = [margin * U + 8, y - 0.7 * U, "up"];
            y += 2 * U;
        });
        a.page = [(p.width * U) / 2, 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `Prose set on ruled lines on a page${p.title ? " under a title" : ""}${p.numbers ? ", the lines numbered down the margin" : ""}, the way a reading book's page is laid out.`,
});
