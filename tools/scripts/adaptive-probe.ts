// Plays scripted child paths on one question against the real model and writes what happened, so the
// adaptive tutor can be judged before it is widened. An explicit command, never part of a check.

import { mkdirSync, writeFileSync } from "node:fs";
import { compileLessons } from "../pack";
import { adaptiveContext, adaptiveTeachable } from "../../school/adaptive";
import type { AdaptiveTry, TutorMove } from "../../school/adaptive";
import { adaptiveTurn, type AdaptiveTurn } from "../../server/adaptive";
import { tutorConfig } from "../../server/gemini-tutoring";
import type { PackQuestion } from "../../engine/pack";
import type { Value } from "../../engine/expr";

const LESSON = "g1-counting-to-twenty";
const SKILLS = ["counting.to-twenty", "subtraction.compare"];
const ASK = "How many more beads are pushed across on the top wire";
const out = process.env.TUTOR_REPORT_DIR ?? ".scratchpad/leftover/adaptive";

function question(): PackQuestion {
    const lesson = compileLessons().find((l) => l.id === LESSON);
    if (!lesson) throw new Error(`no lesson ${LESSON}`);
    const asked = Object.values(lesson.levels).flatMap((at) =>
        at.sections.flatMap((s) =>
            s.blocks.flatMap((b) => (b.k === "ask" ? [...b.questions, ...b.again.flat()] : [])),
        ),
    );
    const q = asked.find((a) => a.ask.includes(ASK) && adaptiveTeachable(SKILLS, a));
    if (!q) throw new Error("no teachable rekenrek question");
    return q;
}

interface Path {
    name: string;
    /** What the child has done on the worksheet before asking for help. */
    tries: AdaptiveTry[];
    /** How the child answers each check the tutor asks: right, wrong, or nothing. */
    replies: ("right" | "wrong" | "none")[];
    turns: number;
}

const paths = (answer: number, top: number, bottom: number): Path[] => [
    {
        name: "right first time, then asks anyway",
        tries: [{ answer: String(answer), correct: true, told: null }],
        replies: ["right"],
        turns: 2,
    },
    {
        name: "both wires added (a rule knows it)",
        tries: [
            {
                answer: String(top + bottom),
                correct: false,
                told: "That is both wires together. How many more is the difference between them.",
            },
        ],
        replies: ["right", "right"],
        turns: 3,
    },
    {
        name: "the top wire alone (a rule knows it)",
        tries: [
            {
                answer: String(top),
                correct: false,
                told: "That is the top wire on its own. Take away the beads on the bottom wire.",
            },
        ],
        replies: ["right", "right"],
        turns: 3,
    },
    {
        name: "a mistake no rule knows",
        tries: [{ answer: "2", correct: false, told: null }],
        replies: ["right", "right"],
        turns: 3,
    },
    { name: "nothing typed, asks for help twice", tries: [], replies: ["none", "none"], turns: 3 },
    {
        name: "still does not understand after the first move",
        tries: [{ answer: "4", correct: false, told: null }],
        replies: ["wrong", "wrong"],
        turns: 3,
    },
    {
        name: "gets it after stepping back",
        tries: [
            {
                answer: String(bottom),
                correct: false,
                told: "That is the bottom wire on its own. How many more has the top wire.",
            },
        ],
        replies: ["wrong", "right", "right"],
        turns: 4,
    },
    {
        name: "taps randomly",
        tries: [{ answer: "1", correct: false, told: null }],
        replies: ["wrong", "wrong", "wrong"],
        turns: 4,
    },
];

const seen = (move: TutorMove): string =>
    `${move.origin}:${move.kind}${move.check ? `(${move.check.quantityId})` : ""}`;

