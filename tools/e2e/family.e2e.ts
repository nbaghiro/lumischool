// The journey a family takes, against the running apps (.docs/auth.md, flows 1, 2, 4, 5 and 6): a
// grown-up signs in with a code, a person in two families chooses one, a parent opens a child's
// view on this device in one tap and adds the others with the PIN, the children move between their
// pages, a child's map walks them through it on a first visit and says which world to finish
// before one not open yet, a child goes into their world in one movement and answers today's
// lesson on the roll, the sheet takes a child from question to question, a sitting begun with no
// network lands once it is back, a sitting left half done is picked up where it stood, a child one
// lesson short of a term's end finishes it and the world answers, a parent puts a term with no work
// yet in the world made for it and the child's map shows it there, a child answers a question on
// its drawing, a child hands in a painting made on paper for a grown-up to look at, a child builds
// a program from a pad's blocks, a grown-up leaves the view with the family's PIN, a parent ends
// every open view from another device, and a stale session cookie at `/` lands on the site.

import {
    expect,
    type APIRequestContext,
    type BrowserContext,
    type Locator,
    type Page,
    type TestInfo,
} from "@playwright/test";
import {
    address,
    askForCode,
    atScreen,
    BASE,
    blankQuestions,
    childsMap,
    codeFor,
    FAMILY_PIN,
    goIntoWorld,
    holdGrownUps,
    outToMap,
    newDevice,
    openChildrensView,
    newestCode,
    signInAs,
    signOut,
    test,
    typeCode,
} from "./steps";
import { clearToday } from "./ready";

const OFFLINE = "No internet just now. Your answers wait here until it comes back.";

// Each device's run of these cases starts from today's sheet as the seed left it. The devices run
// one after another in one run, and the cases chain within a device (the resume case picks up what
// the answering cases left), so without this the iPad's and the phone's cases met the laptop's
// answers: the roll landed at the first question still to do rather than today's date, and the
// questions they answer were done already.
test.beforeAll(() => clearToday());

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** The names of the cookies this device holds. */
const cookieNames = async (context: BrowserContext): Promise<string[]> =>
    (await context.cookies()).map((c) => c.name);

/** The id of a child in this browser's children's view, from its own route. */
async function kidIdOf(page: Page, name: string): Promise<string> {
    const body: unknown = await page.evaluate(async (): Promise<unknown> => {
        const res = await fetch("/api/kid");
        const read: unknown = await res.json();
        return read;
    });
    const kids: unknown = isRecord(body) ? body.kids : null;
    const kid = Array.isArray(kids)
        ? (kids as unknown[]).find((k) => isRecord(k) && k.name === name)
        : undefined;
    if (!isRecord(kid) || typeof kid.id !== "string") throw new Error(`no ${name} in the view`);
    return kid.id;
}

/** The numbers of the questions of a lesson a child answered today, as the signed-in grown-up on this page reads their log. */
async function answersToday(page: Page, kid: string, lesson: string): Promise<number[]> {
    const body: unknown = await page.evaluate(async (id: string): Promise<unknown> => {
        const res = await fetch(`/api/events?kid=${encodeURIComponent(id)}`);
        const read: unknown = await res.json();
        return read;
    }, kid);
    const events: unknown = isRecord(body) ? body.events : null;
    const today = new Date().toISOString().slice(0, 10);
    return Array.isArray(events)
        ? (events as unknown[]).flatMap((e) => {
              if (!isRecord(e) || e.kind !== "answered" || typeof e.at !== "string") return [];
              const q = isRecord(e.data) && isRecord(e.data.q) ? e.data.q : null;
              return q && q.lesson === lesson && e.at.startsWith(today) && typeof q.n === "number"
                  ? [q.n]
                  : [];
          })
        : [];
}

test("a seeded parent signs in with the code sent to their address, read from the local outbox", async ({
    page,
    request,
}, info) => {
    const email =
        info.project.name === "ipad" ? "demo-parent2@lumischool.ai" : "demo-parent1@lumischool.ai";
    await page.goto("/sign-in");
    const logo = page.getByRole("link", { name: "lumischool site" });
    await expect(logo).toHaveAttribute("href", "/home");
    await expect(logo).toHaveAttribute("rel", "external");
    await expect(page.getByRole("heading", { name: "Try the demo" })).toHaveCount(0);
    const before = await newestCode(request, email);
    await page.getByLabel("Your email address").fill(email);
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page.getByRole("heading", { name: "Type the code" })).toBeVisible();
    await typeCode(page, request, email, before);
    await atScreen(page, page.getByRole("heading", { name: /^Hello, (Anna|Ben) Harlow$/ }));
    await expect(
        page.locator("main").getByText("The Harlow family", { exact: true }),
    ).toBeVisible();
    const children = page.getByRole("region", { name: "Children", exact: true });
    for (const kid of ["Rosie", "Leo", "Ivy"])
        await expect(children.getByRole("listitem").filter({ hasText: kid })).toBeVisible();
    await signOut(page);
});

