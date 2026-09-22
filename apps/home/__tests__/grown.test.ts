import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import type { SheetBack } from "../../../school/family/sheets";
import type { GrownRecord } from "../../../server/api";
import type { Kid } from "../../../server/db/schema";
import {
    dayLong,
    dayMark,
    helloLine,
    names,
    paperFor,
    plannedOn,
    waitingIn,
    weekOf,
} from "../grown";
import { whereOf } from "../where";
import { kidHref } from "../routes";

const fact = (id: string, subject: string, over: Partial<LessonFacts> = {}): LessonFacts => ({
    id,
    source: `${id}.lesson`,
    title: `The ${id} lesson`,
    goal: null,
    grade: 1,
    unit: 1,
    subject,
    format: "teach",
    art: [],
    file: `lessons/${id}.json`,
    levels: { medium: { hash: "h" } },
    first: null,
    skills: [],
    ...over,
});

const LESSONS = [fact("m1", "maths"), fact("m2", "maths"), fact("r1", "reading")];
const facts = (id: string): LessonFacts | undefined => LESSONS.find((l) => l.id === id);

const sheet = (over: Partial<SheetBack>): SheetBack => ({
    child: "kid",
    lesson: "m1",
    subject: "maths",
    on: "2026-09-14",
    mode: "screen",
    minutes: 20,
    finished: true,
    withGrownUp: false,
    asked: 4,
    right: 4,
    mistakes: [],
    marked: true,
    sheet: null,
    questions: [],
    ...over,
});

const kid: Kid = { id: "kid", family_id: "f", name: "Rosie", grade: 1, settings: {} };

const record = (over: Partial<GrownRecord> = {}): GrownRecord => ({
    kid,
    pack: "p",
    today: "2026-09-16",
    start: "2026-09-07",
    tracks: [
        { track: "reading", on: true, perWeek: 2, day: "2026-09-05", own: true },
        { track: "maths", on: true, perWeek: 5, day: "2026-09-05", own: true },
    ],
    years: [{ grade: 1, progress: { done: {}, current: "m1", week: 2, unlocked: [] } }],
    plan: [
        {
            track: "reading",
            days: [
                { on: "2026-09-15", kind: "lesson", lesson: "r1" },
                { on: "2026-09-17", kind: "lesson", lesson: "r1" },
            ],
        },
        {
            track: "maths",
            days: [
                { on: "2026-09-14", kind: "lesson", lesson: "m1" },
                { on: "2026-09-15", kind: "again", lesson: "m1" },
                { on: "2026-09-16", kind: "lesson", lesson: "m2" },
                { on: "2026-09-17", kind: "off" },
                { on: "2026-09-18", kind: "lesson", lesson: "gone" },
            ],
        },
    ],
    unfinished: [],
    worlds: { terms: {}, tweaks: {}, begun: {}, kept: [] },
    from: "2026-09-07",
    back: [
        sheet({}),
        sheet({ lesson: "r1", subject: "reading", on: "2026-09-15", finished: false }),
        sheet({ on: "2026-08-20", mode: "paper", marked: false, asked: 0, right: 0 }),
    ],
    look: null,
    ...over,
});

describe("what the grown-ups' home says about a child", () => {
    it("lists a day's lessons across the tracks, maths first, and leaves out days off and lessons the pack lacks", () => {
        const r = record();
        assert.deepEqual(
            plannedOn(r, "2026-09-15", facts).map((p) => [p.lesson.id, p.title, p.kind]),
            [
                ["m1", "Maths", "again"],
                ["r1", "Reading", "lesson"],
            ],
        );
        assert.deepEqual(
            plannedOn(r, "2026-09-17", facts).map((p) => p.lesson.id),
            ["r1"],
        );
        assert.deepEqual(plannedOn(r, "2026-09-18", facts), []);
    });

    it("reads the week Monday to Friday: done, part done, not done, today and planned", () => {
        const week = weekOf(record(), facts);
        assert.deepEqual(
            week.map((d) => [d.on, d.today, d.dots.map((x) => x.state)]),
            [
                ["2026-09-14", false, ["done"]],
                ["2026-09-15", false, ["missed", "part"]],
                ["2026-09-16", true, ["today"]],
                ["2026-09-17", false, ["planned"]],
                ["2026-09-18", false, []],
            ],
        );
        assert.equal(week[1]?.dots[1]?.marker, "berry", "reading's own colour");
    });

    it("waits to be marked only on paper nobody has marked", () => {
        assert.deepEqual(
            waitingIn(record()).map((s) => s.on),
            ["2026-08-20"],
        );
    });

    it("says where a child is on their map in words, from the same record their map reads", () => {
        const where = whereOf(record(), kid, LESSONS);
        assert.ok(where);
        assert.equal(where.term, 1);
        assert.match(where.lines.at(-1) ?? "", /“.+” waits for \d+ more lessons? here\./);
        const done = record({
            years: [
                {
                    grade: 1,
                    progress: {
                        done: { m1: { stars: 3, on: "2026-09-10", minutes: 20, right: 1 } },
                        current: "m2",
                        week: 2,
                        unlocked: [],
                    },
                },
            ],
        });
        assert.equal(
            whereOf(done, kid, LESSONS)?.lines[0],
            "Stamped Thu, Sep 10, by The m1 lesson.",
        );
    });

    it("puts a child's card in the world the family chose for their term, with the tweaks as they stood", () => {
        const chosen = record({
            worlds: {
                terms: { "1": ["valley-farm", null, null] },
                tweaks: { "valley-farm": { weather: "rain" } },
                begun: { "1.1": "2026-09-08" },
                kept: [{ term: "1.1", tweaks: { "valley-farm": { weather: "clear" } } }],
            },
        });
        const where = whereOf(chosen, kid, LESSONS);
        assert.equal(where?.world.id, "valley-farm");
        assert.equal(where?.world.weather, "clear");
        assert.equal(
            whereOf(record(), kid, LESSONS)?.world.id,
            "meadow",
            "a family that never chose",
        );
    });

    it("greets the family with today's lessons and what waits, and says so when nothing does", () => {
        assert.equal(
            helloLine(["Rosie", "Leo", "Ivy"], 3, 4),
            "3 lessons today for Rosie, Leo and Ivy. 4 sheets came back on paper and wait to be marked.",
        );
        assert.equal(
            helloLine(["Rosie"], 1, 1),
            "1 lesson today for Rosie. 1 sheet came back on paper and waits to be marked.",
        );
        assert.equal(
            helloLine(["Rosie", "Leo"], 0, 0),
            "Nothing is planned today for Rosie and Leo. Nothing is waiting to be marked.",
        );
        assert.match(helloLine([], 0, 0), /^No children yet\./);
    });

    it("writes days as the family's page does, prints on the family's paper, and names a child's card in the address", () => {
        assert.equal(dayLong("2026-09-17"), "Thursday, September 17");
        assert.equal(dayMark("2026-09-07"), "7 Sep");
        assert.equal(names(["Rosie"]), "Rosie");
        assert.equal(paperFor("America/Denver"), "Letter");
        assert.equal(paperFor("Europe/London"), "A4");
        assert.equal(kidHref({ id: "a b" }), "/?kid=a%20b");
    });
});
