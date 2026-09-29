import assert from "node:assert/strict";
import test from "node:test";
import { check, type Envelope } from "../../engine/answer";
import type { PackItem, PackLesson, PackQuestion } from "../../engine/pack";
import { askedIn, began, checkTyped, HANDED, LINES, partToRead } from "../lessons";

const SENTENCE = "The Mole had been working very hard all the morning.";

const question = (n: number, answers: Record<string, string>): PackQuestion => ({
    n,
    variant: "",
    env: {},
    answers,
    labels: null,
    ask: "Listen to the sentence, then type it.",
    hints: [],
    feedback: [],
    scene: null,
    arranged: null,
    explain: null,
});

const item = (id: string, check: PackItem["check"]): PackItem => ({
    id,
    hash: `${id}-hash`,
    title: null,
    skills: [],
    check,
});

const DICTATED = item("dictation.sample", {
    name: "writing.dictation",
    settings: { text: SENTENCE },
});

/** A book lesson of two sittings, with a dictation in the first. */
const BOOK: PackLesson = {
    pack: 2,
    id: "book-sample",
    source: "lessons/book-sample.lumi",
    title: "The Wind in the Willows",
    goal: null,
    grade: 5,
    unit: 1,
    subject: "reading",
    format: "book",
    art: [],
    book: {
        id: "willows-sample",
        title: "The Wind in the Willows",
        author: "Kenneth Grahame",
        published: 1908,
        file: "books/willows-sample-0123456789.json",
    },
    levels: {
        medium: {
            hash: "medium-hash",
            grownUps: [],
            sections: [1, 2].map((part) => ({
                type: "sitting",
                stars: null,
                chapters: [part],
                blocks: [
                    {
                        k: "ask" as const,
                        how: "show" as const,
                        item: DICTATED,
                        questions: [question(part, { answer: SENTENCE })],
                        again: [],
                    },
                ],
            })),
        },
    },
};

test("a dictation is typed however long its sentence, and marked word by word", () => {
    const [first] = askedIn(BOOK, "medium");
    assert.equal(first?.way, "typed");
    const q = question(1, { answer: SENTENCE });
    const right = checkTyped(
        q,
        { answer: "the mole had been working very hard all the morning" },
        DICTATED.check,
    );
    assert.equal(right?.right, true);
    const wrong = checkTyped(
        q,
        { answer: "The Mole had ben working very hard all morning." },
        DICTATED.check,
    );
    assert.equal(wrong?.right, false);
    assert.equal(wrong?.said, "Check the spelling of ben. A word is missing.");
    assert.deepEqual(wrong?.given, {
        k: "word",
        text: "The Mole had ben working very hard all morning.",
    });
    // the same answer checked as any other typed answer is only right or wrong as a whole
    assert.equal(checkTyped(q, { answer: "The Mole had ben working" })?.said, null);
});

test("a book lesson is read a sitting a day: the one begun, else the first not finished", () => {
    const at = (kind: Envelope["kind"], data: object, n: number): Envelope => {
        const read = check({
            id: `00000000-0000-4000-8000-00000000000${n}`,
            family_id: "00000000-0000-4000-8000-000000000001",
            kid_id: "00000000-0000-4000-8000-000000000002",
            kind,
            data,
            actor: null,
            device: "00000000-0000-4000-8000-000000000003",
            seq: n,
            at: `2026-09-2${n}T09:00:00.000Z`,
        });
        assert.ok(read.ok, read.ok ? "" : read.problem);
        return read.envelope;
    };
    assert.equal(partToRead(BOOK, []), 1);
    const one = at("sitting-began", began("s1", BOOK, "medium", "p", 1), 1);
    assert.equal(partToRead(BOOK, [one]), 1);
    const done = at(
        "sitting-ended",
        { sitting: "s1", finished: true, minutes: 20, withGrownUp: false },
        2,
    );
    assert.equal(partToRead(BOOK, [one, done]), 2);
    const two = at("sitting-began", began("s2", BOOK, "medium", "p", 2), 3);
    const over = at(
        "sitting-ended",
        { sitting: "s2", finished: true, minutes: 20, withGrownUp: false },
        4,
    );
    assert.equal(partToRead(BOOK, [one, done, two, over]), 2);
    assert.equal(
        partToRead({ ...BOOK, levels: { medium: { hash: "h", grownUps: [], sections: [] } } }, []),
        null,
    );
});

test("every piece a grown-up looks at or listens to says so once it is handed in", () => {
    assert.equal(LINES[HANDED.spoken], "A grown-up will listen to it.");
    assert.equal(LINES[HANDED.sung], "A grown-up will listen to it.");
    assert.equal(LINES[HANDED.made], "A grown-up will look at it.");
});
