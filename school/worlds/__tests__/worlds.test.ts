// The worlds model on a small made-up corpus: what the record makes of the map, and what each page's
// view of it may hold. The rules a child's view keeps are the ones .docs/overworld.md states: nothing
// every world is on the page, unavailable ones are closed, and nothing a viewer who looks or previews
// does is recorded.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import {
    artKey,
    inside,
    neighbour,
    reachAt,
    wet,
    type Arrow,
    type MapReach,
    type MapView,
    type WorldLimits,
} from "../../../engine/space";
import type { Progress } from "../../record/record";
import { apply, defaultChoice } from "../choice";
import { corpusFrom, topicsIn } from "../lessons";
import { layoutMap, ownLand } from "../overworld";
import { LAND_AT, LANDS, REGIONS, SAILS, SEA_SIDES, spotsOn } from "../geography";
import { journey, type TrackPlan, type YearRecord } from "../rewards";
import { daysOf } from "../roll";
import { edgeOf, terrainOf } from "../terrain";
import type { Applied } from "../types";
import {
    BACKDROP_MAP,
    CHILD_MAP,
    childWorld,
    countryViewOf,
    GROWN_MAP,
    GROWN_WORLD,
    journalOf,
    mapViewOf,
    recordsAll,
    SITE_MAP,
    siteWorld,
    worldViewOf,
} from "../view";
import { schoolRun, worldById, yearOf } from "../worlds";
import { refsOf } from "../art";

const STARTED = "2026-08-31";

/** A lesson's facts as the pack's index gives them, with two drawings and two skills in turn. */
function factOf(
    id: string,
    file: string,
    grade: number,
    unit: number,
    subject: string,
): LessonFacts {
    return {
        id,
        source: `lessons/${file}-${id}.lumi`,
        title: subject === "maths" ? `Lesson ${unit} of year ${grade}` : `${subject} ${unit}`,
        goal: null,
        grade,
        unit,
        subject,
        format: "teach",
        art: unit % 2 ? ["coins"] : ["tree"],
        file: `lessons/${id}-0000000000.json`,
        levels: { medium: { hash: "0000000000" } },
        first: null,
        skills: unit % 2 ? ["counting.in-twos"] : ["addition.making-ten"],
    };
}

const two = (n: number): string => String(n).padStart(2, "0");

/** Nine units a grade, one lesson each, so a year has three terms of three days. */
const lessonsOf = (grade: number): LessonFacts[] =>
    Array.from({ length: 9 }, (_, i) =>
        factOf(`g${grade}-l${i + 1}`, `g${grade}-${two(i + 1)}`, grade, i + 1, "maths"),
    );

/** Six lessons of another track in a grade, which the year hangs off the maths path. */
const trackOf = (subject: string, grade: number): LessonFacts[] =>
    Array.from({ length: 6 }, (_, i) =>
        factOf(`${subject}-${grade}-${i + 1}`, `${subject}-${two(i + 1)}`, grade, i + 1, subject),
    );

const CORPUS = corpusFrom([...lessonsOf(1), ...lessonsOf(2)], STARTED);
const TOPICS = topicsIn(CORPUS);
const CHOICE = defaultChoice("Rosie");
const worldOf = (id: string): Applied => apply(worldById(id), undefined, false).world;
const size = () => ({ w: 400, h: 400 });

/** A year with its first `n` lessons finished a day apart, and the child on the next unless `own` is false. */
function progressOf(grade: number, n: number, own = true): Progress {
    const year = CORPUS.year(grade, "Rosie");
    const done: Progress["done"] = {};
    year.lessons.slice(0, n).forEach((l, i) => {
        done[l.id] = {
            stars: 3,
            on: `2026-09-${String(i + 1).padStart(2, "0")}`,
            minutes: 10,
            right: 1,
        };
    });
    return { done, current: own ? (year.lessons[n]?.id ?? "") : "", week: 1, unlocked: [] };
}

/** Every year's record for a child `n` lessons into a grade: the years before finished, the years after untouched. */
const records = (grade: number, n: number): YearRecord[] =>
    CORPUS.grades.map((g) => ({
        grade: g,
        year: CORPUS.year(g, "Rosie"),
        progress: progressOf(g, g < grade ? 9 : g === grade ? n : 0, g === grade),
        worlds: yearOf(g),
        tracks: [],
    }));

const childMap = (grade: number, n: number): MapView =>
    mapViewOf({
        records: records(grade, n),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Rosie", since: STARTED },
        limits: CHILD_MAP,
    });

test("the record makes the map: one place the child is, a stamp and a moment only where work was done, and more work only adds", () => {
    const trip = journey(records(1, 4), worldOf, TOPICS);
    assert.equal(trip.places.length, 6);
    assert.deepEqual(
        trip.places.map((p) => p.state),
        ["done", "here", "ahead", "ahead", "ahead", "ahead"],
    );
    assert.equal(trip.here, 1);
    const meadow = trip.places[0];
    assert.equal(meadow?.stamp, "2026-09-01");
    assert.equal(meadow?.moment, "2026-09-03");
    assert.ok(meadow?.lit.length, "a finished lesson lights a landmark");
    assert.deepEqual(
        trip.roads.map((r) => !!r.open),
        [true, false, false, false, false],
    );
    const later = journey(records(1, 7), worldOf, TOPICS);
    trip.places.forEach((p, i) => {
        const q = later.places[i];
        if (p.stamp) assert.equal(q?.stamp, p.stamp);
        if (p.moment) assert.equal(q?.moment, p.moment);
        for (const x of p.lit) assert.ok(q?.lit.some((y) => y.art === x.art && y.on === x.on));
    });
});

test("the whole run lays out once, every world on land or at sea as it should be, and the arrow keys walk it", () => {
    const run = schoolRun();
    const map = layoutMap(run, (id) => worldOf(id).chapter.by);
    assert.equal(map.nodes.length, 12);
    assert.equal(map.roads.length, 11);
    const terrain = terrainOf(map, worldOf);
    for (const n of map.nodes) {
        const c = { x: n.box.x + n.box.w / 2, y: n.box.y + n.box.h / 2 };
        const atSea = worldOf(n.world).ground === "sea" || worldOf(n.world).ground === "reef";
        assert.equal(
            wet(terrain, c),
            atSea,
            `${n.world} stands ${atSea ? "on land" : "in the sea"}`,
        );
    }
    const opposite: Record<Arrow, Arrow> = {
        ArrowLeft: "ArrowRight",
        ArrowRight: "ArrowLeft",
        ArrowUp: "ArrowDown",
        ArrowDown: "ArrowUp",
    };
    const arrows = Object.keys(opposite) as Arrow[];
    for (let i = 0; i + 1 < map.nodes.length; i++) {
        const on = arrows.find((k) => neighbour(map, i, k) === i + 1);
        assert.ok(on, `no arrow goes on from ${map.nodes[i]?.world}`);
        assert.equal(neighbour(map, i + 1, opposite[on]), i);
        for (const k of arrows) {
            const to = neighbour(map, i, k);
            if (to !== null) assert.ok(Math.abs(to - i) === 1, `an arrow from ${i} skips to ${to}`);
        }
    }
});

