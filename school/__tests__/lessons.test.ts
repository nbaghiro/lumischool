import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { check, type Envelope, type EventKind } from "../../engine/answer";
import { num, parseExpr, str, type Expr } from "../../engine/expr";
import type { PackItem, PackLesson, PackQuestion, PackRule } from "../../engine/pack";
import {
    FRESH,
    LINES,
    TRIES,
    answered,
    askedIn,
    began,
    checkArranged,
    checkProgram,
    checkTyped,
    easierOf,
    ended,
    HANDED,
    handIn,
    handedIn,
    helpAsked,
    hintOpened,
    hinted,
    leftOf,
    mayHint,
    optionsOf,
    pinned,
    pointOf,
    tried,
    turnsOf,
    voiceable,
    writtenOf,
    type Turn,
} from "../lessons";

const e = (s: string): Expr => parseExpr(s);
const rule = (
    when: string,
    say: string,
    point: string | null = null,
    children: PackRule[] = [],
): PackRule => ({
    when: e(when),
    say: [say],
    point,
    children,
});

const question = (over: Partial<PackQuestion>): PackQuestion => ({
    n: 1,
    variant: "a=6,b=4",
    env: { a: num(6), b: num(4) },
    answers: { answer: "10" },
    labels: null,
    ask: "6 and 4 make how many?",
    hints: ["Start at 6 and count on 4.", "7, 8, 9, and one more."],
    feedback: [],
    scene: null,
    arranged: null,
    explain: null,
    ...over,
});

const item = (id: string, check: PackItem["check"] = null): PackItem => ({
    id,
    hash: `${id}-hash`,
    title: null,
    skills: ["add.count-on"],
    check,
});

/** A scene with one choice part, named for the answer it picks. */
const choosing = (
    id: string,
    options: { label: string; value: string }[],
): PackQuestion["scene"] => ({
    size: [10, 4],
    nodes: [
        {
            type: "choice",
            id,
            v: { options: options.map((o) => ({ kind: "prop" as const, prop: o.value, ...o })) },
            place: null,
        },
    ],
    arrows: [],
    marks: [],
    boxes: { [id]: { x: 0, y: 0, w: 10, h: 4 } },
});

const adding = question({
    feedback: [
        rule("answer == a - b", "That is 6 take away 4. Put them together.", "bar"),
        rule("answer > 20", "That is more than both together.", null, [
            rule("answer == a * b", "{answer} is 6 lots of 4, not 6 and 4."),
        ]),
    ],
});

const lesson: PackLesson = {
    pack: 1,
    id: "g1-adding",
    source: "lessons/g1-04-adding.lumi",
    title: "Adding to twenty",
    goal: null,
    grade: 1,
    unit: 4,
    subject: "maths",
    format: "teach",
    art: [],
    levels: {
        medium: {
            hash: "medium-hash",
            grownUps: [],
            sections: [
                {
                    type: "look",
                    stars: null,
                    blocks: [
                        { k: "say", text: "Count on from the bigger number." },
                        {
                            k: "ask",
                            how: "worked",
                            item: item("add.shown"),
                            questions: [question({ n: 0 })],
                            again: [],
                        },
                    ],
                },
                {
                    type: "do",
                    stars: null,
                    blocks: [
                        {
                            k: "ask",
                            how: "practice",
                            item: item("add.on"),
                            questions: [
                                adding,
                                question({ n: 2, variant: "a=7,b=5", answers: { answer: "12" } }),
                            ],
                            again: [
                                [
                                    question({ variant: "a=8,b=3" }),
                                    question({ n: 2, variant: "a=9,b=2" }),
                                ],
                                [
                                    question({ variant: "a=5,b=5" }),
                                    question({ n: 2, variant: "a=6,b=6" }),
                                ],
                            ],
                        },
                        {
                            k: "ask",
                            how: "show",
                            item: item("code.build", { name: "coding.builds", settings: {} }),
                            questions: [question({ n: 3, answers: { answer: "right 2, down 1" } })],
                            again: [],
                        },
                        {
                            k: "ask",
                            how: "show",
                            item: item("code.steps", { name: "coding.runs", settings: {} }),
                            questions: [question({ n: 7, answers: { col: "3", row: "2" } })],
                            again: [],
                        },
                        {
                            k: "ask",
                            how: "show",
                            item: item("write.sentence"),
                            questions: [
                                question({
                                    n: 4,
                                    answers: { answer: "The cat sat on the warm mat by the door." },
                                }),
                            ],
                            again: [],
                        },
                        {
                            k: "ask",
                            how: "show",
                            item: item("write.caption", {
                                name: "writing.by-eye",
                                settings: {
                                    "look-for": "A caption that says what is in the picture.",
                                },
                            }),
                            questions: [question({ n: 5, answers: {}, hints: [] })],
                            again: [],
                        },
                        {
                            k: "ask",
                            how: "show",
                            item: item("write.speech"),
                            questions: [
                                question({
                                    n: 6,
                                    answers: { pick: "b" },
                                    labels: { pick: "“Wait for me,” called Sam." },
                                    scene: choosing("pick", [
                                        { label: "“Wait for me, called Sam.”", value: "a" },
                                        { label: "“Wait for me,” called Sam.", value: "b" },
                                    ]),
                                }),
                            ],
                            again: [],
                        },
                    ],
                },
            ],
        },
    },
};

