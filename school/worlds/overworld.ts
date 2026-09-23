// The map of every world: the whole school on one sheet of squared paper, each world a place in a
// country (geography.ts) joined to the next by the way the story travels there (a path, a road,
// rails, a river, the sea). It is the top of the journal's zoom: close in a child reads a day, a step
// out the days are pages, further out the world they are in and its neighbours, and a grown-up can
// step out again to the whole country.
//
// Pure, like roll.ts: the same run always lays out the same way, which is what lets a test walk the
// arrow keys across it and a screen reader get the same journey as a list.
import {
    at,
    inside,
    type Pt,
    type Rect,
    type RoadKind,
    type MapNode,
    type MapRoad,
    type MapSide,
    type Overworld,
} from "../../engine/space";
import {
    ALTS,
    LANDS,
    LAND_AT,
    routeOf,
    SEA_SIDES,
    SHEET,
    SHEET_FIVE,
    SLOTS,
    SPURS,
    sitesFor,
    slotOf,
    spotsOn,
    type Footing,
} from "./geography";
import { Trail } from "./roll";
import { DEFAULT_YEARS, outsideYear, siteOf, type Side } from "./worlds";

/**
 * A world's picture on the map, in world units. It came down from 1,500 by 980, when the country
 * became four lands: a land is what a child's map holds edge to edge, so its places stand closer
 * than the one country's did, and a smaller picture is what makes room for them. At the zoom a
 * child's map opens a land at, a place is still about a hundred pixels to tap. */
const MAP = { vw: 1100, vh: 720 };

/**
 * How a world stands in a term: a world made to be chosen instead of a term's own stands beside the
 * term's place, a place a track brings a child to stands at its own site, and any other world stands
 * in the place of the term it is in, whichever world it is.
 */
const footingOf = (world: string): Footing => {
    const kind = siteOf(world)?.kind;
    return kind === "choice" ? "beside" : kind === "track" ? "own" : "in";
};

/** What kind of country a place asks for, for the spot its land keeps. */
const terrainOfPlace = (id: string): string => {
    const s = siteOf(id);
    return s && s.kind !== "term" ? s.land.terrain : "grass";
};

/** Term and alternative sites follow their slots; subject sites are shared across grades. */
export function spotsFor(sides: readonly Side[]): (Pt | undefined)[] {
    const out: (Pt | undefined)[] = sides.map(() => undefined);
    const byLand = new Map<number, { id: string; terrain: string; k: number }[]>();
    sides.forEach((side, k) => {
        const site = siteOf(side.world);
        if (site?.kind === "term") {
            out[k] = SLOTS[slotOf(site.grade, site.term)];
            return;
        }
        if (site?.kind === "choice") {
            const first = site.terms[0];
            out[k] = first ? ALTS[slotOf(first.grade, first.term)] : undefined;
            return;
        }
        const list = byLand.get(side.grade) ?? [];
        list.push({ id: side.world, terrain: terrainOfPlace(side.world), k });
        byLand.set(side.grade, list);
    });
    for (const [g, places] of byLand) {
        const at = spotsOn(g, places);
        for (const p of places) out[p.k] = at[p.id];
    }
    return out;
}

/** A world of the run that stands at a place of its own rather than in its term's: on its own land's spot. */
function ownSpotOf(r: { grade: number; world: string }): Pt | undefined {
    const s = siteOf(r.world);
    if (s?.kind === "term") return SLOTS[slotOf(s.grade, s.term)];
    if (s?.kind === "choice")
        return s.terms[0] ? ALTS[slotOf(r.grade, s.terms[0].term)] : undefined;
    return spotsOn(r.grade, [{ id: r.world, terrain: terrainOfPlace(r.world) }])[r.world];
}

/**
 * Lay the run out on the country in geography.ts: each world in the place of the term it is in, and
 * between each term's place and the next the way the story travels, through the points the geography
 * gives that pair of terms; and each place off the run on its own year's land, its way leaving from a
 * world of that year. The country is the same on a phone, where the camera shows less of it.
 */
