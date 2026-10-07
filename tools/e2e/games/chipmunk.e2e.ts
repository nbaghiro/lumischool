import { expect, type Page } from "@playwright/test";
import { fieldPoints } from "../field";
import { test } from "../steps";
import { openGame } from "./play";

const reads = async (page: Page): Promise<string> =>
    (await page.locator('[data-game="reads"]').textContent()) ?? "";

const won = (page: Page) => page.locator('.round-end[data-round-end="won"]');

/** Where Nutmeg's feet are and where each nut is, in the world's squares, read off the probe at one moment. */
async function look(page: Page) {
    const f = await fieldPoints(page);
    const all = await page.locator(".field-probe [data-key]").evaluateAll((els) =>
        els.map((e) => {
            const r = e.getBoundingClientRect();
            return {
                key: e instanceof HTMLElement ? (e.dataset.key ?? "") : "",
                x: r.left + r.width / 2,
                y: r.top + r.height / 2,
                foot: r.bottom,
            };
        }),
    );
    const me = all.find((e) => e.key === "nutmeg");
    if (!me) throw new Error("No Nutmeg");
    return {
        me: f.toWorld(me.x, me.foot),
        nuts: all.filter((e) => e.key.startsWith("nut:")).map((e) => f.toWorld(e.x, e.y)),
        toScreen: f.toScreen,
    };
}

/** A number out of the line a screen reader reads. */
async function count(page: Page, pattern: RegExp): Promise<number> {
    return Number(pattern.exec(await reads(page))?.[1] ?? 0);
}

const cheeks = (page: Page) => count(page, /with (\d+) acorns and \d+ pinecones in her cheeks/);
const lying = (page: Page) => count(page, /(\d+) lying on the ground/);
const hanging = (page: Page) => count(page, /(\d+) on the trees/);
const stored = (page: Page) => count(page, /Rooms: (\d+)/);

/** Taps an arrow in short presses until her feet are within `near` of `x`, as a child nudges her there. */
async function walkTo(page: Page, x: number, near = 0.3): Promise<void> {
    for (let i = 0; i < 120; i++) {
        const d = x - (await look(page)).me.x;
        if (Math.abs(d) <= near) return;
        const key = d > 0 ? "ArrowRight" : "ArrowLeft";
        await page.keyboard.down(key);
        await page.waitForTimeout(Math.min(260, Math.max(30, Math.abs(d) * 110)));
        await page.keyboard.up(key);
        await page.waitForTimeout(60);
    }
    throw new Error(
        `Never got to ${x}: ${JSON.stringify((await look(page)).me)} ${await reads(page)}`,
    );
}

/** Picks up the acorns lying on the ground, nearest first, until her cheeks hold `most`. */
async function gather(page: Page, most: number): Promise<void> {
    for (let i = 0; i < 20 && (await cheeks(page)) < most; i++) {
        const { me, nuts } = await look(page);
        const ground = nuts
            .filter((n) => n.y > 11)
            .toSorted((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x));
        const next = ground[0];
        if (!next) return;
        await walkTo(page, next.x, 0.35);
        await page.waitForTimeout(150);
    }
}

/** Shakes in short presses of the big button until enough acorns lie on the ground, as a child taps it. */
async function shakeDown(page: Page, press: () => Promise<void>): Promise<void> {
    for (let i = 0; i < 40 && (await hanging(page)) > 1; i++) {
        await press();
        await page.waitForTimeout(400);
        if ((await lying(page)) + (await cheeks(page)) >= 7) break;
    }
}

