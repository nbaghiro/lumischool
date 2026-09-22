import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ghost, patch, say } from "../lettering";

/** A carriage on a word train, in squares. */
const TRAIN_CAR = 4.4;

export const wordTrain = defineDrawing({
    id: "wordtrain",
    family: "letters",
    title: "Word train",
    group: "Props",
    about: "An engine pulling one carriage for each sound in a word, or for each beat, so a word is pulled apart into its pieces in order and counting the carriages counts the sounds. The engine can carry the whole word on its side, and one carriage can be left empty to fill.",
    params: { parts: ["h", "e", "n"], blank: -1, word: "" },
    settings: {
        parts: { kind: "words", most: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
        word: { kind: "text", most: 12 },
    },
    takes: [
        { label: "h-e-n", params: { parts: ["h", "e", "n"], blank: -1, word: "" } },
        { label: "A sound to fill", params: { parts: ["d", "u", "ck"], blank: 1, word: "duck" } },
        {
            label: "Three beats",
            params: { parts: ["sand", "cas", "tle"], blank: -1, word: "sandcastle" },
        },
    ],
    box: (p) => ({
        w: Math.ceil(5.4 + Math.max(1, p.parts.filter(Boolean).length) * TRAIN_CAR + 0.4),
        h: 6,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            parts = p.parts.filter(Boolean),
            rail = 5.4 * U,
            a: RawAnchors = {};
        const wheels = (x0: number, x1: number) => {
            for (const x of [x0, x1]) {
                pen.circle(
                    g,
                    x,
                    rail - 0.45 * U,
                    0.9 * U,
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
                    { strokeWidth: 1.6 },
                );
                pen.circle(g, x, rail - 0.45 * U, 0.3 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 1,
                });
            }
        };
        // The engine faces left, leading, so the carriages behind it read in the order the word is said.
        const ex = 0.4 * U;
        pen.path(
            g,
            `M${ex + 0.3 * U} ${rail - 0.9 * U}V${2.6 * U}Q${ex + 0.3 * U} ${2.2 * U} ${ex + 0.8 * U} ${2.2 * U}H${ex + 2.6 * U}V${1.1 * U}H${ex + 4.8 * U}V${rail - 0.9 * U}Z`,
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 10, fillWeight: 0.55 }),
            { strokeWidth: 2.4 },
        );
        pen.rect(
            g,
            ex + 0.8 * U,
            1.2 * U,
            0.6 * U,
            1 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.4 },
        );
        for (const [dx, dy, d] of [
            [1.1, 0.7, 0.5],
            [0.6, 0.35, 0.36],
        ] as const)
            pen.circle(g, ex + dx * U, dy * U, d * U, "doodle", pen.fill("card"), {
                strokeWidth: 1.1,
            });
        pen.rect(g, ex + 3 * U, 1.5 * U, 1.4 * U, 1.1 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        if (p.word) {
            pen.path(
                g,
                roundedRect(ex + 0.5 * U, 2.9 * U, 4 * U, 1.3 * U, 4),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.3 },
            );
            say(c, ex + 2.5 * U, 3.9 * U, p.word, p.word.length > 7 ? 12 : 15);
        }
        wheels(ex + 1.3 * U, ex + 3.8 * U);
        parts.forEach((part, i) => {
            const x = (5.4 + i * TRAIN_CAR) * U,
                w = (TRAIN_CAR - 0.4) * U;
            pen.line(g, x - 0.4 * U, rail - 1.1 * U, x, rail - 1.1 * U, "pencil", {
                strokeWidth: 2,
            });
            pen.path(
                g,
                roundedRect(x, 1.3 * U, w, rail - 2.2 * U, 7),
                "pencil",
                pen.fill("sky", "solid", { hachureGap: 8, fillWeight: 0.6 }),
                { strokeWidth: 2.2 },
            );
            const win = roundedRect(x + 0.45 * U, 1.75 * U, w - 0.9 * U, 2.2 * U, 5);
            if (i === p.blank) {
                patch(c, x + w / 2, 2.85 * U, w - 0.9 * U, 2.2 * U);
                ghost(c, win, "ruler");
            } else {
                pen.path(g, win, "ruler", pen.fill("card"), { strokeWidth: 1.5 });
                say(
                    c,
                    x + w / 2,
                    3.55 * U,
                    part,
                    part.length <= 2 ? 26 : part.length <= 4 ? 21 : 16,
                );
            }
            wheels(x + 0.9 * U, x + w - 0.9 * U);
            a[`car(${i})`] = [x + w / 2, 1.3 * U, "up"];
        });
        pen.line(g, 0.2 * U, rail, (5.8 + parts.length * TRAIN_CAR) * U, rail, "ruler", {
            strokeWidth: 2,
        });
        a.engine = [ex + 2.4 * U, 1.1 * U, "up"];
        return a;
    },
    describe: () =>
        "An engine pulling a carriage for each sound in a word, a piece of the word on each carriage, the word along the engine's side when given.",
});
