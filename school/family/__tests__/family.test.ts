import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { check, type Envelope } from "../../../engine/answer";
import { isSchoolDay, weekdayOf, type Sitting } from "../../record/record";
import { defaultTracks } from "../../tracks";
import type { YearLesson } from "../../year";
import { familyName, gradeName, shortDate, spanText } from "../names";
import { nowIn } from "../now";
import {
    alive,
    behind,
    childRecord,
    laneOf,
    movesOf,
    nextDay,
    outOfOrder,
    park,
    pickWeekdays,
    planOf,
    shiftFrom,
    startOf,
    trackDays,
    turnOf,
    weeks,
    type Plan,
    type PlannedDay,
} from "../family";

describe("a family as a page names it", () => {
    it("reads whatever a parent typed for the family's name as that family", () => {
        assert.equal(familyName("Harlow"), "The Harlow family");
        assert.equal(familyName("  Okafor "), "The Okafor family");
        assert.equal(familyName("the Okafors"), "The Okafors");
        assert.equal(familyName("The Brennans"), "The Brennans");
        assert.equal(familyName("Okafor family"), "The Okafor family");
        assert.equal(familyName("Okafor  Family"), "The Okafor Family");
        assert.equal(familyName("Theodore"), "The Theodore family");
    });

    it("says the family's name in the middle of a sentence with a small the", () => {
        assert.equal(familyName("Brennan", true), "the Brennan family");
        assert.equal(familyName("The Okafors", true), "the Okafors");
    });

    it("names a grade, and the year before grade 1", () => {
        assert.equal(gradeName(0), "Kindergarten");
        assert.equal(gradeName(3), "Grade 3");
    });

    it("writes a day for a cell and minutes as a family reads them", () => {
        assert.equal(shortDate("2026-09-14"), "Mon 14 Sep");
        assert.equal(spanText(95), "1 h 35 min");
        assert.equal(spanText(40), "40 min");
        assert.equal(spanText(120), "2 h");
    });
});

const plan: Plan = {
    child: "kid",
    days: [
        { on: "2026-08-03", kind: "lesson", lesson: "l1" },
        { on: "2026-08-04", kind: "again", lesson: "l1" },
        { on: "2026-08-05", kind: "lesson", lesson: "l2" },
        { on: "2026-08-06", kind: "practice", lesson: "l2" },
        { on: "2026-08-07", kind: "lesson", lesson: "l3" },
        { on: "2026-08-10", kind: "lesson", lesson: "l4" },
    ],
};

const sat = (over: Partial<Sitting>): Sitting => ({
    child: "kid",
    lesson: "l1",
    on: "2026-08-03",
    minutes: 20,
    mode: "paper",
    finished: true,
    withGrownUp: true,
    subject: "maths",
    ...over,
});