export function layoutMap(
    run: { grade: number; term: number; world: string }[],
    kindOf: (world: string) => RoadKind,
    sides: readonly Side[] = [],
): Overworld {
    const spots = spotsFor(sides);
    const sites = sitesFor(run, footingOf, ownSpotOf);
    const nodes: MapNode[] = run.map((r, i) => {
        const c = at(sites, i).at;
        return {
            i,
            grade: r.grade,
            term: r.term,
            world: r.world,
            box: { x: c.x - MAP.vw / 2, y: c.y - MAP.vh / 2, w: MAP.vw, h: MAP.vh },
            stand: { x: c.x, y: c.y + MAP.vh / 2 - 60 },
        };
    });
    const mid = (n: { box: Rect }): Pt => ({ x: n.box.x + n.box.w / 2, y: n.box.y + n.box.h / 2 });
    // out of the foot of a picture and round its side that faces the way, so no way crosses a picture
    const side = (n: { box: Rect; stand: Pt }, toward: Pt): Pt[] => {
        const c = mid(n),
            s = Math.sign(toward.x - c.x) || 1;
        return [
            { x: c.x + s * 420, y: n.stand.y + 70 },
            { x: c.x + s * (MAP.vw / 2 + 80), y: n.box.y + n.box.h * 0.72 },
        ];
    };
    const roads: MapRoad[] = [];
    for (let i = 1; i < nodes.length; i++) {
        const from = sites[i - 1]?.slot,
            to = sites[i]?.slot;
        const a = at(nodes, i - 1),
            b = at(nodes, i),
            via = (from && to ? routeOf(from, to) : null) ?? [];
        // a way into a term's place is the kind of way that place was made for (the sea to the island's), whichever world stands there
        const madeFor = to
            ? (DEFAULT_YEARS[b.grade] ?? outsideYear(b.grade))[b.term - 1]
            : undefined;
        const out = side(a, via[0] ?? mid(b)),
            inn = side(b, via.at(-1) ?? mid(a)).reverse();
        const t = through([a.stand, ...out, ...via, ...inn, b.stand]);
        roads.push({
            from: i - 1,
            to: i,
            kind: kindOf(madeFor ?? b.world),
            d: t.d,
            samples: t.samples(16),
        });
    }
    const boxAt = (c: Pt): Rect => ({
        x: c.x - MAP.vw / 2,
        y: c.y - MAP.vh / 2,
        w: MAP.vw,
        h: MAP.vh,
    });
    const placed = sides.flatMap((s, k) => {
        const c = spots[k];
        return c && nodes.length
            ? [{ side: s, box: boxAt(c), stand: { x: c.x, y: c.y + MAP.vh / 2 - 60 } }]
            : [];
    });
    // where a term's world stands when nobody has chosen another for it, so a family's choice never
    // moves which world a place's way leaves from
    const termAt = (n: MapNode): Pt => SLOTS[slotOf(n.grade, n.term)] ?? mid(n);
    const nearestTo = (q: Pt, ns: MapNode[]): MapNode | undefined =>
        ns.reduce<MapNode | undefined>(
            (a, b) =>
                !a ||
                Math.hypot(termAt(b).x - q.x, termAt(b).y - q.y) <
                    Math.hypot(termAt(a).x - q.x, termAt(a).y - q.y)
                    ? b
                    : a,
            undefined,
        );
    const offRun: MapSide[] = [];
    for (const [k, { side: s, box, stand }] of placed.entries()) {
        const i = nodes.length + k,
            kind = kindOf(s.world),
            site = siteOf(s.world);
        const term = site?.kind === "choice" ? site.terms[0] : undefined;
        const beside = term
            ? nodes.find((x) => x.grade === term.grade && x.term === term.term)
            : undefined;
        // a place of a year leaves from a world of that year: the nearest whose term's place stands on
        // its land, or the nearest of any of them for a way over the water or through the air
        const land = LAND_AT[s.grade];
        const onLand = (n: MapNode) => {
            const q = termAt(n);
            return (
                !land ||
                (q.x > land.x && q.x < land.x + land.w && q.y > land.y && q.y < land.y + land.h)
            );
        };
        const ofYear =
            site?.kind === "track"
                ? nodes
                : nodes.filter(
                      (n) => n.grade === s.grade && (kind === "sea" || kind === "air" || onLand(n)),
                  );
        const near = site?.land.near ?? [];
        const inTermOf = (n: string) => {
            const t = siteOf(n);
            return t?.kind === "term"
                ? nodes.find((x) => x.grade === t.grade && x.term === t.term)
                : undefined;
        };
        const host =
            beside ??
            nearestTo(mid({ box }), ofYear) ??
            near.map((n) => nodes.find((x) => x.world === n)).find((x) => x !== undefined) ??
            near.map(inTermOf).find((x) => x !== undefined) ??
            nearestTo(mid({ box }), nodes);
        if (!host) continue;
        const via = SPURS[s.world] ?? [];
        const trail = (through_: Pt[]): Trail =>
            through([
                host.stand,
                ...side(host, through_[0] ?? mid({ box })),
                ...through_,
                ...side({ box, stand }, through_.at(-1) ?? mid(host)).reverse(),
                stand,
            ]);
        let t = trail(via);
        // A way to a place crosses no other place's drawings: where a straight one would, it is bent
        // round the side that clears, which is what SPURS used to be written out by hand for.
        if (!via.length) {
            // every other place's drawings: not the one the way leaves, nor the one it arrives at
            const drawn = [
                ...nodes.filter((n) => n.i !== host.i).map((n) => n.box),
                ...placed.filter((_, j) => j !== k).map((n) => n.box),
            ];
            const hits = (path: Trail) =>
                path
                    .samples(16)
                    .some((q) =>
                        drawn.some(
                            (r) =>
                                q.x > r.x - 700 &&
                                q.x < r.x + r.w + 700 &&
                                q.y > r.y - 700 &&
                                q.y < r.y + r.h + 700,
                        ),
                    );
            if (hits(t)) {
                const a = host.stand,
                    b = stand;
                const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const nx = -(b.y - a.y) / len,
                    ny = (b.x - a.x) / len;
                let done = false;
                for (const off of [
                    1400, -1400, 2000, -2000, 2600, -2600, 3200, -3200, 3800, -3800, 4400, -4400,
                ]) {
                    for (const f of [0.5, 0.35, 0.65, 0.25, 0.75]) {
                        const bx = a.x + (b.x - a.x) * f,
                            by = a.y + (b.y - a.y) * f;
                        const bent = trail([{ x: bx + nx * off, y: by + ny * off }]);
                        if (hits(bent)) continue;
                        t = bent;
                        done = true;
                        break;
                    }
                    if (done) break;
                }
            }
        }
        offRun.push({
            i,
            world: s.world,
            grade: s.grade,
            box,
            stand,
            host: host.i,
            road: {
                from: host.i,
                to: i,
                kind:
                    kind === "air" ||
                    kind === "sea" ||
                    LANDS.some(
                        (land) => inside(land.coast, mid(host)) && inside(land.coast, mid({ box })),
                    )
                        ? kind
                        : "sea",
                d: t.d,
                samples: t.samples(16),
            },
        });
    }
    const around = (ns: { box: Rect }[], pad: number, below: number): Rect => {
        const x0 = Math.min(...ns.map((n) => n.box.x)) - pad,
            x1 = Math.max(...ns.map((n) => n.box.x + n.box.w)) + pad;
        const y0 = Math.min(...ns.map((n) => n.box.y)) - pad,
            y1 = Math.max(...ns.map((n) => n.box.y + n.box.h)) + below;
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    };
    const grades = [...new Set(run.map((r) => r.grade))].sort((x, y) => x - y);
    const bands = grades.map((g) => ({
        grade: g,
        rect: around(
            nodes.filter((n) => n.grade === g),
            420,
            700,
        ),
    }));
    // the country is the four lands and their sea; a fifth year adds its own sheet above them
    const sheets = grades.some((g) => g >= 5) ? [SHEET, SHEET_FIVE] : [SHEET];
    if (!grades.some((g) => g >= 5) && offRun.some((s) => s.stand.y < SHEET.y))
        sheets.push(SHEET_FIVE);
    if (nodes.length) sheets.push(around([...nodes, ...offRun], 1400, 1800));
    const x0 = Math.min(...sheets.map((r) => r.x)),
        y0 = Math.min(...sheets.map((r) => r.y));
    const x1 = Math.max(...sheets.map((r) => r.x + r.w)),
        y1 = Math.max(...sheets.map((r) => r.y + r.h));
    const core = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    const bounds = {
        x: core.x - SEA_SIDES,
        y: core.y - SEA_SIDES,
        w: core.w + 2 * SEA_SIDES,
        h: core.h + 2 * SEA_SIDES,
    };
    return { nodes, roads, sides: offRun, bands, bounds, core };
}

