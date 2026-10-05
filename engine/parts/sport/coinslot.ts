import type { RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** A coin box beside a climb's path: a slot on top, the word give on its front, and a coin just given. */
export const coinSlot = defineDrawing<{ dropping: boolean }>({
    id: "coinslot",
    family: "sport",
    title: "Coin box",
    group: "Props",
    about: "A small blue box on a post with a slot in its top and the word give on its front, which takes back one coin for each hop on its button.",
    params: { dropping: false },
    settings: { dropping: { kind: "flag" } },
    takes: [
        { label: "Waiting", params: { dropping: false } },
        { label: "A coin dropping in", params: { dropping: true } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.rect(g, 0.85 * U, 1.6 * U, 0.3 * U, 1.3 * U, "pencil", pen.fill("tang", "solid"), {
            strokeWidth: 1,
        });
        pen.path(
            g,
            roundedRect(0.15 * U, 0.3 * U, 1.7 * U, 1.4 * U, 5),
            "pencil",
            pen.fill("sky", "solid"),
            {
                strokeWidth: 1.4,
                roughness: 0.3,
            },
        );
        pen.rect(g, 0.6 * U, 0.45 * U, 0.8 * U, 0.15 * U, "ruler", pen.fill("ink"), {
            strokeWidth: 0.6,
        });
        if (p.dropping)
            pen.circle(g, U, 0.18 * U, 0.3 * U, "pencil", pen.fill("glow", "solid"), {
                strokeWidth: 0.8,
            });
        say(c, U, 1.35 * U, "give", 15);
        return { slot: [U, 0.5 * U, "up"] };
    },
    describe: (p) =>
        p.dropping
            ? "A small blue box on a wooden post with a dark slot in its lid, a gold coin dropping in and the word give written on its front."
            : "A small blue box on a wooden post with a dark slot in its lid and the word give written on its front, waiting for a coin.",
    motion: { still: "A coin box stands still by the path." },
});
