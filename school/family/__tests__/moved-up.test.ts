import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { check, type Envelope } from "../../../engine/answer";
import { fold } from "../../record";
import type { YearLesson } from "../../year";
import { foldCalendar, termOn, type CalCell, type Calendar } from "../calendar";
import { childRecord, mayMoveTo, schoolYears, yearReviewOf } from "../family";

const FAMILY = "11111111-1111-4111-8111-111111111111";
const KID = "22222222-2222-4222-8222-222222222222";
const SIBLING = "44444444-4444-4444-8444-444444444444";
const PARENT = "33333333-3333-4333-8333-333333333333";
const TZ = "America/Denver";
const START = "2026-09-07";
const MOVE = "2026-10-05";
const TODAY = "2026-10-20";

let n = 0;
const logged = (kind: string, data: unknown, at: string, kid: string | null = KID): Envelope => {
    n++;
    const made = check({
        id: `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`,
        family_id: FAMILY,
        kid_id: kid,
        kind,
        data,
        actor: PARENT,
        device: PARENT,
        seq: n,
        at,
    });
    assert.ok(made.ok, made.ok ? "" : made.problem);
    return made.envelope;
};

const lesson = (grade: number, i: number): YearLesson => ({
    id: `g${grade}-${String(i).padStart(2, "0")}`,
    source: `lessons/g${grade}-${String(i).padStart(2, "0")}.lumi`,
    title: `Grade ${grade}, ${i}`,
    goal: null,
    grade,
    unit: Math.ceil(i / 2),
    subject: "maths",
    format: "teach",
});

const LESSONS: YearLesson[] = [3, 4].flatMap((grade) => [
    ...Array.from({ length: 15 }, (_, i) => lesson(grade, i + 1)),
    { ...lesson(grade, 16), id: `g${grade}-year-review`, unit: 9, format: "review" },
]);

const mathsOn = (day: string, kid = KID): Envelope =>
    logged(
        "plan-changed",
        { op: { op: "track", track: "maths", on: true, perWeek: 2 } },
        `${day}T18:00:00.000Z`,
        kid,
    );

const sat = (day: string, id: string): Envelope[] => [
    logged(
        "sitting-began",
        { sitting: `s-${day}`, lesson: id, lessonHash: "h", pack: "p", mode: "screen" },
        `${day}T16:00:00.000Z`,
    ),
    logged(
        "sitting-ended",
        { sitting: `s-${day}`, finished: true, minutes: 20, withGrownUp: false },
        `${day}T16:30:00.000Z`,
    ),
];

const moved = (from: number, grade: number, onDay: string): Envelope =>
    logged("moved-up", { from, grade, onDay }, `${onDay}T15:00:00.000Z`);

// Every Tuesday and Thursday before the move, which is where two days a week of maths fall, worked.
const WORKED = ["09-08", "09-10", "09-15", "09-17", "09-22", "09-24", "09-29", "10-01"];
const BEFORE: Envelope[] = [
    mathsOn(START),
    ...WORKED.flatMap((d, i) => sat(`2026-${d}`, `g3-${String(i + 1).padStart(2, "0")}`)),
];

const calendarOf = (events: Envelope[], kids: { id: string; grade: number }[]): Calendar =>
    foldCalendar({
        events,
        sittings: fold(events, TZ, () => "maths").sittings,
        kids,
        lessons: LESSONS,
        timeZone: TZ,
        today: TODAY,
        until: "2026-12-18",
    });

const cellsOf = (cal: Calendar, kid = KID): CalCell[] =>
    [...(cal.kids.get(kid)?.cells.values() ?? [])].flat();

