import { plain, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["soil", "grass", "tunnel", "shaft", "room", "door", "stone"] as const;
type Kind = (typeof KINDS)[number];

const kindOf = (v: unknown): Kind => KINDS.find((k) => k === v) ?? "soil";
const halves = (v: number, d: number): number =>
    Math.max(0.5, Math.min(12, Math.round((Number.isFinite(v) ? v : d) * 2) / 2));

const WORDS: Record<Kind, string> = {
    soil: "brown earth cut through, hatched, with small pebbles and a thin root or two in it",
    grass: "a strip of grass with a few fallen leaves along its top, over hatched brown earth",
    tunnel: "the pale inside of a tunnel dug through earth, with a soft dark edge",
    shaft: "a narrow upright hole dug down through earth, with roots across it for footholds",
    room: "a round-topped room dug in the earth with a bed of dry grass on its floor",
    door: "a small mound of earth round the dark hole of a burrow's door",
    stone: "a smooth grey stepping stone standing up out of a stream",
};

/** The pieces a burrow seen cut away is drawn from: earth, grass over it, tunnels, a shaft, a room, its door and a stream's stones. */
export const burrow = defineDrawing<{ kind: string; w: number; d: number }>({
    id: "burrow",
    family: "outdoors",
    title: "Burrow cut-away",
    group: "Structures",
    about: "The earth under a wood seen cut away like an ant farm: earth, grass along the top, tunnels, a shaft with root footholds, a bedded room, the door and stepping stones.",
    params: { kind: "soil", w: 4, d: 3 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        w: { kind: "number", min: 0.5, max: 12, step: 0.5 },
        d: { kind: "number", min: 0.5, max: 12, step: 0.5 },
    },
    takes: KINDS.map((kind) => ({
        label: kind,
        params: { kind, w: kind === "shaft" ? 2 : 4, d: kind === "door" ? 1 : 3 },
    })),
    box: (p) => ({ w: halves(p.w, 4), h: halves(p.d, 3) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            k = kindOf(p.kind),
            w = halves(p.w, 4) * U,
            h = halves(p.d, 3) * U,
            m = 0.1 * U,
            soft = c.paper ? c.t.ink : c.t["ink-soft"],
            line = { strokeWidth: 1.2, roughness: 0.35 };
        const earth = (top: number) => {
            // a light wash of earth under a sparse hatch on screen, the hatch alone on paper
            if (!c.paper) {
                // opaque, so pieces laid against each other meet without a seam or a darker overlap
                plain(c, { kind: "rect", x: 0, y: top, w, h: h - top, fill: c.t.card });
                plain(c, {
                    kind: "rect",
                    x: 0,
                    y: top,
                    w,
                    h: h - top,
                    fill: c.t.tang,
                    opacity: 0.22,
                });
            }
            pen.rect(
                g,
                m,
                top + m,
                w - 2 * m,
                h - top - 2 * m,
                "ruler",
                pen.fill("tang", "hachure", { hachureGap: 16, fillWeight: 0.7 }),
                {
                    stroke: "none",
                },
            );
            for (let x = 0.9 * U, i = 0; x < w - 0.4 * U; x += 3.1 * U, i++) {
                const y = top + ((i * 7) % 10) * 0.09 * h + 0.5 * U;
                if (y > h - 0.4 * U) continue;
                pen.ellipse(g, x, y, 0.35 * U, 0.25 * U, "pencil", pen.fill("grid"), {
                    strokeWidth: 0.7,
                });
                if (i % 3 === 1 && x + 1.5 * U < w)
                    pen.curve(
                        g,
                        [
                            [x + 0.4 * U, y - 0.3 * U],
                            [x + 0.9 * U, y + 0.1 * U],
                            [x + 1.3 * U, y - 0.1 * U],
                        ],
                        "pencil",
                        { strokeWidth: 0.8, stroke: soft },
                    );
            }
        };
        if (k === "soil") earth(0);
        else if (k === "grass") {
            earth(0.5 * U);
            // filled edge to edge and lined along its top and foot only, so lengths laid end to end read as one strip
            pen.rect(g, 0, m, w, 0.55 * U, "ruler", pen.fill("mint", "solid"), { stroke: "none" });
            for (const y of [m, m + 0.55 * U]) pen.line(g, 0.5, y, w - 0.5, y, "ruler", line);
            for (let x = 0.6 * U, i = 0; x < w - 0.9 * U; x += 1.3 * U, i++) {
                pen.linear(
                    g,
                    [
                        [x - 0.15 * U, 0.15 * U],
                        [x, 0.5 * U],
                        [x + 0.15 * U, 0.15 * U],
                    ],
                    "pencil",
                    { strokeWidth: 0.9, stroke: c.t.ink },
                );
                if (i % 3 === 0)
                    pen.ellipse(
                        g,
                        x + 0.6 * U,
                        0.4 * U,
                        0.5 * U,
                        0.22 * U,
                        "pencil",
                        pen.fill(i % 2 ? "glow" : "berry"),
                        {
                            strokeWidth: 0.7,
                        },
                    );
            }
        } else if (k === "tunnel") {
            pen.rect(g, 0, 0, w, h, "pencil", pen.fill("card", "solid"), { stroke: "none" });
            for (const y of [m, h - m])
                pen.line(g, 0, y, w, y, "pencil", { strokeWidth: 1, stroke: soft, roughness: 0.5 });
        } else if (k === "shaft") {
            pen.rect(g, 0, 0, w, h, "pencil", pen.fill("card", "solid"), { stroke: "none" });
            for (const x of [m, w - m])
                pen.line(g, x, 0, x, h, "pencil", { strokeWidth: 1, stroke: soft, roughness: 0.5 });
            // roots across the shaft for footholds, from one side and then the other
            for (let y = 0.7 * U, i = 0; y < h - 0.3 * U; y += 0.9 * U, i++) {
                const from = i % 2 ? w - m : m,
                    to = i % 2 ? w * 0.35 : w * 0.65;
                pen.curve(
                    g,
                    [
                        [from, y],
                        [(from + to) / 2, y + 0.15 * U],
                        [to, y + 0.05 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.6, stroke: c.paper ? c.t.ink : c.t.tang },
                );
            }
        } else if (k === "room") {
            const d = `M${m} ${h - m}V${0.9 * U}Q${m} ${m} ${0.9 * U} ${m}H${w - 0.9 * U}Q${w - m} ${m} ${w - m} ${0.9 * U}V${h - m}Z`;
            pen.path(g, d, "pencil", pen.fill("card", "solid"), { strokeWidth: 1.2, stroke: soft });
            pen.rect(
                g,
                m,
                h - 0.45 * U,
                w - 2 * m,
                0.35 * U,
                "pencil",
                pen.fill("glow", "hachure", { hachureGap: 2.5 }),
                {
                    strokeWidth: 0.8,
                },
            );
            for (let x = 0.5 * U; x < w - 0.3 * U; x += 0.7 * U)
                pen.line(g, x, h - 0.45 * U, x + 0.25 * U, h - 0.7 * U, "pencil", {
                    strokeWidth: 0.7,
                    stroke: soft,
                });
        } else if (k === "door") {
            pen.path(
                g,
                `M${m} ${h - m}Q${0.6 * U} ${0.2 * U} ${w / 2 - 0.7 * U} ${0.45 * U}L${w / 2 + 0.7 * U} ${0.45 * U}Q${w - 0.6 * U} ${0.2 * U} ${w - m} ${h - m}Z`,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 4 }),
                line,
            );
            pen.ellipse(
                g,
                w / 2,
                h - 0.3 * U,
                1.6 * U,
                0.55 * U,
                "pencil",
                pen.fill("ink-soft", "solid"),
                {
                    strokeWidth: 1,
                },
            );
        } else {
            pen.path(
                g,
                roundedRect(m, m, w - 2 * m, h - 2 * m, 0.45 * U),
                "pencil",
                pen.fill("grid", "solid"),
                line,
            );
            pen.curve(
                g,
                [
                    [0.3 * U, 0.35 * U],
                    [w / 2, 0.2 * U],
                    [w - 0.3 * U, 0.35 * U],
                ],
                "pencil",
                { strokeWidth: 1.2, stroke: c.t.card },
            );
        }
        return { top: [w / 2, 0, "up"] };
    },
    describe: (p) =>
        `${WORDS[kindOf(p.kind)].replace(/^./, (x) => x.toUpperCase())}, part of a burrow cut away from the side.`,
    motion: { still: "The earth and the burrow dug in it never move." },
});
