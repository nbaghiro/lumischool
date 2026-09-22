// A lesson compiled for the pack asks what the lesson page asks: the same questions in the same order
// with the same variants and answers, reads back through the pack's own checker, and carries two more
// draws of each practice block, the ones the demo draws for another day.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readLesson, type PackLesson, type PackQuestion } from "../../pack";
import { AGAIN, compileLesson, keyOf, STEP } from "../compile";
import { questions } from "../lessons";
import { Workspace } from "../notation";
import { pick } from "../verify";
import { content } from "./helpers";

const ws = new Workspace(content(), { verify: "when read" });
const compiled = [...ws.lessons.values()].map((lesson) => ({
    lesson,
    pack: compileLesson(ws, lesson, () => "h"),
}));
const asked = (qs: PackQuestion[]): string[] =>
    qs.map((q) => `${q.n} ${q.variant} ${JSON.stringify(q.answers)}`);
const blocksOf = (pack: PackLesson): PackLesson["levels"]["medium"]["sections"][number]["blocks"] =>
    pack.levels.medium.sections.flatMap((s) => s.blocks);

test("every lesson compiles to what its page asks, in order", () => {
    for (const { lesson, pack } of compiled) {
        const page = [...questions(ws, lesson).values()]
            .flat()
            .map((q) => `${q.n} ${keyOf(q.variant)} ${JSON.stringify(q.variant.answers)}`);
        const packed = blocksOf(pack).flatMap((b) => (b.k === "ask" ? asked(b.questions) : []));
        assert.deepEqual(packed, page, lesson.id);
    }
});

test("each level a lesson declares compiles to what its page asks at that level, and a lesson without levels has medium only", () => {
    let levelled = 0;
    for (const { lesson, pack } of compiled) {
        const declared = lesson.levels ?? ["medium"];
        assert.deepEqual(Object.keys(pack.levels).sort(), [...declared].sort(), lesson.id);
        for (const level of declared) {
            const at = level === "medium" ? lesson : ws.lessonAt(lesson.id, level);
            assert.ok(at, `${lesson.id} at ${level}`);
            const page = [...questions(ws, at).values()]
                .flat()
                .map((q) => `${q.n} ${keyOf(q.variant)} ${JSON.stringify(q.variant.answers)}`);
            const packed = (pack.levels[level]?.sections ?? []).flatMap((s) =>
                s.blocks.flatMap((b) => (b.k === "ask" ? asked(b.questions) : [])),
            );
            assert.deepEqual(packed, page, `${lesson.id} at ${level}`);
            if (level !== "medium") levelled++;
        }
    }
    assert.ok(levelled >= 12, `only ${levelled} levels besides medium`);
});

test("every compiled lesson reads back through the pack's checker once it has been through JSON", () => {
    for (const { lesson, pack } of compiled) {
        const read = readLesson(JSON.parse(JSON.stringify(pack)));
        assert.ok(read.ok, `${lesson.id}: ${read.ok ? "" : read.problem}`);
    }
});

test("each practice block carries its next draws, numbered as the block is", () => {
    let blocks = 0;
    for (const { lesson, pack } of compiled) {
        const asks = questions(ws, lesson);
        const practice = lesson.sections.flatMap((s) =>
            s.blocks.filter((b) => b.type === "practice" && asks.get(b)?.length),
        );
        const packed = blocksOf(pack).flatMap((b) =>
            b.k === "ask" && b.how === "practice" ? [b] : [],
        );
        assert.equal(packed.length, practice.length, lesson.id);
        for (const [i, b] of packed.entries()) {
            const node = practice[i];
            assert.ok(node);
            const count = node.props.count?.k === "num" ? node.props.count.v : 1;
            const seed = node.props.seed?.k === "num" ? node.props.seed.v : 1;
            assert.equal(b.again.length, AGAIN, lesson.id);
            b.again.forEach((draw, d) => {
                const want = pick(
                    ws.reports.get(b.item.id)?.variants ?? [],
                    count,
                    seed + (d + 1) * STEP,
                ).map(keyOf);
                assert.deepEqual(
                    draw.map((q) => q.variant),
                    want,
                    `${lesson.id} draw ${d + 1}`,
                );
                assert.deepEqual(
                    draw.map((q) => q.n),
                    b.questions.map((q) => q.n).slice(0, draw.length),
                    `${lesson.id} draw ${d + 1}`,
                );
            });
            blocks++;
        }
    }
    assert.ok(blocks > 100, `only ${blocks} practice blocks were compiled`);
});
