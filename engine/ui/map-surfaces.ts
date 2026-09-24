import { intersects, visibleRect, type Camera, type Rect, type Size } from "../space";

import { mapVariant } from "./map-diagnostics";

let serial = 0;

/** A bounded viewport with a small guard band lets ordinary movement reuse the same painted ink. */
export function mapSurface(
    svg: SVGSVGElement,
    bounds: Rect,
): {
    frame: (camera: Camera, size: Size) => void;
} {
    const prefix = `surface-${++serial}-`;
    const ids = new Map<string, string>();
    for (const node of svg.querySelectorAll<SVGElement>("[id]")) {
        ids.set(node.id, prefix + node.id);
        node.id = prefix + node.id;
    }
    for (const node of svg.querySelectorAll<SVGElement>("*")) {
        for (const attribute of node.attributes) {
            let value = attribute.value;
            for (const [id, replacement] of ids)
                value = value.replaceAll(`url(#${id})`, `url(#${replacement})`);
            if (value !== attribute.value) node.setAttribute(attribute.name, value);
        }
    }
    if (mapVariant === "no-masks")
        for (const node of svg.querySelectorAll("[mask]")) node.removeAttribute("mask");
    const masks = [...svg.querySelectorAll<SVGMaskElement>("mask")];
    svg.style.transformOrigin = "0 0";
    // Keep terrain ink through camera changes without promoting the country-sized parent.
    svg.style.willChange = "transform";
    svg.style.overflow = "hidden";
    svg.dataset.mapSurface = "";
    let window: { rect: Rect; z: number; w: number; h: number } | null = null;
    return {
        frame(camera, size) {
            if (size.w <= 0 || size.h <= 0 || !Number.isFinite(camera.z) || camera.z <= 0) return;
            const seen = visibleRect(camera, size);
            const visible = intersects(seen, bounds);
            svg.style.display = visible ? "" : "none";
            if (!visible) return;
            if (
                window &&
                window.w === size.w &&
                window.h === size.h &&
                camera.z / window.z <= 1.1 &&
                camera.z / window.z >= 0.9 &&
                seen.x >= window.rect.x &&
                seen.y >= window.rect.y &&
                seen.x + seen.w <= window.rect.x + window.rect.w &&
                seen.y + seen.h <= window.rect.y + window.rect.h
            )
                return;
            const margin = Math.min(96, size.w / 8, size.h / 8);
            const rect = visibleRect(camera, { w: size.w + margin * 2, h: size.h + margin * 2 });
            window = { rect, z: camera.z, w: size.w, h: size.h };
            svg.setAttribute("viewBox", `${rect.x} ${rect.y} ${rect.w} ${rect.h}`);
            svg.setAttribute("width", String(size.w + margin * 2));
            svg.setAttribute("height", String(size.h + margin * 2));
            svg.style.left = `${rect.x}px`;
            svg.style.top = `${rect.y}px`;
            svg.style.width = `${size.w + margin * 2}px`;
            svg.style.height = `${size.h + margin * 2}px`;
            svg.style.transform = `scale(${1 / camera.z})`;
            for (const mask of masks) {
                mask.setAttribute("x", String(rect.x));
                mask.setAttribute("y", String(rect.y));
                mask.setAttribute("width", String(rect.w));
                mask.setAttribute("height", String(rect.h));
            }
        },
    };
}
