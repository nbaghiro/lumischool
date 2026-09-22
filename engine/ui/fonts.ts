// Self-hosted faces, so screen and print never fall back silently.
import "@fontsource/andika/400.css";
import "@fontsource/andika/700.css";
import "@fontsource-variable/shantell-sans/full.css";
import "@fontsource-variable/spline-sans-mono/index.css";

/** The faces a first screen sets, by weight, as `document.fonts` names them. */
const FIRST = [
    "400 16px Andika",
    "700 16px Andika",
    "760 24px 'Shantell Sans Variable'",
    "500 11px 'Spline Sans Mono Variable'",
];

/**
 * Loads the faces a first screen sets before an app draws anything, so no text is drawn in a stand-in
 * face and then redrawn. `cap` is how long to wait, in milliseconds, before drawing anyway.
 */
export async function fontsReady(cap = 1200): Promise<void> {
    const loaded = Promise.all(FIRST.map((f) => document.fonts.load(f))).then(
        () => undefined,
        () => undefined,
    );
    await Promise.race([loaded, new Promise<void>((done) => setTimeout(done, cap))]);
}
