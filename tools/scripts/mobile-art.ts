// `npm run mobile:art`: what the mobile app's sign-in screens draw with, made from the web's own so the
// two match (.docs/mobile.md, "Sign-in in the app"). The faces are the fontsource files the web loads,
// turned into TrueType for expo-font, with the variation each style uses fixed into a face of its own,
// since React Native sets no variation axes. The drawings (the bar's mark, the tape, each card's stamp)
// and the map behind each card are pictured from the sign-in pages at a phone's width, so `npm run dev`
// must be up. It also lists the time zones a family can choose, since Hermes has no
// `Intl.supportedValuesOf`. `-- --fonts` or `-- --pictures` makes only that part. The faces need
// Python 3 with fontTools and brotli (`pip install fonttools brotli`), found as `$PYTHON` or `python3`.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Locator, type Page } from "@playwright/test";
import { format, resolveConfig } from "prettier";
import { GROWNUPS } from "../../engine/parts/apps/grownup";

const BASE = process.env.PICTURES_BASE ?? "http://localhost:8500";
const ROOT = join(import.meta.dirname, "..", "..");
const APP = join(ROOT, "apps/mobile");
const FONTS = join(APP, "assets/fonts");
const ART = join(APP, "assets/auth");
/** The phone the reference screens are drawn at, in CSS pixels, as the app's layout reads them. */
const PHONE = { width: 393, height: 852 };
/** Room round a drawing, in CSS pixels, for the strokes a drawing lets reach past its box. */
const MARGIN = 6;
/** The pixels to a CSS pixel the drawings are made at, a phone's densest screen. */
const DRAWN_AT = 3;
/** The pixels to a CSS pixel the maps are made at, which is past the detail of the web's own snapshots. */
const MAP_AT = 2;
/** The parent tabs' icons, in the order the tabs stand (apps/mobile/app/(parent)/_layout.tsx). */
const TAB_ICONS = ["home", "lessons", "map", "calendar", "games", "paint", "journal"] as const;
/** WebP's quality, 0 to 1, for the maps, as the web keeps its own snapshots. */
const QUALITY = 0.8;

// Each face the web sets, as the axes it sets them with (palette.css, page.css, postcard.css, form.css).
const PYTHON_FACES = String.raw`
import os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.merge import Merger
mods, out = sys.argv[1], sys.argv[2]
def face(name, files, axes):
    parts = []
    for i, path in enumerate(files):
        f = TTFont(os.path.join(mods, path))
        f.flavor = None
        if axes is not None:
            f = instantiateVariableFont(f, axes)
        part = os.path.join(out, ".%s-%d.ttf" % (name, i))
        f.save(part)
        parts.append(part)
    font = Merger().merge(parts)
    for p in parts:
        os.remove(p)
    names = font["name"]
    for rec in list(names.names):
        if rec.nameID in (1, 3, 4, 6, 16, 17):
            names.removeNames(nameID=rec.nameID)
    for nid in (1, 3, 4, 6):
        names.setName(name, nid, 3, 1, 0x409)
    names.setName("Regular", 2, 3, 1, 0x409)
    font.save(os.path.join(out, name + ".ttf"))
A = "@fontsource/andika/files/andika-%s-%d-normal.woff2"
face("Andika-Regular", [A % ("latin", 400), A % ("latin-ext", 400)], None)
face("Andika-Bold", [A % ("latin", 700), A % ("latin-ext", 700)], None)
M = "@fontsource-variable/spline-sans-mono/files/spline-sans-mono-%s-wght-normal.woff2"
face("SplineSansMono-Medium", [M % "latin", M % "latin-ext"], {"wght": 500})
face("SplineSansMono-Bold", [M % "latin", M % "latin-ext"], {"wght": 700})
S = "@fontsource-variable/shantell-sans/files/shantell-sans-%s-full-normal.woff2"
for name, wght, infm, bnce in [
    ("ShantellSans-Title", 700, 70, 20),
    ("ShantellSans-Hand", 600, 50, 0),
    ("ShantellSans-Note", 600, 70, 0),
    ("ShantellSans-Name", 700, 70, 0),
]:
    face(name, [S % "latin", S % "latin-ext"], {"wght": wght, "INFM": infm, "BNCE": bnce, "SPAC": 0})
`;

