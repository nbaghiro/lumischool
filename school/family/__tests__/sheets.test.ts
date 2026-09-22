import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { check, type Envelope, type QuestionRef } from "../../../engine/answer";
import type { PackLesson, PackQuestion } from "../../../engine/pack";
import { fold, type Attempt, type Printed, type Sitting } from "../../record/record";
import {
    cameBackRight,
    childWeek,
    dayItems,
    lookOf,
    marksOf,
    schoolWeek,
    sheetSays,
    sheetsBack,
    toMark,
    waitingToMark,
    weekShift,
} from "../sheets";

const sit = (over: Partial<Sitting>): Sitting => ({
    child: "kid",
    lesson: "l1",
    on: "2026-09-07",
    minutes: 20,
    mode: "paper",
    finished: true,
    withGrownUp: true,
    subject: "maths",
    ...over,
});

const ans = (over: Partial<Attempt>): Attempt => ({
    child: "kid",
    lesson: "l1",
    section: "do",
    n: 1,
    item: "i",
    version: 1,
    variant: { ask: "?" },
    skills: ["s"],
    given: "3",
    right: true,
    tries: 1,
    hints: 0,
    mode: "paper",
    markedBy: "grown-up",
    on: "2026-09-07",
    ...over,
});

const ref = (n: number, variant = `a=${n}`): QuestionRef => ({
    lesson: "l1",
    lessonHash: "h-medium",
    section: "do",
    n,
    item: "add.small",
    itemHash: "ih",
    variant,
    ask: `What is ${n} + 1?`,
    skills: ["add"],
});

describe("what came back, by the sheet", () => {
    it("reads a sheet as one sitting with the answers from the same lesson on the same day", () => {
        const sittings = [
            sit({}),
            sit({ on: "2026-09-08" }),
            sit({ lesson: "l2", on: "2026-09-08", subject: "reading" }),
        ];
        const attempts = [
            ans({}),
            ans({ n: 2, right: false, tries: 2, rule: "Count the spaces." }),
            ans({ n: 3, right: false, tries: 2, rule: "Count the spaces." }),
            ans({ on: "2026-09-08" }),
        ];
        const back = sheetsBack("kid", sittings, attempts);
        assert.deepEqual(
            back.map((b) => [b.on, b.lesson]),
            [
                ["2026-09-07", "l1"],
                ["2026-09-08", "l1"],
                ["2026-09-08", "l2"],
            ],
        );
        assert.equal(back[0]?.asked, 3);
        assert.equal(back[0]?.right, 1);
        assert.deepEqual(back[0]?.mistakes, [{ rule: "Count the spaces.", times: 2 }]);
        assert.equal(back[2]?.marked, false, "a paper sheet with nothing recorded is not marked");
        assert.deepEqual(
            sheetsBack("kid", sittings, attempts, "2026-09-08", "2026-09-08").map((b) => b.lesson),
            ["l1", "l2"],
        );
    });

    it("gives a paper sheet the sheet it was printed as, and its questions only while it waits", () => {
        const printed: Printed[] = [
            {
                sheet: "old",
                kid: "kid",
                lesson: "l1",
                on: "2026-08-30",
                at: "2026-08-30T10:00:00.000Z",
                questions: [ref(1)],
            },
            {
                sheet: "new",
                kid: "kid",
                lesson: "l1",
                on: "2026-09-06",
                at: "2026-09-06T10:00:00.000Z",
                questions: [ref(1), ref(2)],
            },
        ];
        const [waiting] = sheetsBack("kid", [sit({})], [], undefined, undefined, printed);
        assert.equal(waiting?.sheet, "new");
        assert.equal(waiting?.questions.length, 2);
        const [marked] = sheetsBack("kid", [sit({})], [ans({})], undefined, undefined, printed);
        assert.equal(marked?.sheet, "new");
        assert.deepEqual(marked?.questions, []);
        const [screen] = sheetsBack(
            "kid",
            [sit({ mode: "screen" })],
            [],
            undefined,
            undefined,
            printed,
        );
        assert.equal(screen?.sheet, null);
    });

    it("stars a sheet only when it is finished, marked, and every answer was right first time", () => {
        const [one] = sheetsBack("kid", [sit({})], [ans({}), ans({ n: 2 })]);
        assert.ok(one);
        assert.equal(cameBackRight(one), true);
        assert.equal(cameBackRight({ ...one, right: 1 }), false);
        assert.equal(cameBackRight({ ...one, finished: false }), false);
        assert.equal(
            cameBackRight({ ...one, asked: 0, right: 0, marked: false }),
            false,
            "an unmarked sheet has nothing to star",
        );
        assert.equal(sheetSays(one), "2 of 2 right first time");
        assert.equal(
            sheetSays({ ...one, marked: false, asked: 0, right: 0 }),
            "Came back on paper, not marked yet",
        );
    });

    it("waits to be marked on paper with nothing recorded, oldest first, and never on screen work", () => {
        const w = waitingToMark(
            "kid",
            [
                sit({ on: "2026-09-09" }),
                sit({ on: "2026-09-02" }),
                sit({ mode: "screen", on: "2026-09-01" }),
            ],
            [],
        );
        assert.deepEqual(
            w.map((s) => s.on),
            ["2026-09-02", "2026-09-09"],
        );
    });

    it("keeps a school week to Monday to Friday, and a week back starts the Monday before", () => {
        assert.deepEqual(schoolWeek("2026-09-16"), [
            "2026-09-14",
            "2026-09-15",
            "2026-09-16",
            "2026-09-17",
            "2026-09-18",
        ]);
        assert.equal(weekShift("2026-09-14", -1), "2026-09-07");
        assert.equal(
            weekShift("2026-09-20", 1),
            "2026-09-21",
            "a Sunday belongs to the week ending",
        );
    });

    it("sets a day's plan against what came back, and never drops a lesson done on another day", () => {
        const back = sheetsBack(
            "kid",
            [sit({ lesson: "a" }), sit({ lesson: "b", finished: false }), sit({ lesson: "late" })],
            [ans({ lesson: "a" })],
        );
        const past = dayItems(["a", "b", "c"], back, "2026-09-07", "2026-09-14");
        assert.deepEqual(
            past.map((i) => [i.lesson, i.state]),
            [
                ["a", "done"],
                ["b", "part"],
                ["c", "missed"],
                ["late", "extra"],
            ],
        );
        assert.deepEqual(
            dayItems(["a", "c"], [], "2026-09-15", "2026-09-14").map((i) => i.state),
            ["planned", "planned"],
        );
        assert.deepEqual(
            dayItems(["c"], [], "2026-09-14", "2026-09-14").map((i) => i.state),
            ["planned"],
            "today's lesson has not happened yet, and is not missed",
        );
    });
});