describe("the plan a grown-up can change", () => {
    it("says what happened against what was planned, including a day done later", () => {
        const sittings = [
            sat({}),
            sat({ lesson: "l2", on: "2026-08-06" }),
            sat({ lesson: "l3", on: "2026-08-11" }),
            sat({ lesson: "l4", on: "2026-08-10", finished: false }),
        ];
        const rows = weeks(plan, sittings, "2026-08-12");
        assert.equal(rows.length, 2);
        const state = (on: string) => rows.flatMap((r) => r.cells).find((c) => c.on === on)?.state;
        assert.equal(state("2026-08-03"), "done");
        assert.equal(state("2026-08-04"), "missed", "the second day on l1 never happened");
        assert.equal(state("2026-08-05"), "missed", "the Wednesday had nothing on it");
        assert.equal(state("2026-08-06"), "done", "the Thursday keeps its own sitting on l2");
        assert.equal(state("2026-08-07"), "late", "l3 was done on the Tuesday after instead");
        assert.equal(state("2026-08-10"), "part");
        assert.equal(behind(plan, sittings, "2026-08-12").days, 2);
        const off = weeks(
            { child: "kid", days: [{ on: "2026-08-20", kind: "off" }] },
            [],
            "2026-08-12",
        );
        assert.equal(off[0]?.cells[0]?.state, "off");
    });

    it("reads a day with nothing on it in the middle of a lesson as not done, and never spends the day after's sitting on it", () => {
        const days: PlannedDay[] = ["2026-08-04", "2026-08-05", "2026-08-06"].map((on) => ({
            on,
            kind: "lesson",
            lesson: "l2",
        }));
        const sittings = [
            sat({ lesson: "l2", on: "2026-08-04", finished: false }),
            sat({ lesson: "l2", on: "2026-08-06" }),
        ];
        assert.deepEqual(
            weeks({ child: "kid", days }, sittings, "2026-08-12")
                .flatMap((w) => w.cells)
                .map((c) => c.state),
            ["part", "missed", "done"],
        );
    });

    it("shifts everything from a date on, keeping the weekday", () => {
        const moved = shiftFrom(plan, "2026-08-05", 1);
        assert.equal(moved.days[0]?.on, "2026-08-03", "what is already done stays where it is");
        assert.equal(moved.days[2]?.on, "2026-08-12");
        assert.equal(weekdayOf(moved.days[2]?.on ?? ""), "Wednesday");
        assert.equal(moved.days.length, plan.days.length, "nothing is lost");
    });

    it("parks a lesson by taking its days out and putting them back later, on school days", () => {
        const parked = park(plan, "l2", "2026-08-05", 1);
        const l2 = parked.days.filter((d) => d.lesson === "l2");
        assert.equal(l2.length, 2);
        for (const d of l2) {
            assert.ok(isSchoolDay(d.on), `${d.on} is a school day`);
            assert.ok(d.on > "2026-08-10", "and it lands after the gap");
        }
        assert.equal(parked.days.filter((d) => d.lesson === "l1").length, 2, "nothing else moves");
    });

    it("says which lesson a plan puts before what opens it, instead of blocking", () => {
        const before: Plan = {
            ...plan,
            days: [
                { on: "2026-08-03", kind: "lesson", lesson: "l2" },
                { on: "2026-08-04", kind: "lesson", lesson: "l1" },
            ],
        };
        const needs = (id: string) => (id === "l2" ? ["l1"] : []);
        assert.deepEqual(
            outOfOrder(before, needs, (id) => id.toUpperCase()),
            ["L2 is planned before L1, which opens it."],
        );
        assert.deepEqual(
            outOfOrder(plan, needs, (id) => id),
            [],
            "a plan in order says nothing",
        );
    });

    it("puts today first, then anything missed, then what is planned", () => {
        assert.equal(nextDay(plan, [], "2026-08-05")?.lesson, "l2");
        assert.equal(
            nextDay(plan, [sat({}), sat({ lesson: "l2", on: "2026-08-05" })], "2026-08-20")?.on,
            "2026-08-04",
            "a missed day comes before the rest of the plan",
        );
    });
});

const FAMILY = "11111111-1111-4111-8111-111111111111";
const KID = "21111111-1111-4111-8111-111111111111";
const PARENT = "81111111-1111-4111-8111-111111111111";
const TZ = "America/Denver";
let seq = 0;

const planned = (
    day: string,
    op: Extract<Envelope, { kind: "plan-changed" }>["data"]["op"],
    kid: string | null = KID,
): Envelope => {
    seq++;
    const made = check({
        id: `f${String(seq).padStart(7, "0")}-1111-4111-8111-111111111111`,
        family_id: FAMILY,
        kid_id: kid,
        kind: "plan-changed",
        data: { op },
        actor: PARENT,
        device: PARENT,
        seq,
        at: `${day}T18:00:00.000Z`,
    });
    assert.ok(made.ok, made.ok ? "" : made.problem);
    return made.envelope;
};