test("subject worlds have permanent, spacious sites across the shared regions", () => {
    const sites = ["painters-hut", "reed-marsh", "crystal-caves", "dune-oasis", "treetops"];
    for (const id of sites) {
        const first = spotsOn(1, [{ id, terrain: "" }])[id];
        assert.ok(first);
        for (const grade of [2, 3, 4])
            assert.deepEqual(spotsOn(grade, [{ id, terrain: "" }])[id], first);
        assert.ok(
            LANDS.some((land) => inside(land.coast, first)),
            `${id} stands on land`,
        );
    }
    assert.equal(REGIONS.length, 8);
});

test("a child's map holds every world of every year: their own year's dimmed and closed until each opens, the next distinct, and another year's present and closed with no way in", () => {
    // Every world of the child's own year is drawn, dimmed and closed until it opens. Another
    // year's worlds stand on their own lands in the same closed state, to be seen and not entered.
    const v = childMap(1, 4);
    assert.equal(v.here, 1);
    assert.deepEqual(
        v.places.map((p) => p.state),
        ["done", "here", "next", "ahead", "ahead", "ahead"],
    );
    for (const p of v.places) {
        if (p.state === "ahead")
            assert.equal(p.open, false, `place ${p.i} past the edge has a button`);
        assert.ok(p.shown, `place ${p.i} is not on the child's map`);
        if (p.state === "next") assert.equal(p.open, false, "the next world can be travelled to");
    }
    for (const p of v.places.filter((x) => (v.layout.nodes[x.i]?.grade ?? 1) !== 1)) {
        assert.equal(p.state, "ahead", `another year's place ${p.i} is not closed`);
        assert.equal(p.open, false, `another year's place ${p.i} has a way in`);
        assert.ok(
            p.shown?.label.includes("Not reached yet"),
            "another year's world says it is not reached",
        );
    }
    const next = v.places[2];
    assert.equal(next?.shown?.name, "The railway");
    assert.ok(next?.shown?.label.includes("Not reached yet"));
    assert.equal(next?.shown?.notes.length, 0, "a child reads no notes under a world");
    // the way on out of the year is the sail to the next land; the ways onto and across another
    // year's land are not drawn, since there is no way in
    assert.deepEqual(
        v.ways.map((w) => w.state),
        ["walked", "pencil", "hidden", "hidden", "hidden"],
    );
    assert.equal(
        v.reach.known,
        null,
        "a child's map draws the country beneath every visible place",
    );
    assert.equal(v.reach.edge, edgeOf(journey(records(1, 4), worldOf, TOPICS), 6));
    assert.deepEqual(
        Object.keys(v.pictures).sort(),
        v.places.flatMap((p) => (p.shown ? [p.shown.world] : [])).sort(),
        "every place the map holds brings its picture and art, dimmed until it opens",
    );
    for (const n of v.layout.nodes) assert.notEqual(n.world, "", `node ${n.i} names its world`);
    assert.equal(v.layout.nodes[1]?.world, "harbour");
    assert.deepEqual(v.title, { child: "Rosie", since: STARTED });
    assert.equal(v.grown, false);
    assert.ok(
        v.frame.w < v.layout.bounds.w,
        "a child's map opens on their own land and holds the whole sea",
    );
    const withHut = mapViewOf({
        records: records(1, 4),
        sides: [{ world: "painters-hut", grade: 1 }],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Rosie", since: STARTED },
        limits: CHILD_MAP,
    });
    const hut = withHut.places.find((p) => p.shown?.world === "painters-hut");
    assert.equal(hut?.state, "ahead");
    assert.equal(hut?.open, false, "an unavailable subject place remains closed");
    assert.equal(hut?.shown?.name, "The painter's hut");
});

test("a child's map opens on the land of the year they stand in and holds the whole sea: the other years' lands are drawn, and earned colour remains across the country", () => {
    for (const [grade, n] of [
        [1, 4],
        [2, 2],
    ] as const) {
        const v = childMap(grade, n);
        const land = LAND_AT[grade];
        assert.ok(land);
        assert.deepEqual(v.frame, land, `year ${grade}: the map does not open on the land`);
        const R = v.layout.bounds;
        const inR = (q: { x: number; y: number }) =>
            q.x >= R.x && q.x <= R.x + R.w && q.y >= R.y && q.y <= R.y + R.h;
        for (const q of [
            { x: land.x, y: land.y },
            { x: land.x + land.w, y: land.y + land.h },
        ])
            assert.ok(inR(q), `year ${grade}: the land is not all within reach`);
        const mid = (b: { x: number; y: number; w: number; h: number }) => ({
            x: b.x + b.w / 2,
            y: b.y + b.h / 2,
        });
        for (const p of v.places) {
            const ofYear = v.layout.nodes[p.i]?.grade === grade;
            if (ofYear) assert.ok(inR(mid(p.box)), `year ${grade}: place ${p.i} is out of reach`);
        }
        // every land is drawn, another year's as well as this one's
        const theirs = v.layout.nodes.filter((x) => x.grade !== grade).map((x) => mid(x.box));
        assert.ok(theirs.length > 0, `year ${grade}: no other year to draw`);
        for (const q of theirs)
            assert.ok(
                v.country.lands.some((ring) => inside(ring, q)),
                `year ${grade}: another year's land is not drawn`,
            );
        assert.ok(
            v.country.lands.some((ring) =>
                v.layout.nodes.some((x) => x.grade === grade && inside(ring, mid(x.box))),
            ),
            `year ${grade}: the land itself is not drawn`,
        );
        assert.ok(v.reach.whole.every((ring) => v.country.lands.includes(ring)));
        // the map's own title, key and compass are this land's, in its own sea
        const own = ownLand(v.layout, grade);
        assert.ok(own);
        const inOwn = (q: { x: number; y: number }) =>
            q.x >= own.region.x &&
            q.x <= own.region.x + own.region.w &&
            q.y >= own.region.y &&
            q.y <= own.region.y + own.region.h;
        for (const at of [v.land.title, v.land.key, v.land.compass]) {
            assert.ok(inOwn(at), `year ${grade}: the furniture is off the child's land`);
            assert.ok(wet(v.country, at), `year ${grade}: the furniture stands on land`);
        }
        for (const x of v.sights)
            assert.ok(inOwn(x.at), `year ${grade}: ${x.name} is off the child's land`);
        for (const w of v.ways)
            if (w.state !== "hidden")
                for (const i of [w.from, w.to])
                    assert.equal(v.layout.nodes[i]?.grade ?? grade, grade, "a way to another land");
    }
    // a map of the whole country keeps every land
    const site = mapViewOf({
        records: records(1, 4),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Sample", since: STARTED },
        limits: SITE_MAP,
    });
    assert.ok(
        site.layout.nodes.every(
            (x) =>
                site.country.lands.some((r) =>
                    inside(r, { x: x.box.x + x.box.w / 2, y: x.box.y + x.box.h / 2 }),
                ) || worldOf(x.world).ground === "sea",
        ),
    );
});

