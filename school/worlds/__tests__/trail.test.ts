// A world's term as a place (.docs/journal.md, "A world as a place"): the stops are fixed by the day's
// number before any sheet is opened, the land past the next day is paper on a child's trail, nothing
// stands on the trail or on a label, and the view says each day as a child says it and keeps the day
// still to come to itself.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import { intersects, type Day } from "../../../engine/space";
import type { Progress } from "../../record/record";
import { apply, defaultChoice } from "../choice";
import { problems } from "../check";
import { corpusFrom, topicsIn } from "../lessons";
import { daysOf } from "../roll";
import { dayInWords, layoutTrail, slotsOf, type Slot, type TrailInput } from "../trail";
import type { Applied } from "../types";
import { childWorld, GROWN_WORLD, journalOf, trailViewOf, worldViewOf } from "../view";
import { WORLDS, worldById } from "../worlds";

const STARTED = "2026-08-31";

/** Nine maths lessons a grade, one to a unit, so each term is three days. */
const lessonsOf = (grade: number): LessonFacts[] =>
    Array.from({ length: 9 }, (_, i) => ({
        id: `g${grade}-l${i + 1}`,
        source: `lessons/g${grade}-l${i + 1}.lumi`,
        title: `Lesson ${i + 1} of year ${grade}`,
        goal: null,
        grade,
        unit: i + 1,
        subject: "maths",
        format: "teach",
        art: i % 2 ? ["tree"] : ["coins"],
        file: `lessons/g${grade}-l${i + 1}-0000000000.json`,
        levels: { medium: { hash: "0000000000" } },
        first: null,
        skills: i % 2 ? ["addition.making-ten"] : ["counting.in-twos"],
    }));

const CORPUS = corpusFrom([...lessonsOf(1), ...lessonsOf(2)], STARTED);
const TOPICS = topicsIn(CORPUS);
const CHOICE = defaultChoice("Rosie");
const worldOf = (id: string): Applied => apply(worldById(id), undefined, false).world;
const size = () => ({ w: 320, h: 240 });
const YEAR = CORPUS.year(1, "Rosie");

/** The first `n` lessons of the first year finished a day apart from 1 September, a Tuesday. */
function progressOf(n: number): Progress {
    const done: Progress["done"] = {};
    YEAR.lessons.slice(0, n).forEach((l, i) => {
        done[l.id] = { stars: 3, on: `2026-09-0${i + 1}`, minutes: 10, right: 1 };
    });
    return { done, current: YEAR.lessons[n]?.id ?? "", week: 1, unlocked: [] };
}

const daysAt = (n: number): { days: Day[]; next: ReturnType<typeof daysOf>["next"] } =>
    daysOf(YEAR, progressOf(n));

const HARBOUR: TrailInput["world"] = {
    id: "harbour",
    name: "The harbour",
    ground: "shore",
    gate: "lighthouse",
    moment: "ferry",
    secret: "shell",
    landmarks: ["jetty", "boat"],
    creatures: ["gull"],
};

const trailOf = (slots: Slot[], o: Partial<TrailInput> = {}) =>
    layoutTrail({ term: 2, slots, world: HARBOUR, wide: true, size, whole: false, ...o });

test("a day within the week is said as a child says it, and past the week it is the sheet's own date", () => {
    // 16 September 2026 is a Wednesday
    const said = (iso: string) => dayInWords(iso, "2026-09-16");
    assert.equal(said("2026-09-16"), "Today");
    assert.equal(said("2026-09-15"), "Yesterday");
    assert.equal(said("2026-09-11"), "Before the weekend", "a Friday seen from early in the week");
    assert.equal(said("2026-09-10"), "Last Thursday");
    assert.equal(said("2026-09-13"), "Last Sunday");
    // past the week the words would be one phrase repeated down a term, so the caller says the date
    assert.equal(said("2026-09-09"), "");
    assert.equal(said("2026-09-02"), "");
    assert.equal(said("2026-08-20"), "");
    // a Friday seen from the Thursday after is last Friday, not the weekend's
    assert.equal(dayInWords("2026-09-11", "2026-09-17"), "Last Friday");
    assert.equal(dayInWords("2026-09-11", "2026-09-12"), "Yesterday");
    assert.equal(dayInWords("", "2026-09-16"), "");
    for (const d of ["2026-09-15", "2026-09-10", "2026-08-01"])
        assert.doesNotMatch(dayInWords(d, "2026-09-16"), /\d|!/, "no number and no exclamation");
});

