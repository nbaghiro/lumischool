// What the apps need to know about the browser they are in: whether it is a developer's own computer,
// and whether it is a phone or a device with little memory, which the map's budgets are set by.

/** A page served from this computer, where the outbox may exist. The API still decides. */
export const onThisComputer = (hostname: string): boolean =>
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

/**
 * A phone, a tablet, or a computer that says it has 4 GB or less, which the map holds to smaller
 * budgets (.docs/map-smoothness-plan.md, phase 5): on an iPhone the GPU's memory and the page's come
 * out of the same few gigabytes.
 */
export const smallDevice = ((): boolean => {
    if (typeof navigator === "undefined") return false;
    const memory: unknown = Reflect.get(navigator, "deviceMemory");
    const ua = navigator.userAgent;
    return (
        /iPhone|iPad|iPod|Android/.test(ua) ||
        (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ||
        (typeof memory === "number" && memory <= 4)
    );
})();
