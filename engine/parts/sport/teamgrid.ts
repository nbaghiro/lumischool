import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn } from "../lettering";

type Pt = [number, number];

/** One shirt: body, two sleeves, a collar, and stripes down it when it is the second team's. */
function shirt<G>(
    c: Ctx<G>,
    cx: number,
    cy: number,
    w: number,
    h: number,
    tint: TokenName,
    striped: boolean,
): void {
    const { pen, g } = c;
    const top = cy - h / 2,
        bot = cy + h / 2,
        body = w * 0.33,
        sleeve = w * 0.5,
        sh = top + h * 0.26;
    const pts: Pt[] = [
        [cx - body, top],
        [cx - sleeve, top + h * 0.1],
        [cx - sleeve, sh],
        [cx - body, sh - h * 0.03],
        [cx - body, bot],
        [cx + body, bot],
        [cx + body, sh - h * 0.03],
        [cx + sleeve, sh],
        [cx + sleeve, top + h * 0.1],
        [cx + body, top],
    ];
    pen.polygon(g, pts, "pencil", pen.fill(tint, "solid", { hachureGap: 7, fillWeight: 0.6 }), {
        strokeWidth: 2,
    });
    // The stripe is ink, so the two teams are still two teams with every colour taken away.
    if (striped)
        for (const s of [-1, 1])
            pen.line(g, cx + s * body * 0.75, sh, cx + s * body * 0.75, bot, "pencil", {
                strokeWidth: 2.4,
            });
    pen.ellipse(g, cx, top + 2, body * 1.05, h * 0.12, "pencil", pen.fill("card"), {
        strokeWidth: 1.4,
    });
}

export const teamGrid = defineDrawing({
    id: "teamgrid",
    family: "sport",
    title: "Team shirts",
    group: "Props",
    about: "Numbered shirts in rows and columns, with the last few striped for a second team. Rows times columns is how many there are, and splitting them between two teams turns the same picture into a subtraction.",
    params: { rows: 2, cols: 5, numbers: true, second: 4 },
    settings: {
        rows: { kind: "whole", min: 1, max: 9 },
        cols: { kind: "whole", min: 1, max: 8 },
        numbers: { kind: "flag" },
        second: { kind: "whole", min: 0, max: 72 },
    },
    takes: [
        { label: "Two rows of five", params: { rows: 2, cols: 5, numbers: true, second: 4 } },
        { label: "One team", params: { rows: 3, cols: 4, numbers: true, second: 0 } },
        { label: "No numbers", params: { rows: 2, cols: 6, numbers: false, second: 6 } },
    ],
    box: (p) => ({ w: p.cols * 4 + 1, h: p.rows * 5 + 1 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            total = p.rows * p.cols;
        for (let k = 0; k < total; k++) {
            const cx = ((k % p.cols) * 4 + 2.5) * U,
                cy = (Math.floor(k / p.cols) * 5 + 3) * U;
            const other = k >= total - p.second;
            shirt(c, cx, cy, 3 * U, 3.6 * U, other ? "berry" : "sky", other);
            if (p.numbers) numOn(c, cx, cy + 0.3 * U, k + 1, 17);
            a[`shirt(${k + 1})`] = [cx, cy - 1.8 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `Football shirts with short sleeves laid out in rows and columns${p.numbers ? ", each with its number on the front" : ""}, ${p.second <= 0 ? "all of them blue" : p.second >= p.rows * p.cols ? "all of them pink with stripes" : "blue ones first, then pink striped ones for a second team"}.`,
    reads: true,
});