/** The faces PYTHON_FACES makes, in the order it makes them. */
const FACE_NAMES = [
    "Andika-Regular",
    "Andika-Bold",
    "SplineSansMono-Medium",
    "SplineSansMono-Bold",
    "ShantellSans-Title",
    "ShantellSans-Hand",
    "ShantellSans-Note",
    "ShantellSans-Name",
] as const;

function faces(): void {
    const python = process.env.PYTHON ?? "python3";
    if (spawnSync(python, ["-c", "import fontTools, brotli"]).status !== 0)
        throw new Error(`${python} has no fontTools and brotli: pip install fonttools brotli`);
    rmSync(FONTS, { recursive: true, force: true });
    mkdirSync(FONTS, { recursive: true });
    const run = spawnSync(python, ["-c", PYTHON_FACES, join(ROOT, "node_modules"), FONTS], {
        stdio: "inherit",
    });
    if (run.status !== 0)
        throw new Error(`${python} could not make the faces; it needs fontTools and brotli`);
    for (const [from, to] of [
        ["@fontsource/andika/LICENSE", "OFL-Andika.txt"],
        ["@fontsource-variable/shantell-sans/LICENSE", "OFL-ShantellSans.txt"],
        ["@fontsource-variable/spline-sans-mono/LICENSE", "OFL-SplineSansMono.txt"],
    ] as const)
        copyFileSync(join(ROOT, "node_modules", from), join(FONTS, to));
    process.stdout.write(`mobile art: faces in ${FONTS}\n`);
}

/** A sign-in step as the web shows it, and what the page is answered with to reach it. */
interface Step {
    name: string;
    path: string;
    /** Asks for a code with a new address, and with `verify` types the code. */
    code?: boolean;
    verify?: unknown;
    status?: unknown;
}

const FAMILIES = (kid: boolean): unknown[] =>
    ["Okafor", "Lindqvist", "Moreau", "Haddad"].map((name, i) => ({
        family_id: `f${i}`,
        name,
        kid_id: kid ? `k${i}` : null,
    }));

const STEPS: readonly Step[] = [
    { name: "sign-in", path: "/sign-in" },
    { name: "start", path: "/start" },
    { name: "kid", path: "/sign-in?for=kids" },
    { name: "code", path: "/sign-in", code: true },
    {
        name: "choose",
        path: "/sign-in",
        code: true,
        verify: { choose: FAMILIES(false).slice(0, 2) },
    },
    { name: "none", path: "/sign-in", code: true, verify: { start: true } },
    { name: "unlock", path: "/sign-in", status: { available: true, locked: true } },
];

const json = (body: unknown): { status: number; contentType: string; body: string } => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
});

