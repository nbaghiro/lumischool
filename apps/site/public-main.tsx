// Small islands enhance the shared navigation and the actual sample lesson. The written page stays.
import { render } from "solid-js/web";
import { Bar } from "./page";

export function enhance(): void {
    const bar = document.querySelector<HTMLElement>("[data-public-bar]");
    if (bar) {
        bar.replaceChildren();
        render(() => <Bar written />, bar);
    }
    const host = document.querySelector<HTMLElement>("[data-public-lesson]");
    const url = host?.dataset.lessonUrl;
    if (host && url)
        void import("./public-lesson")
            .then((m) => m.openLesson(host, url))
            .catch(() => {
                // The real lesson's static text remains readable if the enhancement is unavailable.
            });
}
