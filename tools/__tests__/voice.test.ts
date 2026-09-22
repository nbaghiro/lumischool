// The guide's help over the whole curriculum (.docs/ai.md, "The guide"): every string the card can
// hand the voice for any question is one of that question's own strings or a fixed line (property
// 20), Where? rings something wherever a question draws something, and the guard over the guide's voice
// passes every line as the corpus stands.

import assert from "node:assert/strict";
import { before, test } from "node:test";
import { LEVELS, type PackLesson, type PackQuestion } from "../../engine/pack";
import { askedIn, easierOf, LINES, pointOf, voiceable } from "../../school/lessons";
import { compileLessons } from "../pack";
import { breachesOf } from "../../school/voice";
import { everyLine } from "../scripts/check-voice";

let lessons: PackLesson[] = [];
before(() => {
    lessons = compileLessons();
});

const questionsOf = (l: PackLesson): PackQuestion[] =>
    Object.values(l.levels).flatMap((at) =>
        at.sections.flatMap((s) =>
            s.blocks.flatMap((b) => (b.k === "ask" ? [...b.questions, ...b.again.flat()] : [])),
        ),
    );

test("every string the guide's card can read for a question is the question's own, or a fixed line", () => {
    const fixed = new Set(Object.values(LINES));
    let questions = 0;
    for (const l of lessons)
        for (const q of questionsOf(l)) {
            questions += 1;
            const own = new Set([q.ask, ...q.hints]);
            const walk = (rules: typeof q.feedback): void => {
                for (const r of rules) {
                    for (const s of r.say) own.add(s);
                    walk(r.children);
                }
            };
            walk(q.feedback);
            for (const line of voiceable(q))
                assert.ok(own.has(line) || fixed.has(line), `${l.id} q${q.n}: ${line}`);
        }
    assert.ok(questions > 1000, `only ${questions} questions were read`);
});

/**
 * Questions whose scene is only words and an answer, where Where? is not offered. It may fall as
 * scenes gain drawings, and a rise means a question that draws something stopped being ringable.
 */
const WORDS_ONLY = 1158;

/** Parts that say the question or take its answer, which are not a place to ring (school/lessons.ts). */
const SAYS = new Set(["text", "caption", "choice", "number-input", "word-input", "row", "column"]);

test("Where? rings something wherever a question draws something, and is not offered where a scene is only words", () => {
    let scenes = 0,
        easier = 0,
        wordsOnly = 0;
    for (const l of lessons) {
        for (const q of questionsOf(l))
            if (q.scene) {
                scenes += 1;
                const p = pointOf(q);
                if (p === null) {
                    wordsOnly += 1;
                    const drawn = q.scene.nodes.filter(
                        (n) => !SAYS.has(n.type) && n.id in (q.scene?.boxes ?? {}),
                    );
                    assert.deepEqual(
                        drawn.map((n) => n.id),
                        [],
                        `${l.id} q${q.n} draws something and rings nothing`,
                    );
                } else
                    assert.ok(p in q.scene.boxes, `${l.id} q${q.n} rings ${p}, which has no box`);
            } else assert.equal(pointOf(q), null);
        for (const level of LEVELS)
            for (const a of askedIn(l, level)) {
                const e = easierOf(l, level, a);
                if (!e) continue;
                easier += 1;
                const own = questionsOf(l);
                const q = e.kind === "worked" ? e.question : e.asked.question;
                assert.ok(
                    own.includes(q),
                    `${l.id} q${a.question.n}: an easier thing from elsewhere`,
                );
                if (e.kind === "easy") assert.equal(e.asked.item.id, a.item.id);
            }
    }
    assert.ok(scenes > 100, `only ${scenes} scenes were read`);
    assert.ok(easier > 0, "no question offers an easier thing");
    assert.ok(
        wordsOnly <= WORDS_ONLY,
        `${wordsOnly} questions with a scene have nothing to ring, over ${WORDS_ONLY}`,
    );
});

test("the guard over the guide's voice passes every line the guide can say as the corpus stands", () => {
    const bad = everyLine().flatMap((s) =>
        breachesOf(s.line, { words: s.words }).map((b) => `${s.where}: ${b}: ${s.line}`),
    );
    assert.deepEqual(bad, []);
});