async function open(browser: Browser, step: Step, scale: number): Promise<Page> {
    const context = await browser.newContext({
        viewport: PHONE,
        deviceScaleFactor: scale,
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const { verify, status } = step;
    if (verify !== undefined)
        await page.route("**/api/auth/email/verify", (r) => r.fulfill(json(verify)));
    if (status !== undefined)
        await page.route("**/api/auth/status", (r) => r.fulfill(json(status)));
    await page.goto(`${BASE}${step.path}`);
    await page.locator(".postcard").first().waitFor();
    if (step.code === true) {
        await page.locator("input[autocomplete=email]").fill(`art-${Date.now()}@example.test`);
        await page.keyboard.press("Enter");
        await page.locator("input[autocomplete=one-time-code]").waitFor();
        if (verify !== undefined) {
            await page.locator("input[autocomplete=one-time-code]").fill("12345678");
            await page.locator(".kicker", { hasText: "Signed in" }).waitFor();
        }
    }
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    return page;
}

/** What leaves one drawing alone on a clear ground, square to the page. */
const ALONE = `
    html, body, .page, .page-top, .postcard, .postcard-choice { background: transparent !important; box-shadow: none !important; }
    .page-main.auth .postcard { scale: none !important; }
    .page-ground { display: none !important; }
    body * { visibility: hidden !important; }
    [data-art], [data-art] * { visibility: visible !important; }
    [data-art] { rotate: none !important; opacity: 1 !important; mix-blend-mode: normal !important; }
`;

/** One drawing alone on a clear ground, square to the page, with `MARGIN` round its box. */
async function drawing(page: Page, target: Locator): Promise<Buffer> {
    await target.evaluate((el) => el.setAttribute("data-art", ""));
    await page.evaluate((css) => {
        const style = document.createElement("style");
        style.id = "art-style";
        style.textContent = css;
        document.head.append(style);
    }, ALONE);
    const box = await target.boundingBox();
    if (box === null) throw new Error("a drawing to picture is not on the page");
    const png = await page.screenshot({
        omitBackground: true,
        animations: "disabled",
        clip: {
            x: box.x - MARGIN,
            y: box.y - MARGIN,
            width: box.width + 2 * MARGIN,
            height: box.height + 2 * MARGIN,
        },
    });
    await page.evaluate(() => document.getElementById("art-style")?.remove());
    await target.evaluate((el) => el.removeAttribute("data-art"));
    return png;
}

/** The map behind a step's cards, without them, as WebP. */
async function ground(page: Page): Promise<{ data: Buffer; width: number; height: number }> {
    await page.addStyleTag({
        content: ".page-main, .page-foot { visibility: hidden !important; }",
    });
    const box = page.locator(".page-ground");
    const png = await box.screenshot({ animations: "disabled" });
    const encoded = await page.evaluate(
        async ({ b64, quality }) => {
            const img = new Image();
            img.src = `data:image/png;base64,${b64}`;
            await img.decode();
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d")?.drawImage(img, 0, 0);
            const blob = await new Promise<Blob | null>((done) =>
                canvas.toBlob(done, "image/webp", quality),
            );
            if (!blob) return "";
            let s = "";
            for (const b of new Uint8Array(await blob.arrayBuffer())) s += String.fromCharCode(b);
            return btoa(s);
        },
        { b64: png.toString("base64"), quality: QUALITY },
    );
    if (!encoded) throw new Error("this Chrome could not encode WebP");
    return {
        data: Buffer.from(encoded, "base64"),
        width: png.readUInt32BE(16) / MAP_AT,
        height: png.readUInt32BE(20) / MAP_AT,
    };
}

interface Made {
    file: string;
    width: number;
    height: number;
}

async function pictures(): Promise<void> {
    rmSync(ART, { recursive: true, force: true });
    mkdirSync(ART, { recursive: true });
    const browser = await chromium.launch({
        channel: "chrome",
        args: ["--disable-component-update"],
    });
    const drawings: Record<string, Made> = {};
    const maps: Record<string, Made> = {};
    const keep = (
        into: Record<string, Made>,
        name: string,
        file: string,
        data: Buffer,
        size: { width: number; height: number },
    ): void => {
        writeFileSync(join(ART, file), data);
        into[name] = { file, ...size };
        process.stdout.write(`mobile art: ${file}, ${(data.length / 1024).toFixed(0)} KiB\n`);
    };
    /** A drawing as its file and its size in CSS pixels, read from the PNG's header. */
    const drawn = (png: Buffer): [Buffer, { width: number; height: number }] => [
        png,
        { width: png.readUInt32BE(16) / DRAWN_AT, height: png.readUInt32BE(20) / DRAWN_AT },
    ];
    try {
        for (const step of STEPS) {
            const page = await open(browser, step, DRAWN_AT);
            if (step.name === "sign-in") {
                const mark = page.locator(".bar-mark");
                keep(drawings, "mark", "mark.png", ...drawn(await drawing(page, mark)));
                // laid away from the window's edge, which would cut the card's own tape short
                await page.evaluate(() => {
                    const holder = document.createElement("div");
                    holder.style.cssText =
                        "position:fixed;left:100px;top:100px;width:200px;height:100px";
                    holder.innerHTML = '<span class="postcard-tape" id="art-tape"></span>';
                    document.body.append(holder);
                });
                const tape = page.locator("#art-tape");
                keep(drawings, "tape", "tape.png", ...drawn(await drawing(page, tape)));
                // the parent tabs' icons, drawn by the web's own icon module through the dev server
                await page.addScriptTag({
                    type: "module",
                    content:
                        'import { iconElement } from "/engine/ui/icon.tsx"; window.artIcon = iconElement;',
                });
                await page.waitForFunction(() => "artIcon" in window);
                for (const name of TAB_ICONS) {
                    await page.evaluate((icon) => {
                        const make: unknown = Reflect.get(window, "artIcon");
                        const isMaker = (f: unknown): f is (name: string) => unknown =>
                            typeof f === "function";
                        if (!isMaker(make))
                            throw new Error("engine/ui/icon.tsx has no iconElement");
                        const svg = make(icon);
                        if (!(svg instanceof SVGSVGElement)) throw new Error("not an svg");
                        svg.id = "art-icon";
                        const holder = document.createElement("div");
                        holder.id = "art-icon-holder";
                        holder.style.cssText = "position:fixed;left:100px;top:300px;color:#22262e";
                        holder.append(svg);
                        document.body.append(holder);
                    }, name);
                    const icon = page.locator("#art-icon");
                    keep(
                        drawings,
                        `icon-${name}`,
                        `icon-${name}.png`,
                        ...drawn(await drawing(page, icon)),
                    );
                    await page.evaluate(() => document.getElementById("art-icon-holder")?.remove());
                }
                // each grown-up's stamp as the bar draws it, for the avatar on the app's bar
                await page.addScriptTag({
                    type: "module",
                    content:
                        'import { grownup, plane } from "/tools/scripts/mobile-art-stamp.tsx"; window.artGrownup = grownup; window.artPlane = plane;',
                });
                await page.waitForFunction(() => "artGrownup" in window);
                for (const kind of GROWNUPS) {
                    await page.evaluate((k) => {
                        const draw: unknown = Reflect.get(window, "artGrownup");
                        const isDraw = (f: unknown): f is (k: string, into: Element) => unknown =>
                            typeof f === "function";
                        if (!isDraw(draw)) throw new Error("apps/home/bar.tsx has no GrownStamp");
                        const holder = document.createElement("div");
                        holder.id = "art-icon-holder";
                        holder.style.cssText = "position:fixed;left:100px;top:300px";
                        document.body.append(holder);
                        draw(k, holder);
                    }, kind);
                    const stamp = page.locator("#art-icon-holder .gb-me-stamp");
                    await page.waitForFunction(
                        () => document.querySelectorAll("#art-icon-holder svg").length >= 2,
                    );
                    keep(
                        drawings,
                        `grownup-${kind}`,
                        `grownup-${kind}.png`,
                        ...drawn(await drawing(page, stamp)),
                    );
                    await page.evaluate(() => document.getElementById("art-icon-holder")?.remove());
                }
                // the paper plane the splash flies, as the map's Fly button draws it, at four times that size
                await page.evaluate(() => {
                    const draw: unknown = Reflect.get(window, "artPlane");
                    const isDraw = (f: unknown): f is (into: Element) => unknown =>
                        typeof f === "function";
                    if (!isDraw(draw)) throw new Error("the paper plane did not load");
                    const holder = document.createElement("div");
                    holder.id = "art-icon-holder";
                    holder.style.cssText =
                        "position:fixed;left:100px;top:300px;width:132px;height:88px";
                    const style = document.createElement("style");
                    style.textContent =
                        ".art-plane,.art-plane svg{display:block;width:100%;height:100%}";
                    holder.append(style);
                    document.body.append(holder);
                    draw(holder);
                });
                await page.waitForFunction(
                    () => document.querySelector("#art-icon-holder .art-plane svg") !== null,
                );
                keep(
                    drawings,
                    "plane",
                    "plane.png",
                    ...drawn(await drawing(page, page.locator("#art-icon-holder .art-plane"))),
                );
                await page.evaluate(() => document.getElementById("art-icon-holder")?.remove());
            }
            const stamp = page.locator(".postcard-corner > .stamp");
            if ((await stamp.count()) > 0 && step.name !== "none") {
                const name = `stamp-${step.name}`;
                keep(drawings, name, `${name}.png`, ...drawn(await drawing(page, stamp)));
            }
            await page.context().close();
        }
        for (const kid of [false, true]) {
            const step = {
                name: "choose",
                path: "/sign-in",
                code: true,
                verify: { choose: FAMILIES(kid) },
            };
            const page = await open(browser, step, DRAWN_AT);
            const stamps = page.locator(".postcard-choice-corner > .stamp");
            for (let i = 0; i < (await stamps.count()); i++) {
                const name = `stamp-${kid ? "tent" : "cottage"}-${i}`;
                const one = stamps.nth(i);
                keep(drawings, name, `${name}.png`, ...drawn(await drawing(page, one)));
            }
            await page.context().close();
        }
        for (const step of STEPS) {
            const page = await open(browser, step, MAP_AT);
            const map = await ground(page);
            keep(maps, step.name, `map-${step.name}.webp`, map.data, map);
            await page.context().close();
        }
    } finally {
        await browser.close();
    }
    const entries = (made: Record<string, Made>): string =>
        Object.entries(made)
            .map(
                ([name, m]) =>
                    `${JSON.stringify(name)}: { source: require<number>("./assets/auth/${m.file}"), width: ${m.width}, height: ${m.height} }`,
            )
            .join(",\n");
    const listed = join(APP, "art.ts");
    const text = `// Made by tools/scripts/mobile-art.ts (npm run mobile:art) from the web's sign-in pages. Do not edit by hand.

/** A picture the sign-in screens draw, and its size on the web's page in CSS pixels. */
export interface Art {
    source: number;
    width: number;
    height: number;
}

/** How far a drawing's picture reaches past the drawing's own box on each side, in CSS pixels. */
export const MARGIN = ${MARGIN};

/** The width of the phone the pictures were made at, in CSS pixels. */
export const MADE_AT = ${PHONE.width};

/** The faces, by the family each style names. */
export const FACES = {
${FACE_NAMES.map((f) => `    ${JSON.stringify(f)}: require<number>("./assets/fonts/${f}.ttf"),`).join("\n")}
} satisfies Record<string, number>;

export const DRAWINGS = {
${entries(drawings)},
} satisfies Record<string, Art>;

/** The map behind each step's card, from the top of the card's column to the foot of the strip under it. */
export const MAPS = {
${entries(maps)},
} satisfies Record<string, Art>;

/** The brand's own pictures, which npm run brand:mobile makes: the logo and one square of the book. */
export const BRAND = {
    lockup: { source: require<number>("./assets/lockup.png"), width: 1200, height: 246 },
    paper: { source: require<number>("./assets/paper.png"), width: 60, height: 60 },
} satisfies Record<string, Art>;
`;
    writeFileSync(
        listed,
        await format(text, { ...(await resolveConfig(listed)), filepath: listed }),
    );
}

/** The zones Node's ICU knows, which the server checks a new family's zone against. */
async function zones(): Promise<void> {
    const listed = join(APP, "zones.ts");
    const text = `// Made by tools/scripts/mobile-art.ts (npm run mobile:art) from Node's own list. Do not edit by hand.

/** Every time zone a family can choose, since Hermes has no \`Intl.supportedValuesOf\`. */
export const ZONES: readonly string[] = ${JSON.stringify(Intl.supportedValuesOf("timeZone"))};
`;
    writeFileSync(
        listed,
        await format(text, { ...(await resolveConfig(listed)), filepath: listed }),
    );
}

const only = process.argv[2];
await zones();
if (only !== "--pictures") faces();
if (only !== "--fonts") await pictures();
