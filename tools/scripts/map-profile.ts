import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, webkit } from "@playwright/test";

const safari = process.argv.includes("--webkit");
const layer = process.argv.find((arg) => arg.startsWith("--layer="))?.split("=")[1];
const quick = process.argv.includes("--quick");
const seconds = Math.min(
    600,
    Math.max(
        10,
        Number(process.argv.find((arg) => arg.startsWith("--seconds="))?.split("=")[1] ?? 60),
    ),
);
if (!Number.isFinite(seconds)) throw new Error("seconds must be a finite number");
const headless = !process.argv.includes("--headed");
const browser = await (safari
    ? webkit.launch({ headless })
    : chromium.launch({ channel: "chrome", headless }));
const page = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
});
const errors: string[] = [];
page.on("pageerror", (error) => {
    if (errors.length < 20) errors.push(error.message);
});
const samples: object[] = [];
const sample = async (stage: string): Promise<void> => {
    samples.push({
        stage,
        ...(await page.evaluate(() => ({
            document: performance.timeOrigin,
            nodes: document.querySelectorAll(".world *").length,
            scenes: document.querySelectorAll(".ow-host,.wd-host,.pl-host").length,
            flightWork: document.querySelector<HTMLElement>(".ow-host")?.dataset.flyWork,
            paperPixels: [...document.querySelectorAll<HTMLCanvasElement>("canvas.paper")].reduce(
                (sum, c) => sum + c.width * c.height,
                0,
            ),
            largestSvg: [...document.querySelectorAll<SVGSVGElement>(".world svg")]
                .map((svg) => {
                    const r = svg.getBoundingClientRect();
                    return {
                        class: svg.getAttribute("class"),
                        width: Math.round(r.width),
                        height: Math.round(r.height),
                    };
                })
                .sort((a, b) => b.width * b.height - a.width * a.height)
                .slice(0, 5),
            surfaces: [...document.querySelectorAll<SVGSVGElement>("[data-map-surface]")].map(
                (svg) => {
                    const r = svg.getBoundingClientRect();
                    return {
                        width: Math.round(r.width),
                        height: Math.round(r.height),
                        masks: svg.querySelectorAll("mask").length,
                    };
                },
            ),
        }))),
    });
};
try {
    await page.goto(`http://localhost:8500/home?mapDebug=1${layer ? `&mapLayer=${layer}` : ""}`);
    if (layer === "no-filters")
        await page.addStyleTag({ content: ".ow * { filter: none !important; }" });
    const hidden: Record<string, string> = {
        "no-terrain": ".ow > .m-terrain",
        "no-art": ".ow > .m-art",
        "no-grid": ".ow-host > canvas.paper",
        "plane-only": ".ow > :not(.ow-fly), .ow-host > canvas.paper",
    };
    if (layer && hidden[layer])
        await page.addStyleTag({ content: `${hidden[layer]} { visibility: hidden !important; }` });
    for (const section of quick ? [] : ["#map", "#you", "footer", "#map", "#top"]) {
        await page.locator(section).last().scrollIntoViewIfNeeded();
        await page.waitForTimeout(1500);
        await sample(section);
    }
    for (let visit = 0; visit < (quick ? 0 : 20); visit++) {
        await page.getByRole("link", { name: "See the map", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: "A sample child's map" });
        await dialog.locator(".ow-host.ready").waitFor({ timeout: 60_000 });
        await sample(`open-${visit}`);
        await dialog.getByRole("button", { name: "Close", exact: true }).click();
        await dialog.waitFor({ state: "detached" });
        await sample(`closed-${visit}`);
    }
    await page.getByRole("link", { name: "See the map", exact: true }).click();
    const map = page.getByRole("dialog").locator(".ow-host.ready");
    await map.waitFor();
    if (layer === "raster-window")
        await map.evaluate(async (root) => {
            for (const svg of root.querySelectorAll<SVGSVGElement>("[data-map-surface]")) {
                const copy = svg.cloneNode(true);
                if (!(copy instanceof SVGSVGElement)) continue;
                copy.removeAttribute("style");
                const url = URL.createObjectURL(
                    new Blob([new XMLSerializer().serializeToString(copy)], {
                        type: "image/svg+xml",
                    }),
                );
                const image = new Image();
                image.src = url;
                try {
                    await image.decode();
                    image.style.cssText = svg.style.cssText;
                    image.style.position = "absolute";
                    svg.after(image);
                    svg.style.visibility = "hidden";
                } finally {
                    URL.revokeObjectURL(url);
                }
            }
        });
    if (process.argv.includes("--promote"))
        await map.evaluate((root) => {
            for (const svg of root.querySelectorAll<SVGSVGElement>("[data-map-surface]"))
                svg.style.willChange = "transform";
        });
    await map.getByRole("button", { name: "Fly the paper plane (P)" }).click();
    await map.getByRole("radio", { name: "Fast", exact: true }).click();
    const frames = page.evaluate(
        (duration) =>
            new Promise<{ frames: number; over50ms: number; maxMs: number; p95ms: number }>(
                (resolve) => {
                    const buckets = Array.from({ length: 251 }, () => 0);
                    const start = performance.now();
                    let last = start,
                        frames = 0,
                        over50ms = 0,
                        maxMs = 0;
                    const frame = (now: number): void => {
                        const gap = now - last;
                        last = now;
                        frames++;
                        if (gap > 50) over50ms++;
                        maxMs = Math.max(maxMs, gap);
                        const bucket = Math.min(250, Math.ceil(gap));
                        buckets[bucket] = (buckets[bucket] ?? 0) + 1;
                        if (now - start < duration) {
                            requestAnimationFrame(frame);
                            return;
                        }
                        let sum = 0,
                            p95ms = 250;
                        for (const [ms, count] of buckets.entries()) {
                            sum += count;
                            if (sum >= frames * 0.95) {
                                p95ms = ms;
                                break;
                            }
                        }
                        resolve({ frames, over50ms, maxMs, p95ms });
                    };
                    requestAnimationFrame(frame);
                },
            ),
        seconds * 1000,
    );
    const until = Date.now() + seconds * 1000;
    let step = 0;
    while (Date.now() < until) {
        await page.keyboard.down(step % 2 ? "ArrowLeft" : "ArrowRight");
        await page.waitForTimeout(1500);
        await page.keyboard.up(step % 2 ? "ArrowLeft" : "ArrowRight");
        await map.dispatchEvent("wheel", { deltaY: step % 2 ? -60 : 60, ctrlKey: true });
        await page.waitForTimeout(3500);
        await sample(`flight-${step++}`);
    }
    await page.screenshot({
        path: join(tmpdir(), `map-profile-${safari ? "webkit" : "chrome"}.png`),
    });
    await writeFile(
        join(tmpdir(), `map-profile-${safari ? "webkit" : "chrome"}.json`),
        JSON.stringify(
            {
                seconds,
                layer,
                errors,
                frames: await frames,
                diagnostics: await page.evaluate("window.mapDiagnostics()"),
                samples,
            },
            null,
            2,
        ),
    );
    if (errors.length) throw new Error(errors.join("\n"));
    process.stdout.write(`${samples.length} samples, no page errors; output in ${tmpdir()}\n`);
} finally {
    await browser.close();
}
