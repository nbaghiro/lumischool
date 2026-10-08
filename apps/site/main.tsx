// The site's one page (.docs/auth.md, "Hosts"). The palette, the faces and the page's own styles come
// first, and the page is drawn once its faces have loaded, so its first frame is styled and set in
// the faces it keeps.

import { fontsReady } from "../../engine/ui/fonts";
import "../../engine/ui/palette.css";
import "./site.css";
import { render } from "solid-js/web";
import { Page } from "./page";

await fontsReady();
if (location.pathname === "/" || location.pathname === "/home") {
    const { siteData } = await import("./data");
    const data = await siteData();
    const host = document.getElementById("site-root");
    if (host) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const position = { left: scrollX, top: scrollY };
        const step = host.querySelector(".site-steps")?.scrollLeft ?? 0;
        // Keep document height while replacing the server page, so Safari never clamps its scroll.
        host.style.minHeight = `${host.getBoundingClientRect().height}px`;
        host.replaceChildren();
        render(() => <Page initial={data.words} />, host);
        host.style.minHeight = "";
        // Keep both the page and the phone's horizontal map stops where the reader left them.
        host.querySelector(".site-steps")?.scrollTo({ left: step });
        scrollTo(position);
    }
} else {
    const { enhance } = await import("./public-main");
    enhance();
}