describe("a child moved up a year", () => {
    it("has no missed days before the move, which keep the old grade's lessons", () => {
        const cells = cellsOf(calendarOf([...BEFORE, moved(3, 4, MOVE)], [{ id: KID, grade: 4 }]));
        const before = cells.filter((c) => c.on < MOVE);
        assert.equal(before.length, WORKED.length);
        assert.deepEqual(
            before.filter((c) => c.state !== "done"),
            [],
        );
        assert.ok(before.every((c) => c.lesson?.startsWith("g3-")));
        const after = cells.filter((c) => c.on >= MOVE);
        assert.ok(after.length > 0);
        assert.ok(after.every((c) => c.lesson?.startsWith("g4-")));

        const byHand = cellsOf(calendarOf(BEFORE, [{ id: KID, grade: 4 }]));
        assert.ok(
            byHand.some((c) => c.on < MOVE && c.state === "missed"),
            "the row changed with no event reads the weeks before as grade four's, and missed",
        );
    });

    it("keeps the earlier year's progress, and counts the new year's weeks from the move", () => {
        const was = childRecord(BEFORE, { id: KID, grade: 3 }, LESSONS, TZ, TODAY);
        const now = childRecord(
            [...BEFORE, moved(3, 4, MOVE)],
            { id: KID, grade: 4 },
            LESSONS,
            TZ,
            TODAY,
        );
        const grade = (r: typeof now, g: number) => r.years.find((y) => y.grade === g)?.progress;
        assert.deepEqual(grade(now, 3)?.done, grade(was, 3)?.done);
        assert.equal(Object.keys(grade(now, 3)?.done ?? {}).length, WORKED.length);
        assert.equal(was.start, START);
        assert.equal(now.start, MOVE);
        assert.equal(grade(now, 4)?.week, 3);
        const maths = now.plan.find((p) => p.track === "maths")?.days ?? [];
        assert.equal(maths.filter((d) => d.on >= MOVE)[0]?.lesson, "g4-01");
    });

    it("starts the calendar's second year on the move's day, and a sibling keeps their own", () => {
        const terms = {
            op: "terms",
            terms: [
                { n: 1, from: "2026-09-07", to: "2026-11-20" },
                { n: 2, from: "2026-12-07", to: "2027-03-19" },
            ],
        };
        const cal = calendarOf(
            [
                ...BEFORE,
                mathsOn(START, SIBLING),
                logged("plan-changed", { op: terms }, "2026-09-10T18:00:00.000Z", null),
                moved(3, 4, MOVE),
            ],
            [
                { id: KID, grade: 4 },
                { id: SIBLING, grade: 1 },
            ],
        );
        assert.deepEqual(
            cal.years.map((y) => y.from),
            [START, MOVE],
        );
        assert.deepEqual(cal.years[0]?.terms, [{ n: 1, from: "2026-09-07", to: "2026-10-04" }]);
        assert.deepEqual(cal.years[1]?.terms[0], { n: 1, from: MOVE, to: "2026-12-18" });
        assert.equal(cal.terms, cal.years[1]?.terms);
        assert.equal(termOn(cal, "2026-09-30")?.to, "2026-10-04");
        assert.equal(termOn(cal, "2026-10-06")?.from, MOVE);
        assert.equal(cal.kids.get(KID)?.start, MOVE);
        assert.equal(cal.kids.get(SIBLING)?.start, START);
        assert.equal(cal.kids.get(SIBLING)?.years.length, 1);
    });

    it("moved up and then back, loses nothing finished in either grade and plans the old one again", () => {
        const BACK = "2026-10-12";
        const events = [
            ...BEFORE,
            moved(3, 4, MOVE),
            ...sat("2026-10-06", "g4-01"),
            moved(4, 3, BACK),
        ];
        const kid = { id: KID, grade: 3 };
        assert.deepEqual(schoolYears(events, kid, START), [
            { grade: 3, from: START },
            { grade: 4, from: MOVE },
            { grade: 3, from: BACK },
        ]);
        const r = childRecord(events, kid, LESSONS, TZ, TODAY);
        assert.ok(r.years.find((y) => y.grade === 4)?.progress.done["g4-01"]);
        assert.equal(
            Object.keys(r.years.find((y) => y.grade === 3)?.progress.done ?? {}).length,
            WORKED.length,
        );
        const maths = r.plan.find((p) => p.track === "maths")?.days ?? [];
        assert.ok(
            maths
                .filter((d) => d.on >= MOVE && d.on < BACK)
                .every((d) => d.lesson?.startsWith("g4-")),
        );
        assert.equal(maths.filter((d) => d.on >= BACK)[0]?.lesson, "g3-09");
    });

    it("takes back a move made and undone on one day as though it had not happened", () => {
        const events = [...BEFORE, moved(3, 4, MOVE), moved(4, 3, MOVE)];
        assert.deepEqual(schoolYears(events, { id: KID, grade: 3 }, START), [
            { grade: 3, from: START },
        ]);
    });
});

describe("a move", () => {
    it("goes to the grade next to the child's and only to one that is offered", () => {
        const offered = [1, 2, 3, 4];
        assert.equal(mayMoveTo(3, 4, offered), true);
        assert.equal(mayMoveTo(3, 2, offered), true);
        assert.equal(mayMoveTo(3, 5, offered), false);
        assert.equal(mayMoveTo(4, 5, offered), false);
        assert.equal(mayMoveTo(1, 0, offered), false);
        assert.equal(mayMoveTo(3, 3, offered), false);
    });

    it("is offered once the grade's year review is finished", () => {
        assert.equal(yearReviewOf(LESSONS, 3), "g3-year-review");
        assert.equal(yearReviewOf(LESSONS, 5), null);
    });

    it("names the child, and only a grade next to the one it moves from", () => {
        const base = {
            id: "99999999-1111-4111-8111-111111111111",
            family_id: FAMILY,
            kid_id: KID,
            kind: "moved-up",
            actor: PARENT,
            device: PARENT,
            seq: 1,
            at: "2026-10-05T15:00:00.000Z",
        };
        assert.ok(check({ ...base, data: { from: 3, grade: 4, onDay: MOVE } }).ok);
        assert.ok(!check({ ...base, data: { from: 3, grade: 5, onDay: MOVE } }).ok);
        assert.ok(!check({ ...base, data: { from: 3, grade: 4, onDay: "2026-02-30" } }).ok);
        assert.ok(!check({ ...base, kid_id: null, data: { from: 3, grade: 4, onDay: MOVE } }).ok);
    });
});
