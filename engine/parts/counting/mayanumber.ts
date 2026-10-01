import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

interface MayaNumberParams {
    values: number[];
    places: boolean;
    letters: boolean;
}

/** The Maya count in twenties: ones at the bottom, twenties above them, four hundreds at the top. */
const PLACE = [1, 20, 400] as const;
const PLACE_NAME = ["ones", "20s", "400s"] as const;

/** Each place's digit, from the ones up, at least one place even for zero. */
const digitsOf = (v: number): number[] => {
    const out: number[] = [];
    let n = Math.max(0, Math.min(7999, Math.round(v)));
    do {
        out.push(n % 20);
        n = Math.floor(n / 20);
    } while (n > 0 && out.length < PLACE.length);
    return out;
};

/** A level is two squares tall, a numeral three squares wide with a square between numerals. */
const LEVEL = 2,
    COL = 4,
    LABEL = 3;

export const mayaNumber = defineDrawing<MayaNumberParams>({
    id: "mayanumber",
    family: "counting",
    title: "Maya numerals",
    group: "Structures",
    about: "Numbers as the Maya wrote them, in twenties: a dot is one, a bar is five, a shell is nought, and each level up is worth twenty times the one below, ones at the bottom, then twenties, then four hundreds. `places` names the levels at the side, and `letters` letters the numerals A, B, C so a question can ask about one.",
    params: { values: [13, 33, 429], places: true, letters: true },
    settings: {
        values: { kind: "numbers", min: 0, max: 7999, most: 4 },
        places: { kind: "flag" },
        letters: { kind: "flag" },
    },
    takes: [
        { label: "13, 33 and 429", params: { values: [13, 33, 429], places: true, letters: true } },
        { label: "Nought to five", params: { values: [0, 1, 4, 5], places: false, letters: true } },
        { label: "20, with its shell", params: { values: [20], places: true, letters: false } },
        { label: "Nineteen", params: { values: [19], places: false, letters: false } },
    ],
    box: (p) => {
        const levels = Math.max(1, ...p.values.map((v) => digitsOf(v).length));
        return {
            w: (p.places ? LABEL : 0) + Math.max(1, p.values.length) * COL,
            h: levels * LEVEL + (p.letters ? 2 : 0) + 1,
        };
    },
    draw: (c, p) => {
        const { pen, g } = c;
        const levels = Math.max(1, ...p.values.map((v) => digitsOf(v).length));
        const x0 = (p.places ? LABEL : 0) * U,
            top = 0.5 * U,
            bottom = top + levels * LEVEL * U;
        const levelTop = (i: number) => bottom - (i + 1) * LEVEL * U;
        if (p.places)
            for (let i = 0; i < levels; i++) {
                say(c, x0 - 0.3 * U, levelTop(i) + 1.2 * U, PLACE_NAME[i] ?? "", 13, "end");
                if (i > 0)
                    pen.line(
                        g,
                        x0 - 0.2 * U,
                        levelTop(i - 1),
                        x0 + p.values.length * COL * U - U,
                        levelTop(i - 1),
                        "ruler",
                        {
                            strokeWidth: 1,
                            strokeLineDash: [4, 5],
                        },
                    );
            }
        p.values.forEach((v, j) => {
            const cx = x0 + j * COL * U + 1.5 * U;
            digitsOf(v).forEach((d, i) => {
                const y = levelTop(i);
                if (d === 0) {
                    pen.ellipse(g, cx, y + U, 2.2 * U, 1.1 * U, "pencil", null, {
                        strokeWidth: 1.8,
                    });
                    for (const dy of [-0.15, 0.15])
                        pen.curve(
                            g,
                            [
                                [cx - 0.75 * U, y + (0.95 + dy) * U],
                                [cx, y + (1.2 + dy) * U],
                                [cx + 0.75 * U, y + (0.95 + dy) * U],
                            ],
                            "pencil",
                            { strokeWidth: 1.3 },
                        );
                    return;
                }
                const bars = Math.floor(d / 5),
                    dots = d % 5,
                    base = y + (LEVEL * U + bars * 0.36 * U + (dots ? 0.45 * U : 0)) / 2;
                for (let b = 0; b < bars; b++) {
                    const by = base - 0.18 * U - (bars - 1 - b) * 0.36 * U;
                    pen.rect(
                        g,
                        cx - 1.2 * U,
                        by - 0.11 * U,
                        2.4 * U,
                        0.22 * U,
                        "pencil",
                        pen.fill("berry"),
                        { strokeWidth: 1.6 },
                    );
                }
                const dotY = base - bars * 0.36 * U - 0.24 * U;
                for (let k = 0; k < dots; k++)
                    pen.circle(
                        g,
                        cx + (k - (dots - 1) / 2) * 0.6 * U,
                        dotY,
                        0.4 * U,
                        "pencil",
                        pen.fill("sky"),
                        { strokeWidth: 1.4 },
                    );
            });
            if (p.letters) say(c, cx, bottom + 1.3 * U, "ABCD".charAt(j), 16);
        });
        return {};
    },
    describe: (p) =>
        `${p.values.length === 1 ? "A number" : `${p.values.length} numbers`} in Maya numerals, in twenties up the page: blue dots for ones, red bars for fives, a shell for nought${p.places ? ", levels named at the side" : ""}${p.letters ? ", lettered underneath" : ""}.`,
});
