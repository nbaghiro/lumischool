import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, wide } from "../lettering";
import { writeLine, wrapTo } from "./lines";

const LETTER_SIZE = 17;

const bodyLines = (p: { body: string; width: number }) =>
    p.body ? wrapTo(p.body, (p.width - 3) * U, LETTER_SIZE) : [];

const letterH = (p: { body: string; lines: number; width: number }) =>
    8 + (p.body ? bodyLines(p).length * 1.6 : Math.max(1, p.lines) * 2);

export const letterPage = defineDrawing({
    id: "letterpage",
    family: "writing",
    title: "A letter",
    group: "Inputs",
    about: "A letter on notepaper with its parts in their places: who it is to at the top, the body on ruled lines, and who it is from at the bottom, with an envelope tucked behind it. Each part is written in or left as a line, so the page itself teaches where the greeting and the sign-off go.",
    params: { greeting: "Dear Sam,", body: "", lines: 4, closing: "Love from", width: 24 },
    settings: {
        greeting: { kind: "text", most: 20 },
        body: { kind: "text", most: 300 },
        lines: { kind: "whole", min: 0, max: 8 },
        closing: { kind: "text", most: 20 },
        width: { kind: "whole", min: 12, max: 40 },
    },
    takes: [
        {
            label: "To write",
            params: { greeting: "Dear", body: "", lines: 4, closing: "From", width: 24 },
        },
        {
            label: "Written",
            params: {
                greeting: "Dear Owl,",
                body: "Thank you for the map. We found the chest under the palm tree, and it was full of shells.",
                lines: 0,
                closing: "Love from",
                width: 24,
            },
        },
    ],
    box: (p) => ({ w: p.width, h: Math.ceil(letterH(p)) }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = p.width * U,
            H = Math.ceil(letterH(p)) * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${W - 7.6 * U} ${1.2 * U}H${W - 0.4 * U}V${6 * U}H${W - 7.6 * U}Z`,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 6 }),
            { strokeWidth: 1.6 },
        );
        pen.linear(
            g,
            [
                [W - 7.6 * U, 1.2 * U],
                [W - 4 * U, 3.6 * U],
                [W - 0.4 * U, 1.2 * U],
            ],
            "pencil",
            { strokeWidth: 1.4 },
        );
        pen.path(
            g,
            `M${0.4 * U} ${0.6 * U}H${W - 2.4 * U}L${W - 1.4 * U} ${1.6 * U}V${H - 0.4 * U}H${0.4 * U}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        pen.path(g, `M${W - 2.4 * U} ${0.6 * U}V${1.6 * U}H${W - 1.4 * U}`, "pencil", null, {
            strokeWidth: 1.4,
        });
        pen.line(g, 2.2 * U, 0.8 * U, 2.2 * U, H - 0.6 * U, "ruler", {
            strokeWidth: 1,
            stroke: c.t.berry,
        });
        const gx = 2.8 * U;
        // A greeting with no name after it ("Dear") leaves a line for the child to write the name on.
        say(c, gx, 2.9 * U, p.greeting, LETTER_SIZE, "start");
        if (!/[,!]$/.test(p.greeting.trim()))
            writeLine(c, gx + wide(p.greeting, LETTER_SIZE) + 8, 3 * U, 6 * U);
        a.greeting = [gx, 1.6 * U, "up"];
        let y = 5 * U;
        if (p.body)
            for (const l of bodyLines(p)) {
                say(c, gx, y, l, LETTER_SIZE, "start");
                y += 1.6 * U;
            }
        else
            for (let k = 0; k < Math.max(1, p.lines); k++) {
                writeLine(c, gx, y + 0.2 * U, W - gx - 2.2 * U);
                y += 2 * U;
            }
        a.body = [gx, 4 * U, "up"];
        const cy = H - 1.6 * U;
        say(c, gx, cy - 1.6 * U, p.closing, LETTER_SIZE, "start");
        writeLine(c, gx, cy + 0.3 * U, 8 * U);
        a.closing = [gx, cy - 2.6 * U, "up"];
        return a;
    },
    describe: () =>
        "A letter on a sheet of notepaper with a greeting at the top, ruled lines for the body and a sign off at the foot, an envelope tucked behind.",
});