test("a term's days are every day of it from its first, the next one closed and the rest kept back", () => {
    const at = daysAt(4);
    assert.deepEqual(
        slotsOf(YEAR, 2, at.days, at.next).map((s) => [s.key, s.state, s.lessons.join()]),
        [
            ["day-g1-l4", "done", "g1-l4"],
            ["day-g1-l5", "today", "g1-l5"],
            ["next-g1-l6", "next", "g1-l6"],
        ],
    );
    const early = daysAt(3);
    assert.deepEqual(
        slotsOf(YEAR, 2, early.days, early.next).map((s) => [s.key, s.state, s.lessons.join()]),
        [
            ["day-g1-l4", "today", "g1-l4"],
            ["next-g1-l5", "next", "g1-l5"],
            ["ahead-g1-l6", "ahead", ""],
        ],
    );
    assert.deepEqual(
        slotsOf(YEAR, 1, at.days, at.next).map((s) => s.state),
        ["done", "done", "done"],
        "a term behind the child holds its days and nothing ahead",
    );
    assert.deepEqual(slotsOf(YEAR, 3, at.days, at.next), [], "a term not reached has no day");
});

test("a stop's place is fixed by the day's number, so doing a day moves nothing in the place", () => {
    const early = daysAt(3),
        later = daysAt(4);
    const a = trailOf(slotsOf(YEAR, 2, early.days, early.next));
    const b = trailOf(slotsOf(YEAR, 2, later.days, later.next));
    assert.equal(a.stops.length, 3);
    assert.deepEqual(
        a.stops.map((s) => s.at),
        b.stops.map((s) => s.at),
    );
    assert.deepEqual(a.land.scenery.length, b.land.scenery.length);
    for (let i = 1; i < b.stops.length; i++) {
        const [p, q] = [b.stops[i - 1], b.stops[i]];
        assert.ok(p && q && q.s > p.s, "the stops run along the trail in the term's order");
    }
    // the walked trail reaches today, the drawn trail the next day, and the land past it is paper
    const today = b.stops[1],
        next = b.stops[2];
    assert.ok(today && next);
    assert.equal(b.walked, today.s);
    assert.equal(b.drawn, next.s);
    assert.ok(
        b.known < b.land.bounds.y + b.land.bounds.h,
        "the land past the next day fades to paper",
    );
    const path = b.land.path[0];
    assert.ok(
        path && path.samples.every((q) => q.s <= b.drawn + 30),
        "the path stops at the next day",
    );
    // a grown-up's trail is drawn whole
    const whole = trailOf(slotsOf(YEAR, 2, later.days, later.next), { whole: true });
    assert.equal(whole.drawn, whole.length);
    assert.equal(whole.known, whole.land.bounds.y + whole.land.bounds.h);
});

test("every day of a long term stands inside the place, with its paper clear of every other day's", () => {
    const slots: Slot[] = Array.from({ length: 30 }, (_, i) => ({
        key: `day-${i}`,
        state: i < 12 ? "done" : i === 12 ? "today" : i === 13 ? "next" : "ahead",
        lessons: i < 14 ? [`l${i}`] : [],
        date: i < 13 ? `2026-09-${String(i + 1).padStart(2, "0")}` : null,
        day: null,
    }));
    for (const wide of [true, false])
        for (const world of [
            HARBOUR,
            { ...HARBOUR, id: "meadow", name: "The meadow", ground: "meadow" as const },
        ]) {
            const t = trailOf(slots, {
                wide,
                world,
                reach: (s) => (s.state === "done" ? { art: `mark-${s.key}`, says: "Look." } : null),
            });
            const B = t.land.bounds;
            assert.equal(t.stops.length, 30);
            for (const s of t.stops)
                assert.ok(
                    s.at.x >= B.x && s.at.x <= B.x + B.w && s.at.y >= B.y && s.at.y <= B.y + B.h,
                    `${s.key} stands outside the place`,
                );
            assert.equal(t.beside.length, t.land.scenery.length);
            // every day's paper takes the same room, whatever its sheets hold, and no two boxes meet
            for (const [i, s] of t.stops.entries()) {
                assert.equal(s.paper.w, wide ? 840 : 380);
                assert.equal(s.paper.h, 1040);
                assert.ok(
                    s.paper.x >= B.x && s.paper.x + s.paper.w <= B.x + B.w,
                    `${s.key}'s paper stands past the place's edge`,
                );
                for (const other of t.stops.slice(i + 1))
                    assert.ok(
                        !intersects(s.paper, other.paper),
                        `${s.key}'s paper meets ${other.key}'s`,
                    );
            }
            assert.equal(
                t.land.scenery.filter((s) => s.kind === "reach").length,
                12,
                "every finished day has its drawing beside it",
            );
            for (const [i, a] of t.land.scenery.entries()) {
                const box = { x: a.at.x, y: a.at.y, w: 320 * (a.k ?? 1), h: 240 * (a.k ?? 1) };
                if (a.kind !== "moment")
                    for (const s of t.stops)
                        assert.ok(!intersects(box, s.paper), `${a.art} stands on ${s.key}'s paper`);
                if (a.kind === "moment") continue;
                for (const q of t.samples)
                    assert.ok(
                        !(q.x > box.x && q.x < box.x + box.w && q.y > box.y && q.y < box.y + box.h),
                        `${a.art} stands on the trail`,
                    );
                assert.ok(
                    box.x >= B.x && box.x + box.w <= B.x + B.w,
                    `${a.art} stands past the place's edge`,
                );
                if (a.kind === "reach")
                    assert.ok((t.beside[i] ?? -1) >= 0, "a reach stands beside its day");
            }
            assert.equal(t.land.stretches.length, 1);
            assert.equal(t.land.rows.length, 0, "the place has no column of sheets");
        }
});

