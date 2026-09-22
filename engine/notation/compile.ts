// A lesson as the pack carries it (engine/pack.ts): at each level it declares, every question with the
// variant the lesson names made concrete, more draws of each practice block for another day, and every
// scene laid out, so a page shows and checks a lesson without the notation.
import { pieces } from "../expr";
import {
    PACK,
    type Level,
    type PackBlock,
    type PackItem,
    type PackLesson,
    type PackLevel,
    type PackQuestion,
    type PackRule,
} from "../pack";
import type { Scene } from "../scene";
import { fill, fillIndex, instantiate, layout, type SceneInstance } from "./instantiate";
import { artOf, questions, type Question } from "./lessons";
import {
    printTerm,
    type Item,
    type Lesson,
    type Rule,
    type TNode,
    type Workspace,
} from "./notation";
import { pick, type Variant } from "./verify";

/** How many more draws of a practice block a lesson carries for another day. */
export const AGAIN = 2;
/** Draw d of a practice block is picked with its seed plus STEP times d, as the demo's worker picks it. */
export const STEP = 101;

/** The sha256 of a lesson's or an item's notation text at a level, which a sitting and an answer record. */
type HashOf = (kind: "lesson" | "item", id: string, level: Level) => string;

export const keyOf = (v: Variant): string =>
    Object.entries(v.values)
        .map(([k, x]) => `${k}=${x}`)
        .join(",");

/**
 * A template filled for one variant on one line, as the lesson page says it, or the words as written
 * when it cannot be, which is when it names the child's answer; school/lessons fills those once there is one.
 */
function said(item: Item, v: Variant, s: string): string {
    try {
        return fill(pieces(s), v.env, item.roles)
            .replace(/\s*\n\s*/g, " ")
            .trim();
    } catch {
        return s;
    }
}

/** The question as it reads on the page: its `ask` text filled in, or its title. */
function askOf(item: Item, v: Variant): string {
    const ask = item.scene?.nodes.find((n) => n.type === "text" && n.id === "ask")?.args.text;
    return ask && ask.k === "text" ? said(item, v, ask.v) : (item.title ?? item.id);
}

/** A concrete scene as the pack carries it: laid out, and with nothing of the notation left in it. */
export function sceneOf(inst: SceneInstance): Scene {
    return {
        size: inst.size,
        nodes: inst.nodes.map(({ type, id, v, place, contains }) =>
            contains ? { type, id, v, place, contains } : { type, id, v, place },
        ),
        arrows: inst.arrows.map(({ from, to }) => ({ from, to })),
        marks: inst.marks.map(({ type, target, solution, v }) => ({ type, target, solution, v })),
        boxes: Object.fromEntries(layout(inst).boxes),
    };
}

function questionOf(ws: Workspace, item: Item, v: Variant, n: number): PackQuestion {
    const rule = (r: Rule): PackRule => ({
        when: r.when,
        say: r.say.map((s) => said(item, v, s)),
        point: r.point ? fillIndex(r.point, v.env) : null,
        children: r.children.map(rule),
    });
    const arranged = v.arranged;
    const right = arranged && item.answers.find((a) => a.name === arranged.id)?.expr;
    return {
        n,
        variant: keyOf(v),
        env: v.env,
        answers: v.answers,
        labels: v.labels ?? null,
        ask: askOf(item, v),
        hints: item.hints.map((h) => said(item, v, h)),
        feedback: item.feedback.map(rule),
        scene: item.scene ? sceneOf(instantiate(item.scene, v.env, item.roles, ws.defines)) : null,
        arranged: arranged && right ? { part: arranged.id, right, key: arranged.key } : null,
        explain: item.explain ? said(item, v, item.explain) : null,
    };
}

function itemOf(item: Item, level: Level, hashOf: HashOf): PackItem {
    const settings = (s: NonNullable<Item["check"]>["settings"]): Record<string, string> =>
        Object.fromEntries(
            Object.entries(s).map(([k, t]) => [
                k,
                t.k === "str" || t.k === "block" ? t.v : printTerm(t),
            ]),
        );
    return {
        id: item.id,
        hash: hashOf("item", item.id, item.level ?? level),
        title: item.title ?? null,
        skills: item.skills,
        check: item.check
            ? { name: item.check.name, settings: settings(item.check.settings) }
            : null,
    };
}

/** One level of a lesson, from the lesson resolved at that level. */
function levelOf(ws: Workspace, lesson: Lesson, level: Level, hashOf: HashOf): PackLevel {
    const asked = questions(ws, lesson);
    const again = (b: TNode, list: Question[], item: Item): PackQuestion[][] => {
        const variants = ws.reportFor(item)?.variants ?? [];
        const count = b.props.count?.k === "num" ? b.props.count.v : 1;
        const seed = b.props.seed?.k === "num" ? b.props.seed.v : 1;
        return Array.from({ length: AGAIN }, (_, d) =>
            pick(variants, count, seed + (d + 1) * STEP).map((v, i) =>
                questionOf(ws, item, v, list[i]?.n ?? 0),
            ),
        );
    };
    const blockOf = (b: TNode): PackBlock[] => {
        if (b.type === "say" || b.type === "grown-ups")
            return [{ k: b.type, text: b.args.text?.k === "text" ? b.args.text.v : "" }];
        if (b.type === "scene") {
            if (b.args.size?.k !== "size") return [];
            return [
                {
                    k: "scene",
                    scene: sceneOf(
                        instantiate(
                            { size: [b.args.size.w, b.args.size.h], nodes: b.children },
                            {},
                            {},
                            ws.defines,
                        ),
                    ),
                },
            ];
        }
        const list = asked.get(b);
        const item = list?.[0]?.item;
        if (!list || !item || (b.type !== "practice" && b.type !== "show" && b.type !== "worked"))
            return [];
        return [
            {
                k: "ask",
                how: b.type,
                item: itemOf(item, level, hashOf),
                questions: list.map((q) => questionOf(ws, q.item, q.variant, q.n)),
                again: b.type === "practice" ? again(b, list, item) : [],
            },
        ];
    };
    return {
        hash: hashOf("lesson", lesson.id, level),
        grownUps: lesson.grownUps,
        sections: lesson.sections.map((s) => ({
            type: s.type,
            stars: s.stars ?? null,
            blocks: s.blocks.flatMap(blockOf),
        })),
    };
}

/** Every level the lesson declares; a lesson that declares none has medium only, which is the lesson as written. */
export function compileLesson(ws: Workspace, lesson: Lesson, hashOf: HashOf): PackLesson {
    const levels: PackLesson["levels"] = { medium: levelOf(ws, lesson, "medium", hashOf) };
    const art = new Set(artOf(ws, lesson));
    for (const level of lesson.levels ?? []) {
        const at = level === "medium" ? undefined : ws.lessonAt(lesson.id, level);
        if (!at || level === "medium") continue;
        levels[level] = levelOf(ws, at, level, hashOf);
        for (const a of artOf(ws, at)) art.add(a);
    }
    return {
        pack: PACK,
        id: lesson.id,
        source: ws.file("lesson", lesson.id).path,
        title: lesson.title ?? lesson.id,
        goal: lesson.goal ?? null,
        grade: lesson.grade ?? 1,
        unit: lesson.unit ?? null,
        subject: lesson.subject ?? "maths",
        format: lesson.format,
        art: [...art].sort(),
        levels,
    };
}