test("a wrong code says how many tries are left, another code inside the minute is refused, and an address with no family starts one", async ({
    page,
    request,
}, info) => {
    const email = address("wrong", info);
    await askForCode(page, email);
    const code = await codeFor(request, email);
    await page.getByLabel("The 8-digit code").fill(code === "00000000" ? "11111111" : "00000000");
    await expect(page.locator("main").getByText(/does not match.*4 more tries/)).toBeVisible();
    await page.getByRole("button", { name: "Send the code again" }).click();
    await expect(page.locator("main").getByText(/Too many codes.*in a minute/)).toBeVisible();
    await page.getByLabel("The 8-digit code").fill(code);
    await expect(page.getByRole("heading", { name: "Start a family" })).toBeVisible();
    await page.getByLabel("Your name").fill("Sam");
    await page.getByLabel("Your family's name").fill("Brennan");
    await page.getByRole("button", { name: "Start the family" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    // a new grown-up has a portrait on their stamp from the start, one their id gives them, and the
    // account page shows it pressed before they pick another
    await expect(page.getByRole("banner").locator(".gb-me-stamp svg")).toHaveCount(2);
    await page.getByRole("button", { name: /: your account, and sign out$/ }).click();
    await page.getByRole("menuitem", { name: "Account" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Your picture" }));
    await expect(
        page
            .getByRole("list", { name: "Pictures to choose from" })
            .getByRole("button", { pressed: true }),
    ).toHaveCount(1);
    await expect(page.locator("main")).toContainText("was picked for you");
    await signOut(page);
});

test("an address in two families is asked which to open, and can switch to the other", async ({
    page,
    request,
}, info) => {
    const email = address("two", info);
    await askForCode(page, email, { name: "Nia", family: "Brennan" });
    let code = await typeCode(page, request, email);
    await atScreen(page, page.getByRole("heading", { name: "Hello, Nia" }));
    await signOut(page);
    await askForCode(page, email, { name: "Nia", family: "Okafor" });
    code = await typeCode(page, request, email, code);
    await expect(
        page.locator("main").getByText("The Okafor family", { exact: true }),
    ).toBeVisible();
    await signOut(page);
    await askForCode(page, email);
    await typeCode(page, request, email, code);
    await expect(page.getByRole("heading", { name: "Which family?" })).toBeVisible();
    await page.getByRole("button", { name: /The Brennan family/ }).click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Nia" }));
    await expect(
        page.locator("main").getByText("The Brennan family", { exact: true }),
    ).toBeVisible();
    // the other families are on the account page now, where the family's page points
    await page.getByRole("link", { name: "Your account" }).click();
    await atScreen(page, page.getByRole("button", { name: /Switch to the Okafor family/ }));
    await page.getByRole("button", { name: /Switch to the Okafor family/ }).click();
    await atScreen(page, page.locator("main").getByText("The Okafor family", { exact: true }));
    await signOut(page);
});

test("a parent opens a child's view on this device, and that browser's session is held put away and unreachable until the PIN", async ({
    page,
    context,
}) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const names = await cookieNames(context);
    expect(names).toContain("ls_kids");
    expect(names, "the session's cookie stays, put away").toContain("ls_session");
    const me = await page.evaluate(async () => {
        const r = await fetch("/api/me");
        return { status: r.status, body: (await r.json()) as { error?: string } };
    });
    expect([me.status, me.body.error], "every adult route refuses it").toEqual([401, "put-away"]);
    expect(await cookieNames(context), "and refusing it clears nothing").toContain("ls_session");
    await expect(page.getByRole("link", { name: "lumischool site" })).toHaveCount(0);
    // a grown-ups' page asked for on this browser is sent to the children's view, where the
    // Grown-ups tab is the way back
    await page.goto("/plan");
    await expect(page).toHaveURL(/\/kids$/);
});

test("a grown-up goes round: the view opens, an adult route is refused, the PIN lands on the family's page with no code, and the view opens again", async ({
    page,
    context,
}) => {
    await signInAs(page);
    const before = await page.evaluate(async () => {
        const me = (await (await fetch("/api/me")).json()) as { session?: { id: string } };
        return me.session?.id ?? "";
    });
    expect(before).not.toBe("");
    await openChildrensView(page, ["Rosie"]);
    const refused = await page.evaluate(async () => (await fetch("/api/kid-sessions")).status);
    expect(refused).toBe(401);
    await holdGrownUps(page);
    await page.getByLabel("The family PIN").fill(FAMILY_PIN);
    await page.getByRole("button", { name: "Leave the children's view" }).click();
    // the family's page, with no code typed: the session that was put away is the one in use
    await atScreen(page, page.getByRole("heading", { name: "Hello, Anna Harlow" }));
    const after = await page.evaluate(async () => {
        const me = (await (await fetch("/api/me")).json()) as { session?: { id: string } };
        return me.session?.id ?? "";
    });
    expect(after, "the same session, given back").toBe(before);
    expect(await cookieNames(context)).not.toContain("ls_kids");
    await openChildrensView(page, ["Rosie"]);
    expect(await cookieNames(context)).toContain("ls_kids");
    await holdGrownUps(page);
    await page.getByLabel("The family PIN").fill(FAMILY_PIN);
    await page.getByRole("button", { name: "Leave the children's view" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Anna Harlow" }));
    await signOut(page);
});

test("the children move between their own pages, and a reload opens on the pictures", async ({
    page,
}, info) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie", "Leo", "Ivy"]);
    const stamps = ["Rosie", "Leo", "Ivy"].map((name) =>
        page.getByRole("button", { name, exact: true }),
    );
    if (info.project.name === "phone") {
        const width = page.viewportSize()?.width ?? 0;
        for (const stamp of stamps) {
            const box = await stamp.boundingBox();
            expect(box, "every child's stamp is on the page").not.toBeNull();
            if (box) {
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(width);
            }
        }
    }
    await page.getByRole("button", { name: "Leo", exact: true }).click();
    await expect(childsMap(page, "Leo")).toBeVisible();
    await page.getByRole("button", { name: "Back to the pictures" }).click();
    await expect(page.getByRole("heading", { name: "Who is learning today?" })).toBeVisible();
    await page.getByRole("button", { name: "Ivy", exact: true }).click();
    await expect(childsMap(page, "Ivy")).toBeVisible();
    await page.reload();
    await atScreen(page, page.getByRole("heading", { name: "Who is learning today?" }));
});

/** The worlds of the years past the first, on lands of their own that a child in the first year does not see. */
const LATER_WORLDS = [
    "The woods",
    "The kitchen",
    "The town",
    "The night sky",
    "The sports ground",
    "The laboratory",
    "The mountains",
    "The open sea",
    "The volcano island",
];

test("a child's map is the whole sea: where they are, the world they finished in colour, the rest of their year dimmed with no way in, and the later years drawn and closed", async ({
    page,
}) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/);
    // Rosie is in the harbour with the meadow behind her, as npm run db:demo seeds her
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeVisible();
    await expect(map.getByRole("button", { name: /^The meadow\. Finished\./ })).toBeVisible();
    const railway = map.getByRole("button", { name: "The railway. Not reached yet." });
    await expect(railway).toBeVisible();
    // The later years' worlds are on her map, drawn and closed, in the one look a world not reached
    // yet has: lettered, dimmed, with no way in and nothing the arrows reach.
    const names = await map.locator(".ow-name .w").allTextContents();
    for (const world of LATER_WORLDS) {
        expect(names, `${world} is not lettered on Rosie's map`).toContain(world);
        const later = map.getByRole("button", { name: `${world}. Not reached yet.` });
        await expect(later).toHaveCount(1);
        await expect(later).toHaveAttribute("aria-disabled", "true");
    }
    // The arrows walk the places she may travel to, so a world not open yet is met by Tab. It remains
    // visibly closed without placing a card over the map.
    await railway.focus();
    await expect(map.getByRole("note")).toHaveCount(0);
    await expect(page.locator(".kid-guide, .kid-help")).toHaveCount(0);
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeVisible();
    // nothing is laid over the map to go in with: her own world is the way in, and the railway is not
    await expect(map.getByRole("button", { name: "Go in" })).toHaveCount(0);
    await expect(railway).toHaveAttribute("aria-label", "The railway. Not reached yet.");
    await map.getByRole("button", { name: /^The harbour\. You are here\./ }).focus();
    // the arrows never reach another year's land: on along the run from the harbour is the railway,
    // which is not open, so the keyboard stays where it is and says so
    await page.keyboard.press("ArrowRight");
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeFocused();
    for (const world of LATER_WORLDS)
        await expect(
            map.getByRole("button", { name: `${world}. Not reached yet.` }),
        ).toHaveAttribute("tabindex", "-1");
    // a finished world can be travelled back to, and Where I am brings the guide home. The arrows
    // walk the places a child may travel to, so one press reaches the meadow with worlds not open
    // yet drawn between them.
    await page.keyboard.press("ArrowLeft");
    await expect(map.getByRole("button", { name: /^The meadow\./ })).toBeFocused({
        timeout: 10_000,
    });
    await map.getByRole("button", { name: "Where I am" }).click();
    await expect(map.getByRole("button", { name: /^The harbour\./ })).toBeFocused({
        timeout: 10_000,
    });
    // drawn back as far as the map goes, the whole sea is in the window: a later year's world with it
    // the region is the map's host itself, so its world layer is its own child
    const world = map.locator(":scope > .world");
    const scale = async (): Promise<number> =>
        Number(
            await world.evaluate((el) => /scale\(([0-9.]+)\)/.exec(el.style.transform)?.[1] ?? "1"),
        );
    await map.focus();
    for (let i = 0; i < 12; i++) {
        const before = await scale();
        await page.keyboard.press("-");
        await page.waitForTimeout(350);
        if ((await scale()) >= before) break;
    }
    expect(await scale(), "the map did not draw back to the sea").toBeLessThan(0.05);
    // a later year's land is in the window with hers: on a phone the sea is wider than the window at
    // the floor and the rest is there to drag to, so it is whichever land the camera's side holds
    const laterInView = await map.evaluate((host, names: string[]) => {
        const h = host.getBoundingClientRect();
        return Array.from(host.querySelectorAll<HTMLElement>("button.ow-node")).filter((b) => {
            const label = b.getAttribute("aria-label") ?? "";
            if (!names.some((n) => label.startsWith(`${n}.`))) return false;
            const r = b.getBoundingClientRect();
            return r.right > h.left && r.left < h.right && r.bottom > h.top && r.top < h.bottom;
        }).length;
    }, LATER_WORLDS);
    expect(laterInView, "no later year's world is in the window at the floor").toBeGreaterThan(0);
    // and the sea covers the window: no point of it shows paper past the sea, on any side. The sea is
    // painted 2,600 units past the map's bounds and fades to paper over that band, so the window has
    // to sit inside the painted sea by that much (engine/ui/map.ts, paintTerrain)
    const cover = await page.evaluate(() => {
        const host = document.querySelector(".ow-host"),
            world = document.querySelector<HTMLElement>(".ow-host > .world"),
            sea = document.querySelector(".ow-sea > path");
        if (!host || !world || !sea) return null;
        const z = Number(/scale\(([0-9.]+)\)/.exec(world.style.transform)?.[1] ?? "1");
        const h = host.getBoundingClientRect(),
            b = sea.getBoundingClientRect(),
            fade = 2600 * z;
        return {
            left: h.left - (b.left + fade),
            top: h.top - (b.top + fade),
            right: b.right - fade - h.right,
            bottom: b.bottom - fade - h.bottom,
        };
    });
    expect(cover, "the map has no sea to measure").not.toBeNull();
    for (const [side, room] of Object.entries(cover ?? {}))
        expect(room, `paper shows past the sea on the ${side}`).toBeGreaterThanOrEqual(-1);
});

/** A child goes into their world from the map, and the roll they land on: the tests below run it twice, once with reduced motion. */
async function goIn(page: Page, reduced: boolean): Promise<void> {
    if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/);
    await goIntoWorld(map);
    const roll = page.getByRole("region", { name: "Rosie's year" });
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
    await expect(roll.locator(".wd-where")).toHaveCount(0);
    await expect(page.locator(".sr[aria-live]").first()).toContainText("The harbour");
    // today's sheet is on the roll with the days before it, and the camera comes down to today
    const today = roll.locator(".wd-sheet.today");
    await expect(today).not.toHaveCount(0);
    const maths = await mathsToday(page, "Rosie");
    const sheet = roll.locator(`.wd-sheet.today[data-lesson="${maths}"]`);
    await expect(sheet).toHaveCount(1);
    await expect(sheet).toHaveAttribute("aria-label", /, today$/);
    expect(await roll.locator(".wd-sheet").count()).toBeGreaterThan(1);
    await expect(roll.locator(".j-date.today")).toBeInViewport({
        timeout: reduced ? 3_000 : 10_000,
    });
    await expect(sheet).toBeInViewport();
    // and the map is where they came from
    await outToMap(page, map);
    await expect(map).toHaveClass(/ready/, { timeout: 15_000 });
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeVisible();
}

test("a child goes into their world from the map, arrives at its horizon, finds today's sheet on the roll, and comes back to the map", async ({
    page,
}) => {
    await goIn(page, false);
});

test("going in and back is a cut for a child who asked for less motion, and lands on the same roll", async ({
    page,
}) => {
    await goIn(page, true);
});

/** A typed question as the pack carries it: its number, its right answer, how many hints it has, and a wrong answer one of the author's rules catches, with that rule's line. */
interface TypedQuestion {
    n: number;
    answer: string;
    hints: number;
    caught: { answer: string; say: string } | null;
}

/**
 * A lesson's questions with a typed answer named `answer`, read from the family's pack as the view
 * reads it. A rule of the form `answer == <sum of the question's values>` gives the wrong answer it
 * catches, worked out here over the pack's own values.
 */
async function typedQuestions(page: Page, kid: string, lesson: string): Promise<TypedQuestion[]> {
    const found: unknown = await page.evaluate(
        async ([id, lessonId]): Promise<unknown> => {
            type Expr =
                | { t: "num"; v: string }
                | { t: "id"; name: string }
                | { t: "bin"; op: string; l: Expr; r: Expr };
            interface Rule {
                when: Expr;
                say: string[];
            }
            interface Question {
                n: number;
                answers: Record<string, string>;
                hints: string[];
                env: Record<string, { k: string; v: { n: number; d: number } }>;
                feedback: Rule[];
            }
            const at = (path: string): Promise<unknown> =>
                fetch(`/api/kid/${encodeURIComponent(id)}/${path}`).then((r) => r.json());
            const pack = (await at("pack")) as {
                pack: string;
                index: { lessons: { id: string; file: string }[] };
            };
            const facts = pack.index.lessons.find((l) => l.id === lessonId);
            if (!facts) return [];
            const file = facts.file.replace(/^lessons\//, "");
            const read = (await at(`pack/${pack.pack}/lessons/${file}`)) as {
                levels: { medium: { sections: { blocks: { questions?: Question[] }[] }[] } };
            };
            const value = (e: Expr, env: Question["env"]): number | null => {
                if (e.t === "num") return Number(e.v);
                if (e.t === "id") {
                    const v = env[e.name];
                    return v && v.k === "num" && v.v.d === 1 ? v.v.n : null;
                }
                const l = value(e.l, env);
                const r = value(e.r, env);
                if (l === null || r === null) return null;
                if (e.op === "+") return l + r;
                if (e.op === "-") return l - r;
                if (e.op === "*") return l * r;
                return e.op === "/" && r !== 0 && l % r === 0 ? l / r : null;
            };
            const caught = (q: Question): { answer: string; say: string } | null => {
                for (const rule of q.feedback) {
                    const w = rule.when;
                    const say = rule.say[0];
                    if (w.t !== "bin" || w.op !== "==" || w.l.t !== "id" || w.l.name !== "answer")
                        continue;
                    const v = value(w.r, q.env);
                    if (v === null || !Number.isInteger(v) || String(v) === q.answers.answer)
                        continue;
                    if (say === undefined || say.includes("{")) continue;
                    return { answer: String(v), say };
                }
                return null;
            };
            const out: TypedQuestion[] = [];
            for (const section of read.levels.medium.sections)
                for (const block of section.blocks)
                    for (const q of block.questions ?? [])
                        if (typeof q.answers.answer === "string")
                            out.push({
                                n: q.n,
                                answer: q.answers.answer,
                                hints: q.hints.length,
                                caught: caught(q),
                            });
            return out;
        },
        [kid, lesson] as const,
    );
    return Array.isArray(found) ? (found as TypedQuestion[]) : [];
}

/**
 * Rolls the world so that a target on a sheet sits in the upper part of the roll's window, with the
 * wheel, as a child does: the roll moves its camera, so the browser's own scrolling cannot reach it.
 * The delta is a trackpad's, not a whole number, since the view reads a whole notch of 40 or more
 * as a mouse wheel and zooms on it (readWheel in engine/space.ts). It goes on until the target is
 * in the window or the paper no longer moves under the wheel, which is the roll's end; the count is
 * only a guard against a roll that moves for ever. Its failure says how far the target still was
 * from where it should sit, and whether the paper had stopped moving or was still going.
 */
async function rollTo(page: Page, roll: Locator, target: Locator, share = 0.3): Promise<void> {
    const host = roll.locator(".wd-host");
    const world = roll.locator(".wd-host .world");
    const camera = (): Promise<string> => world.evaluate((el) => el.style.transform);
    const guard = 60;
    let left = 0;
    let moved = true;
    for (let turn = 0; turn < guard && moved; turn++) {
        const [box, window] = await Promise.all([target.boundingBox(), host.boundingBox()]);
        if (!box || !window) throw new Error("the target or the roll is not on the page");
        const want = window.y + window.height * share;
        left = box.y - want;
        if (Math.abs(left) < 40) return;
        const before = await camera();
        await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
        await page.mouse.wheel(0, left + 0.5);
        await page.waitForTimeout(350);
        await settled(roll);
        moved = (await camera()) !== before;
    }
    throw new Error(
        `the roll did not bring the target into its window: it was still ${Math.round(Math.abs(left))} px ` +
            `${left > 0 ? "below" : "above"} where it should sit, and the paper ` +
            (moved
                ? `was still moving after ${guard} turns of the wheel`
                : "had stopped moving under the wheel"),
    );
}

/** How long the roll's horizon takes before the camera comes down to today, in ms (engine/ui/world.tsx). */
const ARRIVING = 1_400;

/** Waits until the roll has arrived at today and come to rest, which is when a child reads a sheet. */
async function atRest(roll: Locator): Promise<void> {
    await new Promise((ok) => setTimeout(ok, ARRIVING + 400));
    await settled(roll);
}

/** Waits until the roll's paper has stopped moving: the same camera a quarter of a second apart. */
async function settled(roll: Locator): Promise<void> {
    const world = roll.locator(".wd-host .world");
    const at = (): Promise<string> => world.evaluate((el) => el.style.transform);
    await expect
        .poll(
            async () => {
                const a = await at();
                await new Promise((ok) => setTimeout(ok, 250));
                return a === (await at());
            },
            { timeout: 10_000 },
        )
        .toBe(true);
}

/**
 * From a child's map, into their world, to today's lesson on its sheet: the roll, the sheet and the
 * lesson it holds. With `want`, the child has more than one lesson today and this is the one.
 */
async function intoTodaysSheet(
    page: Page,
    name: string,
    want?: string,
): Promise<{ roll: Locator; sheet: Locator; lesson: string }> {
    const map = childsMap(page, name);
    await expect(map).toHaveClass(/ready/);
    await goIntoWorld(map);
    const roll = page.getByRole("region", { name: `${name}'s year` });
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
    const today = roll.locator(".ls-sheet.today");
    const maths = await mathsToday(page, name);
    const sheet = want
        ? roll.locator(`.ls-sheet.today[data-lesson="${want}"]`)
        : roll.locator(`.ls-sheet.today[data-lesson="${maths}"]`);
    await expect(sheet).toHaveCount(1);
    // the camera comes down from the horizon to a sheet of today's before a case rolls the paper
    // itself; with several tracks the day holds a sheet each, and the roll lands on the one to do
    await expect
        .poll(
            async () => {
                for (const one of await today.all()) if (await one.isVisible()) return true;
                return false;
            },
            { timeout: 10_000 },
        )
        .toBe(true);
    await settled(roll);
    const lesson = await sheet.getAttribute("data-lesson");
    if (!lesson) throw new Error("the sheet names no lesson");
    return { roll, sheet, lesson };
}

/** The maths sheet among a day that may also hold work from the family's other tracks. */
async function mathsToday(page: Page, name: string): Promise<string> {
    const maths: unknown = await page.evaluate(async (kidName: string): Promise<unknown> => {
        const view = (await (await fetch("/api/kid")).json()) as {
            kids?: { id: string; name: string }[];
        };
        const kid = view.kids?.find((candidate) => candidate.name === kidName);
        if (!kid) return null;
        const pack = (await (
            await fetch(`/api/kid/${encodeURIComponent(kid.id)}/pack`)
        ).json()) as {
            index?: { lessons?: { id: string; subject: string }[] };
        };
        const ids = new Set(
            (pack.index?.lessons ?? [])
                .filter((lesson) => lesson.subject === "maths")
                .map((lesson) => lesson.id),
        );
        return Array.from(document.querySelectorAll<HTMLElement>(".ls-sheet.today"))
            .map((sheet) => sheet.dataset.lesson ?? "")
            .find((id) => ids.has(id));
    }, name);
    if (typeof maths !== "string" || !maths) throw new Error(`${name} has no maths sheet today`);
    return maths;
}

/**
 * A child's view opened for Rosie, gone into her world from the map, with today's lesson on its
 * sheet on the roll: the child's id, the roll, the sheet and the lesson it holds.
 */
/**
 * Up the roll by about `px` screen pixels the way a trackpad moves it: a small first step marks the
 * wheel as a trackpad's, so the steps after it pan rather than zoom as a mouse's notches do
 * (engine/space.ts, readWheel).
 */
async function panUp(page: Page, px: number): Promise<void> {
    await page.mouse.wheel(0, -20);
    for (let gone = 20; gone < px; gone += 400) {
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(60);
    }
}

async function atTodaysSheet(
    page: Page,
): Promise<{ rosie: string; roll: Locator; sheet: Locator; lesson: string }> {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const rosie = await kidIdOf(page, "Rosie");
    return { rosie, ...(await intoTodaysSheet(page, "Rosie")) };
}

/** A screen sitting begun and not ended, as the server folds it. */
interface Unfinished {
    sitting: string;
    lesson: string;
    answered: number[];
}

const isUnfinished = (v: unknown): v is Unfinished =>
    isRecord(v) &&
    typeof v.sitting === "string" &&
    typeof v.lesson === "string" &&
    Array.isArray(v.answered);

/** The sittings of a child's record that are begun and not ended, as the server folds them. */
const unfinishedOf = async (page: Page, kid: string): Promise<Unfinished[]> => {
    const found: unknown = await page.evaluate(async (id: string): Promise<unknown> => {
        const res = await fetch(`/api/kid/${encodeURIComponent(id)}/record`);
        const r = (await res.json()) as { unfinished?: unknown };
        return r.unfinished ?? null;
    }, kid);
    return Array.isArray(found) ? found.filter(isUnfinished) : [];
};

/** Types the right answer to a typed question on the sheet and checks it, rolling the sheet to it first. */
async function answerRight(
    page: Page,
    roll: Locator,
    sheet: Locator,
    t: TypedQuestion,
): Promise<void> {
    const q = sheet.locator(`.ls-q[data-n="${t.n}"]`);
    const box = q.getByLabel(`Your answer to question ${t.n}`);
    await rollTo(page, roll, box);
    await box.fill(t.answer);
    await q.getByRole("button", { name: "Check" }).click();
    await expect(q.locator(".ls-said")).toHaveText(/^Yes, /);
    await expect(q).toHaveClass(/done/);
}

test("a child answers today's lesson on the roll: a wrong answer gets the author's line, a hint opens, and the right answer is written in", async ({
    page,
}) => {
    const { rosie, roll, sheet, lesson } = await atTodaysSheet(page);
    // today's sheet is the lesson itself: its look section, scene and text, comes before the questions
    const look = sheet.locator(".ls-sec").first();
    await expect(look.getByRole("heading", { level: 3 })).toHaveText("Look");
    await expect(look.locator(".scene-tile svg").first()).toBeAttached();
    await expect(sheet.locator(".ls-q").first()).toBeAttached();
    expect(await sheet.textContent()).not.toMatch(/!/);
    // the first question answered by typing that has a hint and a rule that catches a wrong answer
    const typed = await typedQuestions(page, rosie, lesson);
    const picked = typed.find((t) => t.hints > 0 && t.caught);
    if (!picked?.caught) throw new Error(`${lesson} has no typed question with a hint and a rule`);
    const { n, answer: right, caught } = picked;
    const q = sheet.locator(`.ls-q[data-n="${n}"]`);
    // one place to write, wherever it is: the box the picture drew for it, or the row under the picture
    await expect(q.locator(".ls-in")).toHaveCount(1);
    await expect(q.locator(".ls-here")).toHaveCount(0);
    const box = q.getByLabel(`Your answer to question ${n}`);
    const check = q.getByRole("button", { name: "Check" });
    const said = q.locator(".ls-said");
    await rollTo(page, roll, box);
    // the part the rule points at is ringed: the drawing is drawn again with the pen loop on it
    const strokes = q.locator(".scene-tile svg path");
    const drawn = await strokes.count();
    await box.fill(caught.answer);
    await check.click();
    await expect(said).toHaveText(caught.say);
    await expect(said).toBeInViewport();
    await expect(said).not.toHaveText(/!/);
    await expect.poll(() => strokes.count()).toBeGreaterThan(drawn);
    // Rosie's grown-up set hints to come after one try. Opening the lit guide gives this question's
    // only authored hint at once.
    const guide = q.getByRole("button", { name: /^Help from / });
    await expect(guide).toBeVisible();
    await expect(guide).toHaveClass(/\blit\b/);
    await expect(q.getByRole("button", { name: "A hint" })).toHaveCount(0);
    await guide.click();
    const card = q.locator(".tu-card");
    await expect(card).toBeVisible();
    await expect(q.locator(".ls-hints li")).toHaveCount(1);
    await expect(card.locator(".tu-line.hint")).toHaveCount(1);
    await box.fill(right);
    await check.click();
    await expect(said).toHaveText("Yes, you got it.");
    await expect(said).toBeInViewport();
    // the question is done, so there is nowhere left to write on it: a box on the picture goes and the
    // drawing carries the answer in the teacher's pen, and a box in the row stays and is closed
    await expect(q.locator(".ls-in:not([disabled])")).toHaveCount(0);
    await expect(check).toBeDisabled();
    // a right answer closes the card
    await expect(card).toHaveCount(0);
    const next = sheet.locator(".ls-q.current");
    await expect(next).toHaveCount(1);
    await expect.poll(() => next.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    // every try and the hint are in the queue and sent: the sitting is in the record with the question answered
    await expect
        .poll(() => unfinishedOf(page, rosie), { timeout: 30_000 })
        .toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lesson, answered: expect.arrayContaining([n]) }),
            ]),
        );
});