/** Rosie's own year with `n` lessons done, by default on a Monday, so the Friday before is before the weekend. */
const journalAt = (n: number, today = "2026-09-07") =>
    journalOf({
        corpus: CORPUS,
        place: { kind: "year" },
        grade: 1,
        when: null,
        choice: CHOICE,
        live: {
            grade: 1,
            year: YEAR,
            progress: progressOf(n),
            today,
            before: [],
            tracks: [],
        },
        sample: () => progressOf(0),
    });

const trailIn = (journal: ReturnType<typeof journalAt>, term: number, world: string) =>
    trailViewOf({
        journal,
        term,
        world: worldOf(world),
        place: undefined,
        corpus: CORPUS,
        topics: TOPICS,
        size,
        narrow: false,
        grown: false,
    });

test("a day more than a week back is said as its own sheet is stamped", () => {
    const t = trailIn(journalAt(4, "2026-09-28"), 1, "meadow");
    assert.ok(t);
    assert.deepEqual(
        t.stops.map((s) => s.when),
        ["Tuesday, September 1", "Wednesday, September 2", "Thursday, September 3"],
    );
});

test("the child's view carries the place: the guide at today, what was lit, the moment, and the next day as a marker", () => {
    const j = journalAt(4);
    const viewAt = (arriveAt?: number, grown = false) =>
        worldViewOf({
            journal: j,
            choice: CHOICE,
            corpus: CORPUS,
            worldOf,
            topics: TOPICS,
            height: () => 1200,
            size,
            narrow: false,
            grown,
            ...(arriveAt === undefined ? {} : { arriveAt }),
            limits: grown ? GROWN_WORLD : childWorld("kid-1"),
        });
    const v = viewAt();
    const t = v.trail;
    assert.ok(t, "today's term is a place");
    assert.equal(t.world, "harbour");
    assert.equal(t.label, "Term 2");
    assert.equal(t.stops.length, t.layout.stops.length);
    assert.equal(t.standings.length, t.layout.land.scenery.length);
    assert.deepEqual(
        t.layout.stops.map((s) => s.state),
        ["done", "today", "next"],
    );
    assert.equal(t.guide, 1, "the guide stands at today");
    const [done, today, next] = t.stops;
    assert.ok(done && today && next);
    assert.equal(done.when, "Before the weekend");
    assert.equal(done.names, "Lesson 4 of year 1");
    assert.equal(done.stamp, "gull", "the harbour stamps a finished day with its gull");
    assert.equal(today.when, "Today");
    assert.equal(today.stamp, null);
    assert.deepEqual(
        next,
        { hook: null, names: "", when: "", stamp: null, sheets: [] },
        "the next day keeps its lesson back",
    );
    // a finished day carries its own sheets, which the page draws into the stop's paper
    assert.deepEqual(done.sheets, [
        { lesson: "g1-l4", title: "Lesson 4 of year 1", state: "done", on: "2026-09-04" },
    ]);
    assert.equal(today.sheets[0]?.state, "today");
    for (const s of t.stops) assert.doesNotMatch(`${s.hook ?? ""}${s.names}${s.when}`, /!/);
    // a drawing beside a finished day is lit on that day, and one beside the next day says nothing yet
    t.layout.land.scenery.forEach((s, i) => {
        if (s.kind !== "reach") return;
        const stop = t.layout.stops[t.layout.beside[i] ?? -1],
            st = t.standings[i];
        if (stop?.state === "done") assert.deepEqual(st, { lit: true, on: stop.date });
        else assert.equal(st?.lit, false);
        if (stop?.state === "next") assert.equal(st?.says, "");
    });
    const moment = t.layout.land.scenery.findIndex((s) => s.kind === "moment");
    if (moment >= 0) assert.equal(t.standings[moment]?.inked, false, "the harbour's moment waits");
    assert.equal(t.moment, null);
    // every drawing the place names can be drawn from the view
    for (const s of t.layout.land.scenery) assert.ok(v.art[s.art], `${s.art} has no ref`);
    for (const s of t.stops)
        if (s.stamp) assert.ok(v.art[s.stamp], `the stamp's ${s.stamp} has no ref`);
    for (const x of t.sky.sky) assert.ok(v.art[x.art], `${x.art} in the sky has no ref`);

    // going into the meadow, finished: every day stamped with the hen, the guide at the last day, the moment inked
    const meadow = viewAt(1).trail;
    assert.ok(meadow);
    assert.equal(meadow.world, "meadow");
    assert.deepEqual(
        meadow.stops.map((s) => s.stamp),
        ["hen", "hen", "hen"],
    );
    assert.deepEqual(
        meadow.stops.map((s) => s.when),
        ["Last Tuesday", "Last Wednesday", "Last Thursday"],
    );
    assert.deepEqual(
        meadow.stops.map((s) => s.hook),
        [
            "Two ears on every rabbit.",
            "Apples from the tree by the path.",
            "Two ears on every rabbit.",
        ],
        "the question each day is about leads, in the meadow's words",
    );
    const lit = meadow.layout.land.scenery.flatMap((s, i) =>
        s.kind === "reach" ? [[s.art, meadow.standings[i]?.lit, meadow.standings[i]?.on]] : [],
    );
    assert.deepEqual(lit, [
        ["rabbit", true, "2026-09-01"],
        ["tree", true, "2026-09-02"],
    ]);
    assert.equal(meadow.guide, 2);
    assert.equal(meadow.moment, "2026-09-03");
    assert.equal(meadow.layout.drawn, meadow.layout.length, "a finished term is drawn to its end");
    const inked = meadow.layout.land.scenery.findIndex((s) => s.kind === "moment");
    if (inked >= 0) assert.equal(meadow.standings[inked]?.inked, true);

    // a grown-up's place is drawn whole
    const grown = viewAt(undefined, true).trail;
    assert.ok(grown);
    assert.equal(grown.layout.drawn, grown.layout.length);
    // a term not reached yet has no place
    assert.equal(viewAt(3).trail, null);
});