describe("a lesson's questions at a level", () => {
    it("lists them in page order, each with how it is answered: a coding question with an answer is typed, and a program is built", () => {
        const asked = askedIn(lesson, "medium");
        assert.deepEqual(
            asked.map((a) => [a.section, a.ref.n, a.ref.variant, a.way]),
            [
                ["look", 0, "a=6,b=4", "worked"],
                ["do", 1, "a=6,b=4", "typed"],
                ["do", 2, "a=7,b=5", "typed"],
                ["do", 3, "a=6,b=4", "program"],
                ["do", 7, "a=6,b=4", "typed"],
                ["do", 4, "a=6,b=4", "elsewhere"],
                ["do", 5, "a=6,b=4", "grown-up"],
                ["do", 6, "a=6,b=4", "typed"],
            ],
        );
        assert.deepEqual(asked[1]?.ref, {
            lesson: "g1-adding",
            lessonHash: "medium-hash",
            section: "do",
            n: 1,
            item: "add.on",
            itemHash: "add.on-hash",
            variant: "a=6,b=4",
            ask: "6 and 4 make how many?",
            skills: ["add.count-on"],
        });
    });

    it("asks another day's draw of each practice block, and the rest as the page does", () => {
        assert.deepEqual(
            askedIn(lesson, "medium", 2).map((a) => a.ref.variant),
            [
                "a=6,b=4",
                "a=5,b=5",
                "a=6,b=6",
                "a=6,b=4",
                "a=6,b=4",
                "a=6,b=4",
                "a=6,b=4",
                "a=6,b=4",
            ],
        );
    });

    it("asks a level the lesson does not declare as the lesson is written", () => {
        assert.deepEqual(askedIn(lesson, "easy"), askedIn(lesson, "medium"));
        assert.equal(began("s1", lesson, "hard", "digest").lessonHash, "medium-hash");
    });
});