test("a child writes their answer in the box the picture drew for it, where the printed sheet has them write, and nowhere else", async ({
    page,
}) => {
    const { roll, sheet } = await atTodaysSheet(page);
    await expect(sheet.locator(".ls-q").first()).toBeAttached();
    // the questions of today's sheet by how each is answered
    const kinds = await sheet.evaluate((el) =>
        [...el.querySelectorAll(".ls-q")].map((q) => ({
            n: q.getAttribute("data-n") ?? "",
            inBox: q.querySelectorAll(".ls-scene .ls-inbox .ls-in").length,
            inRow: q.querySelectorAll(".ls-row .ls-in").length,
            picks: q.querySelectorAll(".ls-row .ls-pick").length,
            scenePicks: q.querySelectorAll(".ls-scene .ls-inbox-pick").length,
            labels: [...q.querySelectorAll(".ls-in")].map(
                (i) => i.getAttribute("aria-label") ?? "",
            ),
        })),
    );
    // no answer has two places to write in: a question with two answers has a box for each, and each
    // box is either on the picture or in the row under it
    for (const k of kinds) expect(k.labels.length, `question ${k.n}`).toBe(new Set(k.labels).size);
    const onPicture = kinds.find((k) => k.inBox > 0);
    if (!onPicture) throw new Error("today's sheet has no question answered on its picture");
    const q = sheet.locator(`.ls-q[data-n="${onPicture.n}"]`);
    const box = q.locator(".ls-inbox .ls-in");
    await rollTo(page, roll, box);
    // the box is the one the picture drew, two squares of the scene tall, so it is where a child
    // would write on the sheet they print
    const sized = await q.evaluate((el) => {
        const svg = el.querySelector("svg.scene-svg");
        const inbox = el.querySelector(".ls-inbox");
        if (!svg || !inbox) return null;
        const view = (svg.getAttribute("viewBox") ?? "").split(/\s+/).map(Number);
        const s = svg.getBoundingClientRect();
        const b = inbox.getBoundingClientRect();
        return {
            tall: Math.round((b.height / s.height) * (view[3] ?? 0)),
            inside: b.left >= s.left - 1 && b.right <= s.right + 1,
        };
    });
    expect(sized?.inside, "the box sits on the picture").toBe(true);
    expect(sized?.tall, "the box is the two squares the scene drew").toBe(40);
    // what is typed is in the picture's own hand, not the page's, so it reads as writing on the sheet
    await expect(box).toHaveCSS("font-family", /Shantell/);
    // A question with options uses the cards the scene drew, not a second row of choice buttons.
    const picked = kinds.find((k) => k.scenePicks > 0);
    if (picked) {
        const o = sheet.locator(`.ls-q[data-n="${picked.n}"]`);
        await expect(o.locator(".ls-in")).toHaveCount(0);
        await expect(o.locator(".ls-row .ls-pick")).toHaveCount(0);
        await expect(o.locator(".ls-scene .ls-inbox-pick").first()).toBeAttached();
    }
});

/** Waits until a map's or a roll's paper has stopped moving: the same camera a quarter of a second apart. */
async function settledIn(where: Locator): Promise<void> {
    const world = where.locator(".world").first();
    const at = (): Promise<string> => world.evaluate((el) => el.style.transform);
    await expect
        .poll(
            async () => {
                const a = await at();
                await new Promise((ok) => setTimeout(ok, 250));
                return a === (await at());
            },
            { timeout: 10_000 },
        )
        .toBe(true);
}

/**
 * Waits until something on a sheet is inside the roll's window, which is what the sheet asks of the
 * roll when a child works in a question, and says where it was when it is not.
 */
async function inWindow(roll: Locator, what: Locator): Promise<void> {
    const where = async (): Promise<string> => {
        const [a, b] = await Promise.all([
            what.boundingBox(),
            roll.locator(".wd-host").boundingBox(),
        ]);
        if (!a || !b) return "not on the page";
        const held = a.y >= b.y && a.y + a.height <= b.y + b.height;
        return held
            ? "in the window"
            : `at ${Math.round(a.y)}..${Math.round(a.y + a.height)} against the window ${Math.round(b.y)}..${Math.round(b.y + b.height)}`;
    };
    await expect.poll(where, { timeout: 10_000 }).toBe("in the window");
}

/** The device's voice, stubbed: every line handed to it is kept on the page for the test to read. */
async function stubVoice(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const spoken: string[] = [];
        class Utter {
            text: string;
            rate = 1;
            onend: (() => void) | null = null;
            onerror: (() => void) | null = null;
            constructor(text: string) {
                this.text = text;
            }
        }
        Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utter });
        Object.defineProperty(window, "speechSynthesis", {
            value: {
                speak: (u: Utter) => {
                    spoken.push(u.text);
                    setTimeout(() => u.onend?.(), 10);
                },
                cancel: () => {},
                getVoices: () => [{ lang: "en" }],
            },
        });
        Object.defineProperty(window, "__spoken", { value: spoken });
    });
}

const spokenOn = (page: Page): Promise<string[]> =>
    page.evaluate(() => {
        const s: unknown = Reflect.get(window, "__spoken");
        return Array.isArray(s) ? (s as string[]) : [];
    });

/** The help-asked events of a lesson, as the child's view reads its own log back. */
async function helpAskedOn(page: Page, kid: string, lesson: string): Promise<string[]> {
    const body: unknown = await page.evaluate(
        async ([id, l]): Promise<unknown> => {
            const res = await fetch(
                `/api/kid/${encodeURIComponent(id)}/state?lesson=${encodeURIComponent(l)}`,
            );
            const read: unknown = await res.json();
            return read;
        },
        [kid, lesson] as const,
    );
    const events: unknown = isRecord(body) ? body.events : null;
    return Array.isArray(events)
        ? (events as unknown[]).flatMap((e) =>
              isRecord(e) &&
              e.kind === "help-asked" &&
              isRecord(e.data) &&
              typeof e.data.ask === "string"
                  ? [e.data.ask]
                  : [],
          )
        : [];
}

test("a child asks the guide on a question: the card opens under it and the drawing stays put, the question is read aloud, Where? rings the part, and Ask a grown-up pins it, every press in the log", async ({
    page,
}) => {
    await stubVoice(page);
    const { rosie, roll, sheet, lesson } = await atTodaysSheet(page);
    const typed = await typedQuestions(page, rosie, lesson);
    // a typed question with a hint that is still to do, since a case before may have answered one
    let picked: TypedQuestion | undefined;
    for (const t of typed.filter((t) => t.hints > 0))
        if (await sheet.locator(`.ls-q[data-n="${t.n}"]:not(.done)`).count()) {
            picked = t;
            break;
        }
    if (!picked) throw new Error(`${lesson} has no typed question with a hint still to do`);
    const q = sheet.locator(`.ls-q[data-n="${picked.n}"]`);
    const box = q.getByLabel(`Your answer to question ${picked.n}`);
    await rollTo(page, roll, box);
    const drawing = q.locator(".scene-tile").first();
    const before = await drawing.boundingBox();
    const guide = q.getByRole("button", { name: /^Help from / });
    await expect(guide).toBeVisible();
    await guide.click();
    const card = q.locator(".tu-card");
    await expect(card).toBeVisible();
    await expect(guide).toHaveAttribute("aria-expanded", "true");
    // the card is in the sheet's flow under the strip: nothing above it moved
    expect(await drawing.boundingBox()).toEqual(before);
    // Rosie is in grade 1, so the question was read aloud as the card opened, and every line has a speaker
    const asked = await card.locator(".tu-line.ask .tu-words").innerText();
    await expect.poll(() => spokenOn(page)).toContain(asked);
    await card.getByRole("button", { name: `Read it: ${asked}` }).click();
    await expect.poll(async () => (await spokenOn(page)).filter((s) => s === asked).length).toBe(2);
    expect((await spokenOn(page)).join(" ")).not.toMatch(/!/);
    // Where? rings the part the question turns on
    const strokes = q.locator(".scene-tile svg path");
    const drawn = await strokes.count();
    await card.getByRole("button", { name: "Where?" }).click();
    await expect.poll(() => strokes.count()).toBeGreaterThan(drawn);
    // Ask a grown-up pins the question: the line, the pin's word, and no second ask
    await card.getByRole("button", { name: "Ask a grown-up" }).click();
    await expect(card.locator(".tu-line.fixed .tu-words").last()).toHaveText(
        "Leave this one. Your grown-up will see it on their page.",
    );
    await expect(q.locator(".ls-pin")).toHaveText("For your grown-up.");
    await expect(card.getByRole("button", { name: "Ask a grown-up" })).toHaveCount(0);
    expect(await card.textContent()).not.toMatch(/!/);
    // Got it closes the card and hands the keyboard to the box
    await card.getByRole("button", { name: "Got it" }).click();
    await expect(card).toHaveCount(0);
    await expect(box).toBeFocused();
    await expect(guide).toHaveAttribute("aria-expanded", "false");
    // both presses are in the log, as help-asked beside the sitting
    await expect
        .poll(() => helpAskedOn(page, rosie, lesson), { timeout: 30_000 })
        .toEqual(expect.arrayContaining(["where", "grown-up"]));
});