test("chipmunk: the keys run to the oak, shake it from its trunk with space, gather a cheekful, and walking onto the door fills the store", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are played on the desktop");
    test.setTimeout(180_000);
    const errors: string[] = [];
    await openGame(page, "chipmunk", 0, errors, "nutmeg");
    await page.locator('[data-game="board"]').focus();
    for (let trip = 0; trip < 4 && !(await reads(page)).includes("ready for winter"); trip++) {
        if (
            (await reads(page)).includes("in the burrow") ||
            (await reads(page)).includes("in room")
        ) {
            // up in the burrow runs her back to the shaft and out
            await page.keyboard.press("ArrowUp");
            await expect.poll(() => reads(page), { timeout: 8000 }).toContain("on the ground");
        }
        if ((await lying(page)) < 6 - (await cheeks(page)) && (await hanging(page)) > 0) {
            await walkTo(page, 12.4, 0.5);
            await shakeDown(page, async () => {
                await page.keyboard.down(" ");
                await page.waitForTimeout(160);
                await page.keyboard.up(" ");
            });
            await page.waitForTimeout(500);
        }
        await gather(page, 6);
        // onto the door with a cheekful: down she goes, on to the room, and her cheeks empty there;
        // an arrow still pressed after the dive steers her itself, so then she is walked into the room
        const before = await stored(page);
        const done = async () =>
            (await reads(page)).includes("ready for winter") || (await stored(page)) > before;
        await walkTo(page, 22, 0.4);
        await expect
            .poll(() => reads(page), { timeout: 5000 })
            .toMatch(/in the burrow|in room|ready for winter/);
        await page.waitForTimeout(2000);
        if (!(await done())) await walkTo(page, 26.5, 0.6);
        await expect.poll(done, { timeout: 8000 }).toBe(true);
        for (let i = 0; i < 6 && (await stored(page)) > 6; i++) {
            await page.keyboard.press("e");
            await page.waitForTimeout(200);
        }
        await page.waitForTimeout(1200);
    }
    await expect(won(page)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".round-end")).toContainText("6");
    expect(errors).toEqual([]);
});

test("chipmunk: a finger held on the oak runs her there and shakes it, taps send her to the acorns, and a tap on the door takes the cheekful home", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the mouse is held on the desktop");
    test.setTimeout(180_000);
    const errors: string[] = [];
    await openGame(page, "chipmunk", 0, errors, "nutmeg");
    const started = Date.now();
    /** Holds the finger on a point of the wood for a while, then lifts it. */
    const holdAt = async (x: number, y: number, ms: number) => {
        const p = (await look(page)).toScreen(x, y);
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
        await page.waitForTimeout(ms);
        await page.mouse.up();
    };
    const tapAt = async (x: number, y: number) => {
        const p = (await look(page)).toScreen(x, y);
        await page.mouse.click(p.x, p.y);
    };
    const tapHer = async () => {
        const { me } = await look(page);
        await tapAt(me.x, me.y - 0.55);
    };
    for (let trip = 0; trip < 4 && !(await reads(page)).includes("ready for winter"); trip++) {
        if (
            (await reads(page)).includes("in the burrow") ||
            (await reads(page)).includes("in room")
        ) {
            await tapAt(22, 12.6);
            await expect.poll(() => reads(page), { timeout: 8000 }).toContain("on the ground");
        }
        if ((await lying(page)) < 6 - (await cheeks(page)) && (await hanging(page)) > 0) {
            // a finger held on the crown runs her to the trunk, then shakes for as long as it stays
            await holdAt(13, 7.3, 1600);
            await shakeDown(page, () => holdAt(13, 7.3, 400));
            await page.waitForTimeout(500);
        }
        for (let i = 0; i < 20 && (await cheeks(page)) < 6; i++) {
            const { me, nuts } = await look(page);
            const next = nuts
                .filter((n) => n.y > 11)
                .toSorted((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];
            if (!next) break;
            const had = await cheeks(page);
            await tapAt(next.x, 11.6);
            await expect.poll(() => cheeks(page), { timeout: 4000 }).toBeGreaterThan(had);
            await page.waitForTimeout(150);
        }
        await tapAt(22, 11.6);
        await expect
            .poll(
                async () =>
                    (await reads(page)).includes("ready for winter") || (await stored(page)) > 0,
                { timeout: 8000 },
            )
            .toBe(true);
        for (let i = 0; i < 6 && (await stored(page)) > 6; i++) {
            await tapHer();
            await page.waitForTimeout(300);
        }
        await page.waitForTimeout(1200);
    }
    await expect(won(page)).toBeVisible({ timeout: 10_000 });
    // the first level is meant to take a child about half a minute with the mouse
    expect(Date.now() - started).toBeLessThan(90_000);
    expect(errors).toEqual([]);
});
