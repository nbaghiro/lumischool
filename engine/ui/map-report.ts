export function mapReport(read: () => object): () => void {
    let previous: string | null = null;
    try {
        previous = sessionStorage.getItem("mapDiagnostics");
    } catch {
        /* Storage is optional. */
    }
    const snapshot = (): object => ({
        at: Date.now(),
        document: performance.timeOrigin,
        ...read(),
        browser: navigator.userAgent,
        viewport: [innerWidth, innerHeight, devicePixelRatio],
        nodes: document.querySelectorAll(".world *").length,
        surfacePixels: [...document.querySelectorAll<SVGSVGElement>("[data-map-surface]")].map(
            (svg) => {
                const r = svg.getBoundingClientRect();
                return Math.round(r.width * r.height);
            },
        ),
        paperPixels: [...document.querySelectorAll<HTMLCanvasElement>("canvas.paper")].reduce(
            (sum, canvas) => sum + canvas.width * canvas.height,
            0,
        ),
    });
    Object.defineProperty(window, "mapDiagnostics", { value: snapshot, configurable: true });
    const save = (): void => {
        try {
            sessionStorage.setItem("mapDiagnostics", JSON.stringify(snapshot()));
        } catch {
            /* Diagnostics must not interrupt navigation. */
        }
    };
    let pending = 0;
    const saveLater = () => {
        if (pending) return;
        pending = window.setTimeout(() => {
            pending = 0;
            save();
        }, 5000);
    };
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy map report";
    copy.style.cssText =
        "position:fixed;right:12px;top:84px;z-index:2147483647;padding:12px;background:white;color:#22262e;border:1px solid;border-radius:12px;font:14px sans-serif";
    copy.addEventListener("click", () => {
        if (!navigator.clipboard) {
            copy.textContent = "Copy requires a secure connection";
            return;
        }
        void navigator.clipboard
            .writeText(JSON.stringify({ current: snapshot(), previous }, null, 2))
            .then(() => {
                copy.textContent = "Map report copied";
            })
            .catch(() => {
                copy.textContent = "Copy unavailable in this browser";
            });
    });
    if (document.body) document.body.append(copy);
    else
        document.addEventListener("DOMContentLoaded", () => document.body.append(copy), {
            once: true,
        });
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) save();
    });
    return saveLater;
}
