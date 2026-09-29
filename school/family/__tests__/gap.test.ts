import assert from "node:assert/strict";
import test from "node:test";
import { check } from "../../../engine/answer";
import type { PackItem, PackLesson } from "../../../engine/pack";
import type { Sitting } from "../../record";
import { sittingNote, trackDays } from "../family";
import { respondedOf, toMark } from "../sheets";

const KID = "00000000-0000-4000-8000-000000000002";

test("a book lesson takes a day of the plan for each of its sittings, whatever the pace", () => {
    const sat = (lesson: string, on: string, part?: number): Sitting => ({
        child: KID,
        lesson,
        on,
        minutes: 20,
        mode: "screen",
        finished: true,
        withGrownUp: false,
        subject: "reading",
        ...(part === undefined ? {} : { part }),
    });
    const plan = (sittings: Sitting[]) =>
        trackDays({
            track: "reading",
            lessons: ["poems", "book", "fables"],
            perWeek: 5,
            start: "2026-09-21",
            today: "2026-09-22",
            until: "2026-10-02",
            moves: [],
            sittings,
            parts: new Map([["book", 4]]),
        }).map((d) => [d.on, d.lesson, d.kind, d.note ?? "", d.part ?? 0]);
    const days = plan([sat("poems", "2026-09-21"), sat("book", "2026-09-22", 1)]);
    assert.deepEqual(days.slice(0, 6), [
        ["2026-09-21", "poems", "lesson", "", 0],
        ["2026-09-22", "book", "lesson", sittingNote(1, 4), 1],
        ["2026-09-23", "book", "lesson", sittingNote(2, 4), 2],
        ["2026-09-24", "book", "lesson", sittingNote(3, 4), 3],
        ["2026-09-25", "book", "lesson", sittingNote(4, 4), 4],
        ["2026-09-28", "fables", "lesson", "", 0],
    ]);
});

const RECITED: PackItem = {
    id: "notice.sample-recited",
    hash: "h",
    title: null,
    skills: [],
    check: {
        name: "reading.recited",
        settings: {
            "look-for": "The whole verse said from memory.",
            notice: '["Every line, in order", "No looking at the page"]',
        },
    },
};

const LESSON: PackLesson = {
    pack: 2,
    id: "notice-sample",
    source: "lessons/notice-sample.lumi",
    title: "Pieces a grown-up looks at",
    goal: null,
    grade: 5,
    unit: 8,
    subject: "reading",
    format: "teach",
    art: [],
    levels: {
        medium: {
            hash: "medium-hash",
            grownUps: [],
            sections: [
                {
                    type: "do",
                    stars: null,
                    blocks: [
                        {
                            k: "ask",
                            how: "show",
                            item: RECITED,
                            questions: [
                                {
                                    n: 1,
                                    variant: "",
                                    env: {},
                                    answers: {},
                                    labels: null,
                                    ask: "Say the first verse by heart.",
                                    hints: [],
                                    feedback: [],
                                    scene: null,
                                    arranged: null,
                                    explain: null,
                                },
                            ],
                            again: [],
                        },
                    ],
                },
            ],
        },
    },
};

test("a piece on a sheet brings its notice list to the marking, and the points ticked are a response", () => {
    const ref = {
        lesson: LESSON.id,
        lessonHash: "medium-hash",
        section: "do",
        n: 1,
        item: RECITED.id,
        itemHash: "h",
        variant: "",
        ask: "Say the first verse by heart.",
        skills: [],
    };
    const items = toMark(LESSON, [ref]);
    assert.deepEqual(items[0]?.notice, ["Every line, in order", "No looking at the page"]);
    let n = 0;
    const drafts = respondedOf({
        kid: KID,
        on: { sheet: "00000000-0000-4000-8000-00000000000a" },
        items,
        ticked: new Map([[1, ["No looking at the page", "not on the list"]]]),
        at: "2026-09-28T09:00:00.000Z",
        newId: () => `00000000-0000-4000-8000-00000000001${n++}`,
    });
    assert.equal(drafts.length, 1);
    const [draft] = drafts;
    assert.ok(draft?.kind === "responded");
    assert.deepEqual(draft.data.noticed, ["No looking at the page"]);
    const read = check({
        ...draft,
        family_id: "00000000-0000-4000-8000-000000000001",
        actor: null,
        device: "00000000-0000-4000-8000-000000000003",
        seq: 1,
    });
    assert.ok(read.ok, read.ok ? "" : read.problem);
});
