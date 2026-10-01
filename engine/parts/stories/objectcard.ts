import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, say } from "../lettering";
import { wrapTo } from "../writing/lines";

/** The things a card can show, each with its own small picture. */
const OBJECTS = [
    "hand axe",
    "bronze axe",
    "iron sickle",
    "clay tablet",
    "oracle bone",
    "cowrie shell",
    "lion coin",
    "coin with a hole",
    "paper note",
    "clay pot",
] as const;
const ROWS = ["Used for", "Made", "Found in"] as const;

interface ObjectCardParams {
    /** Which picture, by its place in the list the description gives. */
    kind: number;
    name: string;
    use: string;
    /** The year it was made: below zero is BC, and there is no year nought. */
    year: number;
    /** 1 when the year is only known roughly, which the card says as "about". */
    about: number;
    place: string;
    /** A row left blank for the child: 0 none, 1 used for, 2 made, 3 found in. */
    ask: number;
}

const W = 22;
const TEXT = 13;
const VALUE_X = 11.6 * U;
const VALUE_W = (W - 12.2) * U;

const grouped = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** A year as a museum label writes it: long ago in years ago, else BC or AD. */
export function madeIn(year: number, about: boolean): string {
    const y = Math.round(year),
        roughly = about ? "about " : "";
    if (y < -10000) return `${roughly}${grouped(-y)} years ago`;
    if (y < 0) return `${roughly}${grouped(-y)} BC`;
    return y < 1000 ? `${roughly}AD ${y}` : `${roughly}${y}`;
}

const valuesOf = (p: ObjectCardParams): string[][] =>
    [p.use, madeIn(p.year, Math.round(p.about) === 1), p.place].map((v, i) =>
        Math.round(p.ask) === i + 1 ? [""] : wrapTo(v, VALUE_W, TEXT),
    );

function heightOf(p: ObjectCardParams): number {
    const rows = valuesOf(p).reduce((h, lines) => h + lines.length * 0.95 + 0.8, 0);
    return Math.max(9, Math.ceil(3.4 + rows + 0.4));
}