test("a year ends by sailing: the jetty waits in pencil, is inked when the year is finished, and on the day the next land opens the ship comes in", () => {
    const during = childMap(1, 4);
    const jetty = SAILS[1];
    assert.ok(during.sail && jetty, "a child's land has its sail");
    assert.deepEqual(during.sail.jetty, jetty);
    assert.equal(during.sail.inked, null, "in pencil while the year goes on");
    assert.equal(during.sail.came, null, "nobody sailed to the first land");
    const way = during.sail.way;
    assert.ok(way, "a path runs down to the jetty");
    const railway = during.layout.nodes.find((n) => n.world === "railway");
    assert.ok(railway && way.from === railway.i, "from the year's last world");
    const end = way.samples.at(-1);
    assert.ok(end && Math.hypot(end.x - jetty.x, end.y - jetty.y) < 300, "and ends at the jetty");
    assert.equal(during.sail.faces, 1, "the ship faces the next land, east");
    // the year finished: the jetty, its ship and the path are inked with the day of the last moment
    const finished = childMap(1, 9);
    assert.equal(finished.sail?.inked, "2026-09-09");
    // the next land's first day: the child is on the second year's land, and the ship came in to it
    const arrived = childMap(2, 1);
    const came = arrived.sail?.came;
    assert.ok(came, "the ship comes in on the day the land opened");
    assert.equal(came.on, "2026-09-01");
    const R = arrived.layout.bounds,
        woods = arrived.layout.nodes.find((n) => n.world === "woods");
    assert.ok(woods);
    for (const q of came.path) {
        assert.ok(
            q.x >= R.x && q.x <= R.x + R.w && q.y >= R.y && q.y <= R.y + R.h,
            "off the land's map",
        );
        assert.ok(wet(arrived.country, q), "the ship sails over land");
    }
    const last = came.path.at(-1);
    assert.ok(
        last && Math.hypot(last.x - woods.stand.x, last.y - woods.stand.y) < 3000,
        "and lands by the woods",
    );
    // a day later it is not played again
    assert.equal(childMap(2, 2).sail?.came?.on, "2026-09-01");
    // the way between two years is said as the sail it is
    const t = terrainOf(
        layoutMap(schoolRun(), (id) => worldOf(id).chapter.by),
        worldOf,
    );
    assert.equal(t.crossings[2], "across the sea");
    assert.equal(t.back[2], "back across the sea");
});

test("a child with nothing done stands in their own year, and one between years where they left off", () => {
    // every year's record, with nobody's work in any of them
    const empty = (): YearRecord[] =>
        CORPUS.grades.map((g) => ({
            grade: g,
            year: CORPUS.year(g, "Ivy"),
            progress: { done: {}, current: "", week: 1, unlocked: [] },
            worlds: yearOf(g),
            tracks: [],
        }));
    const first = (grade: number) => {
        const trip = journey(empty(), worldOf, TOPICS, [], grade);
        return trip.places[trip.here];
    };
    const own = first(2);
    assert.equal(own?.grade, 2, "a child with nothing done stands in their own year");
    assert.equal(own?.term, 1, "at its first term");
    assert.equal(first(1)?.grade, 1, "a child of the first year is where they always were");
    // told no grade, the map with nobody on it still opens on the school's first world
    const nobody = journey(empty(), worldOf, TOPICS);
    assert.equal(nobody.here, 0);
    // and a child between years keeps standing at the last place they reached
    const between = journey(records(1, 9), worldOf, TOPICS, [], 2);
    const at = between.places[between.here];
    assert.equal(at?.grade, 1, "a child who has finished a year stands where they left off");
    assert.ok(at?.state !== "ahead");
});

test("the world a child stands in is always one they can go into, and is never the one a note says is shut", () => {
    const nothing = (grade: number): MapView =>
        mapViewOf({
            records: CORPUS.grades.map((g) => ({
                grade: g,
                year: CORPUS.year(g, "Ivy"),
                progress: { done: {}, current: "", week: 1, unlocked: [] },
                worlds: yearOf(g),
                tracks: [],
            })),
            sides: [],
            corpus: CORPUS,
            worldOf,
            topics: TOPICS,
            size,
            grown: false,
            child: { name: "Ivy", since: STARTED },
            grade,
            limits: CHILD_MAP,
        });
    // a child with nothing done, in the first year and in a later one, and a child between years
    for (const v of [nothing(1), nothing(2), childMap(1, 9)]) {
        const here = v.here;
        assert.ok(here !== null, "a child's map has somewhere the child is");
        const p = v.places[here];
        assert.ok(p, "and a place there");
        assert.equal(p.open, true, "the world a child stands in opens to them");
        assert.notEqual(p.state, "next", "and is not the world a note calls not open yet");
        assert.notEqual(p.state, "behind");
        // no place a page would call shut is where the child is standing
        v.places.forEach((q, i) => {
            if (q.state === "next" || q.state === "behind") assert.notEqual(i, here);
        });
    }
});

