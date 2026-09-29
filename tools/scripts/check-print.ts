// Prints lessons the way a grown-up prints one from the catalogue (apps/home/explore.tsx), in Google
// Chrome against `npm run dev`, and holds every level to the rules in .docs/audit.md, "Printed length",
// which count a long lesson's pages sitting by sitting (sittingsOf in engine/pack.ts).
//   node --import ./tools/scripts/resolve.ts tools/scripts/check-print.ts [id | id:level ...]
//     [--grades=5,6] [--paper=A4|Letter] [--jobs=3]
import { randomUUID } from "node:crypto";
import { inflateSync } from "node:zlib";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { LEVELS, MOST_PAGES, readIndex, type LessonFacts, type Level } from "../../engine/pack";
import { PRINT_MARGIN_MM } from "../../engine/paper";
import { cleanup } from "../e2e/ready";

const BASE = "http://localhost:8500";
const MM = 96 / 25.4;
const PAPER = {
    A4: { width: 210, height: 297 },
    Letter: { width: 215.9, height: 279.4 },
} as const;
type Paper = keyof typeof PAPER;
/** The window a grown-up prints from. */
const DESK = { width: 1280, height: 900 };

interface Asked {
    id: string;
    levels: Level[] | null;
}

function args(argv: readonly string[]): {
    asked: Asked[];
    grades: number[];
    paper: Paper;
    jobs: number;
} {
    const asked: Asked[] = [];
    let grades = [5, 6];
    let paper: Paper = "A4";
    let jobs = 3;
    for (const a of argv) {
        const flag = /^--(\w+)=(.*)$/.exec(a);
        if (flag) {
            const [, name, value = ""] = flag;
            if (name === "grades") grades = value.split(",").map(Number);
            else if (name === "paper" && (value === "A4" || value === "Letter")) paper = value;
            else if (name === "jobs" && Number(value) > 0) jobs = Number(value);
            else throw new Error(`check-print: ${a} is not an option`);
            continue;
        }
        const [id = "", level] = a.split(":");
        const known = LEVELS.find((l) => l === level);
        if (level !== undefined && !known) throw new Error(`check-print: ${level} is not a level`);
        const at = asked.find((x) => x.id === id);
        if (at && known) at.levels = [...(at.levels ?? []), known];
        else if (!at) asked.push({ id, levels: known ? [known] : null });
    }
    return { asked, grades, paper, jobs };
}

/** What the page holds for one copy of a sheet, read under print styles at the paper's width. */
interface Held {
    questions: number;
    answered: number;
    notes: number;
    hints: number;
    /** Numbered questions whose answer is clipped, or which are taller than a page and so split. */
    cut: string[];
}

/** Runs in the page. */
function readHeld(pageHeight: number): Held {
    const root = document.querySelector(".explore-print");
    // a section moved ahead of the tries is drawn again in its place for the screen, not printed
    const numbered = [...(root?.querySelectorAll<HTMLElement>(".ls-q") ?? [])].filter(
        (q) => q.getClientRects().length > 0 && q.querySelector(".ls-n:not(.worked)") !== null,
    );
    const cut: string[] = [];
    let answered = 0;
    for (const q of numbered) {
        const n = q.querySelector(".ls-n")?.textContent?.trim() ?? "?";
        const answer = q.querySelector<HTMLElement>(".ls-answer");
        if (!answer) continue;
        answered++;
        if (q.getBoundingClientRect().height > pageHeight) {
            cut.push(`${n} (taller than a page)`);
            continue;
        }
        const r = answer.getBoundingClientRect();
        let clipped = r.width === 0 || r.height === 0;
        for (let el = answer.parentElement; el && !clipped && el !== root; el = el.parentElement) {
            const s = getComputedStyle(el);
            if (s.overflowX === "visible" && s.overflowY === "visible") continue;
            const box = el.getBoundingClientRect();
            clipped =
                r.top < box.top - 1 ||
                r.bottom > box.bottom + 1 ||
                r.left < box.left - 1 ||
                r.right > box.right + 1;
        }
        if (clipped) cut.push(n);
    }
    return {
        questions: numbered.length,
        answered,
        notes: root?.querySelectorAll(".ls-grownups").length ?? 0,
        hints: root?.querySelectorAll(".ls-hints").length ?? 0,
        cut,
    };
}