describe("the plan worked out from the log", () => {
    it("starts a school year on the first school day on or after the kid's first track, the latest op for a track winning", () => {
        const log = [
            planned("2026-08-29", { op: "track", track: "maths", on: true, perWeek: 5 }),
            planned("2026-08-29", { op: "track", track: "reading", on: true, perWeek: 3 }),
            planned("2026-09-05", { op: "track", track: "reading", on: true, perWeek: 2 }),
        ];
        assert.equal(
            startOf(log, KID, TZ),
            "2026-08-31",
            "a Saturday's op starts the year on the Monday",
        );
        assert.deepEqual(
            [...planOf(log, { id: KID, grade: 1 }, TZ, "2026-08-31")]
                .filter(([t]) => t === "maths" || t === "reading")
                .map(([t, o]) => [t, o.perWeek]),
            [
                ["maths", 5],
                ["reading", 2],
            ],
            "an op wins over the grade's default for its own track",
        );
    });

    it("starts from the grade's default, which a family's own op wins over track by track", () => {
        const log = [
            planned("2026-08-29", { op: "track", track: "maths", on: true, perWeek: 5 }),
            planned("2026-08-29", { op: "track", track: "nature", on: false, perWeek: 0 }),
        ];
        const plan = planOf(log, { id: KID, grade: 1 }, TZ, "2026-08-31");
        assert.deepEqual(
            [...plan].map(([t, o]) => [t, o.on ? o.perWeek : "off"]),
            [
                ["maths", 5],
                ["reading", 2],
                ["writing", 1],
                ["physics", 1],
                ["nature", "off"],
            ],
            "grade 1's default, with maths repaced and nature turned off",
        );
        assert.equal(plan.get("writing")?.since, "2026-08-31", "a default begins with the year");
        assert.deepEqual(
            [...planOf([], { id: KID, grade: 4 }, TZ, "2026-08-31").keys()],
            ["maths", "reading", "writing", "physics", "nature", "coding", "chemistry"],
            "grade 4 carries two more subjects and never music",
        );
        assert.deepEqual([...planOf([], { id: KID, grade: 1 }, TZ, "2026-08-31")].length, 5);
    });

    it("keeps the ops that move days in the order they were written, and track ops are not among them", () => {
        const log = [
            planned("2026-09-04", { op: "shift", from: "2026-09-07", weeks: 1 }),
            planned("2026-08-29", { op: "track", track: "maths", on: true, perWeek: 5 }),
            planned("2026-09-10", {
                op: "set-day",
                onDay: "2026-09-18",
                kind: "off",
                lesson: null,
                note: null,
            }),
        ];
        assert.deepEqual(
            movesOf(log, KID, TZ).map((m) => m.op.op),
            ["shift", "set-day"],
        );
    });

    it("applies a family day off, but not a plan change an undo names", () => {
        const change = planned(
            "2026-09-14",
            { op: "days-off", from: "2026-09-17", to: "2026-09-17", note: "Museum" },
            null,
        );
        const undone = planned("2026-09-14", { op: "undo", of: change.id });
        assert.deepEqual(
            movesOf([change], KID, TZ).map((move) => move.op.op),
            ["days-off"],
        );
        assert.deepEqual(movesOf([change, undone], KID, TZ), []);
    });

    it("gives a track's days what was worked, the current lesson where nothing was, and moves every day on after a shift", () => {
        const worked = (lesson: string, on: string, finished = true): Sitting => ({
            child: KID,
            lesson,
            on,
            minutes: 15,
            mode: "screen",
            finished,
            withGrownUp: false,
            subject: "maths",
        });
        const days = trackDays({
            track: "maths",
            lessons: ["a", "b", "c", "d"],
            perWeek: 3,
            start: "2026-08-31",
            today: "2026-09-16",
            until: "2026-09-25",
            moves: [{ on: "2026-09-04", op: { op: "shift", from: "2026-09-07", weeks: 1 } }],
            sittings: [
                worked("a", "2026-08-31"),
                worked("a", "2026-09-02"),
                worked("b", "2026-09-04", false),
                worked("b", "2026-09-14"),
            ],
        });
        assert.deepEqual(
            days.map((d) => [d.on, d.lesson, d.kind]),
            [
                ["2026-08-31", "a", "lesson"],
                ["2026-09-02", "a", "again"],
                ["2026-09-04", "b", "lesson"],
                ["2026-09-14", "b", "again"],
                ["2026-09-16", "c", "lesson"],
                ["2026-09-18", "c", "again"],
                ["2026-09-21", "d", "lesson"],
                ["2026-09-23", "d", "again"],
            ],
        );
    });

    it("picks a parked lesson up after its gap with its full pace, and works the one after it meanwhile", () => {
        const worked = (lesson: string, on: string, finished = true): Sitting => ({
            child: KID,
            lesson,
            on,
            minutes: 15,
            mode: "screen",
            finished,
            withGrownUp: false,
            subject: "maths",
        });
        const days = trackDays({
            track: "maths",
            lessons: ["a", "b", "c", "d"],
            perWeek: 5,
            start: "2026-09-07",
            today: "2026-09-09",
            until: "2026-09-25",
            moves: [
                {
                    on: "2026-09-09",
                    op: { op: "park", lesson: "b", from: "2026-09-10", gapWeeks: 1 },
                },
            ],
            sittings: [
                worked("a", "2026-09-07"),
                worked("a", "2026-09-08"),
                worked("a", "2026-09-09"),
            ],
        });
        const of = (lesson: string): string[] =>
            days.filter((d) => d.lesson === lesson).map((d) => d.on);
        assert.deepEqual(of("c"), ["2026-09-10", "2026-09-11", "2026-09-14"], "c takes b's place");
        assert.deepEqual(
            of("b"),
            ["2026-09-17", "2026-09-18", "2026-09-21"],
            "b comes back once its week is over, with its three days",
        );
        assert.deepEqual(
            of("d"),
            ["2026-09-15", "2026-09-16", "2026-09-22"],
            "d fills the days b waits out",
        );
    });

    it("puts a change back in force when its undo is undone, and reads the log in order", () => {
        const off = planned(
            "2026-09-14",
            { op: "days-off", from: "2026-09-17", to: "2026-09-17", note: "Museum" },
            null,
        );
        const undo = planned("2026-09-15", { op: "undo", of: off.id });
        const redo = planned("2026-09-16", { op: "undo", of: undo.id });
        assert.deepEqual(alive([off, undo]), []);
        assert.deepEqual(
            alive([redo, off, undo]).map((e) => e.id),
            [off.id],
        );
        assert.deepEqual(
            movesOf([off, undo, redo], KID, TZ).map((m) => m.op.op),
            ["days-off"],
        );
    });

    it("spreads a track's days over a child's school days, as the fixed table does over Monday to Friday", () => {
        const week = [1, 2, 3, 4, 5];
        assert.deepEqual(pickWeekdays(week, 1), [3]);
        assert.deepEqual(pickWeekdays(week, 2), [2, 4]);
        assert.deepEqual(pickWeekdays(week, 3), [1, 3, 5]);
        assert.deepEqual(pickWeekdays(week, 5), week);
        assert.deepEqual(pickWeekdays([1, 3, 6], 3), [1, 3, 6]);
        assert.deepEqual(pickWeekdays([1, 2, 3, 4, 6], 2), [1, 6]);
        assert.deepEqual(pickWeekdays([2, 4], 0), []);
    });

    it("turns each track along the week by its own offset, so two at one pace never share a day", () => {
        const week = [1, 2, 3, 4, 5];
        assert.deepEqual(pickWeekdays(week, 1, 0), [3], "no turn is the fixed table");
        assert.deepEqual(pickWeekdays(week, 1, 1), [4]);
        assert.deepEqual(pickWeekdays(week, 1, 2), [5]);
        assert.deepEqual(pickWeekdays(week, 1, 5), [3], "a turn of a whole week comes back round");
        assert.deepEqual(pickWeekdays(week, 2, 4), [1, 3]);
        assert.deepEqual(pickWeekdays(week, 5, 3), week, "every day is every day, turned or not");
        assert.deepEqual(pickWeekdays([1, 3, 6], 1, 1), [6]);
        assert.equal(turnOf("art"), 0, "a subject that is not a track takes no turn");
        for (const grade of [1, 2, 3, 4]) {
            const load = new Map<number, number>();
            for (const [track, perWeek] of Object.entries(defaultTracks(grade)))
                for (const day of pickWeekdays(week, perWeek ?? 0, turnOf(track)))
                    load.set(day, (load.get(day) ?? 0) + 1);
            const days = week.map((d) => load.get(d) ?? 0);
            assert.ok(
                days.every((n) => n >= 1 && n <= 2),
                `grade ${grade}'s default spreads over the week rather than piling onto one day: ${days.join()}`,
            );
        }
    });

    it("takes a day recorded off after it has gone off the plan, so it no longer reads as not done", () => {
        const days = trackDays({
            track: "maths",
            lessons: ["a", "b", "c"],
            perWeek: 5,
            start: "2026-09-07",
            today: "2026-09-16",
            until: "2026-09-25",
            sittings: [],
            moves: [
                {
                    on: "2026-09-16",
                    op: { op: "days-off", from: "2026-09-09", to: "2026-09-09", note: "A cold" },
                },
            ],
        });
        assert.ok(!days.some((d) => d.on === "2026-09-09"));
        const cells = weeks({ child: KID, days }, [], "2026-09-16").flatMap((w) => w.cells);
        assert.ok(!cells.some((c) => c.on === "2026-09-09"));
        assert.equal(cells.find((c) => c.on === "2026-09-08")?.state, "missed");
    });

    it("swaps a moved day with what the track had on the day it lands on", () => {
        const days = trackDays({
            track: "maths",
            lessons: ["a", "b", "c", "d", "e", "f"],
            perWeek: 5,
            start: "2026-09-14",
            today: "2026-09-14",
            until: "2026-09-18",
            sittings: [
                {
                    child: KID,
                    lesson: "x",
                    on: "2026-09-01",
                    minutes: 1,
                    mode: "screen",
                    finished: true,
                    withGrownUp: false,
                    subject: "maths",
                },
            ],
            moves: [
                {
                    on: "2026-09-14",
                    op: { op: "move", track: "maths", from: "2026-09-15", to: "2026-09-17" },
                },
                {
                    on: "2026-09-14",
                    op: { op: "move", track: "reading", from: "2026-09-16", to: "2026-09-18" },
                },
            ],
        });
        const before = trackDays({
            track: "maths",
            lessons: ["a", "b", "c", "d", "e", "f"],
            perWeek: 5,
            start: "2026-09-14",
            today: "2026-09-14",
            until: "2026-09-18",
            sittings: [],
            moves: [],
        });
        const on = (list: typeof days, day: string): string | undefined =>
            list.find((d) => d.on === day)?.lesson;
        assert.equal(on(days, "2026-09-17"), on(before, "2026-09-15"));
        assert.equal(on(days, "2026-09-15"), on(before, "2026-09-17"));
        assert.equal(
            on(days, "2026-09-16"),
            on(before, "2026-09-16"),
            "another track's move is not this track's",
        );
    });

    it("reads a child's school days, days off and a moved track day from plan changes", () => {
        const days = trackDays({
            track: "maths",
            lessons: ["a", "b"],
            perWeek: 2,
            start: "2026-09-14",
            today: "2026-09-14",
            until: "2026-09-25",
            sittings: [],
            moves: [
                { on: "2026-09-14", op: { op: "school-days", weekdays: [2, 4] } },
                {
                    on: "2026-09-14",
                    op: { op: "days-off", from: "2026-09-17", to: "2026-09-17", note: "Away" },
                },
                {
                    on: "2026-09-14",
                    op: { op: "move", track: "maths", from: "2026-09-15", to: "2026-09-22" },
                },
            ],
        });
        assert.ok(!days.some((day) => day.on === "2026-09-17"), "a day off has no lesson");
        assert.ok(
            days.some((day) => day.on === "2026-09-22"),
            "a lesson can move to a school day",
        );
        assert.ok(days.every((day) => ["Tuesday", "Thursday"].includes(weekdayOf(day.on))));
    });
});

