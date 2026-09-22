// The site's data (school/worlds/sample.ts, written at build by tools/first-view.ts), from the JSON
// the page links in its head: the sample child's journey the opening map is drawn from, the words,
// and where the visitor's pack is (school.ts reads it). Nothing here is loaded with the page, and
// nothing here reads the pack, so the opening map's code carries neither the pack's checker nor the
// lesson's (tools/__tests__/first-view.test.ts).

import { readSiteData, type SiteData } from "../../school/worlds/sample";

let read: Promise<SiteData> | null = null;

/** The site's data, from the JSON the page links in its head, which the browser fetches as the head is read. */
export function siteData(): Promise<SiteData> {
    read ??= (async () => {
        const link = document.querySelector<HTMLLinkElement>("link[data-site-data]");
        if (!link) throw new Error("the page links no data");
        const r = await fetch(link.href);
        if (!r.ok) throw new Error(`the site's data answered ${r.status}`);
        const data = readSiteData(await r.json());
        if (!data.ok) throw new Error(`the site's data cannot be read: ${data.problem}`);
        return data.data;
    })();
    return read;
}

/** Settles once the site's opening map is drawn, which the pictures below it wait for before they read the pack. */
let opened = (): void => {};
const opening = new Promise<void>((done) => {
    opened = done;
});

/** The site says its opening map is drawn. */
export function openingDrawn(): void {
    opened();
}

/** How long the pictures wait for the opening map before they go ahead without it, in ms. */
const OPENING_AT_MOST = 8000;

/** Settles once the opening map is drawn, or after eight seconds, whichever comes first. */
export const afterOpening = (): Promise<unknown> =>
    Promise.race([opening, new Promise((done) => setTimeout(done, OPENING_AT_MOST))]);
