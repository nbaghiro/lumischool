// A drawing on the page as a standalone SVG document an image can decode: its computed colours written
// into it, the page's fonts inlined, cut to a box. The map and the games rasterise their textures from it.
import type { Rect } from "../space";

const faces = new Map<string, Promise<string>>();
/** The page's @font-face rules for the families a drawing letters in, with their files inlined. */
async function fontsFor(families: Set<string>): Promise<string> {
    const out: string[] = [];
    for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            continue;
        }
        for (const rule of rules) {
            if (!(rule instanceof CSSFontFaceRule)) continue;
            const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
            if (!families.has(family)) continue;
            const src = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
            if (!src) continue;
            const href = new URL(src, sheet.href ?? location.href).href;
            let inlined = faces.get(href);
            if (!inlined) {
                inlined = fetch(href)
                    .then((r) => r.blob())
                    .then(
                        (blob) =>
                            new Promise<string>((done) => {
                                const reader = new FileReader();
                                reader.onload = () =>
                                    done(typeof reader.result === "string" ? reader.result : "");
                                reader.readAsDataURL(blob);
                            }),
                    );
                faces.set(href, inlined);
            }
            const data = await inlined.catch(() => "");
            if (!data) continue;
            out.push(
                `@font-face{font-family:"${family}";src:url(${data});font-weight:${rule.style.getPropertyValue("font-weight") || "normal"};font-style:${rule.style.getPropertyValue("font-style") || "normal"}}`,
            );
        }
    }
    return out.join("");
}

/**
 * The SVG as a standalone document over `box` of its viewBox, `w` by `h` pixels, as its computed
 * styles draw it: without the parts in `without`, or only the part `only`, at rest.
 */
export async function standalone(
    svg: SVGSVGElement,
    box: Rect,
    w: number,
    h: number,
    parts: { without: readonly Element[]; only: Element | null; unit: number },
): Promise<string> {
    const copy = svg.cloneNode(true);
    if (!(copy instanceof SVGSVGElement)) return "";
    const from = [...svg.querySelectorAll("*")],
        to = [...copy.querySelectorAll("*")];
    const families = new Set<string>();
    const only = parts.only;
    from.forEach((node, i) => {
        const twin = to[i];
        if (!twin) return;
        if (only) {
            const kept =
                node === only ||
                only.contains(node) ||
                node.contains(only) ||
                node.closest("defs, style") !== null;
            if (!kept) {
                twin.remove();
                return;
            }
            if (node === only) {
                twin.removeAttribute("transform");
                twin.removeAttribute("style");
            }
        } else if (parts.without.includes(node)) {
            twin.remove();
            return;
        }
        const lettered = node.tagName === "text" || node.tagName === "textPath";
        // a class or a custom property, in a style or an attribute, means nothing outside the page
        const styled =
            node.hasAttribute("class") ||
            Array.from(node.attributes).some(
                (a) => a.value.includes("var(") || a.value === "currentColor",
            );
        if (!styled && !lettered) return;
        const cs = getComputedStyle(node);
        if (cs.display === "none" || cs.visibility === "hidden") {
            twin.remove();
            return;
        }
        for (const p of [
            "opacity",
            "fill",
            "stroke",
            "stroke-width",
            "fill-opacity",
            "stroke-opacity",
        ]) {
            const value = cs.getPropertyValue(p);
            if (value) twin.setAttribute(p, value);
        }
        if (lettered) {
            const family = cs.fontFamily;
            for (const f of family.split(",")) families.add(f.replace(/["']/g, "").trim());
            twin.setAttribute(
                "style",
                `font-family:${family};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};letter-spacing:${cs.letterSpacing}`,
            );
        }
    });
    // a glow is drawn into the texture, in the drawing's own units, since the shader has no blur
    const glow = getComputedStyle(svg).filter.match(/drop-shadow\([^()]*(?:\([^()]*\)[^()]*)*\)/g);
    if (glow && !only) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute(
            "style",
            `filter:${glow.join(" ").replace(/(-?[\d.]+)px/g, (_, n: string) => `${parseFloat(n) * parts.unit}px`)}`,
        );
        g.append(...Array.from(copy.childNodes).filter((n) => !(n instanceof SVGDefsElement)));
        copy.append(g);
    }
    copy.removeAttribute("style");
    copy.removeAttribute("class");
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", String(w));
    copy.setAttribute("height", String(h));
    copy.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
    copy.setAttribute("preserveAspectRatio", "none");
    copy.setAttribute("overflow", "hidden");
    if (families.size) {
        const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = await fontsFor(families);
        copy.prepend(style);
    }
    return new XMLSerializer().serializeToString(copy);
}
