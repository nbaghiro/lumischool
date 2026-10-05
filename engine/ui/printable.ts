// A sheet on the page made into a document the mobile app prints on its own (.docs/mobile.md, "Host
// mode in the web apps"): the sheet with the elements it stands in, the page's rules that can reach
// it, and the fonts it was drawn in, inlined, since the app prints without the page.

import type { Paper } from "../host";

/** A stylesheet's rule, as far as choosing what to keep reads one. */
export type Rule =
    | { kind: "style"; selector: string; text: string }
    | { kind: "media"; condition: string; rules: readonly Rule[] }
    | { kind: "font"; text: string; src: string; face: string }
    | { kind: "dropped" }
    | { kind: "other"; text: string };

/** A pseudo-element never matches a query, so a rule is tested on the element it decorates. */
export const withoutPseudo = (selector: string): string =>
    selector.replace(
        /::?(?:before|after|marker|placeholder|first-line|first-letter|selection|backdrop|-webkit-[\w-]+)\b/g,
        "",
    );

/** A media rule a printer can match: one that names print, or does not name the screen. */
const forPaper = (condition: string): boolean =>
    /\bprint\b/.test(condition) || !/\bscreen\b/.test(condition);

/**
 * The text of the rules that can reach the sheet: style rules whose selector matches something in
 * it, media rules a printer can match, and anything else as written. `font` turns a font's rule into
 * the text to keep, such as one with its file inlined.
 */
export function pick(
    rules: readonly Rule[],
    o: {
        matches: (selector: string) => boolean;
        font: (r: Extract<Rule, { kind: "font" }>) => string;
    },
): string[] {
    const kept: string[] = [];
    for (const r of rules) {
        if (r.kind === "style") {
            if (o.matches(withoutPseudo(r.selector))) kept.push(r.text);
        } else if (r.kind === "media") {
            if (!forPaper(r.condition)) continue;
            const inner = pick(r.rules, o);
            if (inner.length) kept.push(`@media ${r.condition} {\n${inner.join("\n")}\n}`);
        } else if (r.kind === "font") kept.push(o.font(r));
        else if (r.kind === "other") kept.push(r.text);
    }
    return kept;
}

/** A font face named by its family and the characters it covers, the same from its rule and from the page's loaded faces. */
export const faceOf = (family: string, range: string): string =>
    `${family.replace(/["']/g, "").trim().toLowerCase()}|${range.replace(/\s+/g, "").toLowerCase()}`;

/** The address in a font's `src`, the first one it names. */
export function firstUrl(src: string): string | null {
    const m = /url\(\s*(["']?)([^"')]+)\1\s*\)/.exec(src);
    return m?.[2] ?? null;
}

const escape = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The whole document: the page's origin for anything not inlined, the paper, the rules and the sheet. */
export function documentOf(o: {
    title: string;
    base: string;
    paper: Paper;
    css: readonly string[];
    body: string;
}): string {
    const size = o.paper === "letter" ? "letter" : "A4";
    return [
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        `<base href="${escape(o.base)}">`,
        `<title>${escape(o.title)}</title>`,
        `<style>\n@page { size: ${size}; }\n${o.css.join("\n").replace(/<\/style/gi, "<\\/style")}\n</style>`,
        "</head>",
        `<body>${o.body}</body>`,
        "</html>",
    ].join("\n");
}

function rulesOf(list: CSSRuleList): Rule[] {
    return [...list].map((r): Rule => {
        if (r instanceof CSSStyleRule)
            return { kind: "style", selector: r.selectorText, text: r.cssText };
        if (r instanceof CSSMediaRule)
            return { kind: "media", condition: r.conditionText, rules: rulesOf(r.cssRules) };
        if (r instanceof CSSFontFaceRule)
            return {
                kind: "font",
                text: r.cssText,
                src: r.style.getPropertyValue("src"),
                face: faceOf(
                    r.style.getPropertyValue("font-family"),
                    r.style.getPropertyValue("unicode-range") || "U+0-10FFFF",
                ),
            };
        if (r instanceof CSSKeyframesRule) return { kind: "dropped" };
        return { kind: "other", text: r.cssText };
    });
}

function sheetsOf(): Rule[] {
    const rules: Rule[] = [];
    for (const sheet of document.styleSheets) {
        try {
            rules.push(...rulesOf(sheet.cssRules));
        } catch {
            // a sheet from another origin keeps its rules to itself
        }
    }
    return rules;
}

/** A font file as a data URL, or null when it cannot be read again, which leaves its address to the base. */
async function inlined(url: string): Promise<string | null> {
    try {
        const r = await fetch(new URL(url, location.href));
        if (!r.ok) return null;
        const bytes = new Uint8Array(await r.arrayBuffer());
        let text = "";
        for (let i = 0; i < bytes.length; i += 0x8000)
            text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return `data:${r.headers.get("content-type") ?? "font/woff2"};base64,${btoa(text)}`;
    } catch {
        return null;
    }
}

/** The sheet inside shallow copies of the elements it stands in, so rules written from them still reach it. */
function inPlace(root: HTMLElement): Element {
    const copy = root.cloneNode(true);
    if (!(copy instanceof Element)) return root;
    const live = root.querySelectorAll("canvas");
    copy.querySelectorAll("canvas").forEach((c, i) => {
        const from = live[i];
        if (!from) return;
        try {
            const img = document.createElement("img");
            img.src = from.toDataURL("image/png");
            img.className = c.className;
            img.style.cssText = from.style.cssText;
            c.replaceWith(img);
        } catch {
            // a canvas drawn from another origin cannot be read, and prints blank
        }
    });
    let node: Element = copy;
    for (let el = root.parentElement; el && el !== document.body; el = el.parentElement) {
        const shell = el.cloneNode(false);
        if (!(shell instanceof Element)) break;
        shell.removeAttribute("inert");
        shell.removeAttribute("aria-hidden");
        shell.append(node);
        node = shell;
    }
    return node;
}

/** The printable document for a sheet on the page. */
export async function printable(root: HTMLElement, paper: Paper): Promise<string> {
    const files = new Map<string, Promise<string | null>>();
    const fonts: { text: string; url: string }[] = [];
    const drawn = new Set<string>();
    document.fonts.forEach((f) => {
        if (f.status === "loaded") drawn.add(faceOf(f.family, f.unicodeRange));
    });
    const css = pick(sheetsOf(), {
        matches: (selector) => {
            if (/^\s*(?::root|html|body|\*)/.test(selector)) return true;
            try {
                return root.matches(selector) || root.querySelector(selector) !== null;
            } catch {
                return true;
            }
        },
        font: (r) => {
            const url = firstUrl(r.src);
            if (url && !url.startsWith("data:") && drawn.has(r.face)) {
                if (!files.has(url)) files.set(url, inlined(url));
                fonts.push({ text: r.text, url });
            }
            return r.text;
        },
    });
    const loaded = new Map<string, string>();
    for (const [url, file] of files) {
        const data = await file;
        if (data) loaded.set(url, data);
    }
    const withFiles = css.map((text) => {
        const font = fonts.find((f) => f.text === text);
        const data = font && loaded.get(font.url);
        return font && data ? text.split(font.url).join(data) : text;
    });
    return documentOf({
        title: document.title,
        base: `${location.origin}/`,
        paper,
        css: withFiles,
        body: inPlace(root).outerHTML,
    });
}