describe("checking a typed answer", () => {
    it("reads past case, spacing and a thousands comma, and takes a picked answer's label", () => {
        assert.equal(
            checkTyped(question({ answers: { answer: "1000" } }), { answer: " 1,000 " })?.right,
            true,
        );
        const pick = question({ answers: { answer: "b" }, labels: { answer: "Circle" } });
        assert.equal(checkTyped(pick, { answer: "circle" })?.right, true);
        assert.equal(checkTyped(pick, { answer: "b" })?.right, true);
        assert.deepEqual(checkTyped(pick, { answer: "Circle" })?.given, {
            k: "pick",
            option: "Circle",
        });
        assert.equal(checkTyped(question({}), { answer: "  " }), null, "an empty box is not a try");
    });

    it("says the author's line for the mistake a wrong answer makes, and points where the rule points", () => {
        const got = checkTyped(adding, { answer: "2" });
        assert.equal(got?.right, false);
        assert.equal(got?.said, "That is 6 take away 4. Put them together.");
        assert.equal(got?.point, "bar");
        assert.deepEqual(got?.given, { k: "number", text: "2" });
    });

    it("reads a rule's own rules after it, and fills in the child's answer where the line names it", () => {
        const got = checkTyped(adding, { answer: "24" });
        assert.equal(got?.said, "That is more than both together.", "the first true rule speaks");
        const inner = question({
            feedback: [
                rule("answer < 0", "Below nothing.", null, [
                    rule("answer == a * b", "{answer} is 6 lots of 4, not 6 and 4."),
                ]),
            ],
        });
        assert.equal(checkTyped(inner, { answer: "24" })?.said, "24 is 6 lots of 4, not 6 and 4.");
    });

    it("fires no rule on a right answer, even one a rule would be true for", () => {
        const careless = question({
            feedback: [rule("answer == 10", "This should never be said.")],
        });
        const got = checkTyped(careless, { answer: "10" });
        assert.deepEqual([got?.right, got?.rule, got?.said, got?.point], [true, null, null, null]);
    });

    it("reads a decimal and a fraction as numbers, so a rule about them can speak", () => {
        const half = question({
            answers: { answer: "1/2" },
            feedback: [rule("answer == 1/4", "That is a quarter.")],
        });
        assert.equal(checkTyped(half, { answer: "1/4" })?.said, "That is a quarter.");
        const tenths = question({
            answers: { answer: "0.5" },
            feedback: [rule("answer == 5", "The point is missing.")],
        });
        assert.equal(checkTyped(tenths, { answer: "5" })?.said, "The point is missing.");
        const words = question({
            answers: { answer: "tall" },
            feedback: [rule('answer == "short"', "The other way round.")],
        });
        assert.equal(checkTyped(words, { answer: "short" })?.said, "The other way round.");
    });

    it("takes a picked answer by its option, however long the option's words", () => {
        const speech = askedIn(lesson, "medium").find((a) => a.ref.n === 6)?.question;
        assert.ok(speech);
        assert.equal(checkTyped(speech, { pick: "b" })?.right, true);
        assert.equal(checkTyped(speech, { pick: "a" })?.right, false);
        assert.deepEqual(checkTyped(speech, { pick: "b" })?.given, { k: "pick", option: "b" });
    });

    it("marks several boxes right only when every box is, and records what each said", () => {
        const two = question({ answers: { tens: "3", ones: "4" } });
        assert.equal(checkTyped(two, { tens: "3", ones: "4" })?.right, true);
        const got = checkTyped(two, { tens: "4", ones: "3" });
        assert.deepEqual([got?.right, got?.given], [false, { k: "word", text: "tens=4, ones=3" }]);
    });
});

describe("tries, hints and what the child reads", () => {
    const wrong = (q: PackQuestion, text: string) => {
        const c = checkTyped(q, { answer: text });
        assert.ok(c);
        return c;
    };
    const step = (turn: Turn, q: PackQuestion, text: string) => {
        const next = tried(turn, q, wrong(q, text), "typed");
        assert.ok(next);
        return next;
    };

    it("says yes on the first try, and yes in other words after a wrong one", () => {
        assert.equal(step(FRESH, adding, "10").reply.say, LINES.right);
        const once = step(FRESH, adding, "2");
        assert.deepEqual([once.reply.state, once.reply.point], ["again", "bar"]);
        assert.equal(step(once.turn, adding, "10").reply.say, LINES["right-in-the-end"]);
    });

    it("shows the answer after the last try, and takes no more tries after that", () => {
        let turn = FRESH;
        let last = "";
        for (let i = 0; i < TRIES; i++) {
            const next = step(turn, adding, "7");
            turn = next.turn;
            last = next.reply.say;
        }
        assert.equal(turn.done, true);
        assert.equal(last, "The answer is 10. It will come back another day.");
        assert.equal(tried(turn, adding, wrong(adding, "10"), "typed"), null);
    });

    it("never tells a child how many tries they took, or cheers", () => {
        for (const line of Object.values(LINES)) {
            assert.doesNotMatch(line, /!|\d|tries|times|score|points/i, line);
        }
    });

    it("offers a hint when the grown-up's setting allows it, one rung at a time, and none once done", () => {
        assert.equal(mayHint(FRESH, adding, "on-request"), true);
        assert.equal(mayHint(FRESH, adding, "after-one-try"), false);
        const once = step(FRESH, adding, "2").turn;
        assert.equal(mayHint(once, adding, "after-one-try"), true);
        const first = hinted(once, adding);
        const second = first && hinted(first.turn, adding);
        assert.deepEqual([first?.hint, second?.hint], adding.hints);
        assert.equal(
            second && mayHint(second.turn, adding, "on-request"),
            false,
            "past the last rung",
        );
        assert.equal(mayHint(step(FRESH, adding, "10").turn, adding, "on-request"), false);
    });
});

