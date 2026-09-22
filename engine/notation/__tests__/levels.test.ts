import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LEVELS, type Level } from "../../pack";
import { levelMeasure, mediumBaseline, questions } from "../lessons";
import { format, parse, resolve, Workspace } from "../notation";
import { content } from "./helpers";

const files = content();
const ws = new Workspace(files);
const BASELINE = new URL("./levels-baseline.json", import.meta.url);

/** The baseline as tools/scripts/levels-baseline.ts wrote it. */
const baselineOf = (
    raw: unknown,
): { lessons: Record<string, string[]>; items: Record<string, string> } => {
    assert.ok(typeof raw === "object" && raw !== null && "lessons" in raw && "items" in raw);
    const lessons: Record<string, string[]> = {};
    const items: Record<string, string> = {};
    for (const [id, asked] of Object.entries(raw.lessons ?? {}))
        lessons[id] = Array.isArray(asked) ? asked.map(String) : [];
    for (const [id, hash] of Object.entries(raw.items ?? {})) items[id] = String(hash);
    return { lessons, items };
};

test("every lesson as written asks what the baseline recorded, and every item keeps its versions", () => {
    const was = baselineOf(JSON.parse(readFileSync(BASELINE, "utf8")));
    const now = mediumBaseline(ws);
    const changedLessons = Object.keys(was.lessons).filter(
        (id) =>
            now.lessons[id] && JSON.stringify(now.lessons[id]) !== JSON.stringify(was.lessons[id]),
    );
    const changedItems = Object.keys(was.items).filter(
        (id) => now.items[id] && now.items[id] !== was.items[id],
    );
    const gone = [...Object.keys(was.lessons), ...Object.keys(was.items)].filter(
        (id) => !now.lessons[id] && !now.items[id],
    );
    assert.deepEqual(
        changedLessons,
        [],
        "these lessons as written ask different questions; a level must not change medium, and a deliberate fix reruns npm run levels:baseline",
    );
    assert.deepEqual(
        changedItems,
        [],
        "these items' versions changed as written; a level must not change medium's versions",
    );
    assert.deepEqual(
        gone,
        [],
        "these lessons or items are gone; if that is deliberate, rerun npm run levels:baseline",
    );
});

test("a lesson with levels resolves at each, and harder levels measure harder", () => {
    for (const lesson of ws.lessons.values()) {
        const levels = lesson.levels ?? ["medium"];
        if (levels.length < 2) continue;
        const measured = levels.map((level) => {
            const at = ws.lessonAt(lesson.id, level);
            assert.ok(at, `${lesson.id} has no ${level}`);
            assert.equal(at.level, level);
            assert.ok(
                [...questions(ws, at).values()].flat().length > 0,
                `${lesson.id} asks nothing at ${level}`,
            );
            return levelMeasure(ws, at).difficulty;
        });
        for (let i = 1; i < measured.length; i++) {
            const a = measured[i - 1];
            const b = measured[i];
            if (a === null || a === undefined || b === null || b === undefined) continue;
            assert.ok(
                a < b,
                `${lesson.id}: ${levels[i - 1]} measures ${a.toFixed(2)} and ${levels[i]} ${b.toFixed(2)}`,
            );
        }
    }
});

const probe = (src: string): Workspace =>
    new Workspace({
        ...Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("components/"))),
        "items/probe.lumi": src,
    });
const issues = (w: Workspace): string[] =>
    [...w.files.values()].flatMap((f) => f.issues.map((i) => `${i.level}: ${i.message}`));

const ITEM = `item probe.bonds v=1 skills=[bonds-to-10] {
  title "Probe"
  difficulty (10 - n)
  let n=1..9
  level easy {
    let n=6..9
  }
  level hard {
    let n=1..4
    where (n != 2)
    hint "Count on from what you can see."
  }

  scene 26x8 {
    tenframe frame count=n color=berry at=canvas(1, 1)
    equation eq "{n} + {?more} = 10" right-of=frame gap=1
  }

  answer more=(10 - n)
  hint "How many empty squares?"
}
`;

