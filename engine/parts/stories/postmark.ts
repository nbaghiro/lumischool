import { letter, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/**
 * One character of the mono face, in ems, without its spacing: measured off the card, where six
 * characters at 10.5 units set 41.4 units wide with a spacing of 0.06.
 */
const ADVANCE = 0.597;

/** The largest hand that fits `n` characters in `room` units, so no letter runs out of its space. */
const fitted = (n: number, room: number, spacing: number, most: number, least: number): number =>
    Math.max(least, Math.min(most, (room * 0.9) / (Math.max(1, n) * (ADVANCE + spacing))));

/**
 * A postmark: a ring with the place round its top, the date across the middle, and the wavy lines
 * that cancel a stamp. It is how a letter says where it was posted and when, which a reading
 * question can ask about.
 */
export const postmark = defineDrawing({
    id: "postmark",
    family: "stories",
    title: "Postmark",
    group: "Marks",
    about: "A round postmark with the place it was posted round the top of its ring, the date across the middle and wavy lines running off to one side, the way they cancel a stamp. Where and when a letter was sent, read off the envelope. Each is stamped in the largest hand its own space holds, so a long town is crowded into a smaller one rather than running past the ring.",
    params: { place: "Toronto", date: "13 Sep", waves: 3 },
    settings: {
        place: { kind: "text", most: 14 },
        date: { kind: "text", most: 8 },
        waves: { kind: "whole", min: 0, max: 5 },
    },
    takes: [
        {
            label: "Toronto, with its waves",
            params: { place: "Toronto", date: "13 Sep", waves: 3 },
        },
        {
            label: "The harbour, the ring alone",
            params: { place: "The harbour", date: "3 May", waves: 0 },
        },
        {
            label: "A long town, in a smaller hand",
            params: { place: "Port-au-Prince", date: "18 Sep", waves: 3 },
        },
    ],
    box: (p) => ({ w: p.waves > 0 ? 8 : 4, h: 4 }),
    draw: (c, p) => {
        const { pen, g, t } = c;
        const cx = 2 * U,
            cy = 2 * U,
            r = 1.72 * U,
            ink = t["ink-soft"];
        const inner = r * 1.4;
        pen.circle(g, cx, cy, r * 2, "pencil", null, { strokeWidth: 1.5, stroke: ink });
        pen.circle(g, cx, cy, inner, "pencil", null, { strokeWidth: 1, stroke: ink });
        // The place runs round the top of the ring, along a curve whose id the surface mints, and the
        // date across the middle inside the smaller ring. Both are stamped in the largest hand their
        // own space holds: a long town crowds its letters and takes a smaller hand, as a real
        // postmark's does, rather than running past the ring and under the stamp beside it.
        const place = String(p.place).toUpperCase().slice(0, 14),
            date = String(p.date).toUpperCase(),
            tr = r * 0.8,
            spacing = place.length > 8 ? 0.04 : 0.14;
        letter(c, {
            x: cx,
            y: cy,
            s: place,
            face: "mono",
            weight: 600,
            size: fitted(place.length, Math.PI * tr, spacing, 9.5, 7.5),
            spacing,
            fill: ink,
            anchor: "middle",
            along: { d: `M${cx - tr} ${cy}A${tr} ${tr} 0 0 1 ${cx + tr} ${cy}`, offset: 50 },
        });
        letter(c, {
            x: cx,
            y: cy + 4.5,
            s: date,
            face: "mono",
            weight: 700,
            size: fitted(date.length, inner, 0.06, 10.5, 7.5),
            spacing: 0.06,
            fill: ink,
            anchor: "middle",
        });
        for (let k = 0; k < Math.max(0, Math.min(5, p.waves)); k++) {
            const y = cy - 0.9 * U + k * ((1.8 * U) / Math.max(1, p.waves - 1));
            const pts: [number, number][] = [];
            for (let x = cx + r + 0.3 * U; x <= 7.8 * U; x += 0.25 * U)
                pts.push([x, y + Math.sin((x / U) * 2.4) * 0.16 * U]);
            pen.curve(g, pts, "pencil", { strokeWidth: 1.2, stroke: ink });
        }
        const a: RawAnchors = { ring: [cx, cy, "up"] };
        return a;
    },
    describe: (p) =>
        `A round postmark in grey ink with a place name round the top of its ring, the date across the middle${p.waves > 0 ? " and wavy lines running off to one side" : ""}.`,
});