describe("an answer arranged on a drawing", () => {
    const plank = question({
        answers: { plank: "level" },
        arranged: { part: "plank", right: e("turning == 0"), key: [{ piece: "bag(0)", at: 2 }] },
        feedback: [
            rule(
                "turning < 0",
                "The left side still goes down. Move a weight further out on the right.",
                "left",
            ),
        ],
    });

    it("is right when the part's measures meet the answer, and wrong ones hear the author's line", () => {
        const places = [{ piece: "bag(0)", at: 2 }];
        assert.equal(
            checkArranged(plank, "balance-plank", places, { turning: num(0) })?.right,
            true,
        );
        const got = checkArranged(plank, "balance-plank", places, { turning: num(-4) });
        assert.deepEqual([got?.right, got?.point], [false, "left"]);
        assert.deepEqual(got?.given, { k: "arranged", part: "balance-plank", places });
        assert.equal(checkArranged(plank, "balance-plank", [], { turning: num(0) }), null);
        assert.equal(
            checkArranged(question({}), "balance-plank", places, { turning: str("x") }),
            null,
        );
    });

    it("after the last try keeps the author's line and says that one way is drawn now", () => {
        const got = checkArranged(plank, "balance-plank", [{ piece: "bag(0)", at: -1 }], {
            turning: num(-8),
        });
        assert.ok(got);
        let turn = FRESH;
        let say = "";
        for (let i = 0; i < TRIES; i++) {
            const next = tried(turn, plank, got, "arranged");
            assert.ok(next);
            turn = next.turn;
            say = next.reply.say;
        }
        assert.equal(
            say,
            `The left side still goes down. Move a weight further out on the right. ${LINES["shown-arranged"]}`,
        );
    });
});

describe("a program a child builds", () => {
    const build = askedIn(lesson, "medium").find((a) => a.way === "program");
    const lines = [
        { text: "repeat 2", depth: 0 },
        { text: "right 1", depth: 1 },
    ];

    it("is right when its run does the job, and records the lines as the child set them in", () => {
        assert.ok(build);
        assert.equal(checkProgram([], true), null);
        const c = checkProgram(lines, true);
        assert.ok(c);
        assert.deepEqual(c, {
            right: true,
            given: { k: "program", lines },
            rule: null,
            said: null,
            point: null,
        });
        assert.equal(tried(FRESH, build.question, c, "program")?.reply.say, LINES.right);
    });

    it("after the last try says what the run did and that a program that works is in the slots", () => {
        assert.ok(build);
        const wrong = checkProgram(lines, false);
        assert.ok(wrong);
        const again = tried(FRESH, build.question, wrong, "program");
        assert.equal(again?.reply.state, "again");
        assert.equal(again?.reply.say, LINES["not-yet"]);
        const last = tried({ ...FRESH, tries: TRIES - 1 }, build.question, wrong, "program");
        assert.equal(last?.reply.state, "shown");
        assert.equal(last?.reply.say, `${LINES["not-yet"]} ${LINES["shown-program"]}`);
        assert.equal(last?.turn.done, true);
    });
});

