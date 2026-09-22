import { roundedRect } from "../../ink/pen";
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { numOn, say } from "../lettering";
import { drawProp } from "../props";
import { bubbleTail, MOODS } from "../speech";
import { CRITTERS, critter, kid, lines } from "./pictures";

const PEOPLE = ["boy", "girl", "kid", "gran"] as const;
/** Who may speak in a panel: the four people, and the reading cast. */
const CAST = [...PEOPLE, ...CRITTERS] as const;

/** One speaker or listener standing on the floor of a panel. Returns where its head is. */
function actor<G>(
    c: Ctx<G>,
    who: string,
    x: number,
    floor: number,
    dir: number,
    mood: string,
): [number, number] {
    if ((PEOPLE as readonly string[]).includes(who)) {
        const look = who === "girl" ? 1 : who === "kid" ? 2 : who === "gran" ? 3 : 0;
        return kid(c, x, floor, who === "gran" ? 1.12 : 1.02, look, mood, dir).head;
    }
    critter(c, (CRITTERS as readonly string[]).includes(who) ? who : "cat", x, floor, 1.5, dir);
    return [x + dir * 0.7 * U, floor - 3.4 * U];
}

export const comic = defineDrawing({
    id: "comic",
    family: "stories",
    title: "A comic strip",
    group: "Characters",
    about: "Two to four panels, each with a speaker, a speech or thought bubble and sometimes a second character listening. Faces carry a feeling, a bubble can be left empty to write in, and panels can be lettered rather than numbered so a child can put them in order.",
    params: {
        who: ["girl", "dog", "girl"],
        says: ["Where is my ball?", "Woof!", "You found it!"],
        moods: ["worried", "happy", "excited"],
        with: ["", "", "dog"],
        thinks: [0, 0, 0],
        holds: ["", "ball", "ball"],
        labels: ["1", "2", "3"],
    },
    settings: {
        who: { kind: "words", most: 4, of: CAST },
        says: { kind: "words", most: 4 },
        moods: { kind: "words", most: 4, of: MOODS },
        with: { kind: "words", most: 4 },
        thinks: { kind: "numbers", min: 0, max: 1, most: 4 },
        holds: { kind: "words", most: 4 },
        labels: { kind: "words", most: 4 },
    },
    takes: [
        {
            label: "The lost ball",
            params: {
                who: ["girl", "dog", "girl"],
                says: ["Where is my ball?", "Woof!", "You found it!"],
                moods: ["worried", "happy", "excited"],
                with: ["", "", "dog"],
                thinks: [0, 0, 0],
                holds: ["", "ball", "ball"],
                labels: ["1", "2", "3"],
            },
        },
        {
            label: "A bubble to fill",
            params: {
                who: ["boy", "hen"],
                says: ["Have you got an egg?", ""],
                moods: ["happy", "happy"],
                with: ["hen", "boy"],
                thinks: [0, 1],
                holds: ["", ""],
                labels: ["A", "B"],
            },
        },
    ],
    box: (p) => {
        const n = Math.max(1, p.says.length),
            pw = n > 3 ? 8.2 : 10;
        return { w: Math.ceil(0.4 + n * (pw + 0.6)), h: 12 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, p.says.length),
            pw = n > 3 ? 8.2 : 10,
            floor = 10.8 * U,
            a: RawAnchors = {};
        p.says.forEach((line, i) => {
            const x0 = (0.3 + i * (pw + 0.6)) * U,
                W = pw * U;
            pen.path(g, roundedRect(x0, 0.3 * U, W, 11.3 * U, 6), "ruler", pen.fill("card"), {
                strokeWidth: 2.4,
            });
            pen.line(g, x0 + 6, floor, x0 + W - 6, floor, "pencil", {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
            });
            const other = p.with[i] ?? "";
            const sx = other ? x0 + W * 0.3 : x0 + W * 0.45;
            const head = actor(c, p.who[i] ?? "cat", sx, floor, 1, p.moods[i] ?? "happy");
            if (other) actor(c, other, x0 + W * 0.74, floor, -1, "happy");
            const held = p.holds[i] ?? "";
            if (held)
                drawProp(
                    c,
                    held,
                    (PEOPLE as readonly string[]).includes(p.who[i] ?? "")
                        ? sx + 1.25 * U
                        : sx + 1.6 * U,
                    (PEOPLE as readonly string[]).includes(p.who[i] ?? "")
                        ? floor - 2.3 * U
                        : floor - 0.5 * U,
                    26,
                );
            const chars = Math.max(8, Math.floor((W - 1.4 * U) / (15 * 0.52)));
            const text = lines(line, chars).slice(0, 3),
                rows = line ? text.length : 2;
            const bx = x0 + 0.5 * U,
                by = 0.8 * U,
                bw = W - 1 * U,
                bh = rows * 1.3 * U + 0.9 * U;
            if ((p.thinks[i] ?? 0) > 0) {
                pen.path(g, roundedRect(bx, by, bw, bh, bh / 2), "doodle", pen.fill("card"), {
                    strokeWidth: 1.6,
                });
                for (const [k, d] of [
                    [0.35, 0.55],
                    [0.65, 0.35],
                ] as const)
                    pen.circle(
                        g,
                        bx + bw * 0.3 + (head[0] - bx - bw * 0.3) * k,
                        by + bh + (head[1] - by - bh) * k,
                        d * U,
                        "pencil",
                        pen.fill("card"),
                        { strokeWidth: 1.2 },
                    );
            } else {
                bubbleTail(c, { x: bx, y: by, w: bw, h: bh }, [head[0], head[1] - 0.2 * U]);
                pen.path(g, roundedRect(bx, by, bw, bh, 12), "pencil", pen.fill("card"), {
                    strokeWidth: 1.7,
                });
            }
            if (line) text.forEach((t, k) => say(c, bx + bw / 2, by + (1.35 + k * 1.3) * U, t, 15));
            else
                for (const k of [0, 1])
                    pen.line(
                        g,
                        bx + 0.5 * U,
                        by + (1.3 + k * 1.3) * U,
                        bx + bw - 0.5 * U,
                        by + (1.3 + k * 1.3) * U,
                        "ruler",
                        { strokeWidth: 1.2 },
                    );
            const label = p.labels[i] ?? "";
            if (label) {
                pen.circle(
                    g,
                    x0 + W - 0.9 * U,
                    floor - 0.9 * U,
                    1.2 * U,
                    "ruler",
                    pen.fill("glow"),
                    { strokeWidth: 1.5 },
                );
                numOn(c, x0 + W - 0.9 * U, floor - 0.9 * U + 6, label, 15);
            }
            a[`panel(${i})`] = [x0 + W / 2, 0.3 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A comic strip of panels side by side, each with a character speaking in a speech or thought bubble${p.with.some(Boolean) ? ", some with a second character listening" : ""}${p.labels.some(Boolean) ? ", and a label on each" : ""}.`,
    motion: { still: STILL.text },
});