/** Whether an element is inside the window, for a map drawn back until a place is on the screen. */
const onScreen = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
};

test("the sheet takes a child through its questions: the one to do now stands out with its box ready and its place in the picture marked, a done one is ticked, and the next takes over", async ({
    page,
    request,
}, info) => {
    test.setTimeout(180_000);
    // Pip's first lesson asks for numbers, each in a box its drawing places
    const fixture = await fixtureFamily(page, request, info, 0);
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const { roll, sheet } = await intoTodaysSheet(page, "Pip", fixture.today);
    // the sheets are there as the roll opens: the pack's readers are warmed with the lesson's code
    // once the map is up (apps/kids/child.tsx), so nothing waits for them when a child goes in
    await expect(roll.locator(".ls-sheet").first()).toBeAttached({ timeout: 3_000 });
    const [first, second] = await typedQuestions(page, fixture.kid, fixture.today);
    if (!first || !second) throw new Error(`${fixture.today} has fewer than two typed questions`);
    const q = sheet.locator(`.ls-q[data-n="${first.n}"]`);
    const next = sheet.locator(`.ls-q[data-n="${second.n}"]`);
    const box = q.getByLabel(`Your answer to question ${first.n}`);
    const nextBox = next.getByLabel(`Your answer to question ${second.n}`);
    await expect(sheet.locator(".ls-q.current")).toHaveCount(1);
    await expect(q).toHaveClass(/current/);
    await expect(q).toHaveAttribute("aria-current", "step");
    await expect(box).toHaveAttribute("placeholder", "?");
    await expect(box).toHaveAttribute("inputmode", "numeric");
    // its place in the picture is the box the picture drew, which is where the child writes, and it
    // is the one that looks ready: the question after it has a box of its own and no ring
    await expect(q.locator(".ls-scene .ls-inbox .ls-in")).toHaveCount(1);
    await expect(q.locator(".ls-inbox-in.ready")).toHaveCount(1);
    await expect(next.locator(".ls-inbox-in.ready")).toHaveCount(0);
    await atRest(roll);
    await rollTo(page, roll, box);
    // a finger's size, and nothing on the page covers it
    const at = await box.boundingBox();
    if (!at) throw new Error("the box is not on the page");
    const camera = await roll.locator(".wd-host .world").evaluate((el) => el.style.transform);
    expect(at.height, `the box on the roll at ${camera}`).toBeGreaterThanOrEqual(44);
    const onTop = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.getAttribute("aria-label") ?? null,
        [at.x + at.width / 2, at.y + at.height / 2] as const,
    );
    expect(onTop).toBe(`Your answer to question ${first.n}`);
    // the right answer typed and sent with the keyboard's own key
    await box.click();
    await box.fill(first.answer);
    await box.press("Enter");
    await expect(q.locator(".ls-said")).toHaveText("Yes, that is right.");
    await expect(q).toHaveClass(/done/);
    await expect(q).not.toHaveClass(/current/);
    await expect(q.locator(".ls-tick")).toBeVisible();
    // the box it was written in is taken away, and the drawing carries the answer in the teacher's pen
    await expect(q.locator(".ls-inbox")).toHaveCount(0);
    // and the next question takes over, with the child's focus in its box
    await expect(next).toHaveClass(/current/);
    await expect(next.locator(".ls-inbox-in.ready")).toHaveCount(1);
    await expect(nextBox).toBeFocused({ timeout: 5_000 });
    expect(await sheet.textContent()).not.toMatch(/tries|score|!/i);
});

test("a child taps a world that is not open yet: nothing opens and no card covers the map", async ({
    page,
}) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/);
    const railway = map.getByRole("button", { name: "The railway. Not reached yet." });
    // the map drawn back until the railway is on the screen to tap
    for (let i = 0; i < 5 && !(await railway.evaluate(onScreen)); i++) {
        await page.keyboard.press("-");
        await page.waitForTimeout(600);
    }
    // a locked place carries aria-disabled, so the tap is made as a child's finger makes it
    // the map's own camera has to be at rest, or the tap lands while it is still flying and travels
    // nowhere; a child meets the same map a moment later
    await settledIn(map);
    await railway.click({ force: true });
    // Nothing opened: no card, no roll, and the guide is still in the harbour.
    await expect(map.getByRole("note")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Rosie's year" })).toHaveCount(0);
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeVisible();
    await expect(page.locator(".kid-guide, .kid-help")).toHaveCount(0);
});

test("going into a world and back is one movement: no waiting line between the dive and the roll, and the map opens where the child left it", async ({
    page,
}) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/);
    const opening = page.locator(".kid-map-note").filter({ hasText: "Your page is opening." });
    const roll = page.getByRole("region", { name: "Rosie's year" });
    // the map dives into the world and the roll opens out of the same box, with nothing in between:
    // the roll's code is warmed with the page and waited for before the screen changes (child.tsx)
    let waited = 0;
    const watch = setInterval(() => {
        void opening.count().then((n) => {
            waited += n;
        });
    }, 50);
    await goIntoWorld(map);
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
    clearInterval(watch);
    expect(waited, "the page said it was opening between the dive and the roll").toBe(0);
    // The way back puts the child on the map where they went in, with nothing laid over it.
    await outToMap(page, map);
    await expect(map).toHaveClass(/ready/, { timeout: 15_000 });
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeVisible();
    await expect(page.locator(".kid-guide, .kid-help")).toHaveCount(0);
    // Leaving disposes the measured sheets. Going in again must draw them afresh rather than waiting
    // forever on the previous resource result (child.tsx).
    await goIntoWorld(map);
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
});

test("a child steps back from the roll and the world is a place: a stop for every day, what each day was about, a stamp on a finished one, and a way into any of them", async ({
    page,
}) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/);
    await goIntoWorld(map);
    const roll = page.getByRole("region", { name: "Rosie's year" });
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
    // nothing is laid over the roll: pulling back is the way out, and the way back in its corner is
    // out of sight until a hand moves over the paper or a finger lifts from it
    await expect(page.locator(".wd-bar, .wd-home")).toHaveCount(0);
    await expect(roll.getByRole("button", { name: "Back to the map" })).toHaveCount(1);
    await expect(roll.locator(".wo")).not.toHaveClass(/\bon\b/);
    await page.locator(".wd-host").focus();
    await page.keyboard.press("Escape");
    const place = page.locator(".pl");
    await expect(place).toHaveClass(/ready/, { timeout: 20_000 });
    // a stop for every day of the term, the guide standing at one of them, and no bar over any of it
    expect(await place.locator(".pl-stop").count()).toBeGreaterThan(1);
    await expect(place.locator(".pl-token")).toHaveCount(1);
    await expect(place.getByRole("button", { name: "Back to the map" })).toHaveCount(1);
    // a finished day says what it was about, in the world's own words, and carries its stamp
    const done = place.locator(".pl-paper.done").first();
    await expect(done.locator(".hook")).not.toBeEmpty();
    expect(await place.locator(".pl-stamp").count()).toBeGreaterThan(0);
    // the day still to come is a marker standing in the world, and it names no lesson
    await expect(place.locator(".pl-paper.next .name")).toHaveCount(0);
    expect(await place.locator(".pl-paper").first().textContent()).not.toMatch(/!/);
    // the day the guide stands at is a target a finger can hit, and tapping it reads that day
    const today = place.locator(".pl-stop.today");
    const stop = (await today.count()) ? today.first() : place.locator(".pl-stop.done").last();
    const box = await stop.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await stop.click();
    await expect(roll).toHaveClass(/ready/, { timeout: 20_000 });
    // and Escape steps out one at a time, to the place and then to the map
    await outToMap(page, map);
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeVisible();
});

/**
 * A finger on the canvas, as a child's is: one pull across `host` from its middle, up by `by` pixels,
 * through the browser's own touch gestures rather than the mouse, so the page sees a finger down,
 * moving and lifting. Only on a device with a touch screen.
 */
async function fingerPull(page: Page, host: Locator, by: number): Promise<void> {
    const box = await host.boundingBox();
    if (!box) throw new Error("the canvas is not on the page");
    const cdp = await page.context().newCDPSession(page);
    try {
        await cdp.send("Input.synthesizeScrollGesture", {
            x: Math.round(box.x + box.width / 2),
            y: Math.round(box.y + box.height / 2),
            yDistance: -by,
            gestureSourceType: "touch",
            speed: 800,
            preventFling: true,
        });
    } finally {
        await cdp.detach();
    }
}

test("the way back to the map is out of sight until a hand moves over the roll or a finger lifts from it, is not there while the paper moves, and goes again once the hand has left", async ({
    page,
}) => {
    // Pulling back is the way out for everyone, and this is for a child who does not know that yet:
    // a whole button, low against the paper, that a finger lifting is enough to bring, and that is
    // never over the paper while the paper moves. On a device with a touch screen the finger is a
    // real one, through the browser's own touch gestures; on the laptop it is the mouse moving.
    const touch = Boolean(test.info().project.use.hasTouch);
    const { roll } = await atTodaysSheet(page);
    const host = roll.locator(".wd-host");
    const way = roll.getByRole("button", { name: "Back to the map" });
    const shown = (): Promise<string> => way.evaluate((el) => getComputedStyle(el).opacity);
    await expect(way).not.toHaveClass(/\bon\b/);
    await expect.poll(shown).toBe("0");
    const window = await host.boundingBox();
    if (!window) throw new Error("the roll is not on the page");
    const x = window.x + window.width / 2;
    const y = window.y + window.height / 2;

    if (touch) {
        // a finger pulls the paper and lifts: the way comes once the paper has stopped, on the lift alone
        await fingerPull(page, host, 120);
        await expect(way).toHaveClass(/\bon\b/, { timeout: 6_000 });
        await expect.poll(shown).toBe("1");
    } else {
        // a hand moving over the paper, with nothing pressed, brings it
        await page.mouse.move(x, y);
        await page.mouse.move(x + 8, y + 8);
        await expect(way).toHaveClass(/\bon\b/);
        await expect.poll(shown).toBe("1");
        // and while the hand pulls the paper it is not there
        await page.mouse.down();
        await page.mouse.move(x + 8, y - 60, { steps: 6 });
        await expect(way).not.toHaveClass(/\bon\b/);
        await page.mouse.move(x + 8, y - 120, { steps: 6 });
        await page.mouse.up();
        await expect(way).toHaveClass(/\bon\b/, { timeout: 6_000 });
    }
    // a whole button a finger can hit, whatever the size of the screen
    const box = await way.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    // it goes again once the hand has left the paper alone for a while
    await expect(way).not.toHaveClass(/\bon\b/, { timeout: 8_000 });
    await expect.poll(shown).toBe("0");

    // a finger lifting without a pull, a tap on the paper's edge where nothing is to press, is
    // enough on its own
    if (touch) {
        await page.touchscreen.tap(window.x + 8, y);
        await expect(way).toHaveClass(/\bon\b/, { timeout: 6_000 });
    } else {
        await page.mouse.move(x, y);
    }
    await expect.poll(shown).toBe("1");
    // and pressing it goes back to the place, where the same way back stands
    await way.click();
    const place = page.locator(".pl");
    await expect(place).toHaveClass(/ready/, { timeout: 20_000 });
    const back = place.getByRole("button", { name: "Back to the map" });
    const backShown = (): Promise<string> => back.evaluate((el) => getComputedStyle(el).opacity);
    await expect(back).toHaveCount(1);
    const land = place.locator(".pl-host");
    const ground = await land.boundingBox();
    if (!ground) throw new Error("the place is not on the page");
    if (touch) await fingerPull(page, land, 40);
    else {
        await page.mouse.move(ground.x + ground.width / 2, ground.y + ground.height / 2);
        await page.mouse.move(ground.x + ground.width / 2 + 8, ground.y + ground.height / 2 + 8);
    }
    await expect(back).toHaveClass(/\bon\b/, { timeout: 6_000 });
    await expect.poll(backShown).toBe("1");
    await back.click();
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 20_000 });
});

