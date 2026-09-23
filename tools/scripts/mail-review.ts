import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { served } from "../brand";
import { mailPreviews } from "../../server/mail-previews";

const dir = "dist/mail-previews";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
    const previews = mailPreviews("http://localhost:8500");
    const files = served();
    for (const width of [390, 1000]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        await page.route("**/*", async (route) => {
            const file = files.get(new URL(route.request().url()).pathname);
            if (file)
                await route.fulfill({
                    contentType: file.type,
                    body: typeof file.body === "string" ? file.body : Buffer.from(file.body),
                });
            else await route.abort();
        });
        for (const [i, mail] of previews.entries()) {
            await page.setContent(mail.html ?? "");
            await page.locator("img").evaluateAll(async (imgs) =>
                Promise.all(
                    imgs.map(async (img) => {
                        if (img instanceof HTMLImageElement) await img.decode();
                    }),
                ),
            );
            assert.equal(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                true,
                `${i} overflows at ${width}`,
            );
            if (i === 1 || i === 2 || i === 3 || i === 0 || i === 9 || i === 10 || i === 12)
                await page.screenshot({ path: `${dir}/${i + 1}-${width}.png`, fullPage: true });
        }
        await page.close();
    }
    process.stdout.write(
        "13 email designs checked at phone and desktop widths. Screenshots are in dist/mail-previews.\n",
    );
} finally {
    await browser.close();
}