test("medium is the file as written outside its levels, and each level changes only what it names", () => {
    const { doc } = parse(ITEM);
    const medium = format(resolve(doc, "medium").doc);
    assert.ok(!medium.includes("level ") && medium.includes("let n=1..9"));
    const hard = format(resolve(doc, "hard").doc);
    assert.ok(
        hard.includes("let n=1..4") &&
            hard.includes("where (n != 2)") &&
            hard.indexOf("Count on") > hard.indexOf("How many empty"),
    );
    assert.deepEqual(resolve(doc, "easy").levels, ["easy", "medium", "hard"]);
    const w = probe(ITEM);
    assert.deepEqual(issues(w), []);
    const variants = (level: Level): (string | undefined)[] => {
        const item = w.itemAt("probe.bonds", level);
        return item ? (w.reportFor(item)?.variants ?? []).map((v) => v.values.n) : [];
    };
    assert.deepEqual(variants("easy"), ["6", "7", "8", "9"]);
    assert.deepEqual(variants("medium"), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    assert.deepEqual(variants("hard"), ["1", "3", "4"]);
    assert.equal(w.textAt("item", "probe.bonds", "medium"), format(resolve(doc, "medium").doc));
});

test("a file without levels hashes as written", () => {
    const plain = ITEM.replace(
        /  level easy \{\n    let n=6..9\n  \}\n  level hard \{\n[\s\S]*?\n  \}\n/,
        "",
    ).replace("  difficulty (10 - n)\n", "");
    const w = probe(plain);
    assert.equal(w.textAt("item", "probe.bonds", "hard"), plain);
});

test("mistakes with levels are reported where they were written", () => {
    const bad = ITEM.replace("level easy {", "level eazy {").replace("let n=1..4", "let m=1..4");
    const found = issues(probe(bad));
    assert.ok(
        found.some((i) => i.includes('"eazy" is not a level')),
        found.join("\n"),
    );
    assert.ok(
        found.some((i) => i.includes('declares no parameter "m"')),
        found.join("\n"),
    );
    const flat = issues(
        probe(ITEM.replace("let n=1..4", "let n=6..9").replace("    where (n != 2)\n", "")),
    );
    assert.ok(
        flat.some((i) => i.startsWith("error: the item's difficulty falls from medium")),
        flat.join("\n"),
    );
});

test("a lesson's settings for one level apply there only, and a count of none drops the block", () => {
    const lesson = `lesson probe.lesson v=1 format=teach grade=1 subject=maths levels=[easy, medium, hard] {
  title "Probe"
  do {
    practice probe.bonds count=2 easy-count=3 hard-count=0 seed=1
    show probe.bonds n=5 easy-n=8 hard-n=3
    level hard {
      show probe.bonds n=2 level=medium
    }
  }
  level easy {
    grown-ups "At this level the frame has one to four empty squares."
  }
}
`;
    const w = new Workspace({ "items/probe.lumi": ITEM, "lessons/probe.lumi": lesson });
    assert.deepEqual(
        issues(w).filter((i) => i.startsWith("error")),
        [],
    );
    const asked = (level: Level): string[] => {
        const at = w.lessonAt("probe.lesson", level);
        return at
            ? [...questions(w, at).values()]
                  .flat()
                  .map((q) => `${q.item.level ?? "medium"}:${q.variant.values.n ?? "?"}`)
            : [];
    };
    assert.equal(asked("easy").length, 4);
    assert.ok(
        asked("easy").every((q) => q.startsWith("easy:")) && asked("easy").at(-1) === "easy:8",
    );
    assert.equal(asked("hard").length, 2);
    assert.equal(asked("hard")[1], "medium:2");
    assert.deepEqual(w.lessonAt("probe.lesson", "easy")?.grownUps, [
        "At this level the frame has one to four empty squares.",
    ]);
    assert.deepEqual(w.lessonAt("probe.lesson", "medium")?.grownUps, []);
    assert.deepEqual(LEVELS, ["easy", "medium", "hard"]);
});

test("a drawing asked about more than it draws is found", () => {
    const bus = `item probe.bus v=1 skills=[adding] {
  title "Bus"
  let n=5..8

  scene 30x12 {
    bus ride windows=6 on=n sign="12" at=canvas(1, 1)
    text ask "How many people are on the bus?" narrate below=ride gap=1
    number-input answer right-of=ask gap=1
  }

  answer n
}
`;
    assert.ok(issues(probe(bus)).some((i) => i.includes("one person a window")));
    assert.ok(
        issues(
            probe(
                ITEM.replace("{n} + {?more} = 10", "{n} + {?more} = 20").replace(
                    "answer more=(10 - n)",
                    "answer more=(20 - n)",
                ),
            ),
        ).some((i) => i.includes("one square wide")),
    );
});
