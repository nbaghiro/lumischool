import { roundedRect } from "../../ink/pen";
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { CRITTERS, critter } from "./pictures";

/** Where the animal may be, as a card names it. */
const WHERE = ["on", "in", "under", "by", "next"] as const;

/** What a picture card can stand an animal on, in, under or by. */
const THINGS = ["box", "bed", "tub", "mat", "rug", "table", "log"] as const;

/**
 * One little scene in a card 8 squares wide and 7 tall: an animal and a thing, and where the
 * animal is. Only the places that make sense are drawn: "under" needs legs and "in" needs sides,
 * so anything else falls back to "on".
 */
function littleScene<G>(c: Ctx<G>, x0: number, who: string, where: string, thing: string): void {
    const { pen, g } = c,
        cx = x0 + 4 * U,
        floor = 6.3 * U;
    const t = (THINGS as readonly string[]).includes(thing) ? thing : "box";
    const canIn = t === "box" || t === "tub" || t === "bed",
        canUnder = t === "bed" || t === "table";
    const w =
        where === "in" && canIn
            ? "in"
            : where === "under" && canUnder
              ? "under"
              : where === "by" || where === "next"
                ? "by"
                : "on";
    const tx = w === "by" ? cx - 1.2 * U : cx;
    pen.line(g, x0 + 0.4 * U, floor, x0 + 7.6 * U, floor, "pencil", {
        strokeWidth: 1.2,
        stroke: c.t["ink-soft"],
    });
    const boxFront = () => {
        pen.rect(
            g,
            tx - 1.7 * U,
            3.9 * U,
            3.4 * U,
            floor - 3.9 * U,
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 8, fillWeight: 0.5 }),
            { strokeWidth: 2 },
        );
        if (w === "in")
            for (const s of [-1, 1]) {
                const ex = tx + s * 1.7 * U;
                pen.polygon(
                    g,
                    [
                        [ex, 3.9 * U],
                        [ex + s * 0.9 * U, 3.2 * U],
                        [ex + s * 1.2 * U, 3.5 * U],
                        [ex + s * 0.25 * U, 4.1 * U],
                    ],
                    "pencil",
                    pen.fill("tang", "solid", { hachureGap: 8, fillWeight: 0.5 }),
                    { strokeWidth: 1.4 },
                );
            }
        else
            pen.line(g, tx - 1.7 * U, 4.35 * U, tx + 1.7 * U, 4.35 * U, "pencil", {
                strokeWidth: 1.1,
            });
    };
    const tubFront = () =>
        pen.path(
            g,
            `M${tx - 1.8 * U} ${4.4 * U}L${tx - 1.4 * U} ${floor}H${tx + 1.4 * U}L${tx + 1.8 * U} ${4.4 * U}Z`,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5 }),
            { strokeWidth: 2 },
        );
    const tubRim = () =>
        pen.ellipse(g, tx, 4.4 * U, 3.6 * U, 0.7 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.6,
        });
    const bed = (blanketOnly = false) => {
        if (!blanketOnly) {
            pen.rect(
                g,
                tx - 2.9 * U,
                2.6 * U,
                0.4 * U,
                floor - 2.6 * U,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.5 },
            );
            pen.rect(
                g,
                tx + 2.5 * U,
                3.7 * U,
                0.4 * U,
                floor - 3.7 * U,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.5 },
            );
            pen.rect(g, tx - 2.5 * U, 3.9 * U, 5 * U, 0.8 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.6,
            });
            pen.ellipse(g, tx - 1.8 * U, 3.7 * U, 1.3 * U, 0.6 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.2,
            });
        }
        pen.rect(
            g,
            tx - (w === "in" ? 1 : 1.1) * U,
            3.5 * U,
            (w === "in" ? 3.5 : 3.6) * U,
            1.25 * U,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.5 },
        );
    };
    const table = () => {
        pen.rect(g, tx - 2.5 * U, 3.5 * U, 5 * U, 0.4 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        for (const s of [-1, 1])
            pen.line(g, tx + s * 2.1 * U, 3.9 * U, tx + s * 2.1 * U, floor, "pencil", {
                strokeWidth: 2.4,
            });
    };
    const mat = () => {
        pen.ellipse(
            g,
            tx,
            floor - 0.15 * U,
            4.8 * U,
            0.8 * U,
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.5 },
        );
    };
    const log = () => {
        pen.path(
            g,
            roundedRect(tx - 2.3 * U, 5 * U, 4.6 * U, floor - 5 * U, 0.6 * U),
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.8 },
        );
        pen.ellipse(g, tx + 2.05 * U, 5.65 * U, 0.8 * U, 1.2 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        pen.ellipse(g, tx + 2.05 * U, 5.65 * U, 0.35 * U, 0.55 * U, "pencil", null, {
            strokeWidth: 0.8,
        });
    };
    const top: Record<string, number> = {
        box: 3.9,
        bed: 3.9,
        tub: 4.2,
        mat: 6.15,
        rug: 6.15,
        table: 3.5,
        log: 5,
    };
    const animal = (base: number, s: number, dir = 1, x = cx) => critter(c, who, x, base, s, dir);
    // In a box or a tub the animal is drawn first and the front of the thing over it, so its head
    // and shoulders show over the side; in bed its head is on the pillow and the blanket over the rest.
    if (w === "in" && t === "box") {
        animal(5.6 * U, 1.3);
        boxFront();
        return;
    }
    if (w === "in" && t === "tub") {
        tubRim();
        animal(5.4 * U, 1.2);
        tubFront();
        pen.arc(g, tx, 4.4 * U, 3.6 * U, 0.7 * U, 0, Math.PI, "pencil", { strokeWidth: 1.6 });
        return;
    }
    if (w === "in" && t === "bed") {
        bed();
        animal(4.3 * U, 0.95, -1, cx - 0.9 * U);
        bed(true);
        return;
    }
    if (t === "box") boxFront();
    else if (t === "tub") {
        tubFront();
        tubRim();
    } else if (t === "bed") bed();
    else if (t === "table") table();
    else if (t === "log") log();
    else mat();
    if (w === "under") animal(floor, 0.72);
    else if (w === "by") animal(floor, 1.05, -1, cx + 2.2 * U);
    else animal((top[t] ?? 3.9) * U, t === "table" || t === "bed" ? 0.9 : 1.05);
}