test("a term walked in the place keeps only the days near the camera drawn, so a whole term can be looked through without the page growing", async ({
    page,
}) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/);
    await goIntoWorld(map);
    const roll = page.getByRole("region", { name: "Rosie's year" });
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
    await page.locator(".wd-host").focus();
    await page.keyboard.press("Escape");
    const place = page.locator(".pl");
    await expect(place).toHaveClass(/ready/, { timeout: 20_000 });
    /** What the place holds now: the days whose paper the screen can reach, and the paper drawn. */
    const held = (): Promise<{ drawn: number; near: number; stops: number }> =>
        page.evaluate(() => {
            const boxes = [...document.querySelectorAll(".pl-paper")];
            const near = boxes.filter((b) => {
                const r = b.getBoundingClientRect();
                // a box the place has hidden far out has no size at all, and is nowhere near
                return (
                    r.width > 0 &&
                    r.height > 0 &&
                    r.bottom > -innerHeight &&
                    r.top < innerHeight * 2 &&
                    r.right > -innerWidth &&
                    r.left < innerWidth * 2
                );
            });
            return {
                drawn: document.querySelectorAll(".pl-paper > .ls-sheet, .pl-paper > .j-sheet")
                    .length,
                near: near.length,
                stops: boxes.length,
            };
        });
    // a day's own sheet is drawn into its stop as the camera comes near it, and not before
    await expect.poll(async () => (await held()).drawn, { timeout: 25_000 }).toBeGreaterThan(0);
    const at = await held();
    expect(
        at.drawn,
        `${at.drawn} days' paper drawn of ${at.near} near, in a term of ${at.stops}`,
    ).toBeLessThanOrEqual(at.near);
    // then the child walks the term, and no more paper is alive than the screen can reach. This
    // family's term is six days on one run of the trail, which is shorter than a screen at the zoom
    // the place is read at, so every day stays near here however far the camera walks: what the walk
    // holds is the bound, and the roll below is where a day going out of reach can be seen.
    await page.locator(".pl-host").focus();
    for (let i = 0; i < 12; i++) {
        await page.keyboard.press(i < 6 ? "ArrowDown" : "ArrowUp");
        await page.waitForTimeout(250);
        const now = await held();
        expect(now.drawn, "no more paper is alive than the screen can reach").toBeLessThanOrEqual(
            now.near,
        );
    }
    await expect.poll(async () => (await held()).drawn, { timeout: 20_000 }).toBeGreaterThan(0);
    // the count at the end of the walk, which is the number the page is judged on: no more paper is
    // alive than the days the screen can reach, whatever was walked past to get here
    const end = await held();
    expect(
        end.drawn,
        `${end.drawn} days' paper alive after the term was walked, ${end.near} of the term's ${end.stops} days near`,
    ).toBeLessThanOrEqual(end.near);

    // On the roll, which runs down a whole year, a day does go out of reach: the paper drawn near
    // today is let go of as the child looks back up the year, and drawn again on the way down.
    // The walk has left the camera where it stopped, so the guide's own key brings today back first,
    // since a stop off the screen cannot be tapped on a canvas that has nothing to scroll.
    await page.keyboard.press("t");
    await page.waitForTimeout(1200);
    const today = place.locator(".pl-stop.today");
    await ((await today.count()) ? today.first() : place.locator(".pl-stop.done").last()).click();
    await expect(roll).toHaveClass(/ready/, { timeout: 20_000 });
    const drawnDays = (): Promise<string[]> =>
        page.evaluate(() =>
            // today's own sheets are the page's and stay while the roll is open; the days looked
            // back at are the ones asked for as the camera comes near them
            [...document.querySelectorAll(".wd-host .ls-sheet:not(.today)")].map(
                (e) => (e instanceof HTMLElement ? e.dataset.lesson : "") ?? "",
            ),
        );
    const held0 = async (): Promise<number> => (await drawnDays()).length;
    await expect.poll(held0, { timeout: 25_000 }).toBeGreaterThan(0);
    const were = await drawnDays();
    const stillHere = async (): Promise<number> =>
        (await drawnDays()).filter((id) => were.includes(id)).length;
    await page.locator(".wd-host").focus();
    // a day's row is taller than the band the roll keeps drawn, so the paper is walked away from in
    // the long strides Shift takes rather than a step at a time
    for (let i = 0; i < 30; i++) await page.keyboard.press("Shift+ArrowUp");
    // paper the camera has left behind is let go of, while what it has walked to is drawn: the page
    // holds what is near it and not the year
    await expect.poll(stillHere, { timeout: 25_000 }).toBeLessThan(were.length);
    for (let i = 0; i < 30; i++) await page.keyboard.press("Shift+ArrowDown");
    await expect.poll(stillHere, { timeout: 25_000 }).toBeGreaterThan(0);
});

test("a sitting begun with no network for a minute lands once it is back", async ({
    page,
    context,
    browser,
}, info) => {
    test.setTimeout(240_000);
    const { rosie, roll, sheet, lesson } = await atTodaysSheet(page);
    const told = page.locator(".offline-note").filter({ hasText: OFFLINE });
    const [picked] = await typedQuestions(page, rosie, lesson);
    if (!picked) throw new Error(`${lesson} has no typed question`);
    const { n, answer: right } = picked;
    const q = sheet.locator(`.ls-q[data-n="${n}"]`);
    const box = q.getByLabel(`Your answer to question ${n}`);
    await rollTo(page, roll, box);

    await context.setOffline(true);
    await expect(told).toBeVisible();
    // the sheet checks the answer itself, so the child reads the reply with no network, and the
    // sitting this answer begins waits in the queue
    await box.fill(right);
    await q.getByRole("button", { name: "Check" }).click();
    await expect(q.locator(".ls-said")).toHaveText("Yes, that is right.");
    // a real minute, since the page's clock cannot be swapped once the view has loaded
    await page.waitForTimeout(60_000);
    await expect(told).toBeVisible();

    await context.setOffline(false);
    await expect(told).toHaveCount(0, { timeout: 30_000 });

    // The sitting that began with no network, never ended, is in the record the server folds once it
    // has landed; it is the earlier case's sitting picked up again when that one is still open.
    await expect
        .poll(() => unfinishedOf(page, rosie), { timeout: 30_000 })
        .toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lesson, answered: expect.arrayContaining([n]) }),
            ]),
        );

    const grownUp = await newDevice(browser, info);
    try {
        const ben = await grownUp.newPage();
        await signInAs(ben, "Ben Harlow");
        await expect.poll(() => answersToday(ben, rosie, lesson), { timeout: 30_000 }).toContain(n);
        await signOut(ben);
    } finally {
        await grownUp.close();
    }
});

test("a sitting left half done is picked up where it stood: its questions done stay done, the roll lands at the first still to do, and no second sitting begins", async ({
    page,
}) => {
    const { rosie, roll, sheet, lesson } = await atTodaysSheet(page);
    // earlier cases answered some questions in sittings they never ended, which this sheet picks up
    const typed = await typedQuestions(page, rosie, lesson);
    const doneAlready = await sheet
        .locator(".ls-q.done")
        .evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-n"))));
    const left = typed.filter((t) => !doneAlready.includes(t.n));
    const [first, second] = left;
    if (!first || !second) throw new Error(`${lesson} has fewer than two typed questions left`);
    await answerRight(page, roll, sheet, first);
    const before = await expect
        .poll(
            async () =>
                (await unfinishedOf(page, rosie)).filter(
                    (u) => u.lesson === lesson && u.answered.includes(first.n),
                ),
            { timeout: 30_000 },
        )
        .not.toHaveLength(0)
        .then(() => unfinishedOf(page, rosie));
    const mine = before.filter((u) => u.lesson === lesson);
    const sitting = mine.at(-1)?.sitting;
    if (!sitting) throw new Error("the sitting is not in the record");

    // the view opens again on the same day: the sheet is where it was left, and the roll lands there
    await page.reload();
    const again = await intoTodaysSheet(page, "Rosie");
    expect(again.lesson).toBe(lesson);
    const done = again.sheet.locator(`.ls-q[data-n="${first.n}"]`);
    await expect(done).toHaveClass(/done/);
    // nowhere left to write on it: a box on the picture is taken away and the drawing carries the
    // answer in the teacher's pen, and a box in the row under the picture stays and is closed
    await expect(done.locator(".ls-in:not([disabled])")).toHaveCount(0);
    await expect(done.locator(".ls-strip")).toHaveAttribute("data-state", "right");
    const next = again.sheet.locator(".ls-q:not(.done)").first();
    await expect(next).toBeInViewport({ timeout: 10_000 });
    // and what is answered now goes into the same sitting
    await answerRight(page, again.roll, again.sheet, second);
    await expect
        .poll(
            async () =>
                (await unfinishedOf(page, rosie)).find((u) => u.sitting === sitting)?.answered ??
                [],
            { timeout: 30_000 },
        )
        .toEqual(expect.arrayContaining([first.n, second.n]));
    expect((await unfinishedOf(page, rosie)).filter((u) => u.lesson === lesson)).toHaveLength(
        mine.length,
    );
});

/** Lessons that share a day of grade 1 with a maths lesson, and ask for a painting and for a program. */
const PAINTED = "art-mixing-the-secondaries";
const BUILT = "coding-following-instructions";

/** The first day of a family's fixture, and the school days from it to yesterday. */
const schoolDaysBefore = (n: number): string[] => {
    const days: string[] = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    while (days.length < n) {
        d.setDate(d.getDate() - 1);
        const wd = d.getDay();
        if (wd >= 1 && wd <= 5) days.unshift(new Date(d).toISOString());
    }
    return days;
};

/**
 * A family of its own with a child in grade 1 doing maths, and the track `also` names beside it, the
 * first `done` lessons of the first term's maths done on paper, one a school day, as a parent records
 * them, so that today's maths lesson is the next: the parent signed in on this page, and the child's
 * id and today's maths lesson. With `done` left out, every lesson of the term but the last is done, so
 * the child is one lesson short of the term's end.
 */
async function fixtureFamily(
    page: Page,
    request: APIRequestContext,
    info: TestInfo,
    done?: number,
    also?: string,
): Promise<{ kid: string; today: string }> {
    const email = address("fixture", info);
    await askForCode(page, email, { name: "Sam", family: "Okafor" });
    await typeCode(page, request, email);
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    const fixture: unknown = await page.evaluate(
        async ([days, count, other]): Promise<unknown> => {
            const post = async (path: string, body: unknown): Promise<unknown> =>
                (
                    await fetch(path, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(body),
                    })
                ).json();
            const added = (await post("/api/kids", {
                name: "Pip",
                grade: 1,
                consent: { notice: "2026-09" },
            })) as { kid?: { id: string } };
            const kid = added.kid?.id;
            if (!kid) return { problem: JSON.stringify(added) };
            const pack = (await (await fetch("/api/pack")).json()) as {
                pack: string;
                index: {
                    lessons: {
                        id: string;
                        grade: number;
                        subject: string;
                        unit?: number;
                        source: string;
                        levels: { medium: { hash: string } };
                    }[];
                };
            };
            // the first term is the first three units of the year's maths, in the order a child meets them
            const maths = pack.index.lessons
                .filter((l) => l.grade === 1 && l.subject === "maths")
                .sort((a, b) => (a.unit ?? 1) - (b.unit ?? 1) || a.source.localeCompare(b.source));
            const units = [...new Set(maths.map((l) => l.unit ?? 1))]
                .sort((a, b) => a - b)
                .slice(0, 3);
            const term = maths.filter((l) => units.includes(l.unit ?? 1));
            const before = term.slice(0, count ?? term.length - 1);
            const today = term[before.length];
            if (!today) return { problem: "the term has no lesson left for today" };
            const on = days.slice(-before.length);
            const first = on[0] ?? days[0] ?? new Date().toISOString();
            // Pip does maths, and one other track when a case asks for it, every day. The rest of
            // grade 1's default is turned off in so many words, since a plan nobody changes carries
            // it, and a term's moment waits on every track that is on.
            const tracks = [
                "maths",
                "coding",
                "physics",
                "chemistry",
                "reading",
                "writing",
                "music",
                "nature",
            ];
            // a loose subject such as art is not a track, and a case may still ask for it by name
            if (other && !tracks.includes(other)) tracks.push(other);
            const events: unknown[] = tracks.map((track) => ({
                id: crypto.randomUUID(),
                kid_id: kid,
                kind: "plan-changed",
                at: new Date(Date.parse(first) - 36e5).toISOString(),
                data:
                    track === "maths" || track === other
                        ? { op: { op: "track", track, on: true, perWeek: 5 } }
                        : { op: { op: "track", track, on: false, perWeek: 0 } },
            }));
            before.forEach((l, i) => {
                const sitting = crypto.randomUUID();
                const began = on[i] ?? first;
                events.push(
                    {
                        id: crypto.randomUUID(),
                        kid_id: kid,
                        kind: "sitting-began",
                        at: began,
                        data: {
                            sitting,
                            lesson: l.id,
                            lessonHash: l.levels.medium.hash,
                            pack: pack.pack,
                            mode: "paper",
                        },
                    },
                    {
                        id: crypto.randomUUID(),
                        kid_id: kid,
                        kind: "sitting-ended",
                        at: new Date(Date.parse(began) + 18e5).toISOString(),
                        data: { sitting, finished: true, minutes: 20, withGrownUp: true },
                    },
                );
            });
            const written = (await post("/api/events", { events })) as { events?: unknown[] };
            return {
                kid,
                today: today.id,
                written: written.events?.length ?? 0,
                expected: events.length,
            };
        },
        [schoolDaysBefore(60), done ?? null, also ?? null] as const,
    );
    if (!isRecord(fixture) || typeof fixture.kid !== "string" || typeof fixture.today !== "string")
        throw new Error(`the fixture was not written: ${JSON.stringify(fixture)}`);
    expect(fixture.written).toBe(fixture.expected);
    return { kid: fixture.kid, today: fixture.today };
}

