import { type RawAnchors } from "../../ink/surface";
import { roundedRect, starPoints } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { loop } from "../marks";
import { wrapTo } from "./lines";

const BOT_SIZE = 19;

const botLines = (says: string, width: number) => wrapTo(says, (width - 1.6) * U, BOT_SIZE * 0.92);

const botH = (says: string, width: number) => Math.max(9, botLines(says, width).length * 2 + 4);

export const fixBot = defineDrawing({
    id: "fixbot",
    family: "writing",
    title: "A robot with a sentence to fix",
    group: "Characters",
    about: "A small robot showing a sentence on its screen. Broken, it has a crossed eye and a spark, and the sentence has one thing wrong with it; mended, it smiles. A child fixes the robot's sentence rather than their own, which makes the first editing job a game and takes the sting out of finding a mistake. `ring` loops one word, for a worked example.",
    params: { says: "the cat sat on the mat", width: 20, fixed: 0, ring: -1 },
    settings: {
        says: { kind: "text", most: 60 },
        width: { kind: "whole", min: 10, max: 30 },
        fixed: { kind: "whole", min: 0, max: 1 },
        ring: { kind: "whole", min: -1, max: 11 },
    },
    takes: [
        {
            label: "Broken",
            params: { says: "the dog ran too the park", width: 18, fixed: 0, ring: -1 },
        },
        {
            label: "Mended, one word ringed",
            params: { says: "The dog ran to the park.", width: 18, fixed: 1, ring: 3 },
        },
    ],
    box: (p) => ({ w: 8 + p.width, h: botH(p.says, p.width) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            h = botH(p.says, p.width) * U;
        const bx = 0.6 * U,
            by = h - 9 * U;
        pen.line(g, bx + 3.5 * U, by + 1.3 * U, bx + 3.5 * U, by + 0.5 * U, "pencil", {
            strokeWidth: 2,
        });
        pen.circle(g, bx + 3.5 * U, by + 0.35 * U, 12, "pencil", pen.fill("glow"), {
            strokeWidth: 1.6,
        });
        pen.path(
            g,
            roundedRect(bx + 1 * U, by + 1.3 * U, 5 * U, 3 * U, 10),
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 2.2 },
        );
        pen.path(
            g,
            roundedRect(bx + 1.6 * U, by + 1.8 * U, 3.8 * U, 2 * U, 7),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        const ey = by + 2.6 * U;
        pen.circle(
            g,
            bx + 2.7 * U,
            ey,
            9,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
        if (p.fixed) {
            pen.circle(
                g,
                bx + 4.3 * U,
                ey,
                9,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
            pen.arc(
                g,
                bx + 3.5 * U,
                ey + 0.35 * U,
                1.3 * U,
                0.8 * U,
                0.2,
                Math.PI - 0.2,
                "pencil",
                { strokeWidth: 1.8 },
            );
        } else {
            for (const s of [-1, 1])
                pen.line(g, bx + 4.3 * U - 6, ey + s * 6, bx + 4.3 * U + 6, ey - s * 6, "pencil", {
                    strokeWidth: 1.8,
                });
            pen.linear(
                g,
                [
                    [bx + 2.7 * U, ey + 0.75 * U],
                    [bx + 3.1 * U, ey + 0.55 * U],
                    [bx + 3.5 * U, ey + 0.75 * U],
                    [bx + 3.9 * U, ey + 0.55 * U],
                    [bx + 4.3 * U, ey + 0.75 * U],
                ],
                "pencil",
                { strokeWidth: 1.6 },
            );
            pen.polygon(
                g,
                starPoints(bx + 6.3 * U, by + 1.2 * U, 11, 6, 0.4),
                "doodle",
                pen.fill("glow"),
                { strokeWidth: 1.3 },
            );
        }
        pen.rect(
            g,
            bx + 3 * U,
            by + 4.3 * U,
            U,
            0.5 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.2 },
        );
        pen.path(
            g,
            roundedRect(bx + 0.8 * U, by + 4.8 * U, 5.4 * U, 3.1 * U, 8),
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 2.2 },
        );
        for (const [k, col] of [
            [0, "berry"],
            [1, "glow"],
            [2, "sky"],
        ] as const)
            pen.circle(g, bx + (1.9 + k * 1.1) * U, by + 5.9 * U, 14, "ruler", pen.fill(col), {
                strokeWidth: 1.2,
            });
        pen.line(g, bx + 1.7 * U, by + 7 * U, bx + 5.3 * U, by + 7 * U, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
        });
        for (const s of [-1, 1]) {
            const sx = s < 0 ? bx + 0.8 * U : bx + 6.2 * U;
            pen.curve(
                g,
                [
                    [sx, by + 5.4 * U],
                    [sx + s * 0.6 * U, by + 6 * U],
                    [sx + s * 0.5 * U, by + 6.9 * U],
                ],
                "pencil",
                { strokeWidth: 2 },
            );
            pen.arc(g, sx + s * 0.5 * U, by + 7.1 * U, 12, 10, 0, Math.PI * 2, "pencil", {
                strokeWidth: 1.6,
            });
        }
        pen.path(
            g,
            roundedRect(bx + 1 * U, by + 8 * U, 5 * U, 0.9 * U, 8),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        for (let k = 0; k < 4; k++)
            pen.circle(g, bx + (1.6 + k * 1.25) * U, by + 8.45 * U, 11, "ruler", pen.fill("card"), {
                strokeWidth: 1.1,
            });
        a.robot = [bx + 3.5 * U, by, "up"];

        const px = 8 * U,
            pw = (p.width - 0.4) * U,
            lines = botLines(p.says, p.width);
        const ph = (lines.length * 2 + 1.6) * U,
            py = Math.max(0.4 * U, by + 2.8 * U - ph / 2);
        pen.path(g, roundedRect(px, py, pw, ph, 12), "ruler", pen.fill("card"), { strokeWidth: 2 });
        pen.polygon(
            g,
            [
                [px, py + ph / 2 - 10],
                [px, py + ph / 2 + 10],
                [bx + 6.3 * U, by + 2.9 * U],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
        // A line is set as one run of text so its spacing is the font's own; where a word sits is only
        // estimated, which is close enough for a loop round it.
        let word = 0;
        const perChar = BOT_SIZE * 0.5;
        lines.forEach((line, i) => {
            const x0 = px + 0.8 * U,
                y = py + (1.9 + i * 2) * U;
            say(c, x0, y, line, BOT_SIZE, "start");
            let at = 0;
            for (const w of line.split(" ")) {
                const cx = x0 + (at + w.length / 2) * perChar,
                    ww = w.length * perChar;
                if (word === p.ring) loop(c, cx, y - 6, ww + 20, 32);
                a[`word(${word})`] = [cx, y - 18, "up"];
                at += w.length + 1;
                word++;
            }
        });
        a.screen = [px + pw / 2, py, "up"];
        return a;
    },
    describe: (p) =>
        `A small robot with a sentence on the screen in its chest${p.fixed > 0 ? ", smiling now it is mended" : ", a crossed eye and a spark flying off it"}.`,
});