/**
 * The pages of a PDF Chrome wrote, and which of them carry nothing of the lesson: no text, no image
 * and no curve, only the paper. A page like that is a sheet the lesson did not lay out.
 */
function pdfPages(pdf: Buffer): { pages: number; blank: number[] } {
    const text = pdf.toString("latin1");
    const objects = new Map<number, string>();
    for (const m of text.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g))
        objects.set(Number(m[1]), m[2] ?? "");
    const stream = (n: number): string => {
        const body = objects.get(n) ?? "";
        const start = body.indexOf("stream");
        const end = body.lastIndexOf("endstream");
        if (start < 0 || end < 0) return "";
        const raw = Buffer.from(body.slice(start + 6, end).replace(/^\r?\n/, ""), "latin1");
        try {
            return inflateSync(raw).toString("latin1");
        } catch {
            return raw.toString("latin1");
        }
    };
    const blank: number[] = [];
    let pages = 0;
    for (const body of objects.values()) {
        if (!/\/Type\s*\/Page(?!s)\b/.test(body)) continue;
        pages++;
        const refs = /\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/.exec(body)?.[1] ?? "";
        const drawn = [...refs.matchAll(/(\d+) 0 R/g)].map((m) => stream(Number(m[1]))).join("\n");
        if (!/\bT[jJ]\b|\bDo\b|\sc\s/.test(drawn)) blank.push(pages);
    }
    return { pages, blank };
}

interface Copy {
    pages: number;
    /** The pages of each sitting, which add up to `pages`. */
    sittings: number[];
    blank: number[];
    held: Held;
}

interface Measured {
    lesson: LessonFacts;
    level: Level;
    child: Copy | null;
    grown: Copy | null;
    problems: string[];
}

/** The page calls `print()` once its sheet is drawn; the stand-in the context installs counts the calls. */
const printed = (page: Page, n: number): Promise<unknown> =>
    page.waitForFunction((want) => document.documentElement.dataset.printed === String(want), n, {
        timeout: 60_000,
    });

async function copy(page: Page, paper: Paper): Promise<Copy> {
    const { width, height } = PAPER[paper];
    // read at the paper's printable width, so the sheet is laid out as the printer lays it out
    await page.setViewportSize({
        width: Math.floor((width - 2 * PRINT_MARGIN_MM) * MM),
        height: DESK.height,
    });
    await page.emulateMedia({ media: "print" });
    const held = await page.evaluate(readHeld, (height - 2 * PRINT_MARGIN_MM) * MM);
    await page.emulateMedia({ media: null });
    await page.setViewportSize(DESK);
    const pdf = (): Promise<Buffer> =>
        page.pdf({
            format: paper,
            printBackground: true,
            margin: {
                top: `${PRINT_MARGIN_MM}mm`,
                bottom: `${PRINT_MARGIN_MM}mm`,
                left: `${PRINT_MARGIN_MM}mm`,
                right: `${PRINT_MARGIN_MM}mm`,
            },
        });
    const whole = pdfPages(await pdf());
    const later = await page.locator(".explore-print .ls-sitting-next").count();
    if (later === 0) return { ...whole, sittings: [whole.pages], held };
    // each later sitting starts a page, so the sittings before one are what prints with it and
    // everything after it taken off, and a sitting's pages are the difference
    const before: number[] = [];
    for (let k = 2; k <= later + 1; k++) {
        const at = `.explore-print .ls-sitting-next[data-sitting="${k}"]`;
        const cut = await page.addStyleTag({
            content: `:is(${at}, ${at} ~ *) { display: none; }`,
        });
        before.push(pdfPages(await pdf()).pages);
        await cut.evaluate((el) => {
            if (el instanceof Element) el.remove();
        });
    }
    const ends = [...before, whole.pages];
    return {
        ...whole,
        sittings: ends.map((end, i) => end - (i === 0 ? 0 : (ends[i - 1] ?? 0))),
        held,
    };
}

async function measure(
    page: Page,
    lesson: LessonFacts,
    level: Level,
    paper: Paper,
): Promise<{ child: Copy; grown: Copy }> {
    // `?print` is the address a child's card prints from: the child's copy, with nothing filled in
    const query = level === "medium" ? "print" : `level=${level}&print`;
    await page.goto(`/explore/${encodeURIComponent(lesson.id)}?${query}`);
    await printed(page, 1);
    const child = await copy(page, paper);
    await page.locator("details.explore-print-menu").evaluate((d) => {
        if (d instanceof HTMLDetailsElement) d.open = true;
    });
    await page.getByLabel("Print the answers and the notes for grown-ups").check();
    await page.getByRole("button", { name: "Print this sheet" }).click();
    await printed(page, 2);
    const grown = await copy(page, paper);
    return { child, grown };
}

