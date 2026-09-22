import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { check, type Envelope, type PlanOp } from "../../../engine/answer";
import type { Sitting } from "../../record/record";
import type { YearLesson } from "../../year";
import {
    catchUp,
    dayState,
    defaultTerms,
    familyDay,
    foldCalendar,
    monthGrid,
    putBack,
    saidOf,
    setTerms,
    termOn,
    weekdayNumber,
    weekDays,
    type Calendar,
} from "../calendar";

const FAMILY = "11111111-1111-4111-8111-111111111111";
const KID = "22222222-2222-4222-8222-222222222222";
const PARENT = "33333333-3333-4333-8333-333333333333";
const TZ = "America/Denver";
const TODAY = "2026-09-17";
const UNTIL = "2027-02-05";

let seq = 0;
const planned = (day: string, op: PlanOp, kid: string | null = KID): Envelope => {
    seq++;
    const made = check({
        id: `c${String(seq).padStart(7, "0")}-1111-4111-8111-111111111111`,
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

const facts = (id: string, unit: number): YearLesson => ({
    id,
    source: `lessons/${id}.lumi`,
    title: id,
    goal: null,
    grade: 1,
    unit,
    subject: "maths",
    format: "teach",
});

const LESSONS: YearLesson[] = Array.from({ length: 40 }, (_, i) =>
    facts(`m-${String(i + 1).padStart(2, "0")}`, Math.floor(i / 4) + 1),
);

const worked = (lesson: string, on: string): Sitting => ({
    child: KID,
    lesson,
    on,
    minutes: 20,
    mode: "screen",
    finished: true,
    withGrownUp: false,
    subject: "maths",
});

const fold = (events: Envelope[], sittings: Sitting[] = []): Calendar =>
    foldCalendar({
        events,
        sittings,
        kids: [{ id: KID, grade: 1 }],
        lessons: LESSONS,
        timeZone: TZ,
        today: TODAY,
        until: UNTIL,
    });

const start = (): Envelope =>
    planned("2026-08-29", { op: "track", track: "maths", on: true, perWeek: 5 });

describe("the family's calendar, folded from the log", () => {
    it("lays each child's lane from the plan, and starts the year where the tracks were turned on", () => {
        const cal = fold([start()], [worked("m-01", "2026-08-31")]);
        const kid = cal.kids.get(KID);
        assert.ok(kid);
        assert.equal(kid.start, "2026-08-31");
        assert.deepEqual(
            kid.tracks.map((t) => [t.track, t.perWeek]),
            [["maths", 5]],
        );
        const lane = kid.lanes.get("maths") ?? [];
        assert.ok(lane.length > 20, "the year is laid out past today");
        assert.equal(kid.cells.get("2026-08-31")?.[0]?.state, "done");
        assert.equal(kid.cells.get("2026-09-01")?.[0]?.state, "missed");
    });

    it("flows the plan round a holiday for the family, and says whose day it is", () => {
        const holiday = planned(
            "2026-09-14",
            { op: "days-off", from: "2026-10-19", to: "2026-10-23", note: "Half term at the lake" },
            null,
        );
        const cal = fold([start(), holiday]);
        const kid = cal.kids.get(KID);
        assert.ok(kid);
        assert.ok(
            !(kid.lanes.get("maths") ?? []).some(
                (d) => d.on >= "2026-10-19" && d.on <= "2026-10-23",
            ),
        );
        assert.equal(dayState(cal, kid, "2026-10-21").state, "off");
        assert.equal(dayState(cal, kid, "2026-10-21").off?.note, "Half term at the lake");
        assert.equal(dayState(cal, kid, "2026-10-26").state, "school");
        assert.equal(dayState(cal, kid, "2026-10-24").state, "weekend");
    });

    it("gives the family three terms until it sets its own, and reads the ones it sets", () => {
        const cal = fold([start()]);
        assert.deepEqual(
            cal.terms.map((t) => t.n),
            [1, 2, 3],
        );
        assert.equal(cal.terms[0]?.from, "2026-08-31", "the term starts on the year's Monday");
        assert.equal(termOn(cal, TODAY)?.n, 1);
        const set = planned(
            "2026-09-15",
            {
                op: "terms",
                terms: [
                    { n: 1, from: "2026-08-31", to: "2026-12-18" },
                    { n: 2, from: "2027-01-04", to: "2027-03-26" },
                ],
            },
            null,
        );
        const after = fold([start(), set]);
        assert.deepEqual(
            after.terms.map((t) => t.to),
            ["2026-12-18", "2027-03-26"],
        );
        const writing = {
            newId: () => "44444444-4444-4444-8444-444444444444",
            at: `${TODAY}T12:00:00.000Z`,
        };
        assert.ok(
            "drafts" in
                setTerms(writing, [
                    { n: 1, from: "2026-08-31", to: "2026-12-18" },
                    { n: 2, from: "2027-01-04", to: "2027-03-26" },
                ]),
        );
        assert.deepEqual(
            setTerms(writing, [{ n: 1, from: "2026-12-18", to: "2026-08-31" }]),
            { refused: "Term 1 ends before it starts." },
            "a term that ends before it starts is refused rather than written",
        );
        assert.deepEqual(
            setTerms(writing, [
                { n: 1, from: "2026-08-31", to: "2026-12-18" },
                { n: 2, from: "2026-12-01", to: "2027-03-26" },
            ]),
            { refused: "Term 2 starts before term 1 ends." },
        );
    });

    it("counts what catching up would take as days and a pace, and never as a verdict", () => {
        const cal = fold([start()]);
        const kid = cal.kids.get(KID);
        const term = cal.terms[0];
        assert.ok(kid && term);
        const lessons = (kid.lanes.get("maths") ?? [])
            .filter((d) => d.on >= term.from && d.on <= term.to)
            .flatMap((d) => (d.lesson ? [d.lesson] : []));
        const up = catchUp(cal, kid, term, "maths", [...new Set(lessons)], 5);
        assert.equal(up.track, "maths");
        assert.ok(up.left >= 0);
        assert.ok(up.perWeek === null || up.perWeek <= kid.schoolDays.length);
    });

    it("writes a family day as a day off for everyone and a day of teaching for each child", () => {
        let n = 0;
        const drafts = familyDay(
            { newId: () => `d${++n}`, at: `${TODAY}T12:00:00.000Z` },
            [KID, "other"],
            "2026-09-18",
            "The museum",
            { subject: "history", minutes: 180 },
        );
        assert.deepEqual(
            drafts.map((d) => [d.kind, d.kid_id]),
            [
                ["plan-changed", null],
                ["day-added", KID],
                ["day-added", "other"],
            ],
        );
        const off = drafts[0];
        assert.ok(off && off.kind === "plan-changed" && off.data.op.op === "days-off");
        assert.equal(off.data.op.note, "The museum");
    });

    it("puts a change back with one undo an event, and says what each change did", () => {
        const shift = planned("2026-09-14", { op: "shift", from: "2026-09-21", weeks: 1 });
        const cal = fold([start(), shift]);
        const change = cal.changes.find((c) => c.op.op === "shift");
        assert.ok(change);
        const drafts = putBack({ newId: () => "u1", at: `${TODAY}T12:00:00.000Z` }, [
            { id: change.id, kid: change.kid },
        ]);
        assert.equal(drafts.length, 1);
        const first = drafts[0];
        assert.ok(first && first.kind === "plan-changed" && first.data.op.op === "undo");
        assert.equal(first.data.op.of, change.id);
        const names = {
            kid: (id: string | null): string => (id ? "Rosie" : "everyone"),
            lesson: (id: string): string => id,
            track: (id: string): string => id,
            day: (iso: string): string => iso,
        };
        assert.equal(saidOf(change, names), "Rosie: everything from 2026-09-21 moved on 1 week.");
    });

    it("lays a month as whole weeks from Monday, and a week as five days or seven", () => {
        const grid = monthGrid("2026-09");
        assert.equal(grid.length % 7, 0);
        assert.equal(weekdayNumber(grid[0] ?? ""), 1);
        assert.ok(grid.includes("2026-09-01") && grid.includes("2026-09-30"));
        assert.deepEqual(weekDays("2026-09-14", false).length, 5);
        assert.deepEqual(weekDays("2026-09-14", true).at(-1), "2026-09-20");
        assert.deepEqual(defaultTerms("2026-08-31")[0], {
            n: 1,
            from: "2026-08-31",
            to: "2026-11-13",
        });
    });
});
