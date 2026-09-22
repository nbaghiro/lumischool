import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type TokenName } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { cap, num, sayOn, wide } from "../lettering";

/** Half the board's width in squares: wide enough for the longer of the two names. */
const boardHalf = (home: string, away: string): number =>
    Math.min(16, Math.max(7, Math.ceil(Math.max(wide(home, 17), wide(away, 17)) / U) + 2));

export const scoreboard = defineDrawing({
    id: "scoreboard",
    family: "sport",
    title: "Scoreboard",
    group: "Structures",
    about: "Two teams with their scores in digits big enough to read from the back of a hall, and the period written small underneath. The difference between the two numbers is a question the game asks by itself.",
    params: { home: "Reds", away: "Blues", scores: [3, 2], note: "Half time" },
    settings: {
        home: { kind: "text", most: 12 },
        away: { kind: "text", most: 12 },
        scores: { kind: "numbers", min: 0, max: 99, most: 2 },
        note: { kind: "text", most: 16 },
    },
    takes: [
        {
            label: "Three two",
            params: { home: "Reds", away: "Blues", scores: [3, 2], note: "Half time" },
        },
        {
            label: "Two digits",
            params: { home: "Hawks", away: "Owls", scores: [14, 21], note: "Full time" },
        },
        { label: "Nil nil", params: { home: "Ash", away: "Bray", scores: [0, 0], note: "" } },
    ],
    box: (p) => ({ w: boardHalf(p.home, p.away) * 2 + 1, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const half = boardHalf(p.home, p.away),
            W = (half * 2 + 1) * U,
            H = 12 * U;
        pen.path(g, roundedRect(0.5 * U, 0.5 * U, W - U, H - U, 14), "pencil", pen.fill("card"), {
            strokeWidth: 2.6,
        });
        pen.line(g, W / 2, 1.2 * U, W / 2, H - 2.6 * U, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
        });
        const sides: { name: string; tint: TokenName }[] = [
            { name: p.home, tint: "sky" },
            { name: p.away, tint: "tang" },
        ];
        sides.forEach((s, i) => {
            const cx = i === 0 ? (0.5 * U + W / 2) / 2 : (W / 2 + W - 0.5 * U) / 2;
            pen.path(
                g,
                roundedRect(cx - ((half - 1.4) * U) / 2, 1.1 * U, (half - 1.4) * U, 1.9 * U, 8),
                "pencil",
                pen.fill(s.tint, "solid", { hachureGap: 7, fillWeight: 0.6 }),
                { strokeWidth: 1.8 },
            );
            sayOn(c, cx, 2.45 * U, s.name, 17);
            // The score sits in a plain well. On paper the name strip above is hatching, and a digit
            // that has to carry across a hall cannot have hatching behind it.
            pen.path(
                g,
                roundedRect(cx - 1.7 * U, 3.5 * U, 3.4 * U, 4.4 * U, 8),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 2 },
            );
            num(c, cx, 6.5 * U, p.scores[i] ?? 0, 44);
            a[`team(${i + 1})`] = [cx, 1.1 * U, "up"];
            a[`score(${i + 1})`] = [cx, 3.5 * U, "up"];
        });
        pen.line(g, 1.5 * U, 9.4 * U, W - 1.5 * U, 9.4 * U, "ruler", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
        cap(c, W / 2, 10.4 * U, p.note, 12);
        a.note = [W / 2, 10.4 * U, "down"];
        return a;
    },
    describe: () =>
        "A scoreboard with two team names on coloured strips side by side, a large score in a white well under each, and a note written small along the bottom.",
    motion: { still: STILL.instrument },
    reads: true,
});