test("finishing the last lesson of a term plays the moment on the roll, and on the map the world is finished, the way on is open and the next world is where the child is", async ({
    page,
    request,
}, info) => {
    test.setTimeout(180_000);
    const fixture = await fixtureFamily(page, request, info);

    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const map = childsMap(page, "Pip");
    await expect(map).toHaveClass(/ready/);
    await expect(map.getByRole("button", { name: /^The meadow\. You are here\./ })).toBeVisible();
    await expect(map.getByRole("button", { name: "The harbour. Not reached yet." })).toBeVisible();

    // the term's last lesson is today's sheet; a right answer and I have finished end its sitting
    const { roll, sheet, lesson } = await intoTodaysSheet(page, "Pip");
    expect(lesson).toBe(fixture.today);
    const [typed] = await typedQuestions(page, fixture.kid, lesson);
    if (!typed) throw new Error(`${lesson} has no typed question`);
    await answerRight(page, roll, sheet, typed);
    const finish = sheet.getByRole("button", { name: "I have finished" });
    await rollTo(page, roll, finish);
    await finish.click();
    await expect(sheet.locator(".ls-finished")).toHaveText(/You have finished this page/);
    // once the sitting has landed the roll is drawn from the record again: the sheet stays as it was
    // left, the moment beside the term's end is inked, and the guide has moved on to the next world
    await expect(roll.locator("[data-key^='moment-'].inked")).toHaveCount(1, { timeout: 30_000 });
    await expect(roll.locator(`.ls-sheet[data-lesson="${lesson}"] .ls-finished`)).toHaveText(
        /You have finished this page/,
    );
    await expect(roll.locator(".j-date.today")).toHaveCount(1);
    await expect(roll.locator(".wd-sheet.today")).toHaveCount(1);
    expect(await roll.locator(".wd-sheet.today").getAttribute("data-lesson")).not.toBe(lesson);

    // and on the map the meadow is finished, the way on is open, and the child is in the harbour
    await outToMap(page, map);
    await expect(map).toHaveClass(/ready/, { timeout: 15_000 });
    await expect(map.getByRole("button", { name: /^The meadow\. Finished\./ })).toBeVisible();
    await expect(map.getByRole("button", { name: /^The harbour\. You are here\./ })).toBeVisible();
    await expect(map.getByRole("button", { name: "The railway. Not reached yet." })).toBeVisible();
    await expect(map.locator(".ow-road.open")).not.toHaveCount(0);
});

/**
 * A family of its own with a child in grade 1 and no plan, as a new family starts; with `open`, a
 * sitting the child began on a screen three days ago on a lesson as an older pack had it, two hints
 * opened in it and never ended, as the owner's own family had. */
/**
 * A family whose one child has nothing planned, which since the default curriculum landed is a
 * family that turned every subject off rather than one that never set a plan up. The screen a child
 * meets with no lesson is still real, so these cases still walk it, but it is no longer where a new
 * family starts (school/tracks.ts, `DEFAULT_TRACKS`).
 */
async function familyWithNoPlan(
    page: Page,
    request: APIRequestContext,
    info: TestInfo,
    open = false,
): Promise<void> {
    const email = address("noplan", info);
    await askForCode(page, email, { name: "Sam", family: "Adeyemi" });
    await typeCode(page, request, email);
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    const added: unknown = await page.evaluate(async (withSitting): Promise<unknown> => {
        const post = async (path: string, body: unknown): Promise<unknown> =>
            (
                await fetch(path, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(body),
                })
            ).json();
        const r = (await post("/api/kids", {
            name: "Pip",
            grade: 1,
            consent: { notice: "2026-09" },
        })) as { kid?: { id: string } };
        const kid = r.kid?.id;
        if (!kid) return r;
        // every track, so the child keeps nothing of their grade's default
        const off = await post("/api/events", {
            events: [
                "maths",
                "coding",
                "physics",
                "chemistry",
                "reading",
                "writing",
                "music",
                "nature",
            ].map((track) => ({
                id: crypto.randomUUID(),
                kid_id: kid,
                kind: "plan-changed",
                at: new Date().toISOString(),
                data: { op: { op: "track", track, on: false, perWeek: 0 } },
            })),
        });
        if (!withSitting) return { ...r, off };
        const sitting = crypto.randomUUID();
        const at = new Date(Date.now() - 3 * 864e5).toISOString();
        const hint = (n: number) => ({
            id: crypto.randomUUID(),
            kid_id: kid,
            kind: "hint-opened",
            at,
            data: {
                sitting,
                rung: 1,
                q: {
                    n,
                    ask: "Is the arrow a push or a pull?",
                    item: "physics.push-or-pull",
                    lesson: "physics-push-and-pull",
                    skills: ["physics.forces"],
                    section: "do",
                    variant: `p=${n % 2},n=4`,
                    itemHash: "0".repeat(64),
                    lessonHash: "0".repeat(64),
                },
            },
        });
        const written = await post("/api/events", {
            events: [
                {
                    id: crypto.randomUUID(),
                    kid_id: kid,
                    kind: "sitting-began",
                    at,
                    data: {
                        sitting,
                        lesson: "physics-push-and-pull",
                        lessonHash: "0".repeat(64),
                        pack: "0".repeat(64),
                        mode: "screen",
                    },
                },
                hint(1),
                hint(2),
            ],
        });
        return { ...r, off, written };
    }, open);
    if (!isRecord(added) || !isRecord(added.kid)) throw new Error(JSON.stringify(added));
}

test("a child with nothing planned goes into their world, finds it with nothing to open, and comes back out", async ({
    page,
    request,
}, info) => {
    // the first thing a new family meets: until the owner's own family met it, a child with no
    // sheet today waited on "Your page is opening." for ever
    await familyWithNoPlan(page, request, info);
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const map = childsMap(page, "Pip");
    await expect(map).toHaveClass(/ready/);
    await goIntoWorld(map);
    const roll = page.getByRole("region", { name: "Pip's year" });
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
    await expect(roll.locator(".wd-where")).toHaveCount(0);
    await expect(roll.locator(".wd-sheet.today")).toHaveCount(0);
    await expect(page.getByText("Your page is opening.")).toHaveCount(0);
    // a child before their first lesson is in a world all the same: its ground, its path and the card
    // that says where the first day goes, rather than an empty page (the owner met that on 20 September)
    await expect(roll.locator(".j-ground")).not.toHaveCount(0);
    await expect(roll.locator(".j-art")).not.toHaveCount(0);
    const card = roll.locator(".j-bare");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Your first lesson will be here.");
    expect(await card.textContent()).not.toMatch(/!/);
    await outToMap(page, map);
    await expect(map).toHaveClass(/ready/, { timeout: 15_000 });
    await expect(map.getByRole("button", { name: /^The meadow\./ })).toBeVisible();
});

test("a child with nothing planned and a sitting left open on an earlier day goes into their world and comes back out", async ({
    page,
    request,
}, info) => {
    await familyWithNoPlan(page, request, info, true);
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const map = childsMap(page, "Pip");
    await expect(map).toHaveClass(/ready/);
    await goIntoWorld(map);
    const roll = page.getByRole("region", { name: "Pip's year" });
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
    await expect(page.getByText("Your page is opening.")).toHaveCount(0);
    await outToMap(page, map);
    await expect(map).toHaveClass(/ready/, { timeout: 15_000 });
});

/** The world's code as the development server serves it, which a deploy or a restart can take away from an open tab. */
const WORLD_CODE = /\/engine\/ui\/world\.tsx/;

test("going in when the server has lost the world's code loads the page again once, and the world then opens", async ({
    page,
}) => {
    await signInAs(page);
    // the child's page asks for the world's code as it opens, so it is refused from the start
    let refused = 0;
    await page.route(WORLD_CODE, (route) => (refused++ === 0 ? route.abort() : route.continue()));
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    // the import fails, and the page loads again, once, on her map
    await expect.poll(() => refused, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect(map).toHaveClass(/ready/, { timeout: 20_000 });
    await goIntoWorld(map);
    const roll = page.getByRole("region", { name: "Rosie's year" });
    await expect(roll).toHaveClass(/ready/, { timeout: 15_000 });
});

test("going in when the world's code cannot be had says so and offers to try again, rather than opening for ever", async ({
    page,
}) => {
    await signInAs(page);
    await page.route(WORLD_CODE, (route) => route.abort());
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    // the first failure loads the page again; after the second, going in says so
    await expect(map).toHaveClass(/ready/, { timeout: 20_000 });
    await goIntoWorld(map);
    await expect(page.locator("#main").getByText("This is taking a long time.")).toBeVisible({
        timeout: 20_000,
    });
    const again = page.getByRole("button", { name: "Try again" });
    await expect(again).toBeVisible();
    const box = await again.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await page.locator(".kid-map-note").first().textContent()).not.toMatch(/!/);
});

test("a finished day looked back at is drawn as the child left it, read-only, with the answers given then or why they are not shown", async ({
    page,
}) => {
    const { roll } = await atTodaysSheet(page);
    // the sheets of days before today, drawn as the roll comes to rest near them
    const past = roll.locator(".ls-sheet:not(.today)");
    const window = await roll.locator(".wd-host").boundingBox();
    if (!window) throw new Error("the roll is not on the page");
    await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
    for (let turn = 0; turn < 40 && (await past.count()) === 0; turn++) {
        await panUp(page, 400);
        await page.waitForTimeout(350);
    }
    expect(
        await past.count(),
        "no day before today was drawn as the roll came near it",
    ).toBeGreaterThan(0);
    const drawn = await past.evaluateAll((sheets) =>
        sheets.map((sheet) => ({
            lesson: sheet.getAttribute("data-lesson") ?? "",
            label: sheet.querySelector(".j-strip .label")?.textContent ?? "",
            open: sheet.querySelectorAll(
                "input:not([disabled]), textarea:not([disabled]), .ls-go:not([disabled]), .ls-pick:not([disabled])",
            ).length,
            given: Array.from(sheet.querySelectorAll("input"))
                .map((box) => (box instanceof HTMLInputElement ? box.value : ""))
                .filter((v) => v !== "").length,
            ticks: sheet.querySelectorAll(".ls-q.done .ls-tick").length,
            // a question the child handed in on paper for a grown-up to mark keeps that state
            handed: sheet.querySelectorAll('.ls-strip[data-state]:not([data-state=""])').length,
            // a lesson done on paper, or one whose file has changed since, says so instead
            note: sheet.querySelector(".ls-looked")?.textContent ?? "",
        })),
    );
    for (const sheet of drawn) {
        expect(sheet.label, `${sheet.lesson} is not labelled as finished`).toBe("Finished");
        expect(sheet.open, `${sheet.lesson} has something to answer or hand in`).toBe(0);
        if (sheet.note) continue;
        expect(
            sheet.given + sheet.ticks + sheet.handed,
            `${sheet.lesson} shows nothing the child did and says nothing about why`,
        ).toBeGreaterThan(0);
    }
});

test("scrolling up the roll to an earlier day is not pulled back to today's question", async ({
    page,
}) => {
    const { roll, sheet } = await atTodaysSheet(page);
    // every time a sheet asks the roll to follow it, counted on the page
    await page.evaluate(() => {
        document.body.dataset.reveals = "0";
        document.addEventListener(
            "lumischool:reveal",
            () => {
                document.body.dataset.reveals = String(Number(document.body.dataset.reveals) + 1);
            },
            true,
        );
    });
    const reveals = async (): Promise<number> =>
        Number(await page.evaluate(() => document.body.dataset.reveals ?? "0"));
    // the one to do now has its box, which a grown-up reading over the child's shoulder may tap
    const box = sheet.locator(".ls-q.current input, .ls-q.current [role='textbox']").first();
    if (await box.count()) {
        await box.focus();
        await page.waitForTimeout(1_800);
    }
    const before = await reveals();
    const window = await roll.locator(".wd-host").boundingBox();
    if (!window) throw new Error("the roll is not on the page");
    const today = roll.locator(".j-date.today");
    const flag = async (): Promise<number> => (await today.boundingBox())?.y ?? Number.NaN;
    const from = await flag();
    // the paper pulled down by a press that starts on a question in view, then up the roll as a
    // trackpad moves it and by the keyboard, as a grown-up looks back through the days
    const numbers = await sheet.locator(".ls-q .ls-n").all();
    for (const n of numbers) {
        const at = await n.boundingBox();
        if (!at || at.y < window.y + 40 || at.y > window.y + window.height - 300) continue;
        const x = at.x + at.width / 2,
            y = at.y + at.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let step = 1; step <= 8; step++) await page.mouse.move(x, y + step * 30);
        await page.mouse.up();
        break;
    }
    await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
    await panUp(page, 3_000);
    for (const key of ["PageUp", "ArrowUp", "ArrowUp"]) await page.keyboard.press(key);
    await page.waitForTimeout(300);
    const went = await flag();
    expect(went - from, "the roll did not go up the days").toBeGreaterThan(500);
    await page.waitForTimeout(3_500);
    // one day's flag for today, however often the roll was drawn again round the past days' sheets,
    // and nothing has brought it back up the screen towards today's question
    await expect(today).toHaveCount(1);
    expect(await flag(), "the roll was pulled back towards today").toBeGreaterThanOrEqual(went - 2);
    expect(await reveals(), "a sheet asked the roll to follow it while nobody worked in it").toBe(
        before,
    );
});

