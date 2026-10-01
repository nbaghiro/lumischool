// The family's own companion routes, for a grown-up trying the companion on a lesson they are looking
// at (engine/ui/companion-dock.tsx); nothing a grown-up does with it is recorded.

import type { Reach } from "../../engine/ui/companion";
import { call } from "../../engine/ui/wire";

export const GROWN_UP: Omit<Reach, "daily"> = {
    on: () => call("GET", "/api/companion"),
    start: (_owner, body) => call("POST", "/api/companion/start", body),
    context: (_owner, where) => call("POST", "/api/companion/context", where),
    end: (_owner, id) => call("POST", "/api/companion/end", { id }),
    gone: (_owner, id) =>
        void fetch("/api/companion/end", {
            method: "POST",
            keepalive: true,
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
        }).catch(() => undefined),
};
