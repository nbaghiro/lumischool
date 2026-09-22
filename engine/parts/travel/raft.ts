import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

/** How far down its box a raft has its deck and its keel, and where along it the flag's pole stands, in squares; a game floats it by these. */
export const RAFT = { deck: 4, keel: 5, box: 5, pole: 0.7 } as const;

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

interface RaftParams {
    part: "raft" | "post";
    w: number;
    flag: string;
}

export const raft = defineDrawing<RaftParams>({
    id: "raft",
    family: "travel",
    title: "Raft",
    group: "Props",
    about: "A raft of logs lashed together, seen from the side, with a waterline painted along it and a flag on a pole at one end that says how many it is to carry, or a blank flag where rafts are to carry the same. Its other part is the wooden post it is tied to, which stands in the river.",
    params: { part: "raft", w: 9, flag: "5" },
    settings: {
        part: { kind: "one of", of: ["raft", "post"] },
        w: { kind: "whole", min: 3, max: 36 },
        flag: { kind: "text", most: 3 },
    },
    takes: [
        { label: "Nine squares long, five on its flag", params: { part: "raft", w: 9, flag: "5" } },
        {
            label: "A blank flag, for rafts that carry the same",
            params: { part: "raft", w: 7, flag: "" },
        },
        { label: "The post it is tied to", params: { part: "post", w: 9, flag: "" } },
    ],
    box: (p) => (p.part === "post" ? { w: 1, h: 4 } : { w: whole(p.w, 3, 36, 9), h: RAFT.box }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        if (p.part === "post") {
            const wood = pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 });
            pen.rect(g, 4, 0.5 * U, 12, 3.45 * U, "ruler", wood, calm(c, 1.6));
            pen.ellipse(g, U / 2, 0.5 * U, 12, 5, "ruler", pen.fill("tang"), calm(c, 1.2));
            pen.ellipse(g, U / 2, 1.2 * U, 17, 7, "ruler", null, calm(c, 1.4));
            return { top: [U / 2, 0.5 * U, "up"], ring: [U / 2, 1.2 * U, "right"] };
        }
        const w = whole(p.w, 3, 36, 9) * U,
            deck = RAFT.deck * U,
            keel = RAFT.keel * U,
            th = keel - deck;
        const logs = (hachureAngle: number) =>
            pen.fill("tang", "hachure", { hachureGap: 6, hachureAngle, fillWeight: 0.8 });
        pen.path(
            g,
            roundedRect(6, deck + th / 2 - 1, w - 12, th / 2, th / 4),
            "pencil",
            logs(6),
            calm(c, 1.7),
        );
        pen.path(
            g,
            roundedRect(2, deck, w - 4, th / 2 + 1, th / 4),
            "pencil",
            logs(-6),
            calm(c, 1.8),
        );
        for (const x of [2 + th / 4, w - 2 - th / 4])
            pen.circle(g, x, deck + th / 4, th / 2 - 3, "ruler", pen.fill("card"), calm(c, 1.1));
        for (const f of [0.25, 0.75]) {
            const x = w * f;
            pen.line(g, x - 3, deck - 1, x + 3, keel - 2, "ruler", {
                strokeWidth: 1.3,
                disableMultiStroke: true,
            });
            pen.line(g, x + 3, deck - 1, x - 3, keel - 2, "ruler", {
                strokeWidth: 1.3,
                disableMultiStroke: true,
            });
        }
        pen.line(g, 12, keel - 5, w - 12, keel - 5, "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
            strokeLineDash: [6, 5],
            disableMultiStroke: true,
        });
        const px = RAFT.pole * U,
            top = 0.35 * U;
        pen.line(g, px, deck, px, top, "ruler", { strokeWidth: 1.8, disableMultiStroke: true });
        pen.path(
            g,
            `M${px} ${top}L${px + 2.3 * U} ${top}L${px + 1.85 * U} ${top + 0.7 * U}L${px + 2.3 * U} ${top + 1.4 * U}L${px} ${top + 1.4 * U}Z`,
            "ruler",
            pen.fill(p.flag ? "glow" : "card"),
            calm(c, 1.4),
        );
        if (p.flag) {
            patch(c, px + 1.05 * U, top + 0.7 * U, 22, 18);
            num(c, px + 1.05 * U, top + 0.7 * U + 6, String(p.flag), 17);
        }
        return {
            deck: [w / 2, deck, "up"],
            flag: [px + 1.05 * U, top + 0.7 * U, "right"],
            left: [2, deck, "left"],
            right: [w - 2, deck, "right"],
        };
    },
    describe: (p) =>
        p.part === "post"
            ? "A short wooden post standing in a river, seen from the side, with a rope ring round it near the top for a raft to be tied to."
            : `A raft of brown logs lashed together, seen from the side with a dashed waterline, and a ${p.flag ? "yellow flag with a number on it" : "blank white flag"} on a pole at one end.`,
    motion: {
        still: "A game floats it and tips it; on the shelf it holds still so the number on its flag can be read.",
    },
});