/**
 * The part of the whole country round a child, for a map of every land that looks at one child: the
 * site's sample child (a child's own map is their land, `ownLand`). The world they are in and the one
 * before it, with the country round them, and far enough towards the next world that its edge is just
 * in view; `edge` is the furthest world their map draws (terrain.ts), and `also` anything else to take in.
 */
export function regionOf(map: Overworld, here: number, edge = here + 1, also: Pt[] = []): Rect {
    const a = map.nodes[Math.max(0, here - 1)],
        b = map.nodes[here] ?? a;
    if (!a || !b) return map.bounds;
    const pts: Pt[] = [...also];
    for (const n of [a, b])
        pts.push(
            { x: n.box.x - 450, y: n.box.y - 520 },
            { x: n.box.x + n.box.w + 450, y: n.box.y + n.box.h + 760 },
        );
    const next = map.nodes[here + 1];
    if (next && here + 1 <= edge) {
        // the near side of the next world's picture: most of the way from this world's middle to its own
        const cx = b.box.x + b.box.w / 2,
            cy = b.box.y + b.box.h / 2,
            nx = next.box.x + next.box.w / 2,
            ny = next.box.y + next.box.h / 2;
        pts.push({ x: cx + (nx - cx) * 0.78, y: cy + (ny - cy) * 0.78 });
    }
    const x0 = Math.min(...pts.map((q) => q.x)),
        y0 = Math.min(...pts.map((q) => q.y));
    const x1 = Math.max(...pts.map((q) => q.x)),
        y1 = Math.max(...pts.map((q) => q.y));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * A child's map is their own land, edge to edge, with the sea round it. It opens on the land's
 * rectangle (`frame`), and pans as far as the land and every place of its year reach, the isles in
 * its water and the island the fourth year sails to among them, with a margin of sea round them
 * (`region`). Another year's land and places are not on it. Null for a year with no land. */
export function ownLand(map: Overworld, grade: number): { frame: Rect; region: Rect } | null {
    const land = LAND_AT[grade];
    if (!land) return null;
    // a place's drawings stand out past its box, and its name is lettered under it
    const boxes = [...map.nodes, ...map.sides]
        .filter((n) => n.grade === grade)
        .map((n) => ({ x: n.box.x - 700, y: n.box.y - 700, w: n.box.w + 1400, h: n.box.h + 1400 }));
    const all = [land, ...boxes];
    const x0 = Math.min(...all.map((r) => r.x)) - SEA_ROUND,
        y0 = Math.min(...all.map((r) => r.y)) - SEA_ROUND;
    const x1 = Math.max(...all.map((r) => r.x + r.w)) + SEA_ROUND,
        y1 = Math.max(...all.map((r) => r.y + r.h)) + SEA_ROUND;
    return { frame: land, region: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

/** The sea a child's map keeps round their land and its places, in world units. */
const SEA_ROUND = 1500;

/** A smooth way through points (Catmull-Rom, as cubic curves), so a road bends where the land does. */
function through(pts: Pt[]): Trail {
    const t = new Trail(),
        n = pts.length;
    const first = at(pts, 0);
    t.move(first.x, first.y);
    for (let i = 0; i < n - 1; i++) {
        const p0 = at(pts, Math.max(0, i - 1)),
            p1 = at(pts, i),
            p2 = at(pts, i + 1),
            p3 = at(pts, Math.min(n - 1, i + 2));
        t.curve(
            p1.x + (p2.x - p0.x) / 6,
            p1.y + (p2.y - p0.y) / 6,
            p2.x - (p3.x - p1.x) / 6,
            p2.y - (p3.y - p1.y) / 6,
            p2.x,
            p2.y,
        );
    }
    return t;
}