test("on the first day the drawing beside the next day waits and says nothing of its lesson", () => {
    const t = trailViewOf({
        journal: journalAt(0),
        term: 1,
        world: worldOf("meadow"),
        place: undefined,
        corpus: CORPUS,
        topics: TOPICS,
        size,
        narrow: true,
        grown: false,
    });
    assert.ok(t);
    assert.deepEqual(
        t.layout.stops.map((s) => s.state),
        ["today", "next", "ahead"],
    );
    assert.equal(t.guide, 0);
    const beside = (art: string) => {
        const i = t.layout.land.scenery.findIndex((s) => s.kind === "reach" && s.art === art);
        return { stop: t.layout.beside[i], standing: t.standings[i] };
    };
    assert.deepEqual(
        beside("rabbit"),
        { stop: 0, standing: { lit: false } },
        "today's waits for today's work",
    );
    assert.deepEqual(beside("tree"), { stop: 1, standing: { lit: false, says: "" } });
    assert.equal(t.stops[1]?.hook, null);
    assert.equal(t.layout.drawn, t.layout.stops[1]?.s, "the trail is drawn as far as the next day");
});

test("a world's stamp is one of its own creatures", () => {
    for (const w of WORLDS) {
        const stamp = w.stamp ?? w.creatures[0];
        assert.ok(stamp, `${w.id} has no creature for its stamp`);
        assert.ok(w.offers.creatures.includes(stamp), `${w.id} stamps with ${stamp}, not its own`);
    }
    assert.equal(worldById("meadow").stamp, "hen");
    assert.deepEqual(
        problems({ ...worldById("meadow"), stamp: "whale" }).filter((p) => p.includes("stamp"))
            .length,
        1,
    );
});