test("a parent puts a term with no work yet in the world made for it, and the child's map shows that world there, while a term with work keeps its own", async ({
    page,
    request,
}, info) => {
    test.setTimeout(120_000);
    // the first term's first lesson is done, so the meadow has work in it and the harbour has none
    await fixtureFamily(page, request, info, 1);
    await page.goto("/plan");
    await atScreen(page, page.getByRole("heading", { name: "Change the plan", exact: true }));
    // the sheet lists only the terms with a world made for them and no work yet: term 1 has work in
    // the meadow, so it is not offered; term 2 is in the harbour and the winter fair was made for it
    const sheet = page.getByRole("article", { name: "Pip" });
    const worlds = sheet.getByRole("region", { name: "This year's worlds" });
    await expect(worlds.getByText(/^Grade 1, term 1/)).toHaveCount(0);
    await expect(
        worlds.getByText("Grade 1, term 2 is in the harbour. The winter fair was made for it."),
    ).toBeVisible();
    await worlds.getByRole("button", { name: "Choose the world for Grade 1, term 2" }).click();
    const card = page.locator("dialog.dialog");
    await expect(card.getByRole("heading", { name: "Grade 1, term 2" })).toBeVisible();
    await expect(card.getByRole("button", { name: /^The harbour/ })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await card.getByRole("button", { name: /^The winter fair/ }).click();
    await card.getByRole("button", { name: "Keep this" }).click();
    await expect(card).toHaveCount(0);
    await expect(page.locator(".say").first()).toContainText(
        "Pip's grade 1, term 2 is in the winter fair from now on",
    );
    // and read back from the family's log, the sheet's line says the term is in the fair
    await expect(
        worlds.getByText("Grade 1, term 2 is in the winter fair. The winter fair was made for it."),
    ).toBeVisible();

    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const map = childsMap(page, "Pip");
    await expect(map).toHaveClass(/ready/);
    await expect(map.getByRole("button", { name: /^The meadow\. You are here\./ })).toBeVisible();
    await expect(
        map.getByRole("button", { name: "The winter fair. Not reached yet." }),
    ).toBeVisible();
    await expect(map.getByRole("button", { name: /^The harbour\./ })).toHaveCount(0);
});

test("a child answers a question on its drawing: weights stood on the see-saw by tapping, a wrong try heard and the plank let go, a hint, then the right one, and the sheet keeps it", async ({
    page,
    request,
}, info) => {
    test.setTimeout(180_000);
    // the second lesson of grade 1 asks for weights on a see-saw plank (g1-bonds-to-ten, question 10)
    const fixture = await fixtureFamily(page, request, info, 1);
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const { roll, sheet, lesson } = await intoTodaysSheet(page, "Pip");
    expect(lesson).toBe(fixture.today);
    const q = sheet.locator(".ls-q.arranged");
    await expect(q).toHaveCount(1);
    const n = Number(await q.getAttribute("data-n"));
    // the part's settings, for the right weights: the load on one side balances two bags on step 3
    const setup: unknown = await page.evaluate(
        async ([id, lessonId, num]) => {
            const at = (path: string): Promise<unknown> =>
                fetch(`/api/kid/${encodeURIComponent(id)}/${path}`).then((r) => r.json());
            const pack = (await at("pack")) as {
                pack: string;
                index: { lessons: { id: string; file: string }[] };
            };
            const facts = pack.index.lessons.find((l) => l.id === lessonId);
            if (!facts) return null;
            const read = (await at(
                `pack/${pack.pack}/lessons/${facts.file.replace(/^lessons\//, "")}`,
            )) as {
                levels: {
                    medium: {
                        sections: {
                            blocks: {
                                questions?: {
                                    n: number;
                                    hints: string[];
                                    arranged: { key: { piece: string; at: number }[] } | null;
                                    scene: {
                                        nodes: {
                                            id: string;
                                            type: string;
                                            v: { bags?: number[] };
                                        }[];
                                    } | null;
                                }[];
                            }[];
                        }[];
                    };
                };
            };
            for (const s of read.levels.medium.sections)
                for (const b of s.blocks)
                    for (const qq of b.questions ?? [])
                        if (qq.n === num && qq.arranged && qq.scene) {
                            const plank = qq.scene.nodes.find((x) => x.type === "balance-plank");
                            return {
                                key: qq.arranged.key,
                                bags: plank?.v.bags ?? [],
                                hints: qq.hints.length,
                            };
                        }
            return null;
        },
        [fixture.kid, lesson, n] as const,
    );
    if (!isRecord(setup) || !Array.isArray(setup.key) || !Array.isArray(setup.bags))
        throw new Error(`question ${n} of ${lesson} is not a plank`);
    const key = setup.key as { piece: string; at: number }[];
    const bags = setup.bags as number[];
    const kgOf = (piece: string): number => bags[Number(/\d+/.exec(piece)?.[0])] ?? 0;
    const said = q.locator(".ls-said");
    const check = q.getByRole("button", { name: "Check" });
    await expect(q.locator(".ar-piece")).toHaveCount(bags.length);
    // a wrong try: one of the right weights alone, tapped and then its step tapped, with the weights
    // on the grass low in the window so the plank above them is in it too
    const [first, second] = key;
    if (!first || !second) throw new Error("the key has fewer than two weights");
    const weight = (piece: string): Locator =>
        q.getByRole("button", {
            name: new RegExp(`^A ${kgOf(piece)} kilogram weight, on the grass`),
        });
    const step = q.getByRole("button", {
        name: new RegExp(`^Step ${Math.abs(first.at)} on the right`),
    });
    // the roll reads the sheet at its own zoom once it has arrived, which is where the weights are
    // a finger apart; a tap before that is a tap on a drawing the size of a stamp
    await atRest(roll);
    await rollTo(page, roll, weight(first.piece), 0.6);
    await weight(first.piece).click();
    await expect(said).toHaveText(/Now choose where it goes/);
    await step.click();
    await expect(said).toHaveText(/On the plank: \d+ kilograms on step \d on the right/);
    // no rolling to the button: working in a question brings its strip into the window
    await inWindow(roll, check);
    await check.click();
    await expect(said).toHaveText(/The plank goes down on the left\./);
    await expect(q.locator(".ar")).toHaveAttribute("data-state", "again");
    await expect(said).not.toHaveText(/!/);
    // Pip's family set no hint policy, so a hint is there on request; then the other weight joins
    await q.getByRole("button", { name: "A hint" }).click();
    await expect(q.locator(".ls-hints li")).toHaveCount(1);
    await q.getByRole("button", { name: "Try again" }).click();
    await rollTo(page, roll, weight(second.piece), 0.6);
    await weight(second.piece).click();
    // the weight already on that step covers it, and a tap on it while holding another means the
    // step under it, which is what a child's finger does (engine/ui/arrange.tsx)
    await step.click({ force: true });
    await check.click();
    await expect(said).toHaveText(/The plank stays level\. Yes, you got it\./);
    await expect(q).toHaveClass(/done/);
    await expect(q.locator(".ar")).toHaveAttribute("data-state", "right");
    await expect(check).toBeDisabled();
    // the try is in the record, as an arrangement
    await expect
        .poll(() => unfinishedOf(page, fixture.kid), { timeout: 30_000 })
        .toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lesson, answered: expect.arrayContaining([n]) }),
            ]),
        );
    // and the sheet opens again with the weights where the child left them, and takes no more
    await page.reload();
    const again = await intoTodaysSheet(page, "Pip");
    const back = again.sheet.locator(".ls-q.arranged");
    await expect(back).toHaveClass(/done/);
    await expect(back.locator(".ar")).toHaveAttribute("data-state", "right");
    await expect(back.getByRole("button", { name: "Check" })).toBeDisabled();
    await expect(back.getByRole("button", { name: /kilogram weight, on step/ })).toHaveCount(2);
});

test("a child hands in a painting made on paper for a grown-up to look at, the sitting records it for them, and the sheet keeps it handed in", async ({
    page,
    request,
}, info) => {
    test.setTimeout(180_000);
    // the third maths lesson of grade 1 shares its day with an art lesson whose painting a grown-up
    // looks at (art-mixing-the-secondaries, art.by-eye), so Pip does art beside maths
    const fixture = await fixtureFamily(page, request, info, 2, "art");
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const { roll, sheet, lesson } = await intoTodaysSheet(page, "Pip", PAINTED);
    const handIn = (at: Locator | Page): Locator =>
        at.getByRole("button", { name: "I have painted it" });
    const q = sheet
        .locator(".ls-q")
        .filter({ has: handIn(page) })
        .first();
    const n = Number(await q.getAttribute("data-n"));
    await expect(q.locator(".ls-note")).toHaveText(
        "Paint this one on paper. A grown-up will look at it.",
    );
    await expect(q.locator(".ls-in")).toHaveCount(0);
    await rollTo(page, roll, handIn(q));
    await handIn(q).click();
    await expect(q.locator(".ls-said")).toHaveText("A grown-up will look at it.");
    await expect(q).toHaveClass(/done/);
    await expect(handIn(q)).toBeDisabled();
    // the sitting holds it as collected: no right or wrong until a grown-up marks it
    const collected = async (): Promise<unknown> =>
        page.evaluate(
            async ([id, lessonId, num]): Promise<unknown> => {
                const res = await fetch(
                    `/api/kid/${encodeURIComponent(id)}/state?lesson=${encodeURIComponent(lessonId)}`,
                );
                const st = (await res.json()) as {
                    events?: {
                        kind: string;
                        data: { q?: { n: number }; given?: unknown; right?: unknown };
                    }[];
                };
                const e = (st.events ?? []).find(
                    (x) => x.kind === "answered" && x.data.q?.n === num,
                );
                return e ? { given: e.data.given, right: e.data.right } : null;
            },
            [fixture.kid, lesson, n] as const,
        );
    expect(fixture.today).toBe("g1-making-ten");
    await expect
        .poll(collected, { timeout: 30_000 })
        .toEqual({ given: { k: "unmarked" }, right: null });
    // and the sheet opens again with it handed in
    await page.reload();
    const again = await intoTodaysSheet(page, "Pip", lesson);
    const back = again.sheet.locator(`.ls-q[data-n="${n}"]`);
    await expect(back).toHaveClass(/done/);
    await expect(handIn(back)).toBeDisabled();
    await expect(back.locator(".ls-said")).toHaveText("A grown-up will look at it.");
});

test("a child builds a program from the pad's blocks: a run that stops short is said, then one that reaches the flag, and the sheet keeps it", async ({
    page,
    request,
}, info) => {
    test.setTimeout(180_000);
    // the first lesson of grade 1 coding asks for three blocks that take the robot to the flag
    // (coding-following-instructions, question 10), and Pip does maths too
    const fixture = await fixtureFamily(page, request, info, 0, "coding");
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    await openChildrensView(page, ["Pip"]);
    const { roll, sheet, lesson } = await intoTodaysSheet(page, "Pip", BUILT);
    const runIt = (at: Locator | Page): Locator => at.getByRole("button", { name: "Run it" });
    const q = sheet
        .locator(".ls-q")
        .filter({ has: runIt(page) })
        .first();
    const n = Number(await q.getAttribute("data-n"));
    const said = q.locator(".ls-said");
    const add = (block: string): Promise<void> =>
        q.getByRole("button", { name: `Add ${block}` }).click();
    const more = async (times: number): Promise<void> => {
        for (let i = 0; i < times; i++) await q.getByRole("button", { name: "More" }).click();
    };
    await rollTo(page, roll, runIt(q), 0.6);
    // one block that stops short of the flag
    await add("right 1");
    await more(2);
    await expect(q.getByRole("button", { name: "Slot 1: right 3" })).toBeVisible();
    await runIt(q).click();
    await expect(said).toHaveText("It stopped on column 4, row 1. Not yet. Have another look.", {
        timeout: 15_000,
    });
    // then the two blocks after it that reach the flag
    await add("down 1");
    await more(1);
    await add("left 1");
    await more(2);
    await runIt(q).click();
    await expect(said).toHaveText("It reached the flag. Yes, you got it.", { timeout: 15_000 });
    await expect(q).toHaveClass(/done/);
    await expect(runIt(q)).toBeDisabled();
    // the run is in the record as the program the child built
    const recorded = async (): Promise<unknown> =>
        page.evaluate(
            async ([id, lessonId, num]): Promise<unknown> => {
                const res = await fetch(
                    `/api/kid/${encodeURIComponent(id)}/state?lesson=${encodeURIComponent(lessonId)}`,
                );
                const st = (await res.json()) as {
                    events?: {
                        kind: string;
                        data: { q?: { n: number }; given?: unknown; right?: unknown };
                    }[];
                };
                const e = (st.events ?? []).findLast(
                    (x) => x.kind === "answered" && x.data.q?.n === num,
                );
                return e ? { given: e.data.given, right: e.data.right } : null;
            },
            [fixture.kid, lesson, n] as const,
        );
    await expect.poll(recorded, { timeout: 30_000 }).toEqual({
        given: {
            k: "program",
            lines: [
                { text: "right 3", depth: 0 },
                { text: "down 2", depth: 0 },
                { text: "left 3", depth: 0 },
            ],
        },
        right: true,
    });
    // and the sheet opens again with the program in the slots, and takes no more
    await page.reload();
    const again = await intoTodaysSheet(page, "Pip", lesson);
    const back = again.sheet.locator(`.ls-q[data-n="${n}"]`);
    await expect(back).toHaveClass(/done/);
    await expect(runIt(back)).toBeDisabled();
    await expect(back.getByRole("button", { name: "Slot 3: left 3" })).toBeVisible();
});

