import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { pick } from "../people/figure";
import { say } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.7 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** How far the top of the name board stands over the counter top, in squares: room under the awning for someone to work. */
export const STAND_ROOF = 16;

export const lemonadeStand = defineDrawing({
    id: "lemonadestand",
    family: "food",
    title: "Lemonade stand",
    group: "Props",
    about: "A lemonade stand seen from the front: a little wooden booth under a striped awning with its name on a board, and a long plank counter running on from it on trestles, for cups to slide along to the customers.",
    params: { w: 34, booth: 16, counter: 6, stripes: "glow", price: "5¢ a cup" },
    settings: {
        w: { kind: "whole", min: 12, max: 80 },
        booth: { kind: "whole", min: 8, max: 24 },
        counter: { kind: "whole", min: 3, max: 10 },
        stripes: { kind: "one of", of: MARKERS },
        price: { kind: "text", most: 12 },
    },
    takes: [
        {
            label: "A long counter",
            params: { w: 34, booth: 16, counter: 6, stripes: "glow", price: "5¢ a cup" },
        },
        {
            label: "Just the booth",
            params: { w: 16, booth: 16, counter: 6, stripes: "berry", price: "10¢ a cup" },
        },
        {
            label: "A fair stand",
            params: { w: 30, booth: 14, counter: 6, stripes: "sky", price: "" },
        },
    ],
    box: (p) => ({ w: Math.round(p.w), h: Math.round(p.counter) + STAND_ROOF }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            W = Math.round(p.w) * U,
            B = Math.min(Math.round(p.booth), Math.round(p.w)) * U,
            top = STAND_ROOF * U,
            H = top + Math.round(p.counter) * U,
            stripe: Marker = pick(MARKERS, p.stripes, "glow"),
            sign = 2.3 * U,
            eave = 2.8 * U,
            awning = 4.8 * U;
        for (const x of [0.6 * U, B - 0.6 * U])
            pen.line(g, x, eave, x, top, "pencil", calm(c, 2.6));
        const n = Math.max(4, Math.round(B / (1.6 * U))),
            sw = (B - 0.2 * U) / n;
        for (let i = 0; i < n; i++) {
            const x = 0.1 * U + i * sw;
            pen.path(
                g,
                `M${x} ${eave}H${x + sw}V${awning}Q${x + sw / 2} ${awning + 0.8 * U} ${x} ${awning}Z`,
                "pencil",
                pen.fill(i % 2 ? "card" : stripe),
                calm(c, 1.4),
            );
        }
        // the name board stands on the awning, clear of whoever is working under it
        const bw = Math.min(B - 2.6 * U, 9 * U),
            bx = (B - bw) / 2;
        for (const x of [bx + 0.8 * U, bx + bw - 0.8 * U])
            pen.line(g, x, sign, x, eave, "pencil", calm(c, 1.4));
        pen.path(g, roundedRect(bx, 0.3 * U, bw, 2 * U, 6), "ruler", pen.fill("card"), calm(c, 2));
        say(c, B / 2, 1.75 * U, "Lemonade", 26, "middle", c.t.ink);
        // the booth's front, painted, with a big lemon on it
        pen.rect(
            g,
            0.3 * U,
            top + 0.5 * U,
            B - 0.6 * U,
            H - top - 0.5 * U,
            "pencil",
            pen.fill("card", "solid"),
            calm(c, 1.8),
        );
        for (let x = 0.3 * U + 2 * U; x < B - 0.5 * U; x += 2 * U)
            pen.line(g, x, top + 0.7 * U, x, H - 0.2 * U, "ruler", {
                ...calm(c, 0.8),
                stroke: c.t["ink-soft"],
            });
        const priced = String(p.price).trim() !== "",
            lx = priced ? B / 2 - 3.2 * U : B / 2,
            ly = top + (H - top) / 2 + 0.2 * U;
        if (priced) say(c, B / 2 + 2 * U, ly + 0.45 * U, String(p.price), 24, "middle", c.t.ink);
        pen.ellipse(g, lx, ly, 3.2 * U, 2.2 * U, "pencil", pen.fill("glow", "solid"), calm(c, 1.8));
        pen.path(
            g,
            `M${lx + 1.5 * U} ${ly - 0.4 * U}Q${lx + 2.1 * U} ${ly - 0.5 * U} ${lx + 2 * U} ${ly - 1.1 * U}`,
            "pencil",
            pen.fill("mint", "solid"),
            calm(c, 1.2),
        );
        // the plank counter runs on from the booth on trestles
        if (W > B + U) {
            const legs = Math.max(2, Math.round((W - B) / (12 * U)) + 1);
            for (let i = 0; i < legs; i++) {
                const x = B + 1.2 * U + (i * (W - B - 2.4 * U)) / (legs - 1);
                pen.line(g, x - 0.9 * U, H, x, top + 0.5 * U, "pencil", calm(c, 2));
                pen.line(g, x + 0.9 * U, H, x, top + 0.5 * U, "pencil", calm(c, 2));
                pen.line(
                    g,
                    x - 0.6 * U,
                    H - 1.6 * U,
                    x + 0.6 * U,
                    H - 1.6 * U,
                    "pencil",
                    calm(c, 1.4),
                );
            }
            pen.rect(
                g,
                B - 0.3 * U,
                top + 0.5 * U,
                W - B + 0.1 * U,
                0.7 * U,
                "ruler",
                pen.fill("tang"),
                calm(c, 1.6),
            );
        }
        pen.rect(g, 0.1 * U, top, W - 0.3 * U, 0.55 * U, "ruler", pen.fill("tang"), calm(c, 2));
        return {
            top: [W / 2, top, "up"],
            sign: [B / 2, 0.3 * U, "up"],
            end: [W - 0.2 * U, top, "right"],
        };
    },
    describe: (p) =>
        `A lemonade stand${String(p.price).trim() ? ` selling at ${String(p.price)}` : ""}: a wooden booth under a striped awning with its name on a board${Math.round(p.w) > Math.round(p.booth) + 1 ? ", and a long plank counter on trestles" : ", with a lemon painted on its front"}.`,
    motion: { still: "A stand holds still; the cups and coins slide along its counter." },
});
