// Fails when a line the world's guide can say breaks the rules on its voice (.docs/ai.md, "The
// guide"): no first person about itself, no name of its own beyond "the firefly", no relational
// vocabulary, no exclamation mark and no em-dash. The lines are the guide's fixed lines and the
// words on its asks, every world's own lines, and every hint and rule line of the curriculum, which
// the guide reads aloud; a question's own words are held to the marks only. The rules are
// school/voice.ts, which the children's app holds its map's tips to in its own test. `--selftest`
// plants each kind of breach and fails if one goes unreported.

import { ASK_WORDS } from "../../engine/ui/asks";
import { LINES } from "../../school/lessons";
import { breachesOf, type Breach } from "../../school/voice";
import { WORLDS } from "../../school/worlds/worlds";
import { compileLessons } from "../pack";

interface Said {
    where: string;
    line: string;
    /** Whether the line is the guide's own words, held to every rule, or a question's, held to the marks. */
    words: boolean;
}

/** Every line the guide can say, with where it comes from. */
export function everyLine(): Said[] {
    const said: Said[] = [];
    for (const [k, line] of Object.entries(LINES))
        said.push({ where: `LINES.${k}`, line, words: true });
    for (const [k, line] of Object.entries(ASK_WORDS))
        said.push({ where: `ASK_WORDS.${k}`, line, words: true });
    for (const w of WORLDS) {
        said.push({ where: `${w.id}.arrive`, line: w.arrive, words: true });
        for (const r of w.reaches)
            said.push({ where: `${w.id}.reaches.${r.art}`, line: r.says, words: true });
    }
    const lessons = compileLessons();
    for (const l of lessons)
        for (const [level, at] of Object.entries(l.levels))
            for (const sec of at.sections)
                for (const b of sec.blocks) {
                    if (b.k !== "ask") continue;
                    for (const q of [...b.questions, ...b.again.flat()]) {
                        const where = `${l.id}/${level}/${q.n}`;
                        said.push({ where: `${where} ask`, line: q.ask, words: false });
                        for (const h of q.hints)
                            said.push({ where: `${where} hint`, line: h, words: true });
                        const walk = (rules: typeof q.feedback): void => {
                            for (const r of rules) {
                                for (const s of r.say)
                                    said.push({ where: `${where} say`, line: s, words: true });
                                walk(r.children);
                            }
                        };
                        walk(q.feedback);
                    }
                }
    return said;
}

function run(): number {
    const bad: string[] = [];
    let n = 0;
    for (const s of everyLine()) {
        n += 1;
        for (const b of breachesOf(s.line, { words: s.words }))
            bad.push(`${s.where}: ${b}: ${s.line}`);
    }
    for (const b of bad) process.stderr.write(`${b}\n`);
    if (bad.length) {
        process.stderr.write(
            `check:voice failed: ${bad.length} of ${n} lines break the guide's rules\n`,
        );
        return 1;
    }
    process.stdout.write(`check:voice passed (${n} lines the guide can say)\n`);
    return 0;
}

function selftest(): number {
    const planted: [string, Breach][] = [
        ["I think you can count it.", "first-person"],
        ["My favourite is the bus.", "first-person"],
        ["The Firefly will show you.", "a-name"],
        ["You are my friend.", "relational"],
        ["Well done!", "exclamation"],
        ["Count on — then check.", "em-dash"],
    ];
    let failed = 0;
    for (const [line, why] of planted) {
        if (!breachesOf(line, { words: true }).includes(why)) {
            process.stderr.write(`selftest: "${line}" was not reported as ${why}\n`);
            failed += 1;
        }
    }
    for (const ok of [
        "Try saying: I can ... Which word fits?",
        "Look for names, days of the week and the word I.",
        "Asking takes ?, a shout takes !, and telling takes a full stop.",
        "The firefly is not a friend.",
        "Count the empty squares.",
    ])
        if (breachesOf(ok, { words: true }).length) {
            process.stderr.write(
                `selftest: "${ok}" was refused: ${breachesOf(ok, { words: true }).join(", ")}\n`,
            );
            failed += 1;
        }
    if (!failed)
        process.stdout.write("selftest: every planted breach reported, and the plain lines pass\n");
    return failed ? 1 : 0;
}

if (process.argv.includes("--selftest")) process.exit(selftest());
if (process.argv.includes("--run")) process.exit(run());
