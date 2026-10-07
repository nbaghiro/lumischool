import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame, reducedMotion } from "./play";
import { emptyPad, type Dir } from "../../../engine/motion/pad";
import {
    HOOP_LEVELS,
    SHOT,
    flightOf,
    handAt,
    handOf,
    hoopsGame,
    placeOf,
    startHoops,
    type Flight,
    type HoopLevel,
    type HoopState,
} from "../../../school/games/hoops";

const card = (page: Page) => page.locator(".round-end");
const reads = (page: Page) => page.locator('[data-game="reads"]');

type Key = Dir | "space" | "spot";

/** One key press as the page plays it under reduced motion: its steps with the key held, then the settling; the spot key is a command, played at once. */
function press(s: HoopState, k: Key): void {
    if (k === "spot") {
        hoopsGame.command?.(s, "spot");
        return;
    }
    const n = hoopsGame.still.press(s);
    for (let i = 0; i < n; i++)
        hoopsGame.step(
            s,
            k === "space"
                ? { ...emptyPad(), tapped: i === 0, go: true, keys: true }
                : { ...emptyPad(), holding: [k], held: k, pressed: i === 0 ? [k] : [] },
        );
    for (let i = 0; i < 60 * 20 && (hoopsGame.still.settling?.(s) ?? false); i++)
        hoopsGame.step(s, emptyPad());
}

/** The fewest presses of the arrows, then space, that put the next basket in from where Charlie stands. */
function basket(s: HoopState): Key[] | null {
    const made = s.made.length;
    let found: Key[] | null = null;
    for (let t = -10; t <= 10; t++)
        for (let m = -6; m <= 26; m++) {
            const keys: Key[] = [
                ...Array<Key>(Math.abs(t)).fill(t < 0 ? "up" : "down"),
                ...Array<Key>(Math.abs(m)).fill(m < 0 ? "left" : "right"),
                "space",
            ];
            if (found && keys.length >= found.length) continue;
            const c = structuredClone(s);
            for (const k of keys) press(c, k);
            if (c.made.length > made) found = keys;
        }
    return found;
}

/** The presses that win the first level from the keys alone: a 1 from where Charlie starts, the next spot, and a 2. */
function plan(): Key[] | null {
    const s = hoopsGame.start(0, 1);
    const first = basket(s);
    if (!first) return null;
    for (const k of first) press(s, k);
    press(s, "spot");
    const second = basket(s);
    if (!second) return null;
    for (const k of second) press(s, k);
    return hoopsGame.won(s) ? [...first, "spot", ...second] : null;
}

const KEY: Record<Key, string> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    space: "Space",
    spot: "n",
};

test("hoops: the first level is won from the keys alone, a press at a time, and every throw starts from the soft lob", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one keyboard win, on the desktop");
    const keys = plan();
    expect(keys, "a way through the first level by the keys").not.toBeNull();
    const errors: string[] = [];
    await openGame(page, "hoops", 0, errors, "ball");
    await reducedMotion(page);
    const first = (keys ?? []).indexOf("space");
    for (const k of (keys ?? []).slice(0, first + 1)) await page.keyboard.press(KEY[k]);
    // the first basket is in, the aim is back to the soft lob, and the spot has been chalked again
    await expect(reads(page)).toContainText("Your baskets: 1.");
    await expect(reads(page)).toContainText("Aimed 54 degrees up at 5% power.");
    await page.screenshot({ path: "/tmp/hoops-reset.png" });
    for (const k of (keys ?? []).slice(first + 1)) await page.keyboard.press(KEY[k]);
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 20000 });
    await expect(card(page).locator('[data-game="end-words"]')).toContainText("Exactly 3");
    await page.screenshot({ path: "/tmp/hoops-keys-won.png" });
    expect(errors).toEqual([]);
});

