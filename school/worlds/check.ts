// What stops a world from making a question harder to read, and what lets a sky be dark.
//
// A question sits on white squared paper in full colour, and no world can reach it: the sheet is
// drawn with the paper tokens whatever world it is in. What a world can still do wrong is around the
// sheet. It can wash the margins too strongly, bring in a colour the palette was never tuned for,
// crowd the paper with drawings, set its labels on a ground they cannot be read against, move
// something in the corner of a child's eye, or greet a five year old with a sentence they cannot
// read. Each of those is a rule below, and every world, and every world as a family changed it, has
// to pass all of them before it is drawn. The rules are data and arithmetic, so the test runs them
// rather than a person looking.
import { MARKERS, rgb, washed, type Marker } from "../../engine/paper";
import {
    at,
    LIMITS,
    SKIES,
    SKY_OPACITY,
    washOf,
    type SkyTone,
    type Weather,
} from "../../engine/space";
import { artById, GUIDE_IDS, type Role } from "./art";
import type { Applied, World } from "./types";

/**
 * Where a world's name can sit in its sky, as a share of the sky's height from the top: the name's
 * top and its foot at the largest it is drawn, at either width, with room to spare. The layout test
 * holds the name to this band, and the rule above holds the ink to every colour inside it.
 */
export const NAME_BAND: [number, number] = [0.15, 0.62];

/** The colour a child sees a share of the way down a deep sky: the gradient there, over white paper. */
export function skyAt(tone: SkyTone, f: number): [number, number, number] {
    const stops = SKIES[tone].stops;
    let a = at(stops, 0),
        b = at(stops, stops.length - 1);
    for (let i = 1; i < stops.length; i++)
        if (f <= at(stops, i)[0]) {
            a = at(stops, i - 1);
            b = at(stops, i);
            break;
        }
    const u = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (f - a[0]) / (b[0] - a[0])));
    const ca = rgb(a[1]),
        cb = rgb(b[1]);
    const mix = (k: 0 | 1 | 2) =>
        Math.round(255 + (ca[k] + (cb[k] - ca[k]) * u - 255) * SKY_OPACITY);
    return [mix(0), mix(1), mix(2)];
}

/**
 * The paper set from base.css, which is the only set a world may use. It is repeated here so the rule
 * can be computed without a browser, and the test reads base.css to prove the two have not drifted.
 */
export const PAPER: Record<Marker | "ink" | "paper", string> = {
    paper: "#FFFFFF",
    ink: "#2B2F37",
    sky: "#8CC7EF",
    mint: "#93D5B3",
    berry: "#F39CBF",
    tang: "#F7AA57",
    glow: "#FFD64A",
};

export const WEATHER: Weather[] = [
    "clear",
    "cloudy",
    "breezy",
    "rain",
    "snow",
    "starry",
    "mist",
    "aurora",
    "rays",
    "drips",
    "dew",
];
const WHEN = /^(art|skill|subject):[a-z0-9.-]+$/;

const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: [number, number, number]) =>
    0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** WCAG contrast ratio between two colours. */