async function main(): Promise<void> {
    const config = tutorConfig({ ...process.env, TUTORING_ENABLED: "1" });
    if (!config.key) throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY");
    const q = question();
    const wire = (v: Value | undefined): number => (v?.k === "num" ? v.v.n : 0);
    const top = wire(q.env.t);
    const bottom = wire(q.env.b);
    const answer = Number(Object.values(q.answers)[0]);
    const runs: unknown[] = [];
    const all: AdaptiveTurn[] = [];
    const lines: string[] = [
        `# Adaptive tutor probe, ${new Date().toISOString()}`,
        ``,
        `Question: ${LESSON} q${q.n} (${q.variant}). Top wire ${top}, bottom wire ${bottom}, answer ${answer}.`,
        `Ask: ${q.ask}`,
        `Model: ${config.model}`,
        ``,
    ];
    for (const path of paths(answer, top, bottom)) {
        lines.push(`## ${path.name}`);
        const tries = [...path.tries];
        const made: string[] = [];
        const turns: unknown[] = [];
        let pending: TutorMove | null = null;
        for (let i = 0; i < path.turns; i++) {
            const context = adaptiveContext({
                lessonId: LESSON,
                skills: SKILLS,
                question: q,
                tries,
                made,
            });
            if (!context) throw new Error("no ground for this question");
            const turn = await adaptiveTurn(config, context);
            all.push(turn);
            made.push(seen(turn.move));
            const reply = path.replies[i] ?? "none";
            let childDid = "read it";
            if (turn.move.check) {
                const right = turn.move.check.correct;
                const wrong = turn.move.check.choices.find((c) => c !== right) ?? right;
                if (reply === "right") childDid = `answered ${right}, which is right`;
                else if (reply === "wrong") childDid = `answered ${wrong}, which is wrong`;
                else childDid = "answered nothing";
            }
            pending = turn.move;
            lines.push(
                `- turn ${i + 1}: ${turn.move.origin} ${turn.move.kind}` +
                    `${turn.move.ring ? ` ringing ${turn.move.ring}` : ""}` +
                    `${turn.refused ? ` [refused: ${turn.refused.reason}, ${turn.refused.detail}]` : ""}` +
                    `${turn.problem ? ` [problem: ${turn.problem}]` : ""}` +
                    `${turn.move.repaired ? ` [repaired: ${turn.move.repaired}]` : ""}`,
                `  says: ${turn.move.say}`,
                ...(turn.move.check
                    ? [
                          `  asks: ${turn.move.check.prompt} choices ${turn.move.check.choices.join(", ")} correct ${turn.move.check.correct}`,
                      ]
                    : []),
                `  child: ${childDid}`,
                `  ${turn.latencyMs} ms, ${turn.inputTokens} in, ${turn.outputTokens} out${turn.retried ? ", retried" : ""}`,
            );
            turns.push({
                turn: i + 1,
                move: turn.move,
                proposal: turn.proposal,
                refused: turn.refused,
                problem: turn.problem,
                retried: turn.retried,
                latencyMs: turn.latencyMs,
                inputTokens: turn.inputTokens,
                outputTokens: turn.outputTokens,
                childDid,
            });
            if (turn.move.kind === "hand-back") break;
        }
        void pending;
        lines.push(``);
        runs.push({ path: path.name, turns });
    }
    mkdirSync(out, { recursive: true });
    writeFileSync(
        `${out}/probe.json`,
        JSON.stringify(
            { lesson: LESSON, question: q.variant, answer, model: config.model, runs },
            null,
            1,
        ),
    );
    writeFileSync(`${out}/probe.md`, lines.join("\n"));
    const latencies = all.map((t) => t.latencyMs).sort((a, b) => a - b);
    process.stdout.write(
        `${all.length} turns, ` +
            `median ${latencies[Math.floor(latencies.length / 2)]} ms, ` +
            `slowest ${latencies.at(-1)} ms, ` +
            `${all.filter((t) => t.refused).length} refused, ` +
            `${all.filter((t) => t.move.origin === "authored").length} fell back, ` +
            `${all.reduce((n, t) => n + t.inputTokens, 0)} in / ${all.reduce((n, t) => n + t.outputTokens, 0)} out tokens\n`,
    );
}

await main();
