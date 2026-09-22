import { type Ctx, type RawAnchors } from "../../ink/surface";
import { rng, roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, soft } from "../lettering";
import { type Pt, lightFill, gleam, lettered } from "./apparatus";
import { OBJECTS } from "./substances";

/** Grain on wood: two long strokes and a knot, in the soft ink so they read as texture and not as edges. */
function grain<G>(c: Ctx<G>, x0: number, y0: number, x1: number, y1: number, knot = true): void {
    const s = { strokeWidth: 0.9, stroke: c.t["ink-soft"] },
        dx = x1 - x0,
        dy = y1 - y0,
        L = Math.hypot(dx, dy) || 1,
        nx = -dy / L,
        ny = dx / L;
    for (const k of [-0.28, 0.3]) {
        const o = k * Math.min(L, 0.5 * U);
        c.pen.curve(
            c.g,
            [
                [x0 + nx * o, y0 + ny * o],
                [x0 + dx * 0.5 + nx * (o + 2.5), y0 + dy * 0.5 + ny * (o + 2.5)],
                [x1 + nx * o, y1 + ny * o],
            ],
            "pencil",
            s,
        );
    }
    if (knot) c.pen.ellipse(c.g, x0 + dx * 0.62, y0 + dy * 0.62, 5, 3.5, "pencil", null, s);
}