function picture<G>(c: Ctx<G>, kind: number, x: number, y: number): void {
    const { pen, g } = c,
        w = { strokeWidth: 1.6 };
    switch (OBJECTS[kind]) {
        case "hand axe":
            pen.polygon(
                g,
                [
                    [x, y - 2.2 * U],
                    [x + 1.4 * U, y + 0.2 * U],
                    [x + 0.9 * U, y + 1.8 * U],
                    [x - 0.9 * U, y + 1.8 * U],
                    [x - 1.4 * U, y + 0.2 * U],
                ],
                "pencil",
                pen.fill("tang", "hachure"),
                w,
            );
            for (const [dx, dy] of [
                [-0.5, -0.4],
                [0.4, 0.3],
                [-0.2, 1],
            ] as const)
                pen.circle(g, x + dx * U, y + dy * U, 0.7 * U, "doodle", null, {
                    strokeWidth: 0.8,
                });
            break;
        case "bronze axe":
            pen.polygon(
                g,
                [
                    [x - 0.6 * U, y - 1.6 * U],
                    [x + 0.6 * U, y - 1.6 * U],
                    [x + 0.5 * U, y + 0.6 * U],
                    [x + 1.4 * U, y + 1.8 * U],
                    [x - 1.4 * U, y + 1.8 * U],
                    [x - 0.5 * U, y + 0.6 * U],
                ],
                "pencil",
                pen.fill("glow"),
                w,
            );
            break;
        case "iron sickle":
            pen.arc(g, x + 0.3 * U, y, 3.4 * U, 3.4 * U, Math.PI * 0.95, Math.PI * 2.05, "pencil", {
                strokeWidth: 3.4,
            });
            pen.rect(g, x - 1.6 * U, y - 0.2 * U, 0.5 * U, 2 * U, "pencil", pen.fill("tang"), w);
            break;
        case "clay tablet":
            pen.rect(g, x - 1.4 * U, y - 1.8 * U, 2.8 * U, 3.6 * U, "pencil", pen.fill("tang"), w);
            for (let r = 0; r < 5; r++)
                for (let k = 0; k < 4; k++)
                    pen.polygon(
                        g,
                        [
                            [x - 1 * U + k * 0.6 * U, y - 1.3 * U + r * 0.65 * U],
                            [x - 0.7 * U + k * 0.6 * U, y - 1.3 * U + r * 0.65 * U],
                            [x - 0.85 * U + k * 0.6 * U, y - 0.95 * U + r * 0.65 * U],
                        ],
                        "ruler",
                        pen.fill("ink"),
                        { strokeWidth: 0.6 },
                    );
            break;
        case "oracle bone":
            pen.path(
                g,
                `M${x - 1.3 * U} ${y - 1.9 * U}Q${x + 1.6 * U} ${y - 2.2 * U} ${x + 1.2 * U} ${y + 1.9 * U}Q${x - 1.8 * U} ${y + 1.4 * U} ${x - 1.3 * U} ${y - 1.9 * U}Z`,
                "pencil",
                pen.fill("card"),
                w,
            );
            for (const [dx, dy] of [
                [-0.4, -0.9],
                [0.3, -0.2],
                [-0.3, 0.6],
                [0.4, 1.1],
            ] as const) {
                pen.line(g, x + dx * U, y + dy * U - 6, x + dx * U, y + dy * U + 6, "ruler", {
                    strokeWidth: 1.1,
                });
                pen.line(g, x + dx * U, y + dy * U, x + dx * U + 7, y + dy * U - 4, "ruler", {
                    strokeWidth: 1.1,
                });
            }
            break;
        case "cowrie shell":
            pen.ellipse(g, x, y, 2.2 * U, 3.2 * U, "pencil", pen.fill("card"), w);
            pen.line(g, x, y - 1.2 * U, x, y + 1.2 * U, "pencil", { strokeWidth: 1.4 });
            for (let k = -3; k <= 3; k++)
                pen.line(g, x - 0.2 * U, y + k * 0.32 * U, x + 0.2 * U, y + k * 0.32 * U, "ruler", {
                    strokeWidth: 0.8,
                });
            break;
        case "lion coin":
            pen.ellipse(g, x, y, 3.2 * U, 2.8 * U, "pencil", pen.fill("glow"), w);
            pen.circle(
                g,
                x - 0.3 * U,
                y - 0.2 * U,
                1.1 * U,
                "pencil",
                pen.fill("tang", "hachure"),
                { strokeWidth: 1.2 },
            );
            pen.line(g, x + 0.2 * U, y, x + 0.9 * U, y + 0.5 * U, "pencil", { strokeWidth: 1.4 });
            break;
        case "coin with a hole":
            pen.circle(g, x, y, 3.2 * U, "pencil", pen.fill("tang"), w);
            pen.rect(g, x - 0.4 * U, y - 0.4 * U, 0.8 * U, 0.8 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            for (const [dx, dy] of [
                [0, -1],
                [0, 1],
                [-1, 0],
                [1, 0],
            ] as const)
                pen.line(
                    g,
                    x + dx * 0.8 * U - 3,
                    y + dy * 0.8 * U,
                    x + dx * 0.8 * U + 3,
                    y + dy * 0.8 * U,
                    "ruler",
                    { strokeWidth: 1.4 },
                );
            break;
        case "paper note":
            pen.rect(g, x - 1.2 * U, y - 2 * U, 2.4 * U, 4 * U, "pencil", pen.fill("card"), w);
            pen.rect(g, x - 0.8 * U, y - 1.6 * U, 1.6 * U, 3.2 * U, "ruler", null, {
                strokeWidth: 1,
            });
            for (let k = 0; k < 4; k++)
                pen.line(
                    g,
                    x - 0.4 * U,
                    y - 1 * U + k * 0.6 * U,
                    x + 0.4 * U,
                    y - 1 * U + k * 0.6 * U,
                    "ruler",
                    { strokeWidth: 1.2, stroke: c.t.berry },
                );
            break;
        default:
            pen.path(
                g,
                `M${x - 0.8 * U} ${y - 1.8 * U}H${x + 0.8 * U}L${x + 0.6 * U} ${y - 1.2 * U}Q${x + 1.9 * U} ${y} ${x + 1 * U} ${y + 1.8 * U}H${x - 1 * U}Q${x - 1.9 * U} ${y} ${x - 0.6 * U} ${y - 1.2 * U}Z`,
                "pencil",
                pen.fill("tang"),
                w,
            );
            pen.line(g, x - 1.2 * U, y, x + 1.2 * U, y, "pencil", {
                strokeWidth: 1,
                stroke: c.t.berry,
            });
    }
}

const TABLET: ObjectCardParams = {
    kind: 3,
    name: "Clay tablet with wedge writing",
    use: "Counting sheep and grain",
    year: -3000,
    about: 1,
    place: "Uruk, Iraq",
    ask: 0,
};

export const objectCard = defineDrawing<ObjectCardParams>({
    id: "objectcard",
    family: "stories",
    title: "Museum object card",
    group: "Structures",
    about: "A museum's label for one old object: a picture of it in a case (`kind`: 0 a stone hand axe, 1 a bronze axe, 2 an iron sickle, 3 a clay tablet, 4 an oracle bone, 5 a cowrie shell, 6 a lion coin, 7 a coin with a square hole, 8 a paper note, 9 a clay pot), its name, and rows for what it was used for, when it was made (BC or AD, years ago for the oldest, `about` when known roughly) and where it was found. `ask` leaves one row blank for the child.",
    params: TABLET,
    settings: {
        kind: { kind: "whole", min: 0, max: OBJECTS.length - 1 },
        name: { kind: "text", most: 40 },
        use: { kind: "text", most: 40 },
        year: { kind: "whole", min: -3000000, max: 2100 },
        about: { kind: "whole", min: 0, max: 1 },
        place: { kind: "text", most: 40 },
        ask: { kind: "whole", min: 0, max: 3 },
    },
    takes: [
        { label: "A clay tablet", params: TABLET },
        {
            label: "A hand axe, the date to find",
            params: {
                kind: 0,
                name: "Flint hand axe",
                use: "Cutting meat and wood",
                year: -500000,
                about: 1,
                place: "Boxgrove, England",
                ask: 2,
            },
        },
        {
            label: "A coin with a hole",
            params: {
                kind: 7,
                name: "Ban liang coin",
                use: "Buying and selling",
                year: -221,
                about: 1,
                place: "China",
                ask: 0,
            },
        },
        {
            label: "A paper note, its use to find",
            params: {
                kind: 8,
                name: "Paper money",
                use: "Buying and selling",
                year: 1024,
                about: 0,
                place: "Sichuan, China",
                ask: 1,
            },
        },
    ],
    box: (p) => ({ w: W, h: heightOf(p) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            h = heightOf(p),
            ask = Math.round(p.ask),
            kind = Math.max(0, Math.min(OBJECTS.length - 1, Math.round(p.kind)));
        // the case the object lies in, and the card beside it
        pen.rect(
            g,
            0.4 * U,
            0.6 * U,
            9.4 * U,
            (h - 1) * U,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 9 }),
            { strokeWidth: 1.8 },
        );
        pen.rect(g, 1.6 * U, 2 * U, 7 * U, (h - 3.8) * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.2,
        });
        picture(c, kind, 5.1 * U, (0.6 + (h - 1) / 2) * U);
        pen.rect(g, 10.4 * U, 0.6 * U, (W - 10.8) * U, (h - 1) * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        let y = 1.9 * U;
        for (const s of wrapTo(p.name, (W - 11.8) * U, 14).slice(0, 2)) {
            say(c, 11 * U, y, s, 14, "start");
            y += 0.95 * U;
        }
        pen.line(g, 10.4 * U, y - 0.4 * U, (W - 0.4) * U, y - 0.4 * U, "ruler", {
            strokeWidth: 1.3,
            stroke: c.t.berry,
        });
        y += 0.5 * U;
        valuesOf(p).forEach((lines, i) => {
            cap(c, 11 * U, y, ROWS[i] ?? "", 10, "start");
            y += 0.8 * U;
            if (ask === i + 1)
                pen.line(g, 11 * U, y + 0.1 * U, (W - 1) * U, y + 0.1 * U, "ruler", {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                });
            else lines.forEach((s, k) => say(c, 11 * U, y + k * 0.95 * U, s, TEXT, "start"));
            a[`row(${i})`] = [VALUE_X, y - 0.8 * U, "left"];
            y += lines.length * 0.95 * U + 0.2 * U;
        });
        a.object = [5.1 * U, 0.6 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A museum case holding a ${OBJECTS[Math.max(0, Math.min(OBJECTS.length - 1, Math.round(p.kind)))] ?? "thing"}, with a label card beside it saying what it was used for, when it was made and where it was found.`,
});