test("the arrow keys walk the places a child may travel to, and leave a shut place to Tab", () => {
    // every place is drawn now, so an arrow that only asks what is drawn can answer with a place the
    // child cannot travel to and stop the keyboard walking the run: the page filters on `open`
    const v = mapViewOf({
        records: records(1, 4),
        sides: [{ world: "painters-hut", grade: 1 }],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Rosie", since: STARTED },
        limits: CHILD_MAP,
    });
    const hut = v.places.find((p) => p.shown?.world === "painters-hut");
    assert.ok(hut, "the hut is on a year 1 child's map");
    assert.equal(hut.open, false, "and has no way in yet");
    const host = v.layout.sides.find((s) => s.world === "painters-hut")?.host;
    assert.ok(host !== undefined, "the hut's way leaves from a world of the run");
    const arrows: readonly Arrow[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    const drawn = (i: number): boolean => v.places[i]?.shown !== null;
    const may = (i: number): boolean => !!v.places[i]?.open;
    assert.ok(
        arrows.some((k) => neighbour(v.layout, host, k, drawn) === hut.i),
        "drawing every place puts the shut hut in the way of an arrow",
    );
    for (const k of arrows) {
        const to = neighbour(v.layout, host, k, may);
        assert.notEqual(to, hut.i, `${k} from its host reaches a place with no way in`);
    }
    const here = v.places.findIndex((p) => p.state === "here");
    assert.ok(
        arrows.some((k) => neighbour(v.layout, here, k, may) === here - 1),
        "one press still walks back to the world behind",
    );
});

test("a place a track brings a child to opens with its first lesson, wherever its way leaves from", () => {
    // the painter's hut holds the art track, and the first year's hut has its way from a world of the
    // first year; the child stands in the first lesson of another term, in another world
    const corpus = corpusFrom(
        [1, 2, 3, 4].flatMap((g) => lessonsOf(g)).concat(trackOf("art", 1)),
        STARTED,
    );
    const topics = topicsIn(corpus);
    const art = corpus.year(1, "Rosie").lessons.find((l) => l.subject === "art");
    assert.ok(art, "the fixture gives year 1 an art lesson");
    const mapWith = (done: readonly string[], current = "g1-l1"): MapView =>
        mapViewOf({
            records: corpus.grades.map((g) => ({
                grade: g,
                year: corpus.year(g, "Rosie"),
                progress: {
                    done: Object.fromEntries(
                        (g === 1 ? done : []).map((id) => [
                            id,
                            { stars: 3, on: "2026-09-02", minutes: 10, right: 1 },
                        ]),
                    ),
                    current: g === 1 ? current : "",
                    week: 1,
                    unlocked: [],
                },
                worlds: yearOf(g),
                tracks: [],
            })),
            sides: [{ world: "painters-hut", grade: 1 }],
            corpus,
            worldOf,
            topics,
            size,
            grown: false,
            child: { name: "Rosie", since: STARTED },
            limits: CHILD_MAP,
        });
    const hutIn = (v: MapView) => v.places.find((p) => p.shown?.world === "painters-hut");
    const from = (v: MapView) => {
        const s = v.layout.sides.find((x) => x.world === "painters-hut");
        return s ? v.layout.nodes[s.host] : undefined;
    };
    // three lessons a term, so the first lesson of the second term is the fourth
    const away = from(mapWith([]))?.term === 1 ? "g1-l4" : "g1-l1";
    const shut = hutIn(mapWith([], away));
    assert.equal(shut?.state, "ahead", "before any art lesson the hut is drawn but not reached");
    assert.equal(shut?.open, false, "and has no way in");
    assert.ok(shut?.shown?.name, "and is named, dimmed, on the map");
    const v = mapWith([art.id], away);
    const hut = hutIn(v);
    assert.equal(hut?.state, "begun", "the first art lesson takes the child there");
    assert.equal(hut?.open, true, "and opens it");
    assert.equal(hut?.shown?.stamp, "2026-09-02", "and stamps it with the day");
    // Its way leaves from a world the child has not reached, and the map flies them there, since
    // travelTo only walks a spur from the world it leaves (engine/ui/overworld.tsx). In the one
    // country that world was the laboratory, in year 3; each year has its own hut now, so it is a
    // world of the hut's own year.
    const side = v.layout.sides.find((x) => x.world === "painters-hut");
    assert.ok(side, "the hut is on the map");
    assert.equal(
        v.layout.nodes[side.host]?.grade,
        1,
        "the hut's way leaves from a world of its year",
    );
    assert.notEqual(v.here, side.host, "and the child stands somewhere else");
    assert.ok(
        v.landings.some((l) => l.node === side?.i),
        "the plane may land beside it once it is open",
    );
});

test("a child's partial record keeps the rest of their year named and closed, and a later year on their map and closed", () => {
    const current = records(1, 4)[0];
    assert.ok(current);
    const v = mapViewOf({
        records: [current],
        trip: journey(
            [
                current,
                ...CORPUS.grades
                    .filter((grade) => grade > current.grade)
                    .map((grade) => ({
                        grade,
                        year: CORPUS.year(grade, "Rosie"),
                        progress: progressOf(grade, 0, false),
                        worlds: yearOf(grade),
                        tracks: [],
                    })),
            ],
            worldOf,
            TOPICS,
        ),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Rosie", since: STARTED },
        limits: CHILD_MAP,
    });
    // The rest of the child's year is named and closed, and so are the next years' worlds on their
    // own lands, drawn to be seen and not entered.
    const rest = v.places.filter((p) => p.shown?.world === "railway");
    assert.deepEqual(
        rest.map((p) => [p.shown?.name, p.state, p.open]),
        [["The railway", "next", false]],
    );
    const later = v.places.filter((p) => (v.layout.nodes[p.i]?.grade ?? 0) > 1);
    assert.ok(later.length > 0, "no later year on the map");
    for (const p of later) {
        assert.equal(p.state, "ahead", `a later year's place ${p.i} is not closed`);
        assert.equal(p.open, false, `a later year's place ${p.i} has a way in`);
        assert.ok(p.shown, `a later year's place ${p.i} is not drawn`);
    }
    assert.deepEqual(
        Object.keys(v.pictures).sort(),
        v.places.flatMap((p) => (p.shown ? [p.shown.world] : [])).sort(),
        "every world the map holds brings its picture, so it is drawn in pencil until it opens",
    );
});

test("when a term's last lesson is done the way on is inked and the child is in the next world before anything is stamped there", () => {
    const opened = childMap(1, 3);
    assert.equal(opened.ways[0]?.state, "open", "the way inks on the moment, before it is walked");
    assert.equal(
        opened.places[1]?.state,
        "here",
        "the world holding today's lesson is where the child is",
    );
    assert.equal(opened.places[1]?.shown?.stamp, null);
    assert.equal(opened.places[2]?.state, "next");
    const arrived = childMap(1, 4);
    assert.equal(arrived.ways[0]?.state, "walked");
    assert.equal(arrived.places[1]?.shown?.stamp, "2026-09-04");
    // a finished school is finished on the child's own land, the last year's; the years before it
    // are on their own lands, drawn and closed on this map
    const done = childMap(2, 9);
    const last = done.places.filter((p) => done.layout.nodes[p.i]?.grade === 2);
    assert.ok(
        last.length === 3 && last.every((p) => p.state === "done"),
        "a finished school is finished",
    );
    assert.ok(
        last.every((p) => p.open),
        "and every world of the land is open to go back into",
    );
    // A child who began in the second year stands on the second year's land, with the first year's
    // worlds on their own land behind them, drawn and closed like any other year's
    const late = mapViewOf({
        records: records(2, 2).map((r) =>
            r.grade === 1 ? { ...r, progress: progressOf(1, 0, false) } : r,
        ),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Rosie", since: STARTED },
        limits: CHILD_MAP,
    });
    assert.deepEqual(
        late.places.map((p) => p.state),
        ["ahead", "ahead", "ahead", "here", "next", "ahead"],
    );
    assert.ok(late.places.slice(0, 3).every((p) => !p.open && p.shown));
});

test("the site's map and the grown-ups' backdrop draw the whole country, and the title is the child the page passes and never a record's", () => {
    const site = mapViewOf({
        records: records(1, 4),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Sample", since: STARTED },
        limits: SITE_MAP,
    });
    assert.ok(site.places.every((p) => p.shown && p.open));
    assert.equal(site.reach.known, null);
    // the country, not the open water beside it the map may be dragged into
    assert.equal(site.frame, site.layout.core);
    assert.equal(site.layout.core.w + 2 * SEA_SIDES, site.layout.bounds.w);
    assert.equal(site.layout.core.h + 2 * SEA_SIDES, site.layout.bounds.h);
    assert.deepEqual(site.title, { child: "Sample", since: STARTED });
    const backdrop = mapViewOf({
        records: records(1, 4),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: true,
        child: null,
        limits: BACKDROP_MAP,
    });
    assert.equal(
        backdrop.title,
        null,
        "a map with no child names nobody, whatever the records say",
    );
    assert.ok(backdrop.places.every((p) => p.shown && !p.open));
    assert.ok(
        backdrop.places.every((p) => (p.shown?.notes.length ?? 0) > 0),
        "a grown-up reads notes",
    );
    assert.equal(backdrop.grown, true);
});

test("the country with nobody on it, behind a page's cards: every world of the run begun and none stamped, laid out as a grown-up's map with no notes, nothing to go into and nobody named", () => {
    const country = countryViewOf({ size, still: true });
    const grown = mapViewOf({
        records: records(1, 4),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: true,
        child: null,
        limits: BACKDROP_MAP,
    });
    assert.deepEqual(
        country.places.map((p) => p.shown?.world),
        schoolRun().map((p) => p.world),
    );
    assert.deepEqual(country.layout.bounds, grown.layout.bounds);
    assert.ok(
        country.places.every(
            (p) =>
                p.shown &&
                !p.open &&
                p.shown.stamp === null &&
                p.shown.moment === null &&
                p.shown.lit.length === 0 &&
                p.shown.notes.length === 0,
        ),
    );
    assert.ok(country.ways.every((w) => w.opened === null));
    assert.equal(country.reach.known, null);
    assert.equal(country.reach.frontier, null);
    assert.equal(country.title, null);
    assert.equal(country.here, 0);
    assert.equal(country.grown, true);
    assert.equal(country.limits, BACKDROP_MAP);
});

test("a child's limits open their sheets and record for their kid; a viewer who looks or previews records nothing and has no kid to record for", () => {
    assert.deepEqual(childWorld("kid-1"), { sheets: "open", record: true, kid: "kid-1" });
    assert.equal(CHILD_MAP.travel, "reached");
    assert.equal(CHILD_MAP.goIn, "own");
    for (const l of [siteWorld(2), GROWN_WORLD]) {
        assert.equal(l.record, false);
        assert.ok(!("kid" in l));
        assert.ok(!("preview" in childWorld("kid-1")));
    }
    type KidOf<L> = L extends { kid: infer K } ? K : never;
    const unrecordedHasNoKid: [KidOf<Extract<WorldLimits, { record: false }>>] extends [never]
        ? true
        : false = true;
    assert.equal(unrecordedHasNoKid, true);
});

test("a year's roll for a child: its days with their sheets, the next sheet closed, a standing for every drawing, and the world today is in", () => {
    const live = {
        grade: 1,
        year: CORPUS.year(1, "Rosie"),
        progress: progressOf(1, 4),
        today: "2026-09-07",
        before: [],
        tracks: [],
    };
    const j = journalOf({
        corpus: CORPUS,
        place: { kind: "year" },
        grade: 1,
        when: null,
        choice: CHOICE,
        live,
        sample: () => progressOf(1, 0),
    });
    const v = worldViewOf({
        journal: j,
        choice: CHOICE,
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        height: () => 1200,
        size,
        narrow: false,
        grown: false,
        limits: childWorld("kid-1"),
    });
    assert.equal(v.days.length, v.layout.rows.length);
    assert.deepEqual(
        v.days.map((d) => d.sheets.map((s) => s.state)),
        [["done"], ["done"], ["done"], ["done"], ["today"]],
    );
    assert.equal(v.days[0]?.sheets[0]?.title, "Lesson 1 of year 1");
    assert.equal(v.days[0]?.sheets[0]?.on, "2026-09-01");
    assert.equal(v.days[4]?.date, "2026-09-07");
    assert.equal(v.next?.state, "closed");
    assert.equal(v.next?.lesson, "g1-l6");
    assert.equal(v.standings.length, v.layout.scenery.length);
    assert.equal(v.open, "harbour");
    assert.equal(v.arrival, null);
    assert.deepEqual(Object.keys(v.pictures).sort(), ["harbour", "meadow", "railway"]);
    // what a page draws in each stretch's sky is on the view, every drawing of it with its ref
    assert.equal(v.stretches.length, v.layout.stretches.length);
    for (const s of v.stretches) {
        assert.ok(s.says.length > 0, "the guide greets at every gate");
        for (const x of s.sky) assert.ok(v.art[x.art], `${x.art} in the sky has no ref`);
    }
    for (const id of ["harbour"])
        assert.ok(
            v.stretches[v.layout.stretches.findIndex((s) => s.world === id)]?.sky.some(
                (x) => x.art === "kite" && x.weather,
            ) || worldOf(id).landmarks.includes("kite"),
            "a breezy world flies its kite in the sky or has it beside the path",
        );
    // going in from the map arrives at that term's world, with the guide's line
    const back = worldViewOf({
        journal: j,
        choice: CHOICE,
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        height: () => 1200,
        size,
        narrow: false,
        grown: false,
        arriveAt: 1,
        limits: childWorld("kid-1"),
    });
    assert.equal(back.open, "meadow");
    assert.deepEqual(back.arrival, { term: 1, says: worldById("meadow").arrive });
    assert.ok(
        v.days.some((d) => d.followers.length),
        "a creature walks behind the guide once its lesson is done",
    );
    // the day each doing happened, for the roll to play it on that day: a creature joins on the day
    // of its lesson and walks with the guide from then on, and a lit reach says the day it was lit
    for (const d of v.days) {
        for (const art of d.joined ?? []) assert.ok(d.followers.includes(art));
        const before = v.days.filter((x) => x.date < d.date).flatMap((x) => x.followers);
        for (const art of d.followers)
            assert.equal(before.includes(art) || (d.joined ?? []).includes(art), true);
    }
    assert.ok(
        v.days.some((d) => d.joined?.length),
        "the creature that joined is named on the day it did",
    );
    for (const [k, st] of v.standings.entries()) {
        const s = v.layout.scenery[k];
        if (s?.kind === "reach") assert.equal(st.on, st.lit ? v.days[s.row]?.date : undefined);
        if (s?.kind === "moment") assert.equal(st.on === undefined, !st.inked);
    }
    assert.equal(v.limits.record, true);
    // what a painter reads beside the layout: each stretch's name box, greeting point and sky, and every drawing's ref
    assert.equal(v.stretches.length, v.layout.stretches.length);
    for (const [i, st] of v.stretches.entries()) {
        const s = v.layout.stretches[i];
        assert.ok(s && st.label.y > s.horizon.y && st.label.k > 0);
        assert.ok(st.greet.y < s.start.y, "the guide greets above the gate, on the ground");
    }
    for (const sc of v.layout.scenery) assert.ok(v.art[sc.art], `${sc.art} has no ref on the view`);
    for (const p of Object.values(v.pictures))
        for (const a of [p.horizon.gate, ...p.landmarks, ...p.creatures, p.chapter.moment.art])
            assert.ok(v.art[a], `${a} has no ref on the view`);
});

test("a child stands where the plan says they are, whatever tracks it has on: every lesson of those tracks can be today, and the world it is in has the child in it with a way in", () => {
    // two tracks beside maths, so some days hold another track's lesson with no maths lesson beside it
    const corpus = corpusFrom(
        [...lessonsOf(1), ...trackOf("writing", 1), ...trackOf("reading", 1)],
        STARTED,
    );
    const topics = topicsIn(corpus);
    const year = corpus.year(1, "Rosie");
    const onPath = year.lessons.filter((l) => !l.branch);
    const subjectOf = (id: string) => year.lessons.find((l) => l.id === id)?.subject ?? "maths";
    const everything: Progress = {
        done: Object.fromEntries(
            year.lessons.map((l) => [l.id, { stars: 3, on: "2026-09-01", minutes: 10, right: 1 }]),
        ),
        current: "",
        week: 1,
        unlocked: [],
    };
    assert.ok(
        daysOf(year, everything).days.some((d) =>
            d.lessons.every((id) => subjectOf(id) !== "maths"),
        ),
        "the fixture has a day with no maths lesson on it",
    );
    const plan = (on: string[]): TrackPlan =>
        ["maths", "writing", "reading"].map((track) => ({
            track,
            on: on.includes(track),
            day: STARTED,
        }));
    const children: { who: string; tracks: string[] }[] = [
        { who: "maths and writing", tracks: ["maths", "writing"] },
        { who: "writing only", tracks: ["writing"] },
        { who: "no maths", tracks: ["writing", "reading"] },
    ];
    const order = (id: string) => {
        const i = year.lessons.findIndex((l) => l.id === id);
        return i < 0 ? Infinity : i;
    };
    for (const { who, tracks } of children) {
        const mine = year.lessons.filter((l) => tracks.includes(l.subject ?? "maths"));
        /** A record with every lesson of the child's tracks before `upto` done, and the maths path's own next lesson as the record's. */
        const recordTo = (upto: number): Progress => {
            const done: Progress["done"] = {};
            for (const l of mine.filter((x) => order(x.id) < upto))
                done[l.id] = { stars: 3, on: "2026-09-01", minutes: 10, right: 1 };
            return {
                done,
                current: onPath.find((l) => !done[l.id])?.id ?? "",
                week: 1,
                unlocked: [],
            };
        };
        const viewsFor = (progress: Progress, now?: string[]) => {
            const live = {
                grade: 1,
                year,
                progress,
                today: "2026-10-01",
                before: [],
                tracks: plan(tracks),
                ...(now ? { now } : {}),
            };
            const j = journalOf({
                corpus,
                place: { kind: "year" },
                grade: 1,
                when: null,
                choice: CHOICE,
                live,
                sample: () => progress,
            });
            const map = mapViewOf({
                records: [
                    {
                        grade: 1,
                        year,
                        progress,
                        worlds: yearOf(1),
                        tracks: plan(tracks),
                        ...(now ? { now } : {}),
                    },
                ],
                sides: [],
                corpus,
                worldOf,
                topics,
                size,
                grown: false,
                child: { name: "Rosie", since: STARTED },
                limits: CHILD_MAP,
            });
            return { j, map };
        };
        for (const l of mine) {
            const { j, map } = viewsFor(recordTo(order(l.id)), [l.id]);
            assert.deepEqual(j.today?.state, "today", `${who}: ${l.id} has a today`);
            assert.ok(j.today?.lessons.includes(l.id), `${who}: ${l.id} can be today`);
            const here = map.here === null ? undefined : map.places[map.here];
            assert.equal(
                here?.state,
                "here",
                `${who}: on ${l.id} the child is somewhere on the map`,
            );
            assert.ok(here?.open, `${who}: on ${l.id} the child may go into the world they are in`);
            assert.equal(
                here?.shown?.world,
                yearOf(1)[j.today ? j.today.term - 1 : -1],
                `${who}: the map and the roll agree on the world ${l.id} is in`,
            );
        }
        // without the plan's days, a child with maths off still stands at their own first lesson to do
        const first = mine[0];
        const { j, map } = viewsFor(recordTo(0));
        const here = map.here === null ? undefined : map.places[map.here];
        assert.equal(here?.state, "here", `${who}: a first day has somewhere to be`);
        assert.ok(here?.open, `${who}: and a way in`);
        assert.ok(first && j.today?.lessons.includes(first.id), `${who}: and a first lesson today`);
    }
});

test("a day whose aside hangs further along the path than its maths leaves the child at the maths, on the map and on the roll alike", () => {
    // six writing lessons hung along nine maths lessons: writing's fourth hangs off maths's seventh,
    // in the third term, while the fourth maths lesson is in the second
    const corpus = corpusFrom([...lessonsOf(1), ...trackOf("writing", 1)], STARTED);
    const year = corpus.year(1, "Rosie");
    const host = year.lessons.find((l) => l.id === "writing-1-4")?.branch;
    assert.equal(host, "g1-l7", "the fixture's aside hangs further along than the day's maths");
    const done: Progress["done"] = {};
    for (const id of ["g1-l1", "g1-l2", "g1-l3", "writing-1-1", "writing-1-2", "writing-1-3"])
        done[id] = { stars: 3, on: "2026-09-01", minutes: 10, right: 1 };
    const progress: Progress = { done, current: "g1-l4", week: 1, unlocked: [] };
    const plan: TrackPlan = ["maths", "writing"].map((track) => ({
        track,
        on: true,
        day: STARTED,
    }));
    const stands = (now: string[]): { map: number | undefined; roll: number | undefined } => {
        const j = journey(
            [{ grade: 1, year, progress, worlds: yearOf(1), tracks: plan, now }],
            worldOf,
            topicsIn(corpus),
        );
        const map = j.here === null ? undefined : j.places[j.here]?.term;
        const roll = daysOf(year, progress, () => true, now).days.find((d) => d.state === "today");
        return { map, roll: roll?.term };
    };
    // a day with the maths and the aside both on it: the child is where the maths is
    assert.deepEqual(stands(["g1-l4", "writing-1-4"]), { map: 2, roll: 2 });
    assert.deepEqual(stands(["writing-1-4", "g1-l4"]), { map: 2, roll: 2 }, "in either order");
    const today = daysOf(year, progress, () => true, ["g1-l4", "writing-1-4"]).days.at(-1);
    assert.deepEqual(today?.lessons, ["g1-l4", "writing-1-4"], "and today still holds both");
    // a day with maths off is the aside's day, as it was
    assert.deepEqual(stands(["writing-1-4"]), { map: 3, roll: 3 });
});

test("the map carries what its painter draws beside the places: every drawing's ref, the country's life, shared geographic region names, and landings only where the viewer may go", () => {
    const child = childMap(1, 4);
    for (const p of Object.values(child.pictures))
        for (const x of p.map.spots) assert.ok(child.art[x.art], `${x.art} has no ref on the view`);
    for (const s of child.life) assert.ok(child.art[s.art], `${s.art} of the life has no ref`);
    for (const own of ["lantern", "bridge", "balloon"])
        assert.ok(child.art[own], `the map's own ${own} has no ref on the view`);
    assert.ok(child.pictures.railway, "a closed place is drawn in pencil, so it has a picture");
    assert.deepEqual(child.regions, REGIONS, "geographic regions are shared by every child");
    assert.ok(child.rides.rails.guide?.art, "the guide rides the rails");
    assert.deepEqual(
        child.landings.map((l) => l.node).sort((a, b) => a - b),
        child.places
            .filter((p) => p.open)
            .map((p) => p.i)
            .sort((a, b) => a - b),
        "a field stands beside every place the child may go to, and nowhere else",
    );
    for (const s of child.sights) assert.ok(child.art[s.art]);
    const grown = mapViewOf({
        records: records(2, 2),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: true,
        child: { name: "Rosie", since: STARTED },
        limits: GROWN_MAP,
    });
    assert.deepEqual(grown.regions, REGIONS);
    assert.deepEqual(
        grown.landings.map((f) => f.node),
        grown.places.filter((p) => p.open).map((p) => p.i),
    );
    assert.ok(
        grown.life.length > child.life.length,
        "a grown-up's map has the whole country's life",
    );
    assert.ok(
        grown.life.some((s) => s.round) &&
            grown.life.every((s) => !s.round || s.round.frames.length > 1),
        "what travels has its round as poses",
    );
    for (const s of grown.life) assert.ok(grown.art[s.art], `${s.art} of the life has no ref`);
    const still = mapViewOf({
        records: records(1, 4),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: false,
        child: { name: "Rosie", since: STARTED },
        limits: CHILD_MAP,
        still: true,
    });
    assert.ok(
        still.life.every((s) => !s.round && !s.bob),
        "under reduced motion nothing on the map has a round or a float",
    );
    assert.ok(
        !still.country.features.some((f) => f.turning) ||
            still.country.features.some((f) => f.art === "windmill" && f.turning?.part === "sails"),
        "a feature that turns says which part",
    );
    // the refs a page loads before it builds a view cover what the view then draws with
    const refs = new Set(refsOf(Object.keys(child.pictures)));
    for (const a of Object.values(child.pictures).flatMap((p) => p.map.spots.map((x) => x.art))) {
        const e = child.art[a];
        assert.ok(e && refs.has(artKey(e)), `${a} is not among the refs its world names`);
    }
});

test("the colour washing out as the map opens is rebuilt from the view alone: the reach at the frontier's share is the reach, and at nought the world's smallest circle with nothing along the way ahead", () => {
    const child = childMap(1, 4),
        r = child.reach,
        f = r.frontier;
    assert.ok(f, "a child partway through a world has a frontier");
    assert.ok(f.from < f.to, "the last lesson took the colour further");
    const key = (c: { x: number; y: number; r: number }) => `${c.x},${c.y},${c.r}`;
    const sorted = (cs: readonly { x: number; y: number; r: number }[]) => cs.map(key).sort();
    const same = (a: MapReach, b: MapReach) => {
        assert.deepEqual(sorted(a.circles), sorted(b.circles));
        assert.deepEqual(a.known && sorted(a.known), b.known && sorted(b.known));
    };
    same(reachAt(r, f.to), r);
    const none = reachAt(r, 0);
    assert.ok(
        none.circles.some((c) => c.x === f.here.x && c.y === f.here.y && c.r === f.here.r0),
        "at nought the world's circle is its smallest",
    );
    assert.ok(
        !none.circles.some((c) => f.ahead.some((a) => a.x === c.x && a.y === c.y && a.r === c.r)),
        "at nought nothing along the way ahead is coloured",
    );
    assert.ok(none.circles.length < r.circles.length || f.ahead.length === 0);
    const before = reachAt(r, f.from);
    for (const c of before.circles)
        assert.ok(
            sorted(r.circles).includes(key(c)) || (c.x === f.here.x && c.y === f.here.y),
            "before the last lesson the colour reached no further than now",
        );
    // what a page inks as the map opens is on the view: the day a landmark was lit, and when a world stands only for a grown-up
    for (const p of child.places)
        for (const l of p.shown?.lit ?? []) assert.match(l.on, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(
        child.places.every((p) => !p.shown || p.shown.when === ""),
        "a child's map letters no year under a name",
    );
    const grown = mapViewOf({
        records: records(1, 4),
        sides: [],
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        size,
        grown: true,
        child: null,
        limits: SITE_MAP,
    });
    assert.equal(grown.places[0]?.shown?.when, "Year 1, term 1");
});

test("a grown-up can enter worlds and fly while the backdrop is passive", () => {
    assert.deepEqual({ ...GROWN_MAP, goIn: BACKDROP_MAP.goIn, fly: false }, BACKDROP_MAP);
    assert.equal(GROWN_MAP.fly, true);
    assert.equal(GROWN_MAP.goIn, "everywhere");
    assert.equal(BACKDROP_MAP.goIn, "none");
});

test("a visit to a world opens on it with its arrival line, and reads the sample child's record when nobody is signed in", () => {
    const j = journalOf({
        corpus: CORPUS,
        place: { kind: "world", world: worldById("railway") },
        grade: null,
        when: null,
        choice: CHOICE,
        live: null,
        sample: (year) => ({ ...progressOf(year.grade, 7), current: "g1-l8" }),
    });
    const v = worldViewOf({
        journal: j,
        choice: CHOICE,
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        height: () => 1200,
        size,
        narrow: true,
        grown: false,
        limits: siteWorld(2),
    });
    assert.equal(v.open, "railway");
    assert.deepEqual(v.arrival, { term: 3, says: worldById("railway").arrive });
    assert.equal(v.limits.sheets, "preview");
    assert.equal(recordsAll(CORPUS, j, CHOICE, () => progressOf(1, 0)).length, 2);
});

test("a child's subject place keeps its own year's lessons, earned work and planned today", () => {
    const corpus = corpusFrom(
        [...lessonsOf(1), ...lessonsOf(2), ...trackOf("art", 1), ...trackOf("art", 2)],
        STARTED,
    );
    const year = corpus.year(1, "Rosie");
    const progress: Progress = {
        done: { "art-1-1": { stars: 3, on: "2026-09-01", minutes: 10, right: 1 } },
        current: "g1-l1",
        week: 1,
        unlocked: [],
    };
    for (const now of [["g1-l1", "art-1-2"], ["g1-l1"], []]) {
        const j = journalOf({
            corpus,
            place: { kind: "world", world: worldById("painters-hut") },
            grade: 1,
            when: null,
            choice: CHOICE,
            sample: () => {
                throw new Error("must use real progress");
            },
            live: { grade: 1, year, progress, today: "2026-09-23", before: [], tracks: [], now },
        });
        assert.deepEqual(
            j.year.lessons.map((l) => l.id),
            trackOf("art", 1).map((l) => l.id),
        );
        assert.deepEqual(j.worlds(CHOICE), ["painters-hut"]);
        assert.deepEqual(
            j.days.filter((d) => d.state === "done").flatMap((d) => d.lessons),
            ["art-1-1"],
        );
        assert.deepEqual(
            j.days.filter((d) => d.state === "today").flatMap((d) => d.lessons),
            now.filter((id) => id.startsWith("art")),
        );
        assert.equal(j.days[0]?.date, "2026-09-01");
        const view = worldViewOf({
            journal: j,
            choice: CHOICE,
            corpus,
            worldOf,
            topics: topicsIn(corpus),
            height: () => 560,
            size,
            narrow: false,
            grown: false,
            limits: childWorld("kid"),
        });
        assert.equal(view.open, "painters-hut");
        assert.ok(view.layout.stretches.every((s) => s.world === "painters-hut"));
        assert.ok(view.days.flatMap((d) => d.sheets).every((s) => s.lesson.startsWith("art-1-")));
        assert.ok(view.trail, "the subject roll also has its own place view");
    }
});

test("children share subject locations without borrowing another grade's rewards", () => {
    const corpus = corpusFrom(
        [...lessonsOf(1), ...lessonsOf(2), ...trackOf("art", 1), ...trackOf("art", 2)],
        STARTED,
    );
    const make = (grade: number) =>
        mapViewOf({
            records: [1, 2].map((g): YearRecord => ({
                grade: g,
                year: corpus.year(g, "Rosie"),
                worlds: yearOf(g),
                progress: {
                    done:
                        g === 1
                            ? {
                                  "art-1-1": {
                                      stars: 3 as const,
                                      on: STARTED,
                                      minutes: 1,
                                      right: 1,
                                  },
                              }
                            : {},
                    current: g === grade ? `g${g}-l1` : "",
                    week: 1,
                    unlocked: [],
                },
            })),
            sides: [1, 2].map((g) => ({ world: "painters-hut", grade: g })),
            corpus,
            worldOf,
            topics: topicsIn(corpus),
            size,
            grown: false,
            child: { name: "Rosie", since: STARTED },
            grade,
            limits: CHILD_MAP,
        });
    const first = make(1),
        second = make(2);
    const hut1 = first.places.filter((p) => p.shown?.world === "painters-hut");
    const hut2 = second.places.filter((p) => p.shown?.world === "painters-hut");
    assert.equal(hut1.length, 1);
    assert.equal(hut2.length, 1);
    assert.deepEqual(hut1[0]?.box, hut2[0]?.box);
    assert.equal(hut1[0]?.open, true);
    assert.equal(hut2[0]?.open, false);
    assert.equal(second.limits.zoomOut, "everything");
});