describe("what a sitting records", () => {
    const envelope = (kind: EventKind, data: unknown) =>
        check({
            id: "00000000-0000-4000-8000-000000000001",
            family_id: "00000000-0000-4000-8000-000000000002",
            kid_id: "00000000-0000-4000-8000-000000000003",
            kind,
            data,
            actor: null,
            device: "00000000-0000-4000-8000-000000000004",
            seq: 0,
            at: "2026-09-15T15:00:00.000Z",
        });

    it("records the beginning, an answer and a hint in shapes the log accepts", () => {
        const asked = askedIn(lesson, "medium")[1];
        assert.ok(asked);
        const c = checkTyped(asked.question, { answer: "2" });
        const next = c && tried(FRESH, asked.question, c, "typed");
        const opened = next && hinted(next.turn, asked.question);
        assert.ok(c && next && opened);
        const timing = {
            k: "screen" as const,
            toFirstInput: 1200,
            toAnswer: 3400,
            leftPage: false,
        };
        for (const [kind, data] of [
            ["sitting-began", began("s1", lesson, "medium", "digest")],
            ["answered", answered("s1", asked, next.turn, c, timing)],
            ["hint-opened", hintOpened("s1", asked, opened.turn)],
            ["sitting-ended", ended("s1", true, 1_000, 400_000)],
        ] as const) {
            const made = envelope(kind, data);
            assert.ok(made.ok, made.ok ? "" : `${kind}: ${made.problem}`);
        }
        assert.deepEqual(
            [
                answered("s1", asked, next.turn, c, timing).rule,
                hintOpened("s1", asked, opened.turn).rung,
            ],
            ["That is 6 take away 4. Put them together.", 1],
        );
    });

    it("records a piece handed in for a grown-up as collected, neither right nor wrong, and takes it once", () => {
        const asked = askedIn(lesson, "medium").find((a) => a.way === "grown-up");
        assert.ok(asked);
        const turn = handIn({ ...FRESH, hints: 1 });
        assert.ok(turn);
        assert.deepEqual(turn, {
            tries: 1,
            hints: 1,
            done: true,
            pinned: false,
            right: false,
            given: { k: "unmarked" },
        });
        assert.equal(handIn(turn), null);
        const timing = { k: "screen" as const, toFirstInput: 9000, toAnswer: 0, leftPage: false };
        const data = handedIn("s1", asked, turn, timing);
        assert.deepEqual(
            { given: data.given, right: data.right, rule: data.rule, tries: data.tries },
            { given: { k: "unmarked" }, right: null, rule: null, tries: 1 },
        );
        const made = envelope("answered", data);
        assert.ok(made.ok, made.ok ? "" : made.problem);
        assert.equal(LINES[HANDED.writing], "A grown-up will read it.");
    });

    it("asks for a painting as a piece to hand in too, with its own line", () => {
        const painted: PackLesson = {
            ...lesson,
            levels: {
                medium: {
                    hash: "m",
                    grownUps: [],
                    sections: [
                        {
                            type: "try",
                            stars: null,
                            blocks: [
                                {
                                    k: "ask",
                                    how: "show",
                                    item: item("art.walk", { name: "art.by-eye", settings: {} }),
                                    questions: [question({ n: 1, answers: {} })],
                                    again: [],
                                },
                            ],
                        },
                    ],
                },
            },
        };
        assert.deepEqual(
            askedIn(painted, "medium").map((a) => a.way),
            ["grown-up"],
        );
        assert.equal(LINES[HANDED.painting], "A grown-up will look at it.");
    });
});

describe("a sitting picked up again", () => {
    const at = (n: number): string => `2026-09-15T15:${String(n).padStart(2, "0")}:00.000Z`;
    const stamp = (i: number, kind: EventKind, data: unknown) => {
        const made = check({
            id: `00000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`,
            family_id: "00000000-0000-4000-8000-000000000002",
            kid_id: "00000000-0000-4000-8000-000000000003",
            kind,
            data,
            actor: null,
            device: "00000000-0000-4000-8000-000000000004",
            seq: i,
            at: at(i),
        });
        if (!made.ok) throw new Error(made.problem);
        return made.envelope;
    };
    const q = (n: number) => ({
        lesson: "l",
        lessonHash: "h",
        section: "exercises",
        n,
        item: "i",
        itemHash: "ih",
        variant: "a=1",
        ask: "?",
        skills: [],
    });
    const timing = { k: "screen" as const, toFirstInput: 100, toAnswer: 200, leftPage: false };
    const tried = (i: number, n: number, right: boolean, tries: number, hints = 0) =>
        stamp(i, "answered", {
            sitting: "s1",
            q: q(n),
            given: { k: "number", text: "1" },
            timing,
            right,
            tries,
            rule: null,
            hints,
        });

    it("finds where each question stood: done when right or after the last try, tried and open otherwise, with its hints", () => {
        const events = [
            stamp(1, "sitting-began", {
                sitting: "s1",
                lesson: "l",
                lessonHash: "h",
                pack: "p",
                mode: "screen",
            }),
            tried(2, 1, false, 1),
            stamp(3, "hint-opened", { sitting: "s1", q: q(1), rung: 1 }),
            tried(4, 1, true, 2, 1),
            tried(5, 2, false, 1),
            tried(6, 2, false, 2),
            tried(7, 2, false, TRIES),
            tried(8, 3, false, 1),
            stamp(9, "hint-opened", { sitting: "s1", q: q(3), rung: 1 }),
            // another sitting of the same lesson is not this one
            tried(10, 4, true, 1),
        ];
        const other = events.map((e) =>
            e.seq === 10 && e.kind === "answered"
                ? { ...e, data: { ...e.data, sitting: "s0" } }
                : e,
        );
        const turns = turnsOf(other, "s1");
        const given = { k: "number", text: "1" };
        assert.deepEqual(
            [...turns].sort((a, b) => a[0] - b[0]),
            [
                [1, { tries: 2, hints: 1, done: true, right: true, pinned: false, given }],
                [2, { tries: TRIES, hints: 0, done: true, right: false, pinned: false, given }],
                [3, { tries: 1, hints: 1, done: false, right: false, pinned: false, given }],
            ],
        );
        assert.equal(turnsOf(other, "s0").get(4)?.done, true);
        assert.equal(turnsOf([], "s1").size, 0);
        const handed = stamp(11, "answered", {
            sitting: "s1",
            q: q(5),
            given: { k: "unmarked" },
            timing,
            right: null,
            tries: 1,
            rule: null,
            hints: 0,
        });
        assert.deepEqual(turnsOf([handed], "s1").get(5), {
            tries: 1,
            hints: 0,
            done: true,
            right: false,
            pinned: false,
            given: { k: "unmarked" },
        });
    });

    it("reads what the child wrote back by the answer's name, for one box, a pick, and several boxes", () => {
        assert.deepEqual(writtenOf(adding, { k: "number", text: "10" }), { answer: "10" });
        assert.deepEqual(writtenOf(adding, { k: "word", text: "ten" }), { answer: "ten" });
        const picked = question({ answers: { pick: "x" }, labels: { pick: "apple" } });
        assert.deepEqual(writtenOf(picked, { k: "pick", option: "apple" }), { pick: "apple" });
        const two = question({ answers: { a: "3", b: "4" } });
        assert.deepEqual(writtenOf(two, { k: "word", text: "a=3, b=5" }), { a: "3", b: "5" });
        assert.deepEqual(writtenOf(adding, undefined), {});
        assert.deepEqual(
            writtenOf(adding, {
                k: "arranged",
                part: "plank",
                places: [{ piece: "bag(0)", at: 3 }],
            }),
            {},
            "an arrangement is not written in a box",
        );
    });
});

