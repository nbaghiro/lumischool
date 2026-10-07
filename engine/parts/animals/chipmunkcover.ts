import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { acorn } from "../outdoors/acorn";
import { burrow } from "../outdoors/burrow";
import { oakTree } from "../outdoors/oaktree";
import { chipmunk } from "./chipmunk";

/** Another drawing's piece at (x, y) in squares from its top left, `k` times its own size. */
function at<G>(c: Ctx<G>, x: number, y: number, k: number): Ctx<G> {
    return group(c, {
        turn: [
            ["translate", x * U, y * U],
            ["scale", k],
        ],
    });
}

/** Nutmeg on an oak branch with her cheeks stuffed, acorns falling, and the burrow cut away below: the picture the game is chosen by. */
export const chipmunkCover = defineDrawing<{ falling: number }>({
    id: "chipmunkcover",
    family: "animals",
    title: "Nutmeg's winter store",
    group: "Props",
    about: "A striped chipmunk on an oak branch with her cheeks stuffed full, acorns tumbling down to the grass, and the burrow cut away below with a room of acorns.",
    params: { falling: 3 },
    settings: { falling: { kind: "whole", min: 0, max: 3 } },
    takes: [
        { label: "Acorns falling", params: { falling: 3 } },
        { label: "Still", params: { falling: 0 } },
    ],
    box: () => ({ w: 12, h: 10 }),
    draw: (c, p): RawAnchors => {
        oakTree.draw(at(c, 1.7, 0, 0.6), { kind: "crown", tall: 6 });
        oakTree.draw(at(c, 4.2, 3.4, 1), { kind: "trunk", tall: 3 });
        const { pen, g } = c;
        pen.path(
            g,
            `M${0.6 * U} ${3.4 * U}Q${4 * U} ${3.1 * U} ${8.6 * U} ${3.4 * U}L${8.6 * U} ${3.8 * U}Q${4 * U} ${3.6 * U} ${0.6 * U} ${3.8 * U}Z`,
            "pencil",
            pen.fill("tang", "solid"),
            { strokeWidth: 1.3 },
        );
        chipmunk.draw(at(c, 4.2, 0.9, 1.25), { who: "nutmeg", pose: "shake", cheeks: 6 });
        const drops: [number, number][] = [
            [2.2, 4.4],
            [7.4, 5.0],
            [3.4, 5.6],
        ];
        drops
            .slice(0, Math.max(0, Math.min(3, Math.round(p.falling))))
            .forEach(([x, y]) => acorn.draw(at(c, x, y, 0.7), { kind: "acorn" }));
        burrow.draw(at(c, 0, 6.4, 1), { kind: "grass", w: 12, d: 3.3 });
        burrow.draw(at(c, 2, 7.4, 1), { kind: "room", w: 6, d: 2.3 });
        burrow.draw(at(c, 9.5, 6.1, 1), { kind: "door", w: 2, d: 1 });
        for (let i = 0; i < 6; i++)
            acorn.draw(at(c, 2.5 + i * 0.6 + Math.floor(i / 5) * 0.2, 9.15, 0.55), {
                kind: "acorn",
            });
        chipmunk.draw(at(c, 6.4, 8.2, 0.7), { who: "hazel", pose: "cheer", cheeks: 0 });
        return { middle: [6 * U, 5 * U, "up"] };
    },
    describe: (p) =>
        `A striped chipmunk on an oak branch with her cheeks stuffed full${p.falling > 0 ? ", acorns tumbling down to the grass," : ""} and a burrow cut away below with a room of acorns.`,
    motion: { still: "A cover holds still so the game it stands for can be chosen." },
});
