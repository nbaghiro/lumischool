import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/**
 * The cup's inside, in its own squares: straight walls, so what it holds rises evenly and each mark is
 * the same share of the cup however full it is. `full` is the line a full cup is filled to, under the
 * rim. A game that pours into the cup reads these to know where its drink stands.
 */
export const LEMONCUP = { w: 4, h: 5, left: 0.55, right: 3.45, full: 0.9, bottom: 4.55 } as const;

const SCALES = ["halves", "quarters", "ml"] as const;
const FRACTION: Record<string, string> = { "0.25": "1/4", "0.5": "1/2", "0.75": "3/4" };

export const lemonCup = defineDrawing({
    id: "lemoncup",
    family: "food",
    title: "Lemonade cup",
    group: "Props",
    about: "A clear tumbler with straight sides and a scale up its wall, marked in halves, in quarters or in millilitres. It is drawn empty, so a game can pour its drink in behind the glass and read the marks through it.",
    params: { scale: "ml", max: 200, step: 50 },
    settings: {
        scale: { kind: "one of", of: SCALES },
        max: { kind: "whole", min: 50, max: 500 },
        step: { kind: "whole", min: 10, max: 250 },
    },
    takes: [
        { label: "Marked in halves", params: { scale: "halves", max: 200, step: 50 } },
        { label: "Marked in quarters", params: { scale: "quarters", max: 200, step: 50 } },
        { label: "200 ml in fifties", params: { scale: "ml", max: 200, step: 50 } },
        { label: "250 ml in fifties", params: { scale: "ml", max: 250, step: 50 } },
    ],
    box: () => ({ w: LEMONCUP.w, h: LEMONCUP.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            l = LEMONCUP.left * U,
            r = LEMONCUP.right * U,
            full = LEMONCUP.full * U,
            bottom = LEMONCUP.bottom * U,
            rim = 0.35 * U,
            base = 4.9 * U;
        const at = (share: number) => bottom - share * (bottom - full);
        // the glass: two walls a little thicker at the foot, and a heavy base
        pen.path(
            g,
            `M${l - 0.18 * U} ${rim}L${l - 0.3 * U} ${base}H${r + 0.3 * U}L${r + 0.18 * U} ${rim}`,
            "ruler",
            null,
            calm(c, 2.4),
        );
        pen.path(g, `M${l} ${rim}V${bottom}H${r}V${rim}`, "ruler", null, {
            ...calm(c, 1),
            stroke: c.t["ink-soft"],
        });
        pen.line(g, l - 0.2 * U, rim, r + 0.2 * U, rim, "ruler", {
            ...calm(c, 1.2),
            stroke: c.t["ink-soft"],
        });
        // a gleam down the left of the glass
        pen.line(g, l + 0.3 * U, rim + 0.5 * U, l + 0.3 * U, bottom - 0.9 * U, "pencil", {
            ...calm(c, 1.6),
            stroke: c.t.card,
        });
        const shares =
            p.scale === "halves"
                ? [0.5, 1]
                : p.scale === "quarters"
                  ? [0.25, 0.5, 0.75, 1]
                  : Array.from(
                        { length: Math.max(1, Math.floor(p.max / Math.max(1, p.step))) },
                        (_, i) => ((i + 1) * p.step) / p.max,
                    );
        for (const share of shares) {
            const y = at(share),
                big = share === 1 || share === 0.5 || p.scale !== "ml";
            pen.line(g, r - (big ? 0.75 : 0.45) * U, y, r, y, "ruler", calm(c, big ? 1.8 : 1.2));
            const label =
                p.scale === "ml"
                    ? String(Math.round(share * p.max))
                    : share === 1
                      ? "1"
                      : (FRACTION[String(share)] ?? "");
            if (label) num(c, r - 1.35 * U, y + 5, label, 12, "middle", c.t["ink-soft"]);
        }
        return {
            rim: [(l + r) / 2, rim, "up"],
            base: [(l + r) / 2, base, "down"],
        };
    },
    describe: (p) =>
        `A clear straight-sided tumbler on a heavy glass base, empty, with a scale up its wall marked ${p.scale === "ml" ? `every ${p.step} ml up to ${p.max} ml` : `in ${p.scale}`}.`,
    motion: { still: "A cup stands still; what moves is the drink poured into it." },
});
