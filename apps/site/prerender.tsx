// The build renders the same Solid page as the browser, with the public sample's words ready.
import { renderToString } from "solid-js/web";
import type { Sample } from "../../school/worlds/sample";
import type { PackLesson } from "../../engine/pack";
import { Written } from "./written";
import { Page } from "./page";
import { Legal } from "./legal";

export function prerender(
    path: string,
    sample: Sample,
    selected?: PackLesson,
    sampleUrl?: string,
): string {
    return renderToString(() =>
        path === "/" ? (
            <Page initial={sample} />
        ) : ["/privacy", "/terms", "/support", "/delete-account"].includes(path) ? (
            <Legal path={path} />
        ) : (
            <Written path={path} sample={selected} sampleUrl={sampleUrl} />
        ),
    );
}