describe("the one thing to look at", () => {
    it("is the named mistake that came up most in four weeks, in the lesson it came up in most", () => {
        const rule = "Count the spaces.";
        const other = "Start at zero.";
        const attempts = [
            ans({ rule, lesson: "l1", on: "2026-09-01", right: false }),
            ans({ rule, lesson: "l2", on: "2026-09-08", right: false }),
            ans({ rule, lesson: "l2", on: "2026-09-09", right: false }),
            ans({ rule: other, on: "2026-09-10", right: false }),
            ans({ rule: other, on: "2026-09-10", right: false }),
            ans({ rule: "Long ago.", on: "2026-07-01" }),
            ans({ rule: "Long ago.", on: "2026-07-02" }),
            ans({ rule: "Someone else's.", child: "sister" }),
            ans({ rule: "Someone else's.", child: "sister" }),
        ];
        assert.deepEqual(lookOf(attempts, "kid", "2026-09-14"), {
            rule,
            lesson: "l2",
            times: 3,
            days: 3,
        });
    });

    it("is nothing when no named mistake came up twice, and the latest wins a tie", () => {
        assert.equal(lookOf([ans({ rule: "Once." })], "kid", "2026-09-14"), null);
        const tie = [
            ans({ rule: "Earlier.", on: "2026-09-01" }),
            ans({ rule: "Earlier.", on: "2026-09-02" }),
            ans({ rule: "Later.", on: "2026-09-03" }),
            ans({ rule: "Later.", on: "2026-09-04" }),
        ];
        assert.equal(lookOf(tie, "kid", "2026-09-14")?.rule, "Later.");
    });
});

const question = (n: number, over: Partial<PackQuestion> = {}): PackQuestion => ({
    n,
    variant: `a=${n}`,
    env: {},
    answers: { total: String(n + 1) },
    labels: null,
    ask: `What is ${n} + 1?`,
    hints: [],
    feedback: [
        {
            when: { t: "bool", v: true },
            say: [`You added ${n} and 0.`],
            point: null,
            children: [
                {
                    when: { t: "bool", v: true },
                    say: ["Count on\n from the first."],
                    point: null,
                    children: [],
                },
            ],
        },
    ],
    scene: null,
    arranged: null,
    explain: null,
    ...over,
});

const lesson: PackLesson = {
    pack: 1,
    id: "l1",
    source: "g1/add.lesson",
    title: "Adding one",
    goal: null,
    grade: 1,
    unit: 1,
    subject: "maths",
    format: "teach",
    art: [],
    levels: {
        medium: {
            hash: "h-medium",
            grownUps: [],
            sections: [
                {
                    type: "do",
                    stars: null,
                    blocks: [
                        { k: "say", text: "Add one." },
                        {
                            k: "ask",
                            how: "practice",
                            item: {
                                id: "add.small",
                                hash: "ih",
                                title: null,
                                skills: ["add"],
                                check: null,
                            },
                            questions: [question(1), question(2)],
                            again: [[question(1, { variant: "a=9", answers: { total: "10" } })]],
                        },
                    ],
                },
            ],
        },
    },
};