export const pictureCards = defineDrawing({
    id: "picturecards",
    family: "stories",
    title: "Pictures to choose from",
    group: "Props",
    about: "Lettered cards, each a small picture of an animal on, in, under or by something: the fox in the box, the dog on the bed. A child reads one sentence and picks the picture it describes, which checks the reading without the picture ever giving the words away.",
    params: {
        who: ["fox", "fox", "dog"],
        where: ["in", "on", "in"],
        thing: ["box", "box", "box"],
        letters: true,
    },
    settings: {
        who: { kind: "words", most: 6, of: CRITTERS },
        where: { kind: "words", most: 6, of: WHERE },
        thing: { kind: "words", most: 6, of: THINGS },
        letters: { kind: "flag" },
    },
    takes: [
        {
            label: "In, on, in",
            params: {
                who: ["fox", "fox", "dog"],
                where: ["in", "on", "in"],
                thing: ["box", "box", "box"],
                letters: true,
            },
        },
        {
            label: "Beds and tables",
            params: {
                who: ["cat", "pig", "hen"],
                where: ["under", "in", "on"],
                thing: ["bed", "bed", "table"],
                letters: true,
            },
        },
        {
            label: "By the tub, on the log",
            params: {
                who: ["duck", "rabbit"],
                where: ["in", "on"],
                thing: ["tub", "log"],
                letters: false,
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.who.length) * 9, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        p.who.forEach((who, i) => {
            const x0 = (0.5 + i * 9) * U;
            pen.path(g, roundedRect(x0, 0.3 * U, 8 * U, 6.5 * U, 10), "ruler", pen.fill("card"), {
                strokeWidth: 2,
            });
            littleScene(c, x0, who, p.where[i] ?? "on", p.thing[i] ?? "box");
            if (p.letters) {
                pen.circle(g, x0 + 0.85 * U, 1.1 * U, 1.1 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.6,
                });
                num(c, x0 + 0.85 * U, 1.1 * U + 6, "ABCDEF"[i] ?? "", 15);
            }
            a[`card(${i})`] = [x0 + 4 * U, 0.3 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A row of cards, each a small picture of an animal on, in, under or by something${p.letters ? ", with a letter in the corner of each" : ""}.`,
});