/** A thing from OBJECTS, drawn in its material with its base on `base`, inside about three and a half squares. */
function objectIcon<G>(c: Ctx<G>, kind: string, x: number, base: number): void {
    const { pen, g } = c,
        t = c.t;
    const woodFill = pen.fill("tang", "hachure", {
        hachureGap: 5,
        fillWeight: 0.8,
        hachureAngle: 75,
    });
    const metalFill = pen.fill("ink-soft", "hachure", { hachureGap: 4.5, fillWeight: 0.6 });
    const glassFill = pen.fill("sky", "hachure", { hachureGap: 9, fillWeight: 0.7 });
    if (kind.endsWith("-spoon")) {
        const made = OBJECTS[kind]?.made,
            hw = made === "wood" ? 0.26 * U : made === "metal" ? 0.15 * U : 0.2 * U;
        const fill = made === "wood" ? woodFill : made === "metal" ? metalFill : pen.fill("berry");
        pen.path(g, roundedRect(x - hw, base - 1.9 * U, hw * 2, 1.9 * U, hw), "pencil", fill, {
            strokeWidth: 1.6,
        });
        pen.ellipse(g, x, base - 2.55 * U, 1.45 * U, 1.75 * U, "pencil", fill, {
            strokeWidth: 1.8,
        });
        pen.arc(g, x, base - 2.5 * U, 0.95 * U, 1.2 * U, Math.PI * 0.15, Math.PI * 0.85, "pencil", {
            strokeWidth: 1.1,
            stroke: t["ink-soft"],
        });
        if (made === "wood") grain(c, x, base - 0.2 * U, x, base - 1.7 * U, false);
        if (made !== "wood") gleam(c, x - 0.35 * U, base - 3.05 * U, base - 2.35 * U, 2.4);
        return;
    }
    if (kind === "glass-jar") {
        const l = x - 1.35 * U,
            r = x + 1.35 * U,
            top = base - 3.1 * U,
            nl = x - 0.95 * U,
            nr = x + 0.95 * U;
        const body = `M${nl} ${top + 0.3 * U}Q${l} ${top + 0.45 * U} ${l} ${top + 1.1 * U}V${base - 8}Q${l} ${base} ${l + 8} ${base}H${r - 8}Q${r} ${base} ${r} ${base - 8}V${top + 1.1 * U}Q${r} ${top + 0.45 * U} ${nr} ${top + 0.3 * U}Z`;
        pen.path(g, body, "pencil", glassFill, { strokeWidth: 1.8 });
        pen.path(
            g,
            roundedRect(x - 1.1 * U, top - 0.1 * U, 2.2 * U, 0.42 * U, 4),
            "pencil",
            glassFill,
            { strokeWidth: 1.7 },
        );
        gleam(c, l + 0.35 * U, top + 1.2 * U, base - 0.5 * U);
        gleam(c, l + 0.62 * U, top + 1.4 * U, top + 1.9 * U, 2);
        return;
    }
    if (kind === "plastic-bottle") {
        const l = x - 1 * U,
            r = x + 1 * U,
            top = base - 3.4 * U;
        const body = `M${x - 0.38 * U} ${top + 0.55 * U}V${top + 0.8 * U}Q${l} ${top + 1.1 * U} ${l} ${top + 1.8 * U}V${base - 8}Q${l} ${base} ${l + 8} ${base}H${r - 8}Q${r} ${base} ${r} ${base - 8}V${top + 1.8 * U}Q${r} ${top + 1.1 * U} ${x + 0.38 * U} ${top + 0.8 * U}V${top + 0.55 * U}Z`;
        pen.path(
            g,
            body,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 12, fillWeight: 0.6 }),
            { strokeWidth: 1.6 },
        );
        pen.path(
            g,
            roundedRect(x - 0.45 * U, top, 0.9 * U, 0.6 * U, 3),
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.5 },
        );
        for (const y of [top + 2.1 * U, top + 2.45 * U])
            pen.line(g, l + 2, y, r - 2, y, "pencil", { strokeWidth: 1, stroke: t["ink-soft"] });
        gleam(c, l + 0.3 * U, top + 1.7 * U, base - 0.4 * U, 2.4);
        return;
    }
    if (kind === "wool-sock") {
        const top = base - 3.3 * U;
        const d =
            `M${x - 0.95 * U} ${top}H${x + 0.25 * U}V${base - 1.45 * U}Q${x + 0.3 * U} ${base - 1.15 * U} ${x + 0.8 * U} ${base - 1.15 * U}H${x + 1.15 * U}` +
            `Q${x + 1.7 * U} ${base - 1.1 * U} ${x + 1.7 * U} ${base - 0.6 * U}Q${x + 1.7 * U} ${base - 0.05 * U} ${x + 1.1 * U} ${base - 0.05 * U}H${x - 0.35 * U}Q${x - 0.95 * U} ${base - 0.05 * U} ${x - 0.95 * U} ${base - 0.7 * U}Z`;
        pen.path(g, d, "pencil", pen.fill("mint"), { strokeWidth: 1.8 });
        pen.line(g, x - 0.95 * U, top + 0.55 * U, x + 0.25 * U, top + 0.55 * U, "pencil", {
            strokeWidth: 1.2,
        });
        for (let k = 1; k < 5; k++)
            pen.line(
                g,
                x - 0.95 * U + k * 0.24 * U,
                top + 0.06 * U,
                x - 0.95 * U + k * 0.24 * U,
                top + 0.5 * U,
                "pencil",
                { strokeWidth: 0.9, stroke: t["ink-soft"] },
            );
        for (const [vx, vy] of [
            [-0.55, 1.1],
            [-0.15, 1.1],
            [-0.35, 1.6],
            [0.05, 1.6],
            [-0.55, 2.1],
            [-0.15, 2.1],
        ] as Pt[])
            pen.linear(
                g,
                [
                    [x + vx * U - 4, base - 3.3 * U + vy * U - 3],
                    [x + vx * U, base - 3.3 * U + vy * U + 2],
                    [x + vx * U + 4, base - 3.3 * U + vy * U - 3],
                ],
                "pencil",
                { strokeWidth: 0.9, stroke: t["ink-soft"] },
            );
        return;
    }
    if (kind === "towel") {
        const top = base - 2.2 * U;
        pen.path(
            g,
            roundedRect(x - 1.6 * U, top, 3.2 * U, 2.2 * U, 6),
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.8 },
        );
        pen.line(g, x - 1.6 * U, top + 1.1 * U, x + 1.6 * U, top + 1.1 * U, "pencil", {
            strokeWidth: 1.2,
        });
        for (const dx of [0.9, 1.15])
            pen.line(g, x + dx * U, top + 3, x + dx * U, base - 3, "pencil", {
                strokeWidth: 2.2,
                stroke: t.card,
            });
        for (let k = 0; k < 7; k++)
            pen.line(
                g,
                x - 1.5 * U + k * 0.4 * U,
                base,
                x - 1.5 * U + k * 0.4 * U,
                base + 3,
                "pencil",
                { strokeWidth: 0.9 },
            );
        return;
    }
    if (kind === "paper-bag") {
        const top = base - 3 * U,
            l = x - 1.15 * U,
            r = x + 1.15 * U;
        let zig = `M${l} ${top + 0.2 * U}`;
        for (let k = 1; k <= 8; k++)
            zig += `L${l + (k * (r - l)) / 8} ${top + (k % 2 ? 0 : 0.2 * U)}`;
        pen.path(g, `${zig}V${base}H${l}Z`, "pencil", pen.fill("card"), { strokeWidth: 1.7 });
        pen.line(g, l + 0.35 * U, top + 0.4 * U, l + 0.35 * U, base - 2, "pencil", {
            strokeWidth: 0.9,
            stroke: t["ink-soft"],
        });
        pen.line(g, r - 0.35 * U, top + 0.4 * U, r - 0.35 * U, base - 2, "pencil", {
            strokeWidth: 0.9,
            stroke: t["ink-soft"],
        });
        pen.line(g, l, base - 0.5 * U, r, base - 0.5 * U, "pencil", {
            strokeWidth: 0.9,
            stroke: t["ink-soft"],
        });
        pen.curve(
            g,
            [
                [x - 0.2 * U, top + 1 * U],
                [x + 0.1 * U, top + 1.5 * U],
                [x - 0.1 * U, top + 2 * U],
            ],
            "pencil",
            { strokeWidth: 0.9, stroke: t["ink-soft"] },
        );
        return;
    }
    if (kind === "cardboard-box") {
        const top = base - 2.2 * U,
            l = x - 1.7 * U,
            w = 2.5 * U,
            dx = 0.8 * U,
            dy = 0.6 * U;
        const card = lightFill(c, "glow", "hachure", 5);
        pen.polygon(
            g,
            [
                [l, top],
                [l + dx, top - dy],
                [l + w + dx, top - dy],
                [l + w, top],
            ],
            "pencil",
            card,
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            g,
            [
                [l + w, top],
                [l + w + dx, top - dy],
                [l + w + dx, base - dy],
                [l + w, base],
            ],
            "pencil",
            card,
            { strokeWidth: 1.6 },
        );
        pen.rect(g, l, top, w, base - top, "pencil", card, { strokeWidth: 1.8 });
        pen.polygon(
            g,
            [
                [l + w * 0.4, top],
                [l + w * 0.4 + dx, top - dy],
                [l + w * 0.6 + dx, top - dy],
                [l + w * 0.6, top],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1 },
        );
        pen.rect(g, l + w * 0.4, top, w * 0.2, 0.7 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1,
        });
        return;
    }
    if (kind === "rubber-boot") {
        const top = base - 3.3 * U;
        const d =
            `M${x - 1.05 * U} ${top}H${x + 0.2 * U}V${base - 1.35 * U}Q${x + 0.35 * U} ${base - 1.05 * U} ${x + 0.9 * U} ${base - 1.0 * U}` +
            `Q${x + 1.65 * U} ${base - 0.9 * U} ${x + 1.65 * U} ${base - 0.3 * U}V${base}H${x - 1.05 * U}Z`;
        pen.path(g, d, "pencil", lightFill(c, "glow", "solid"), { strokeWidth: 1.9 });
        pen.rect(
            g,
            x - 1.1 * U,
            top - 0.05 * U,
            1.35 * U,
            0.45 * U,
            "pencil",
            lightFill(c, "glow", "solid"),
            { strokeWidth: 1.6 },
        );
        pen.line(g, x - 1.05 * U, base - 0.25 * U, x + 1.65 * U, base - 0.25 * U, "pencil", {
            strokeWidth: 1.6,
        });
        for (let k = 0; k < 6; k++)
            pen.line(
                g,
                x - 0.9 * U + k * 0.45 * U,
                base - 0.25 * U,
                x - 0.75 * U + k * 0.45 * U,
                base,
                "pencil",
                { strokeWidth: 1.1 },
            );
        gleam(c, x - 0.75 * U, top + 0.7 * U, base - 1.5 * U, 2.4);
        return;
    }
    if (kind === "rubber-band") {
        const y = base - 1.4 * U;
        pen.ellipse(g, x, y, 2.9 * U, 1.7 * U, "pencil", null, {
            strokeWidth: 5.5,
            stroke: c.paper ? t["ink-soft"] : t.tang,
        });
        pen.ellipse(g, x, y, 3.2 * U, 2 * U, "pencil", null, { strokeWidth: 1.2 });
        pen.ellipse(g, x, y, 2.6 * U, 1.4 * U, "pencil", null, { strokeWidth: 1.2 });
        return;
    }
    if (kind === "brick") {
        const l = x - 1.75 * U,
            w = 2.7 * U,
            h = 1.4 * U,
            dx = 0.75 * U,
            dy = 0.55 * U,
            top = base - h;
        const red = pen.fill("tang", "cross-hatch", { hachureGap: 5, fillWeight: 0.7 });
        pen.polygon(
            g,
            [
                [l, top],
                [l + dx, top - dy],
                [l + w + dx, top - dy],
                [l + w, top],
            ],
            "pencil",
            lightFill(c, "tang", "hachure", 5),
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            g,
            [
                [l + w, top],
                [l + w + dx, top - dy],
                [l + w + dx, base - dy],
                [l + w, base],
            ],
            "pencil",
            red,
            { strokeWidth: 1.6 },
        );
        pen.rect(g, l, top, w, h, "pencil", red, { strokeWidth: 1.8 });
        for (const k of [0.3, 0.55, 0.8])
            pen.ellipse(
                g,
                l + w * k + dx * 0.5,
                top - dy * 0.5,
                0.42 * U,
                0.26 * U,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1 },
            );
        return;
    }
    if (kind === "pebble") {
        const y = base - 1.1 * U;
        pen.path(
            g,
            `M${x - 1.6 * U} ${y + 0.2 * U}Q${x - 1.5 * U} ${y - 1 * U} ${x - 0.1 * U} ${y - 1.05 * U}Q${x + 1.5 * U} ${y - 1.1 * U} ${x + 1.65 * U} ${y + 0.1 * U}Q${x + 1.7 * U} ${y + 1.05 * U} ${x} ${y + 1.05 * U}Q${x - 1.65 * U} ${y + 1.05 * U} ${x - 1.6 * U} ${y + 0.2 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 8, fillWeight: 0.5 }),
            { strokeWidth: 1.8 },
        );
        const r = rng(29);
        for (let k = 0; k < 9; k++)
            pen.circle(
                g,
                x + (r() - 0.5) * 2.4 * U,
                y + (r() - 0.5) * 1.2 * U,
                2.6 + r() * 2,
                "pencil",
                { fill: t.ink, fillStyle: "solid" },
                { strokeWidth: 0.4 },
            );
        pen.arc(
            g,
            x - 0.4 * U,
            y - 0.3 * U,
            1.4 * U,
            0.9 * U,
            Math.PI * 1.15,
            Math.PI * 1.5,
            "pencil",
            { strokeWidth: 1.4, stroke: t.card },
        );
        return;
    }
    if (kind === "metal-key") {
        const y = base - 1.3 * U;
        pen.path(
            g,
            `M${x - 0.35 * U} ${y - 0.2 * U}H${x + 1.6 * U}V${y + 0.2 * U}H${x + 1.35 * U}V${y + 0.55 * U}H${x + 1.1 * U}V${y + 0.2 * U}H${x + 0.85 * U}V${y + 0.45 * U}H${x + 0.6 * U}V${y + 0.2 * U}H${x - 0.35 * U}Z`,
            "pencil",
            metalFill,
            { strokeWidth: 1.5 },
        );
        pen.circle(g, x - 0.95 * U, y, 1.5 * U, "pencil", metalFill, { strokeWidth: 1.8 });
        pen.circle(g, x - 0.95 * U, y, 0.55 * U, "pencil", pen.fill("card"), { strokeWidth: 1.3 });
        gleam(c, x - 1.35 * U, y - 0.35 * U, y + 0.1 * U, 2.2);
        return;
    }
    if (kind === "wooden-block") {
        const l = x - 1.55 * U,
            s = 2.3 * U,
            dx = 0.75 * U,
            dy = 0.6 * U,
            top = base - s;
        pen.polygon(
            g,
            [
                [l, top],
                [l + dx, top - dy],
                [l + s + dx, top - dy],
                [l + s, top],
            ],
            "pencil",
            woodFill,
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            g,
            [
                [l + s, top],
                [l + s + dx, top - dy],
                [l + s + dx, base - dy],
                [l + s, base],
            ],
            "pencil",
            lightFill(c, "tang", "hachure", 3.5),
            { strokeWidth: 1.6 },
        );
        pen.rect(g, l, top, s, s, "pencil", woodFill, { strokeWidth: 1.8 });
        grain(c, l + 0.25 * U, top + 0.6 * U, l + s - 0.2 * U, top + 0.75 * U);
        grain(c, l + 0.2 * U, top + 1.5 * U, l + s - 0.25 * U, top + 1.6 * U, false);
        return;
    }
    if (kind === "raincoat") {
        const top = base - 3.4 * U;
        const d =
            `M${x - 0.45 * U} ${top + 0.15 * U}Q${x} ${top - 0.25 * U} ${x + 0.45 * U} ${top + 0.15 * U}L${x + 0.75 * U} ${top + 0.75 * U}L${x + 1.55 * U} ${top + 1.05 * U}L${x + 1.75 * U} ${top + 2.2 * U}` +
            `L${x + 1.25 * U} ${top + 2.3 * U}L${x + 1.1 * U} ${top + 1.7 * U}L${x + 1.3 * U} ${base}H${x - 1.3 * U}L${x - 1.1 * U} ${top + 1.7 * U}L${x - 1.25 * U} ${top + 2.3 * U}` +
            `L${x - 1.75 * U} ${top + 2.2 * U}L${x - 1.55 * U} ${top + 1.05 * U}L${x - 0.75 * U} ${top + 0.75 * U}Z`;
        pen.path(g, d, "pencil", lightFill(c, "glow", "solid"), { strokeWidth: 1.8 });
        pen.line(g, x, top + 0.75 * U, x, base, "pencil", { strokeWidth: 1.2 });
        for (const y of [1.3, 1.9, 2.5])
            pen.circle(
                g,
                x + 0.22 * U,
                top + y * U,
                4.5,
                "pencil",
                { fill: t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
        gleam(c, x - 0.85 * U, top + 1.4 * U, base - 0.5 * U, 2.4);
        return;
    }
    if (kind === "metal-can") {
        const l = x - 1.1 * U,
            r = x + 1.1 * U,
            top = base - 2.9 * U;
        pen.path(
            g,
            `M${l} ${top}V${base - 0.2 * U}Q${x} ${base + 0.2 * U} ${r} ${base - 0.2 * U}V${top}`,
            "pencil",
            metalFill,
            { strokeWidth: 1.8 },
        );
        pen.ellipse(g, x, top, r - l, 0.55 * U, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        pen.ellipse(g, x, top, r - l - 8, 0.35 * U, "pencil", null, {
            strokeWidth: 0.9,
            stroke: t["ink-soft"],
        });
        for (const k of [0.8, 1.5, 2.2])
            pen.curve(
                g,
                [
                    [l, top + k * U],
                    [x, top + k * U + 4],
                    [r, top + k * U],
                ],
                "pencil",
                { strokeWidth: 1, stroke: t["ink-soft"] },
            );
        gleam(c, l + 0.35 * U, top + 0.5 * U, base - 0.5 * U, 2.6);
        return;
    }
    if (kind === "glass-bottle") {
        const l = x - 0.85 * U,
            r = x + 0.85 * U,
            top = base - 3.4 * U;
        const body = `M${x - 0.28 * U} ${top}V${top + 1 * U}Q${l} ${top + 1.3 * U} ${l} ${top + 1.9 * U}V${base - 6}Q${l} ${base} ${l + 6} ${base}H${r - 6}Q${r} ${base} ${r} ${base - 6}V${top + 1.9 * U}Q${r} ${top + 1.3 * U} ${x + 0.28 * U} ${top + 1 * U}V${top}Z`;
        pen.path(g, body, "pencil", glassFill, { strokeWidth: 1.7 });
        pen.rect(g, x - 0.34 * U, top - 0.1 * U, 0.68 * U, 0.28 * U, "pencil", glassFill, {
            strokeWidth: 1.3,
        });
        gleam(c, l + 0.3 * U, top + 2 * U, base - 0.4 * U, 2.4);
        return;
    }
    if (kind === "wooden-ruler") {
        const l = x - 1.8 * U,
            top = base - 1.9 * U,
            w = 3.6 * U,
            h = 0.85 * U;
        pen.rect(g, l, top, w, h, "pencil", woodFill, { strokeWidth: 1.7 });
        for (let k = 1; k < 12; k++)
            pen.line(
                g,
                l + k * 0.3 * U,
                top,
                l + k * 0.3 * U,
                top + (k % 5 === 0 ? 0.4 : 0.22) * U,
                "pencil",
                { strokeWidth: 0.9 },
            );
        grain(c, l + 0.3 * U, top + 0.62 * U, l + w - 0.3 * U, top + 0.6 * U);
        return;
    }
    if (kind === "wool-hat") {
        const top = base - 3 * U;
        pen.path(
            g,
            `M${x - 1.5 * U} ${base - 0.7 * U}Q${x - 1.6 * U} ${top + 0.4 * U} ${x} ${top + 0.35 * U}Q${x + 1.6 * U} ${top + 0.4 * U} ${x + 1.5 * U} ${base - 0.7 * U}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            roundedRect(x - 1.65 * U, base - 0.8 * U, 3.3 * U, 0.75 * U, 4),
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.7 },
        );
        for (let k = 1; k < 9; k++)
            pen.line(
                g,
                x - 1.65 * U + k * 0.37 * U,
                base - 0.72 * U,
                x - 1.65 * U + k * 0.37 * U,
                base - 0.13 * U,
                "pencil",
                { strokeWidth: 0.9, stroke: t["ink-soft"] },
            );
        pen.circle(g, x, top + 0.2 * U, 0.8 * U, "pencil", lightFill(c, "glow", "solid"), {
            strokeWidth: 1.5,
        });
        for (const [vx, vy] of [
            [-0.7, 1.4],
            [0, 1.1],
            [0.7, 1.4],
            [-0.35, 1.9],
            [0.35, 1.9],
        ] as Pt[])
            pen.linear(
                g,
                [
                    [x + vx * U - 4, top + vy * U - 3],
                    [x + vx * U, top + vy * U + 2],
                    [x + vx * U + 4, top + vy * U - 3],
                ],
                "pencil",
                { strokeWidth: 0.9, stroke: t["ink-soft"] },
            );
        return;
    }
    if (kind === "paper-book") {
        const l = x - 1.5 * U,
            top = base - 2.6 * U,
            w = 2.6 * U,
            h = 2.4 * U;
        pen.polygon(
            g,
            [
                [l + w, top],
                [l + w + 0.45 * U, top + 0.3 * U],
                [l + w + 0.45 * U, top + h + 0.3 * U],
                [l + w, top + h],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        for (let k = 1; k < 5; k++)
            pen.line(
                g,
                l + w + 0.09 * k * U,
                top + 0.06 * k * U + 2,
                l + w + 0.09 * k * U,
                top + h + 0.06 * k * U - 2,
                "pencil",
                { strokeWidth: 0.7, stroke: t["ink-soft"] },
            );
        pen.rect(g, l, top, w, h, "pencil", pen.fill("berry"), { strokeWidth: 1.8 });
        pen.rect(g, l + 0.45 * U, top + 0.5 * U, w - 0.9 * U, 0.7 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.1,
        });
        return;
    }
    pen.path(g, roundedRect(x - 1.2 * U, base - 2.6 * U, 2.4 * U, 2.4 * U, 6), "pencil", null, {
        strokeWidth: 1.4,
        strokeLineDash: [5, 5],
        stroke: t["ink-soft"],
    });
    say(c, x, base - 1.1 * U, "?", 18);
}