/** The surest throw from `from` that flies as `ok` says, pulled back from the ball with the mouse and let go. */
async function pullFrom(
    page: Page,
    L: HoopLevel,
    from: { x: number; y: number },
    ok: (f: Flight) => boolean,
    shot?: string,
): Promise<void> {
    let best: { angle: number; power: number; width: number } | null = null;
    for (let angle = SHOT.lo; angle <= -0.55; angle += 0.0125) {
        let start: number | null = null;
        for (let power = SHOT.min; power <= SHOT.max + 0.1; power += 0.1) {
            const v = { x: Math.cos(angle) * power, y: Math.sin(angle) * power };
            const good = power <= SHOT.max && ok(flightOf(L, from, v, 1));
            if (good && start === null) start = power;
            if (!good && start !== null) {
                if (!best || power - start > best.width)
                    best = { angle, power: (start + power - 0.1) / 2, width: power - start };
                start = null;
            }
        }
    }
    if (!best) throw new Error("No such throw");
    const f = await fieldPoints(page);
    const len = best.power / SHOT.per;
    const a = f.toScreen(from.x, from.y),
        b = f.toScreen(from.x - Math.cos(best.angle) * len, from.y - Math.sin(best.angle) * len);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 12 });
    await page.waitForTimeout(250);
    if (shot) await page.screenshot({ path: shot });
    await page.mouse.up();
}

const overlap = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("hoops: a pull back from the ball and a let go puts a basket in, and the win leaves the hoop in sight", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the pull is made with a mouse");
    const errors: string[] = [];
    await openGame(page, "hoops", 0, errors, "ball");
    const L = HOOP_LEVELS[0];
    await page.waitForTimeout(1500);
    await pullFrom(page, L, handOf(startHoops(L)), (f) => f.scored, "/tmp/hoops-pull.png");
    await expect(reads(page)).toContainText("Your baskets: 1.", { timeout: 6000 });
    // the ball comes back to Charlie's hands and she steps to where the spot is chalked now
    await page.waitForTimeout(2000);
    // the 2 spot, by a tap on its chalk where it is chalked after one basket, and a throw from there
    const spot = placeOf(L, 1, 1, 1);
    const g = await fieldPoints(page);
    const at = g.toScreen(spot.x, 23.1);
    await page.mouse.click(at.x, at.y);
    await expect(reads(page)).toContainText("2 (you are here)", { timeout: 4000 });
    await page.waitForTimeout(1500);
    await pullFrom(page, L, handAt(spot), (f) => f.scored);
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 8000 });
    // the card is in after its rise, and the yard has risen above it
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/tmp/hoops-pull-won.png" });
    const over = await card(page).boundingBox();
    for (const key of ["hoop:front", "charlie"]) {
        const box = await page.locator(`.field-probe [data-key="${key}"]`).boundingBox();
        if (!box || !over) throw new Error(`No ${key} or no card`);
        expect(overlap(box, over), `the card covers ${key}`).toBe(false);
    }
    expect(errors).toEqual([]);
});

test("hoops: a swish in the shoot-around moves Charlie on to the next spot, and the new yards draw", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "pictures for a look, on the desktop");
    const errors: string[] = [];
    const free = HOOP_LEVELS.length - 1,
        L = HOOP_LEVELS[free];
    if (!L) throw new Error("No shoot-around");
    await openGame(page, "hoops", free, errors, "ball");
    await page.waitForTimeout(1500);
    await pullFrom(page, L, handOf(startHoops(L, free)), (f) => f.clean);
    await page.waitForTimeout(1250);
    await page.screenshot({ path: "/tmp/hoops-swish.png" });
    await expect(reads(page)).toContainText("1 in a row", { timeout: 6000 });
    await expect(reads(page)).toContainText("3 (you are here)", { timeout: 6000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "/tmp/hoops-next-spot.png" });
    for (const [title, name] of [
        ["Two hoops", "two-hoops"],
        ["Hedge and branch", "hedge-branch"],
        ["Copy Pip", "copy-pip"],
        ["Beat the clock", "clock"],
        ["Three ways at dusk", "dusk"],
    ] as const) {
        const i = HOOP_LEVELS.findIndex((x) => x.title === title);
        await openGame(page, "hoops", i, errors, "ball");
        await page.waitForTimeout(title === "Copy Pip" ? 4500 : 1500);
        await page.screenshot({ path: `/tmp/hoops-${name}.png` });
    }
    expect(errors).toEqual([]);
});