const KID_DEVICE = "a1111111-1111-4111-8111-111111111111";

const event = <K extends Envelope["kind"]>(
    kind: K,
    at: string,
    data: Extract<Envelope, { kind: K }>["data"],
): Envelope => {
    seq++;
    const made = check({
        id: `d${String(seq).padStart(7, "0")}-1111-4111-8111-111111111111`,
        family_id: FAMILY,
        kid_id: KID,
        kind,
        data,
        actor: null,
        device: KID_DEVICE,
        seq,
        at,
    });
    assert.ok(made.ok, made.ok ? "" : made.problem);
    return made.envelope;
};

const facts = (
    id: string,
    grade: number,
    unit: number,
    subject: string,
    source: string,
): YearLesson => ({ id, source, title: id, goal: null, grade, unit, subject, format: "teach" });

const LESSONS: YearLesson[] = [
    facts("g1-a", 1, 1, "maths", "lessons/g1-01-a.lumi"),
    facts("g1-b", 1, 1, "maths", "lessons/g1-02-b.lumi"),
    facts("g1-c", 1, 2, "maths", "lessons/g1-03-c.lumi"),
    facts("read-1", 1, 1, "reading", "lessons/read-01.lumi"),
    facts("read-2", 2, 1, "reading", "lessons/read-02.lumi"),
    facts("g2-a", 2, 1, "maths", "lessons/g2-01-a.lumi"),
];

