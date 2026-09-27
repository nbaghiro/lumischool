import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { CAR, RAIL, underneath } from "../travel/yard";
import { glyph } from "./glyphs";

export const soundWagon = defineDrawing({
    id: "soundwagon",
    family: "letters",
    title: "Sound wagon",
    group: "Props",
    about: "A flat railway wagon carrying one sound on a big card, the way a word train carries a word in pieces. It is a carriage's length and stands on the same rail, so it couples on behind an engine in the order the sounds are said.",
    params: { sound: "sh" },
    settings: { sound: { kind: "text", most: 3 } },
    takes: [
        { label: "The sound sh", params: { sound: "sh" } },
        { label: "The sound a", params: { sound: "a" } },
        { label: "The sound igh", params: { sound: "igh" } },
    ],
    box: () => ({ w: CAR, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            bed = (RAIL - 1.25) * U;
        pen.path(
            g,
            roundedRect(0.9 * U, 0.3 * U, (CAR - 1.8) * U, bed - 0.45 * U, 6),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        const sound = String(p.sound).slice(0, 3);
        glyph(c, (CAR / 2) * U, bed - 0.85 * U, sound, sound.length > 2 ? 22 : 30);
        pen.rect(
            g,
            0.35 * U,
            bed - 0.2 * U,
            (CAR - 0.7) * U,
            0.75 * U,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 6, fillWeight: 0.8 }),
            { strokeWidth: 2.2 },
        );
        underneath(c, 0, [1.2, CAR - 1.2]);
        return {
            card: [(CAR / 2) * U, 0.3 * U, "up"],
            bed: [(CAR / 2) * U, bed, "down"],
        };
    },
    describe: (p) =>
        `A flat wooden railway wagon seen from the side, with two wheels and a big white card standing on it showing the sound "${String(p.sound).slice(0, 3)}".`,
    motion: {
        still: "A wagon moves only when it is pushed, and a game moves the whole of it.",
    },
});