function judge(m: Measured, medium: Copy | null): void {
    const { child, grown } = m;
    if (!child || !grown) return;
    child.sittings.forEach((pages, i) => {
        const of = child.sittings.length > 1 ? ` in sitting ${i + 1}` : "";
        if (pages > MOST_PAGES)
            m.problems.push(`${pages} child pages${of}, more than ${MOST_PAGES}`);
    });
    // a level's sittings split where its own questions let them, so its longest sitting is held to
    // medium's longest rather than sitting by sitting
    const longest = Math.max(0, ...child.sittings);
    const mediums = Math.max(0, ...(medium?.sittings ?? []));
    if (m.level !== "medium" && mediums > 0 && longest > mediums + 1)
        m.problems.push(
            `${longest} child pages in a sitting, more than one over medium's ${mediums}`,
        );
    if (child.blank.length) m.problems.push(`child copy page ${child.blank.join(", ")} is blank`);
    if (grown.blank.length)
        m.problems.push(`grown-ups copy page ${grown.blank.join(", ")} is blank`);
    if (child.held.answered) m.problems.push(`${child.held.answered} answers on the child copy`);
    if (child.held.hints) m.problems.push("hints on the child copy");
    if (child.held.notes) m.problems.push("notes for grown-ups on the child copy");
    if (grown.held.answered < grown.held.questions)
        m.problems.push(
            `${grown.held.questions - grown.held.answered} of ${grown.held.questions} answers missing from the grown-ups copy`,
        );
    if (grown.held.cut.length)
        m.problems.push(`answers cut off the grown-ups copy: ${grown.held.cut.join(", ")}`);
}

async function signIn(context: BrowserContext, email: string): Promise<Page> {
    const page = await context.newPage();
    await page.goto("/start");
    await page.getByLabel("Your email address").fill(email);
    await page.getByLabel("Your name").fill("Print Check");
    await page.getByLabel("Your family's name").fill("Print Check");
    await page.getByRole("button", { name: "Send me a code" }).click();
    // the fixed code the local server accepts for an address it just sent one to (.docs/local.md)
    await page.getByLabel("The 8-digit code").fill("12345678");
    await page.waitForURL((u) => !/^\/(start|sign-in)/.test(u.pathname));
    return page;
}

async function served(page: Page): Promise<LessonFacts[]> {
    const body: unknown = await (await page.request.get("/api/pack")).json();
    const index = typeof body === "object" && body !== null && "index" in body ? body.index : null;
    const read = readIndex(index);
    if (!read.ok) throw new Error(`check-print: the served pack's index: ${read.problem}`);
    return read.index.lessons;
}

const mediumFirst = (levels: readonly Level[]): Level[] => [
    ...levels.filter((l) => l === "medium"),
    ...levels.filter((l) => l !== "medium"),
];

function table(out: readonly Measured[]): string {
    const wide = Math.max(6, ...out.map((m) => m.lesson.id.length));
    const row = (cells: readonly string[]): string =>
        cells.map((c, i) => c.padEnd([wide, 5, 6, 5, 9, 8, 0][i] ?? 0)).join("  ") + "\n";
    return (
        row(["lesson", "grade", "level", "child", "grown-ups", "sittings", "result"]) +
        out
            .map((m) =>
                row([
                    m.lesson.id,
                    String(m.lesson.grade),
                    m.level,
                    m.child ? String(m.child.pages) : "-",
                    m.grown ? String(m.grown.pages) : "-",
                    m.child ? m.child.sittings.join("+") : "-",
                    m.problems.length ? `fail: ${m.problems.join("; ")}` : "pass",
                ]),
            )
            .join("")
    );
}