test("a grown-up leaves the children's view with the family's PIN", async ({ page, context }) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    await holdGrownUps(page);
    const pin = page.getByLabel("The family PIN");
    const leave = page.getByRole("button", { name: "Leave the children's view" });
    await pin.fill("1111");
    await leave.click();
    // the announcer for screen readers holds the same words
    await expect(page.locator("#main").getByText("That PIN is not right.")).toBeVisible();
    await pin.fill(FAMILY_PIN);
    await leave.click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Anna Harlow" }));
    const names = await cookieNames(context);
    expect(names).toContain("ls_session");
    expect(names).not.toContain("ls_kids");
    await signOut(page);
});

test("a parent ends every children's view from another device, and the view closes", async ({
    page,
    browser,
}, info) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);

    const other = await newDevice(browser, info);
    try {
        const ben = await other.newPage();
        await signInAs(ben, "Ben Harlow");
        // the views are ended from the account page now, where the family's page points
        await ben.goto("/account");
        await ben.getByRole("button", { name: "End every open view" }).click();
        // earlier cases leave their views open too, so more than one may close
        await expect(ben.locator("#main").getByText(/views? (is|are) closed\./)).toBeVisible();
        await signOut(ben);
    } finally {
        await other.close();
    }

    await page.goto("/kids");
    await atScreen(page, page.getByRole("heading", { name: "Ask a grown-up" }));
});

test("a stale session cookie at / ends on the site after one visit", async ({ browser }, info) => {
    const context = await newDevice(browser, info);
    await context.addCookies([{ name: "ls_session", value: "stale.stale.stale", url: BASE }]);
    try {
        const page = await context.newPage();
        await page.goto("/");
        await expect(page.locator('script[src*="/apps/site/"]')).toHaveCount(1);
        await expect(page).toHaveURL(`${BASE}/`);
        expect((await context.cookies()).some((c) => c.name === "ls_session")).toBe(false);
    } finally {
        await context.close();
    }
});

/** What each sheet shows of its day's work, by the lesson, for holding one drawing against another. */
const sheetsShow = (page: Page, where: string): Promise<Record<string, unknown>> =>
    page.evaluate((sel) => {
        const text = (el: Element | null): string => el?.textContent?.trim() ?? "";
        const shown = (sheet: Element): unknown => ({
            questions: [...sheet.querySelectorAll(".ls-q")].map((q) => ({
                n: q.getAttribute("data-n") ?? "",
                done: q.classList.contains("done"),
                ask: text(q.querySelector(".ls-ask")),
                written: [...q.querySelectorAll("input")].map((b) =>
                    b instanceof HTMLInputElement ? b.value : "",
                ),
                picked: [...q.querySelectorAll('.ls-pick[aria-pressed="true"]')].map((b) =>
                    text(b),
                ),
                ticks: q.querySelectorAll(".ls-tick").length,
                state: q.querySelector(".ls-strip")?.getAttribute("data-state") ?? "",
                hints: [...q.querySelectorAll(".ls-hints li")].map((h) => text(h)),
                // a question answered on its drawing, and one built from a pad's blocks
                arranged: q.querySelector(".ar")?.getAttribute("data-state") ?? "",
                blocks: [...q.querySelectorAll(".pr-slot .pr-block")].map((b) => text(b)),
                // nothing on a finished sheet may be answered, wherever it is being read
                open: q.querySelectorAll(
                    "input:not([disabled]), textarea:not([disabled]), .ls-go:not([disabled]), .ls-pick:not([disabled])",
                ).length,
            })),
            note: text(sheet.querySelector(".ls-looked")),
        });
        const out: Record<string, unknown> = {};
        for (const sheet of document.querySelectorAll(sel)) {
            const id = sheet.getAttribute("data-lesson") ?? "";
            if (id) out[id] = shown(sheet);
        }
        return out;
    }, where);

test("a parent and a child read one sheet: every day both of them draw is drawn the same, question for question", async ({
    page,
}) => {
    // If this case fails, the two pages have stopped drawing a finished day through the one state
    // builder (engine/ui/lesson.tsx, sheetState) from the one fold (school/lessons.ts, leftIn), and a
    // parent is reading something other than what their child did. Neither side is steered to a
    // chosen day: the journal is read where it opens, and the child's world is walked back from
    // today until it has drawn a day the journal drew, and every day they both drew is held against
    // the other.
    //
    // The journal comes first, straight from the parent's sign-in, which is how a parent opens it.
    // The other way round, the children's view left with the family's PIN and the journal opened
    // from the page that follows, the journal on the desktop drew two days and then did not move
    // under seventy-two pulls, so the case was failing on the path it took to the journal rather
    // than on the drawing it holds. The child's world is the side that can be walked to any day, so
    // it is the one walked to meet the journal.
    await signInAs(page);
    const rosie = page
        .getByRole("region", { name: "Children", exact: true })
        .getByRole("article", { name: "Rosie" });
    await rosie.getByRole("button", { name: /^Open Rosie's journal/ }).click();
    const world = rosie.locator(".gj-world");
    await expect(rosie.locator(".gj-sheet").first()).toBeVisible({ timeout: 30_000 });
    // The journal opens on today, whose paper is never drawn, and draws the days near it as their
    // paper lands. Should none land where it opens, it is pulled toward the nearest done day a
    // little at a time, from the middle of its window, which is on the roll's paper whatever the
    // page is scrolled to (a pull from the window's edge can start under the page's own bar), until
    // a day's paper has landed or the paper no longer moves under the hand. How far a done day
    // stands from today moves with the calendar, so a count is only a guard here.
    const paper = world.locator(".ls-sheet");
    const done = rosie
        .locator(".gj-sheet")
        .filter({ hasNot: page.locator(".j-strip .date", { hasText: /^(Today|Next)$/ }) });
    expect(await done.count(), "no done day is on the journal's roll").toBeGreaterThan(0);
    const journalCamera = (): Promise<string> =>
        world.locator(".wd-host .world").evaluate((el) => el.style.transform);
    const doneFromMiddle = async (): Promise<number | null> => {
        const frame = await world.boundingBox();
        if (!frame) return null;
        let nearest: number | null = null;
        for (let k = 0; k < (await done.count()); k++) {
            const box = await done.nth(k).boundingBox();
            if (!box) continue;
            const d = box.y + box.height / 2 - (frame.y + frame.height / 2);
            if (nearest === null || Math.abs(d) < Math.abs(nearest)) nearest = d;
        }
        return nearest;
    };
    const guard = 200;
    let left: number | null = null;
    let moved = true;
    for (let pulls = 0; pulls < guard && moved && (await paper.count()) === 0; pulls++) {
        await world.scrollIntoViewIfNeeded();
        const frame = await world.boundingBox();
        left = await doneFromMiddle();
        if (!frame || left === null) break;
        const x = frame.x + frame.width / 2;
        const y = frame.y + frame.height / 2;
        const by = Math.max(20, Math.min(60, Math.round(frame.height / 8))) * (left < 0 ? 1 : -1);
        const before = await journalCamera();
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, y + by, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(600);
        moved = (await journalCamera()) !== before;
    }
    expect(
        await paper.count(),
        `no day's paper landed in the journal: the nearest done day was still ${Math.round(Math.abs(left ?? 0))} px ` +
            `${(left ?? 0) < 0 ? "above" : "below"} the middle of the window, and the paper ` +
            (moved ? `was still moving after ${guard} pulls` : "had stopped moving under the hand"),
    ).toBeGreaterThan(0);
    // a moment for the rest of the near days' paper to land, so the reading is of a journal at rest
    await page.waitForTimeout(750);
    const inJournal = await sheetsShow(page, ".gj-world .ls-sheet");
    const journalDrew = Object.keys(inJournal);
    expect(journalDrew.length, "the journal drew no day of the child's").toBeGreaterThan(0);
    await rosie.getByRole("button", { name: /^Close Rosie's journal/ }).click();

    // The same child's days in their own world, walked from today toward the nearest day the
    // journal drew until its paper is on the roll or the paper no longer moves under the wheel:
    // today's sheet is never one of them, since today is not drawn as paper. How far back those days
    // stand moves with the calendar, so the count is only a guard here too.
    await openChildrensView(page, ["Rosie"]);
    const { roll } = await intoTodaysSheet(page, "Rosie");
    const host = roll.locator(".wd-host");
    const window = await host.boundingBox();
    if (!window) throw new Error("the roll is not on the page");
    await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
    const worldCamera = (): Promise<string> =>
        roll.locator(".wd-host .world").evaluate((el) => el.style.transform);
    const cards = journalDrew.map((id) => roll.locator(`.wd-sheet[data-lesson="${id}"]`));
    const cardFromMiddle = async (): Promise<number | null> => {
        const frame = await host.boundingBox();
        if (!frame) return null;
        let nearest: number | null = null;
        for (const card of cards) {
            const box = await card.first().boundingBox();
            if (!box) continue;
            const d = box.y + box.height / 2 - (frame.y + frame.height / 2);
            if (nearest === null || Math.abs(d) < Math.abs(nearest)) nearest = d;
        }
        return nearest;
    };
    let inWorld = await sheetsShow(page, ".wd-host .ls-sheet:not(.today)");
    let both = journalDrew.filter((id) => id in inWorld);
    const worldDrew = new Set<string>(Object.keys(inWorld));
    let toGo: number | null = null;
    let rolling = true;
    for (let turn = 0; turn < guard && rolling && both.length === 0; turn++) {
        toGo = await cardFromMiddle();
        if (toGo === null) break;
        const before = await worldCamera();
        // a trackpad's delta, not a whole notch, which the view would read as a mouse wheel and zoom on
        await page.mouse.wheel(
            0,
            Math.sign(toGo) * Math.min(400, Math.max(40, Math.abs(toGo))) + 0.5,
        );
        await page.waitForTimeout(350);
        await settled(roll);
        rolling = (await worldCamera()) !== before;
        inWorld = await sheetsShow(page, ".wd-host .ls-sheet:not(.today)");
        for (const id of Object.keys(inWorld)) worldDrew.add(id);
        both = journalDrew.filter((id) => id in inWorld);
    }
    expect(
        both.length,
        `the journal drew ${journalDrew.join(", ")} and the world, walked toward them, drew ${[...worldDrew].join(", ") || "nothing"}, with no day in common: ` +
            (toGo === null
                ? "none of the journal's days has a card on the child's roll"
                : `the nearest was still ${Math.round(Math.abs(toGo))} px ${toGo < 0 ? "above" : "below"} the middle of the window, and the paper ` +
                  (rolling
                      ? `was still moving after ${guard} turns of the wheel`
                      : "had stopped moving under the wheel")),
    ).toBeGreaterThan(0);
    for (const id of both) expect(inJournal[id], `${id} is drawn differently`).toEqual(inWorld[id]);
});

test("every question on a sheet shows its words or its picture: today's sheet, and a day looked back at in the world", async ({
    page,
}) => {
    // A question with a scene draws its words inside the picture, and a picture the stylesheet gives
    // no size to is a question with nothing on it, while its number, its box and its Check draw as
    // usual: three devices went green over such a sheet. So this holds the questions themselves.
    const { roll, sheet } = await atTodaysSheet(page);
    await expect(sheet.locator(".ls-q").first()).toBeVisible();
    for (const today of await roll.locator(".ls-sheet.today").all()) {
        const lesson = await today.getAttribute("data-lesson");
        expect(await blankQuestions(today), `${lesson} has questions with nothing on them`).toEqual(
            [],
        );
    }
    // and a finished day drawn as the roll comes near it, which is the same sheet on the other path
    const past = roll.locator(".ls-sheet:not(.today)");
    const window = await roll.locator(".wd-host").boundingBox();
    if (!window) throw new Error("the roll is not on the page");
    await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
    for (let turn = 0; turn < 40 && (await past.count()) === 0; turn++) {
        await panUp(page, 400);
        await page.waitForTimeout(350);
    }
    expect(await past.count(), "no day before today was drawn").toBeGreaterThan(0);
    for (const back of await past.all()) {
        const lesson = await back.getAttribute("data-lesson");
        expect(await blankQuestions(back), `${lesson} has questions with nothing on them`).toEqual(
            [],
        );
    }
});