export const materials = defineDrawing({
    id: "materials",
    family: "science",
    title: "What it is made of",
    group: "Props",
    about: "Everyday things in a lettered row, each drawn in the material it is made of: a spoon of wood with a grain, of metal with a shine and of plastic, a glass jar and a glass bottle, a plastic bottle, a wool sock and a hat, a towel, a paper bag and a book, a cardboard box, a rubber boot and a band, a brick, a pebble, a metal key and a can, a wooden block and a ruler, and a raincoat. The thing and its material are two answers, so the same spoon comes in three materials. What each is made of and what it is like (hard, bendy, see-through, waterproof, soaks up water, stretchy, floats) is one table that the checker marks from. `names` writes what each thing is under it, never what it is made of.",
    params: { things: ["wooden-spoon", "metal-spoon", "plastic-spoon"], letters: 1, names: 0 },
    settings: {
        things: { kind: "words", most: 8, of: Object.keys(OBJECTS) },
        letters: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "One spoon, three materials",
            params: {
                things: ["wooden-spoon", "metal-spoon", "plastic-spoon"],
                letters: 1,
                names: 0,
            },
        },
        {
            label: "Which keeps you dry?",
            params: {
                things: ["raincoat", "wool-sock", "paper-bag", "rubber-boot"],
                letters: 1,
                names: 1,
            },
        },
        {
            label: "Round the kitchen",
            params: {
                things: ["glass-jar", "plastic-bottle", "metal-key", "wooden-block", "towel"],
                letters: 1,
                names: 1,
            },
        },
        {
            label: "Hard and not",
            params: {
                things: ["brick", "pebble", "cardboard-box", "rubber-band"],
                letters: 1,
                names: 1,
            },
        },
        {
            label: "Three materials, two of each",
            params: {
                things: [
                    "metal-can",
                    "wooden-ruler",
                    "glass-bottle",
                    "wool-hat",
                    "paper-book",
                    "metal-key",
                ],
                letters: 1,
                names: 1,
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(8, p.things.length)) * 4 + 1, h: p.names > 0 ? 7 : 6 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        p.things.slice(0, 8).forEach((kind, i) => {
            const x = (0.5 + 2 + i * 4) * U,
                base = 4 * U;
            objectIcon(c, kind, x, base);
            if (p.letters > 0) lettered(c, x, 5.35 * U, i);
            if (p.names > 0)
                soft(c, x, (p.letters > 0 ? 6.5 : 5.4) * U, OBJECTS[kind]?.name ?? kind, 12);
            a[`thing(${i})`] = [x, 0.4 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `Everyday things in a lettered row, each drawn in the material it is made of, wood with its grain, metal with a shine${p.names > 0 ? ", each named underneath" : ""}.`,
    reads: true,
});