async function main(): Promise<number> {
    const { asked, grades, paper, jobs } = args(process.argv.slice(2));
    const up = await fetch(`${BASE}/api/health`).then(
        (r) => r.ok,
        () => false,
    );
    if (!up) {
        process.stderr.write(`check-print: nothing answers ${BASE}/api/health; run npm run dev\n`);
        return 2;
    }
    const started = Date.now();
    const email = `e2e-print-check-${randomUUID()}@example.com`;
    const browser = await chromium.launch({
        channel: "chrome",
        args: ["--disable-component-update"],
    });
    const out: Measured[] = [];
    try {
        const context = await browser.newContext({ baseURL: BASE, viewport: DESK });
        // Other files are saved while this runs, and a hot update can leave a page half swapped.
        await context.routeWebSocket(
            (url) => url.pathname === "/" && url.searchParams.has("token"),
            () => undefined,
        );
        await context.addInitScript(() => {
            window.print = () => {
                const d = document.documentElement.dataset;
                d.printed = String(Number(d.printed ?? "0") + 1);
            };
            // Measuring and making the PDF fire afterprint, which would take the print layer down
            // between the two; the layer stays up until the next address, as it does for one print.
            addEventListener("afterprint", (e) => e.stopImmediatePropagation(), { capture: true });
        });
        const first = await signIn(context, email);
        const lessons = await served(first);
        const queue = asked.length
            ? asked.flatMap((a) => {
                  const l = lessons.find((x) => x.id === a.id);
                  if (!l) process.stderr.write(`check-print: ${a.id} is not in the served pack\n`);
                  return l ? [{ lesson: l, levels: a.levels ?? l.levels }] : [];
              })
            : lessons
                  .filter((l) => grades.includes(l.grade))
                  .map((l) => ({ lesson: l, levels: l.levels }));
        process.stdout.write(
            `check-print: ${queue.length} lessons on ${paper}, ${jobs} at a time\n`,
        );
        const worker = async (page: Page): Promise<void> => {
            for (let next = queue.shift(); next; next = queue.shift()) {
                let medium: Copy | null = null;
                for (const level of mediumFirst(next.levels)) {
                    const m: Measured = {
                        lesson: next.lesson,
                        level,
                        child: null,
                        grown: null,
                        problems: [],
                    };
                    try {
                        // one more try before a finding, since the dev server may be rebuilding under us
                        const got = await measure(page, next.lesson, level, paper).catch(() =>
                            measure(page, next.lesson, level, paper),
                        );
                        m.child = got.child;
                        m.grown = got.grown;
                        if (level === "medium") medium = got.child;
                        judge(m, medium);
                    } catch (e) {
                        const why = e instanceof Error ? e.message : String(e);
                        m.problems.push(`did not print: ${why.split("\n")[0] ?? ""}`);
                    }
                    out.push(m);
                }
            }
        };
        const pages = [first];
        for (let i = 1; i < jobs; i++) pages.push(await context.newPage());
        await Promise.all(pages.map(worker));
    } finally {
        await browser.close();
        try {
            cleanup([email]);
        } catch (e) {
            process.stderr.write(`check-print: could not remove ${email}: ${String(e)}\n`);
        }
    }
    out.sort(
        (a, b) =>
            a.lesson.grade - b.lesson.grade ||
            a.lesson.id.localeCompare(b.lesson.id) ||
            LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level),
    );
    const failed = new Set(out.filter((m) => m.problems.length).map((m) => m.lesson.id));
    // a lesson counts by its most sittings at any level
    const most = new Map<string, { grade: number; sittings: number }>();
    for (const m of out) {
        const n = m.child?.sittings.length ?? 0;
        const at = most.get(m.lesson.id);
        if (!at || n > at.sittings) most.set(m.lesson.id, { grade: m.lesson.grade, sittings: n });
    }
    const shown = [...new Set([...most.values()].map((m) => m.grade))].sort((a, b) => a - b);
    const tally = shown
        .map((g) => {
            const of = [...most.values()].filter((m) => m.grade === g).map((m) => m.sittings);
            const count = (k: number, more = false): number =>
                of.filter((n) => n === k || (more && n > k)).length;
            return `grade ${g}: ${count(1)} in one sitting, ${count(2)} in two, ${count(3)} in three, ${count(4, true)} in four or more`;
        })
        .join("\n");
    const seconds = Math.round((Date.now() - started) / 1000);
    process.stdout.write(
        `${table(out)}${tally}\ncheck-print: ${out.length} levels of ${most.size} lessons in ${seconds} s; ${failed.size} lessons fail\n`,
    );
    return failed.size ? 1 : 0;
}

process.exitCode = await main();