describe("what the sheet sets", () => {
    it("reads a picked answer's options off the choice part named for the answer, and none for a typed one", () => {
        const picked = question({
            answers: { pick: "x" },
            labels: { pick: "apple" },
            scene: choosing("pick", [
                { label: "apple", value: "x" },
                { label: "ball", value: "y" },
            ]),
        });
        assert.deepEqual(optionsOf(picked, "pick"), [
            { label: "apple", value: "x" },
            { label: "ball", value: "y" },
        ]);
        assert.deepEqual(optionsOf(adding, "answer"), []);
    });

    it("ends a sitting with the minutes since it began, at least one", () => {
        assert.deepEqual(
            [ended("s1", true, 0, 30_000).minutes, ended("s1", false, 0, 9.4 * 60_000).minutes],
            [1, 9],
        );
    });
});

describe("the guide's card", () => {
    const withScene = question({
        n: 1,
        scene: {
            size: [10, 4],
            nodes: [
                { type: "row", id: "row", v: {}, place: null, contains: ["bus"] },
                { type: "bus", id: "bus", v: {}, place: null },
            ],
            arrows: [],
            marks: [],
            boxes: { bus: { x: 0, y: 0, w: 4, h: 4 } },
        },
    });
    const easyLesson: PackLesson = {
        ...lesson,
        levels: {
            ...lesson.levels,
            easy: {
                hash: "easy-hash",
                grownUps: [],
                sections: [
                    {
                        type: "do",
                        stars: null,
                        blocks: [
                            {
                                k: "ask",
                                how: "practice",
                                item: item("add.on"),
                                questions: [
                                    question({ variant: "a=2,b=1", answers: { answer: "3" } }),
                                ],
                                again: [],
                            },
                        ],
                    },
                ],
            },
        },
    };

    it("prefers an authored target and otherwise rings a drawing the scene contains", () => {
        assert.equal(
            pointOf({
                ...adding,
                feedback: [rule("answer == 1", "No.", "bus")],
                scene: withScene.scene,
            }),
            "bus",
        );
        assert.equal(pointOf(withScene), "bus");
        assert.equal(pointOf(adding), null);
        // A missing authored target falls back to a drawing that is actually present.
        const elsewhere = question({
            feedback: [rule("answer == 1", "No.", "tree")],
            scene: withScene.scene,
        });
        assert.equal(pointOf(elsewhere), "bus");
        assert.ok(withScene.scene);
        assert.equal(
            pointOf({ ...elsewhere, scene: { ...withScene.scene, nodes: [], boxes: {} } }),
            null,
        );
    });

    it("offers the lesson's worked example of the same item first, else the item at the easy level, else nothing", () => {
        const asked = askedIn(lesson, "medium");
        const shown = asked.find((a) => a.item.id === "add.shown" && a.question.n === 0);
        const practice = asked.find((a) => a.item.id === "add.on" && a.question.n === 1);
        assert.ok(shown && practice);
        // the worked example is its own item here, so the practice question has no worked example of its own
        assert.equal(easierOf(lesson, "medium", practice), null);
        const easy = easierOf(easyLesson, "medium", practice);
        assert.equal(easy?.kind, "easy");
        assert.equal(easy?.kind === "easy" && easy.asked.question.answers.answer, "3");
        // at the easy level there is nothing easier
        const atEasy = askedIn(easyLesson, "easy")[0];
        assert.ok(atEasy);
        assert.equal(easierOf(easyLesson, "easy", atEasy), null);
        // a worked example of the same item wins over the easy level
        const worked: PackLesson = {
            ...easyLesson,
            levels: {
                ...easyLesson.levels,
                medium: {
                    ...easyLesson.levels.medium,
                    sections: [
                        {
                            type: "do",
                            stars: null,
                            blocks: [
                                {
                                    k: "ask",
                                    how: "worked",
                                    item: item("add.on"),
                                    questions: [question({ n: 0 })],
                                    again: [],
                                },
                                {
                                    k: "ask",
                                    how: "practice",
                                    item: item("add.on"),
                                    questions: [adding],
                                    again: [],
                                },
                            ],
                        },
                    ],
                },
            },
        };
        const p = askedIn(worked, "medium").find((a) => a.question.n === 1);
        assert.ok(p);
        assert.equal(easierOf(worked, "medium", p)?.kind, "worked");
    });

    it("pins a question handed to the grown-up once, never a done one, and reads the pin back from the log", () => {
        const turn = pinned(FRESH);
        assert.ok(turn);
        assert.equal(turn.pinned, true);
        assert.equal(pinned(turn), null);
        assert.equal(pinned({ ...FRESH, done: true }), null);
        const asked = askedIn(lesson, "medium").find((a) => a.question.n === 1);
        assert.ok(asked);
        const data = helpAsked("s1", asked, "grown-up", null);
        const made = check({
            id: "00000000-0000-4000-8000-000000000001",
            family_id: "00000000-0000-4000-8000-000000000002",
            kid_id: "00000000-0000-4000-8000-000000000003",
            kind: "help-asked",
            data,
            actor: null,
            device: "00000000-0000-4000-8000-000000000004",
            seq: 0,
            at: "2026-09-21T10:00:00.000Z",
        });
        assert.ok(made.ok, made.ok ? "" : made.problem);
        const e: Envelope = {
            id: "00000000-0000-4000-8000-000000000001",
            family_id: "00000000-0000-4000-8000-000000000002",
            kid_id: "00000000-0000-4000-8000-000000000003",
            kind: "help-asked",
            data,
            actor: null,
            device: "00000000-0000-4000-8000-000000000004",
            seq: 1,
            at: "2026-09-21T10:00:00.000Z",
        };
        assert.equal(turnsOf([e], "s1").get(1)?.pinned, true);
        assert.equal(leftOf(asked, turnsOf([e], "s1").get(1) ?? FRESH, "on-request").pinned, true);
        // the other asks pin nothing
        const where: Envelope = {
            ...e,
            id: "00000000-0000-4000-8000-000000000005",
            data: helpAsked("s1", asked, "where", "bus"),
        };
        assert.equal(turnsOf([where], "s1").get(1), undefined);
    });

    it("reads only the question's own words, its hints, its rules' lines and the fixed lines", () => {
        const lines = voiceable(adding);
        assert.deepEqual(lines.slice(0, 3), [adding.ask, ...adding.hints]);
        assert.ok(lines.includes("That is 6 take away 4. Put them together."));
        assert.ok(lines.includes("{answer} is 6 lots of 4, not 6 and 4."));
        for (const h of ["no-hint", "no-easier", "handoff", "today", "read"] as const)
            assert.ok(lines.includes(LINES[h]));
        for (const l of lines) assert.doesNotMatch(l, /[!—]|\bI\b/);
    });
});