const question = (lesson: string, n: number) => ({
    lesson,
    lessonHash: "h",
    section: "do",
    n,
    item: "i",
    itemHash: "ih",
    variant: `a=${n}`,
    ask: "?",
    skills: ["s"],
});

describe("a child's record, as their view reads it", () => {
    it("stands a child on today's lessons in every track that works today, or the next planned day's", () => {
        const plan = [
            {
                track: "maths",
                days: [
                    { on: "2026-09-02", kind: "again" as const, lesson: "g1-a" },
                    { on: "2026-09-07", kind: "lesson" as const, lesson: "g1-b" },
                ],
            },
            {
                track: "writing",
                days: [{ on: "2026-09-02", kind: "lesson" as const, lesson: "w-1" }],
            },
            {
                track: "reading",
                days: [{ on: "2026-09-07", kind: "lesson" as const, lesson: "r-1" }],
            },
            {
                track: "physics",
                days: [{ on: "2026-09-03", kind: "off" as const, note: "A day off" }],
            },
        ];
        assert.deepEqual(nowIn({ today: "2026-09-02", plan, years: [] }), ["g1-a", "w-1"]);
        assert.deepEqual(
            nowIn({ today: "2026-09-04", plan, years: [] }),
            ["g1-b", "r-1"],
            "the weekend stands on Monday",
        );
        assert.deepEqual(nowIn({ today: "2026-09-08", plan, years: [] }), []);
        // today's maths is finished today, so maths stands on its next lesson
        const finished = {
            grade: 1,
            progress: {
                done: { "g1-a": { stars: 1 as const, on: "2026-09-02", minutes: 20, right: 1 } },
                current: "g1-b",
                week: 1,
                unlocked: [] as string[],
            },
        };
        assert.deepEqual(nowIn({ today: "2026-09-02", plan, years: [finished] }), ["g1-b", "w-1"]);
    });

    it("comes round to every lesson of every track that is on, with maths or without it", () => {
        const lessons: YearLesson[] = [
            facts("g1-a", 1, 1, "maths", "lessons/g1-01-a.lumi"),
            facts("g1-b", 1, 1, "maths", "lessons/g1-02-b.lumi"),
            facts("w-1", 1, 1, "writing", "lessons/writing-01.lumi"),
            facts("w-2", 1, 2, "writing", "lessons/writing-02.lumi"),
            facts("w-3", 1, 3, "writing", "lessons/writing-03.lumi"),
            facts("r-1", 1, 1, "reading", "lessons/reading-01.lumi"),
            facts("r-2", 1, 1, "reading", "lessons/reading-02.lumi"),
        ];
        const children: Record<string, string[]> = {
            "maths and writing": ["maths", "writing"],
            "writing only": ["writing"],
            "no maths": ["reading", "writing"],
        };
        const today = "2026-09-16";
        for (const [who, tracks] of Object.entries(children))
            for (const track of tracks) {
                const lane = laneOf(lessons, track, 1);
                lane.forEach((lesson, i) => {
                    const log: Envelope[] = tracks.map((t) =>
                        planned("2026-08-29", { op: "track", track: t, on: true, perWeek: 5 }),
                    );
                    // the lessons before it in its track were each finished on a school day
                    lane.slice(0, i).forEach((done, k) => {
                        const day = `2026-09-0${k + 1 === 5 ? 8 : k + 1}`;
                        log.push(
                            event("sitting-began", `${day}T16:00:00.000Z`, {
                                sitting: `${who}-${track}-${k}`,
                                lesson: done,
                                lessonHash: "h",
                                pack: "p",
                                mode: "paper",
                            }),
                            event("sitting-ended", `${day}T16:30:00.000Z`, {
                                sitting: `${who}-${track}-${k}`,
                                finished: true,
                                minutes: 30,
                                withGrownUp: true,
                            }),
                        );
                    });
                    const r = childRecord(log, { id: KID, grade: 1 }, lessons, TZ, today);
                    assert.ok(
                        nowIn(r).includes(lesson),
                        `${who}: ${lesson} is not what the child is on once the ${i} before it are done (${nowIn(r).join(", ")})`,
                    );
                });
            }
    });

    it("reads a track's lane at the kid's grade, or the whole track when nothing is written there", () => {
        assert.deepEqual(laneOf(LESSONS, "maths", 1), ["g1-a", "g1-b", "g1-c"]);
        assert.deepEqual(laneOf(LESSONS, "reading", 1), ["read-1"]);
        assert.deepEqual(laneOf(LESSONS, "reading", 3), ["read-1", "read-2"], "the whole track");
        assert.deepEqual(laneOf(LESSONS, "physics", 1), []);
    });

    it("folds the plan, each grade's progress and the sitting left open from the log alone", () => {
        const log: Envelope[] = [
            planned("2026-08-29", { op: "track", track: "maths", on: true, perWeek: 5 }),
            planned("2026-08-29", { op: "track", track: "reading", on: true, perWeek: 2 }),
            event("sitting-began", "2026-08-31T16:00:00.000Z", {
                sitting: "s1",
                lesson: "g1-a",
                lessonHash: "h",
                pack: "p",
                mode: "screen",
            }),
            event("answered", "2026-08-31T16:05:00.000Z", {
                sitting: "s1",
                q: question("g1-a", 1),
                given: { k: "number", text: "3" },
                timing: { k: "screen", toFirstInput: 1000, toAnswer: 2000, leftPage: false },
                right: true,
                tries: 1,
                rule: null,
                hints: 0,
            }),
            event("sitting-ended", "2026-08-31T16:20:00.000Z", {
                sitting: "s1",
                finished: true,
                minutes: 20,
                withGrownUp: false,
            }),
            event("sitting-began", "2026-09-02T16:00:00.000Z", {
                sitting: "s2",
                lesson: "g1-b",
                lessonHash: "h",
                pack: "p",
                mode: "screen",
            }),
            event("answered", "2026-09-02T16:02:00.000Z", {
                sitting: "s2",
                q: question("g1-b", 1),
                given: { k: "number", text: "6" },
                timing: { k: "screen", toFirstInput: 1000, toAnswer: 2000, leftPage: false },
                right: false,
                tries: 1,
                rule: null,
                hints: 0,
            }),
            event("answered", "2026-09-02T16:03:00.000Z", {
                sitting: "s2",
                q: question("g1-b", 1),
                given: { k: "number", text: "4" },
                timing: { k: "screen", toFirstInput: 1000, toAnswer: 2000, leftPage: false },
                right: true,
                tries: 2,
                rule: null,
                hints: 1,
            }),
            event("answered", "2026-09-02T16:06:00.000Z", {
                sitting: "s2",
                q: question("g1-b", 2),
                given: { k: "number", text: "5" },
                timing: { k: "screen", toFirstInput: 1000, toAnswer: 2000, leftPage: false },
                right: true,
                tries: 1,
                rule: null,
                hints: 0,
            }),
        ];
        const r = childRecord(log, { id: KID, grade: 1 }, LESSONS, TZ, "2026-09-02");
        assert.equal(r.start, "2026-08-31", "the Saturday's op starts the year on the Monday");
        assert.deepEqual(
            r.tracks.slice(-2).map((t) => [t.track, t.perWeek]),
            [
                ["maths", 5],
                ["reading", 2],
            ],
            "the family's own ops come after the grade's default and win over it",
        );
        assert.deepEqual(
            r.years.map((y) => [y.grade, Object.keys(y.progress.done), y.progress.current]),
            [[1, ["g1-a"], "g1-b"]],
            "grade 2 is ahead and has nothing done, so it is not in the record",
        );
        assert.equal(r.years[0]?.progress.done["g1-a"]?.on, "2026-08-31");
        const maths = r.plan.find((p) => p.track === "maths");
        assert.deepEqual(
            maths?.days.slice(0, 3).map((d) => [d.on, d.lesson]),
            [
                ["2026-08-31", "g1-a"],
                ["2026-09-01", "g1-b"],
                ["2026-09-02", "g1-b"],
            ],
        );
        assert.ok(
            maths?.days.some((d) => d.on > "2026-09-02" && d.lesson === "g1-c"),
            "the plan runs on past today to the next lesson",
        );
        assert.deepEqual(
            r.plan
                .find((p) => p.track === "reading")
                ?.days.map((d) => d.lesson)
                .slice(0, 2),
            ["read-1", "read-1"],
        );
        assert.deepEqual(
            r.unfinished,
            [
                {
                    sitting: "s2",
                    lesson: "g1-b",
                    lessonHash: "h",
                    began: "2026-09-02T16:00:00.000Z",
                    answered: [1, 2],
                },
            ],
            "a question tried twice is answered once",
        );
    });

    it("gives a child with no work and no plan of their own the grade's default, laid out from today", () => {
        const r = childRecord([], { id: KID, grade: 2 }, LESSONS, TZ, "2026-09-02");
        assert.deepEqual([r.start, r.unfinished], [null, []], "no op of their own has a day yet");
        assert.deepEqual(
            r.tracks.map((t) => [t.track, t.perWeek, t.day]),
            [
                ["maths", 2, "2026-09-02"],
                ["reading", 2, "2026-09-02"],
                ["writing", 1, "2026-09-02"],
                ["physics", 1, "2026-09-02"],
                ["nature", 1, "2026-09-02"],
            ],
            "the default begins on the day the child does",
        );
        assert.deepEqual(
            r.plan.filter((p) => p.days.length).map((p) => p.track),
            ["maths", "reading"],
            "a default track with nothing written for it plans no days",
        );
        assert.ok(
            r.plan.every((p) => p.days.every((d) => d.on >= "2026-09-02")),
            "nothing is planned before the child's first day",
        );
        assert.deepEqual(
            r.worlds,
            { terms: {}, tweaks: {}, begun: {}, kept: [] },
            "every term its own world",
        );
        assert.deepEqual(
            r.years.map((y) => [y.grade, y.progress.current]),
            [
                [1, "g1-a"],
                [2, "g2-a"],
            ],
        );
    });
});
