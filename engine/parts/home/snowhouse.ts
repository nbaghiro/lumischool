import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const snowHouse = defineDrawing<{ floors: number; lit: boolean }>({
    id: "snowhouse",
    family: "home",
    title: "A snowy chimney house",
    group: "Structures",
    about: "A snow-covered roof with a wide open chimney, warm windows, a wreath and a doorstep waiting for Christmas deliveries.",
    params: { floors: 1, lit: false },
    settings: { floors: { kind: "whole", min: 1, max: 3 }, lit: { kind: "flag" } },
    takes: [
        { label: "The village cottage", params: { floors: 1, lit: false } },
        { label: "The tall town house, delivered", params: { floors: 3, lit: true } },
    ],
    box: (p) => ({ w: 8, h: 8 + Math.max(1, Math.min(3, Math.round(p.floors))) * 2 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = Math.max(1, Math.min(3, Math.round(p.floors))),
            h = 8 + n * 2;
        const edge = { strokeWidth: 1.3, roughness: 0.4 };
        const path = (d: string, fill: "card" | "berry" | "glow") =>
            pen.path(g, d, "pencil", pen.fill(fill, "solid"), edge);
        path(`M${0.9 * U} ${5 * U}H${7.1 * U}V${(h - 0.6) * U}H${0.9 * U}Z`, "card");
        path(`M${0.3 * U} ${5.1 * U}L${4 * U} ${2.5 * U}L${7.7 * U} ${5.1 * U}Z`, "berry");
        path(
            `M${0.3 * U} ${5.1 * U}L${4 * U} ${2.5 * U}L${7.7 * U} ${5.1 * U}L${7.4 * U} ${5.45 * U}Q${5.5 * U} ${4.6 * U} ${4 * U} ${3.15 * U}Q${2.2 * U} ${4.6 * U} ${0.5 * U} ${5.45 * U}Z`,
            "card",
        );
        path(
            `M${2.7 * U} ${1.25 * U}H${5.3 * U}V${3.5 * U}L${4 * U} ${2.6 * U}L${2.7 * U} ${3.5 * U}Z`,
            "berry",
        );
        path(`M${2.5 * U} ${0.8 * U}H${5.5 * U}V${1.35 * U}H${2.5 * U}Z`, "card");
        pen.line(g, 2.8 * U, U, 5.2 * U, U, "pencil", { strokeWidth: 2.4 });
        for (let i = 0; i < n; i++)
            for (const x of [2.25, 5.75]) {
                const y = 6.5 + i * 2;
                pen.rect(
                    g,
                    (x - 0.6) * U,
                    (y - 0.6) * U,
                    1.2 * U,
                    1.25 * U,
                    "pencil",
                    pen.fill("glow", p.lit ? "solid" : "hachure"),
                    edge,
                );
                pen.line(g, x * U, (y - 0.6) * U, x * U, (y + 0.65) * U, "pencil", edge);
            }
        path(
            `M${3.3 * U} ${(h - 0.6) * U}V${(h - 2.6) * U}Q${4 * U} ${(h - 3.2) * U} ${4.7 * U} ${(h - 2.6) * U}V${(h - 0.6) * U}Z`,
            "berry",
        );
        pen.circle(g, 4 * U, (h - 2.25) * U, 0.7 * U, "pencil", null, { strokeWidth: 2 });
        pen.line(g, 0.4 * U, (h - 0.35) * U, 7.6 * U, (h - 0.35) * U, "pencil", edge);
        return { chimney: [4 * U, U, "up"], door: [4 * U, (h - 0.6) * U, "down"] };
    },
    describe: (p) =>
        `A snowy house with an open chimney, a wreath on the front door and ${p.lit ? "bright" : "warm"} windows under its white roof.`,
    motion: { still: "Its windows light when its delivery is complete." },
});