export function contrast(a: [number, number, number], b: [number, number, number]): number {
    const la = luminance(a),
        lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function has(id: string, role: Role, where: string, out: string[]): void {
    const a = artById(id);
    if (!a) out.push(`${where}: there is no drawing "${id}" in src/world/art.ts`);
    else if (!a.roles.includes(role)) out.push(`${where}: "${id}" is not drawn as a ${role}`);
}

/** Everything wrong with a world, as sentences. An empty list is a world that may be drawn. */
export function problems(w: World | Applied): string[] {
    const out: string[] = [];
    if (!/^[a-z][a-z-]*$/.test(w.id)) out.push(`"${w.id}" is not a plain lower-case id`);
    if (words(w.arrive) > LIMITS.arriveWords)
        out.push(
            `${w.id}: the arrival line has ${words(w.arrive)} words, and a five year old reads it; keep it to ${LIMITS.arriveWords}`,
        );
    if (!w.mood.trim() || words(w.mood) > 6)
        out.push(`${w.id}: the mood is a few words for the grown-up, not "${w.mood}"`);
    for (const [k, m] of Object.entries({
        ground: w.light.ground,
        sky: w.light.sky,
        accent: w.light.accent,
        ...(w.light.low ? { low: w.light.low } : {}),
    })) {
        if (!MARKERS.includes(m))
            out.push(
                `${w.id}: the ${k} is "${m}", which is not a marker; a world may only use the palette`,
            );
    }
    if (!(w.light.wash > 0 && w.light.wash <= 1))
        out.push(
            `${w.id}: the wash is ${w.light.wash}, and it has to be a share of the cap between 0 and 1`,
        );
    if (w.light.deep && w.indoor)
        out.push(`${w.id}: a world indoors has a wall, not a sky, and cannot take a deep one`);
    if (w.light.deep) {
        const tone = SKIES[w.light.deep];
        if (!tone) out.push(`${w.id}: there is no deep sky "${w.light.deep}"`);
        else
            for (let f = NAME_BAND[0]; f <= NAME_BAND[1] + 1e-9; f += 0.02) {
                for (const [what, ink] of [
                    ["name", tone.ink],
                    ["term", tone.soft],
                ] as const) {
                    const c = contrast(rgb(ink), skyAt(w.light.deep, f));
                    if (c < LIMITS.contrast) {
                        out.push(
                            `${w.id}: the ${what} on the ${w.light.deep} sky is ${c.toFixed(1)} to 1 ${Math.round(f * 100)}% of the way down`,
                        );
                        break;
                    }
                }
            }
    }
    for (const m of new Set([
        w.light.ground,
        ...(w.light.deep ? [] : [w.light.sky]),
        ...(w.light.low && !w.light.deep ? [w.light.low] : []),
    ])) {
        const c = contrast(washed(PAPER[m], washOf(w)), rgb(PAPER.ink));
        if (c < LIMITS.contrast)
            out.push(
                `${w.id}: ink on the ${m} wash is ${c.toFixed(1)} to 1, under ${LIMITS.contrast}`,
            );
    }
    for (const p of w.horizon.far) {
        has(p.art, "horizon", `${w.id} horizon`, out);
        if (!(p.at >= 0 && p.at <= 1) || (p.k !== undefined && !(p.k > 0 && p.k <= 3)))
            out.push(`${w.id}: "${p.art}" on the horizon is placed off the world`);
    }
    for (const p of w.horizon.sky ?? []) {
        has(p.art, "sky", `${w.id} sky`, out);
        if (!(p.at >= 0 && p.at <= 1) || (p.down !== undefined && !(p.down >= 0 && p.down <= 1)))
            out.push(`${w.id}: "${p.art}" in the sky is placed off the world`);
    }
    has(w.horizon.gate, "gate", `${w.id} gate`, out);
    for (const r of w.reaches) {
        if (!w.offers.landmarks.includes(r.art) && !w.offers.creatures.includes(r.art))
            out.push(`${w.id}: "${r.art}" reaches into a lesson but the world does not offer it`);
        if (!r.when.length || r.when.some((x) => !WHEN.test(x)))
            out.push(
                `${w.id}: "${r.art}" reaches into lessons named as ${r.when.join(", ")}, which is not art:, skill: or subject:`,
            );
        if (words(r.says) > LIMITS.arriveWords)
            out.push(
                `${w.id}: what "${r.art}" says has ${words(r.says)} words, and a child reads it; keep it to ${LIMITS.arriveWords}`,
            );
    }
    if (w.landmarks.length > LIMITS.landmarks)
        out.push(
            `${w.id}: ${w.landmarks.length} landmarks crowd the margins; ${LIMITS.landmarks} at most`,
        );
    if (w.creatures.length > LIMITS.creatures)
        out.push(
            `${w.id}: ${w.creatures.length} creatures crowd the margins; ${LIMITS.creatures} at most`,
        );
    for (const id of w.landmarks) {
        has(id, "landmark", `${w.id} landmark`, out);
        if (!w.offers.landmarks.includes(id))
            out.push(`${w.id}: "${id}" stands in the world but is not one it offers`);
    }
    for (const id of w.creatures) {
        has(id, "creature", `${w.id} creature`, out);
        if (!w.offers.creatures.includes(id))
            out.push(`${w.id}: "${id}" lives in the world but is not one it offers`);
    }
    if (w.stamp !== undefined && !w.offers.creatures.includes(w.stamp))
        out.push(`${w.id}: its stamp carries "${w.stamp}", which is not a creature it offers`);
    for (const id of w.offers.landmarks) has(id, "landmark", `${w.id} offers`, out);
    for (const id of w.offers.creatures) has(id, "creature", `${w.id} offers`, out);
    for (const g of w.offers.grounds)
        if (!MARKERS.includes(g))
            out.push(`${w.id}: offers a ground of "${g}", which is not a marker`);
    if (!w.offers.grounds.includes(w.light.ground))
        out.push(`${w.id}: its own ground "${w.light.ground}" is not one it offers`);
    for (const g of [w.guide, ...w.offers.guides]) {
        if (!(GUIDE_IDS as readonly string[]).includes(g))
            out.push(`${w.id}: there is no guide "${g}"`);
    }
    if (!w.offers.guides.includes(w.guide))
        out.push(`${w.id}: its own guide "${w.guide}" is not one it offers`);
    for (const x of [w.weather, ...w.offers.weather])
        if (!WEATHER.includes(x)) out.push(`${w.id}: there is no weather "${x}"`);
    if (!w.offers.weather.includes(w.weather))
        out.push(`${w.id}: its own weather "${w.weather}" is not one it offers`);
    if (!w.seasons.length) out.push(`${w.id}: a world has at least one season`);
    // an aurora is light in a dark sky; on a day sky it would only be a green wash over the name
    if (w.offers.weather.includes("aurora") && !w.light.deep)
        out.push(`${w.id}: offers an aurora without a deep sky to hang it in`);
    if (w.indoor && (w.offers.weather.includes("mist") || w.offers.weather.includes("aurora")))
        out.push(`${w.id}: mist and an aurora are outdoors`);
    const s = w.site;
    if (s) {
        const ok = (g: number, t: number) =>
            Number.isInteger(g) && g >= 0 && g <= 12 && Number.isInteger(t) && t >= 1 && t <= 3;
        if (s.kind === "term" && !ok(s.grade, s.term))
            out.push(`${w.id}: stands in grade ${s.grade} term ${s.term}, which is not a term`);
        if (s.kind === "choice" && (!s.terms.length || s.terms.some((x) => !ok(x.grade, x.term))))
            out.push(`${w.id}: a choice names the terms it may stand in`);
        if (
            s.kind === "track" &&
            !s.hosts.subjects.length &&
            !s.hosts.lessons?.length &&
            !s.hosts.needs
        )
            out.push(
                `${w.id}: a track place names the lessons that walk its path, or what it waits for`,
            );
        if (!s.land.near.length || !s.land.terrain)
            out.push(`${w.id}: says what ground it needs on the map and what it stands beside`);
    }
    return out;
}
