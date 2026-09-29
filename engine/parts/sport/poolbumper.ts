import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const poolBumper = defineDrawing({
    id: "poolbumper",
    family: "sport",
    title: "Table bumper",
    group: "Props",
    about: "A round rubber bumper fixed to a games table, seen from above as big as its box: a thick ring round a pale middle with a bolt, which balls bounce off.",
    params: { tone: "berry" },
    settings: { tone: { kind: "one of", of: ["berry", "sky", "tang"] } },
    takes: [
        { label: "A pink bumper", params: { tone: "berry" } },
        { label: "A blue bumper", params: { tone: "sky" } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            tone = p.tone === "sky" ? "sky" : p.tone === "tang" ? "tang" : "berry";
        pen.circle(g, U, U, 1.85 * U, "pencil", pen.fill(tone), { strokeWidth: 1.8 });
        pen.circle(g, U, U, 1.05 * U, "pencil", pen.fill("card"), { strokeWidth: 1.2 });
        pen.circle(g, U, U, 0.3 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 0.8,
            disableMultiStroke: true,
        });
        return { middle: [U, U, "up"] };
    },
    describe: () =>
        "A round rubber bumper on a games table seen from above, a thick coloured ring round a pale middle with a small bolt in the centre.",
    motion: { still: "A bumper is fixed to the table; balls bounce off it." },
});
