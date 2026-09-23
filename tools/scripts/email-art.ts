import { rm } from "node:fs/promises";
import { MAIL_WORLDS, mailCover } from "../../server/mail-design";
import { buildHarness, openChrome, photograph } from "./map-snapshots";

const harness = await buildHarness();
const browser = await openChrome();
try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 330 } });
    for (const world of MAIL_WORLDS) {
        const drawn = await photograph(browser, harness.dist, {
            file: world,
            sample: false,
            aim: { place: world },
            across: 6500,
            width: 1100,
            tall: 0.3,
            ats: [{ x: 0.5, y: 0.5 }],
            scale: 1,
            budget: 500_000,
        });
        await page.setContent(
            `<html><body style="margin:0;overflow:hidden"><img style="width:1100px;height:330px;object-fit:cover" src="data:image/webp;base64,${drawn.webp.toString("base64")}"></body></html>`,
        );
        await page.locator("img").evaluate(async (img) => {
            if (img instanceof HTMLImageElement) await img.decode();
        });
        await page.screenshot({ path: `engine/ui${mailCover(world)}` });
        process.stdout.write(`Exported ${world} email cover.\n`);
    }
} finally {
    await browser.close();
    await rm(harness.dir, { recursive: true, force: true });
}