describe("marking a sheet that came back", () => {
    it("reads each printed question's answer and its author's lines, from any draw of the lesson", () => {
        const column = toMark(lesson, [ref(1), ref(1, "a=9"), ref(7, "a=7")]);
        assert.deepEqual(
            column.map((m) => [m.ref.n, m.answer]),
            [
                [1, "2"],
                [1, "10"],
                [7, ""],
            ],
        );
        assert.deepEqual(column[0]?.rules, ["You added 1 and 0.", "Count on from the first."]);
        assert.deepEqual(
            column[2]?.rules,
            [],
            "a question the lesson no longer holds has no lines",
        );
    });

    it("writes a mark for every question, right unless tapped wrong, with the line chosen", () => {
        const items = toMark(lesson, [ref(1), ref(2)]);
        let n = 0;
        const drafts = marksOf({
            kid: "00000000-0000-4000-8000-00000000000a",
            sheet: "sheet-1",
            items,
            wrong: new Map([[2, "You added 2 and 0."]]),
            at: "2026-09-14T17:00:00.000Z",
            newId: () => `00000000-0000-4000-8000-00000000000${++n}`,
        });
        assert.equal(drafts.length, 2);
        const events: Envelope[] = drafts.map((d, i) => {
            const e = {
                ...d,
                family_id: "00000000-0000-4000-8000-0000000000f0",
                actor: "00000000-0000-4000-8000-0000000000a0",
                device: "00000000-0000-4000-8000-0000000000d0",
                seq: i,
            };
            const c = check(e);
            assert.ok(c.ok, c.ok ? "" : c.problem);
            return c.envelope;
        });
        const printed: Envelope = {
            id: "00000000-0000-4000-8000-0000000000b1",
            family_id: "00000000-0000-4000-8000-0000000000f0",
            kid_id: "00000000-0000-4000-8000-00000000000a",
            actor: "00000000-0000-4000-8000-0000000000a0",
            device: "00000000-0000-4000-8000-0000000000d0",
            seq: 9,
            at: "2026-09-10T15:00:00.000Z",
            kind: "sheet-printed",
            data: {
                sheet: "sheet-1",
                lesson: "l1",
                lessonHash: "h-medium",
                pack: "p",
                paper: "A4",
                questions: [ref(1), ref(2)],
                grownUps: true,
            },
        };
        const f = fold([printed, ...events], "UTC", () => "maths");
        assert.deepEqual(
            f.attempts.map((a) => [a.n, a.right, a.rule ?? null, a.markedBy]),
            [
                [1, true, null, "grown-up"],
                [2, false, "You added 2 and 0.", "grown-up"],
            ],
        );
    });
});

describe("a child's week as a grown-up's page reads it", () => {
    it("holds every sheet from last Monday, and older paper only while it waits", () => {
        const kid = "00000000-0000-4000-8000-00000000000a";
        const base = {
            family_id: "00000000-0000-4000-8000-0000000000f0",
            kid_id: kid,
            actor: "00000000-0000-4000-8000-0000000000a0",
            device: "00000000-0000-4000-8000-0000000000d0",
        };
        let seq = 0;
        const sitting = (
            id: string,
            lesson: string,
            at: string,
            mode: "paper" | "screen",
        ): Envelope[] => [
            {
                ...base,
                id: `00000000-0000-4000-8000-${id}0`,
                seq: seq++,
                at,
                kind: "sitting-began",
                data: { sitting: id, lesson, lessonHash: "h", pack: "p", mode },
            },
            {
                ...base,
                id: `00000000-0000-4000-8000-${id}1`,
                seq: seq++,
                at,
                kind: "sitting-ended",
                data: { sitting: id, finished: true, minutes: 20, withGrownUp: false },
            },
        ];
        const events = [
            ...sitting("00000000001", "old-paper", "2026-08-20T15:00:00.000Z", "paper"),
            ...sitting("00000000002", "old-screen", "2026-08-21T15:00:00.000Z", "screen"),
            ...sitting("00000000003", "recent", "2026-09-08T15:00:00.000Z", "screen"),
            ...sitting("00000000004", "ahead", "2026-09-15T15:00:00.000Z", "screen"),
        ];
        const lessons = ["old-paper", "old-screen", "recent", "ahead"].map((id) => ({
            id,
            source: `${id}.lesson`,
            title: id,
            goal: null,
            grade: 1,
            unit: 1,
            subject: "reading",
            format: "teach",
        }));
        const w = childWeek(events, kid, lessons, "UTC", "2026-09-14");
        assert.equal(w.from, "2026-09-07");
        assert.deepEqual(
            w.back.map((s) => [s.lesson, s.subject]),
            [
                ["old-paper", "reading"],
                ["recent", "reading"],
            ],
        );
        assert.equal(w.look, null);
    });
});
