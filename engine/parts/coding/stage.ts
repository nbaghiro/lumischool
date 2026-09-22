import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say, soft } from "../lettering";
import { parse, run, upTo, world, type Dance } from "../../coding";
import { drawActor } from "./grid";

const WHO = ["rabbit", "crab", "bot"] as const;

/** Where the cast stands on a square of the stage's floor, in the drawing's own units. */
export const stageAt = (col: number): [number, number] => [
    1.5 * U + (col - 1) * 2 * U + U,
    7.6 * U - 1.5 * U,
];

export const stage = defineDrawing({
    id: "stage",
    family: "coding",
    title: "A stage for a program's story",
    group: "Structures",
    about: "A small stage with its curtains open, a floor marked in squares and one of the cast on it: the rabbit, the crab or the robot. A program moves it along the floor, makes it jump, clap or spin, and puts what it says in a bubble; a green flag in the corner is the when block that starts it, and the cast can have a when-tapped script of its own. `upto` stops partway, so a comic strip of frames can be drawn from one program.",
    params: {
        cols: 7,
        col: 2,
        who: "rabbit",
        code: ["when the flag is tapped", "right 3", "jump", "say hello"],
        upto: -1,
        event: "flag",
        flag: true,
        actor: true,
    },
    settings: {
        cols: { kind: "whole", min: 3, max: 10 },
        col: { kind: "whole", min: 1, max: 10 },
        who: { kind: "one of", of: WHO },
        code: { kind: "words", most: 12 },
        upto: { kind: "whole", min: -1, max: 20 },
        event: { kind: "one of", of: ["flag", "tap"] },
        flag: { kind: "flag" },
        actor: { kind: "flag" },
    },
    takes: [
        {
            label: "The rabbit says hello",
            params: {
                cols: 7,
                col: 2,
                who: "rabbit",
                code: ["when the flag is tapped", "right 3", "say hello"],
                upto: -1,
                event: "flag",
                flag: true,
                actor: true,
            },
        },
        {
            label: "The crab, clapping",
            params: {
                cols: 6,
                col: 4,
                who: "crab",
                code: ["left 2", "clap 2"],
                upto: -1,
                event: "flag",
                flag: true,
                actor: true,
            },
        },
        {
            label: "The robot, jumping",
            params: {
                cols: 6,
                col: 1,
                who: "bot",
                code: ["right 2", "jump"],
                upto: -1,
                event: "flag",
                flag: false,
                actor: true,
            },
        },
    ],
    box: (p) => ({ w: Math.max(4, Math.round(p.cols)) * 2 + 3, h: 10 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            cols = Math.max(4, Math.round(p.cols)),
            W = (cols * 2 + 3) * U;
        const floor = 7.6 * U,
            x0 = 1.5 * U;
        pen.rect(
            g,
            0.5 * U,
            0.5 * U,
            W - U,
            9 * U,
            "pencil",
            c.paper ? null : { fill: "#EAF4FB", fillStyle: "solid" },
            { strokeWidth: 2 },
        );
        for (const s of [0, 1]) {
            const cx = s ? W - 0.5 * U : 0.5 * U,
                dir = s ? -1 : 1;
            pen.path(
                g,
                `M${cx} ${0.5 * U}Q${cx + dir * 2.4 * U} ${3 * U} ${cx + dir * 0.9 * U} ${6.5 * U}L${cx} ${6.8 * U}Z`,
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 1.6 },
            );
        }
        pen.rect(g, 0.5 * U, 0.5 * U, W - U, 0.9 * U, "pencil", pen.fill("berry"), {
            strokeWidth: 1.6,
        });
        pen.rect(g, 0.5 * U, floor, W - U, 1.9 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        for (let k = 0; k <= cols; k++)
            pen.line(g, x0 + k * 2 * U, floor, x0 + k * 2 * U, floor + 1.9 * U, "ruler", {
                strokeWidth: 1,
                stroke: c.t.ink,
            });
        for (let k = 0; k < cols; k++) {
            patch(c, x0 + k * 2 * U + U, floor + 1.05 * U, 14, 14);
            soft(c, x0 + k * 2 * U + U, floor + 1.35 * U, String(k + 1), 12);
        }
        if (p.flag) {
            const fx = W - 3 * U,
                fy = 2.2 * U;
            pen.circle(g, fx, fy, 1.8 * U, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            pen.line(g, fx - 5, fy + 9, fx - 5, fy - 9, "ruler", { strokeWidth: 2 });
            pen.polygon(
                g,
                [
                    [fx - 5, fy - 9],
                    [fx + 9, fy - 5],
                    [fx - 5, fy - 1],
                ],
                "ruler",
                pen.fill("mint"),
                { strokeWidth: 1.4 },
            );
            a.flag = [fx, fy - 1.8 * U, "up"];
        }
        const w = world({
            cols,
            rows: 1,
            start: { col: Math.max(1, Math.min(cols, Math.round(p.col))), row: 1 },
        });
        const r = run(parse(p.code), w, { event: p.event === "tap" ? "tap" : "flag" }),
            part = upTo(r, p.upto);
        const last = [...part.frames].reverse().find((f) => f.kind === "dance");
        const pose: Dance | "rest" =
            part.frames[part.frames.length - 1]?.kind === "dance" && last?.move
                ? last.move
                : "rest";
        const [x, y] = stageAt(part.state.col);
        if (p.actor)
            drawActor(c, p.who, x, y, pose, part.state.face === "left" ? "left" : "right", 1.35);
        a.actor = [x, y - 1.6 * U, "up"];
        if (part.state.said) {
            const bw = Math.max(3.5 * U, part.state.said.length * 8.5 + 20),
                bx = Math.min(W - bw - U, Math.max(U, x - bw / 2 + 1.5 * U)),
                by = 1.8 * U;
            pen.path(g, roundedRect(bx, by, bw, 1.9 * U, 9), "pencil", pen.fill("card"), {
                strokeWidth: 1.6,
            });
            pen.linear(
                g,
                [
                    [x + 2, by + 1.9 * U],
                    [x + 6, y - 2.2 * U],
                    [x + 12, by + 1.9 * U],
                ],
                "pencil",
                { strokeWidth: 1.6 },
            );
            say(c, bx + bw / 2, by + 1.3 * U, part.state.said, 15);
        }
        return a;
    },
    describe: (p) =>
        `A small stage with its curtains open and a floor marked in squares, the ${p.who} standing on it${p.flag ? ", a green flag in the corner" : ""}.`,
});
