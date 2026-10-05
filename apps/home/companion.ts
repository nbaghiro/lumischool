// The family's own companion routes, for a grown-up trying the companion on a lesson they are looking
// at (engine/ui/companion-dock.tsx); nothing a grown-up does with it is recorded.

import type { Reach } from "../../engine/ui/companion";
import { call } from "../../engine/ui/wire";

export const GROWN_UP: Reach = {
    on: () => call("GET", "/api/companion"),
    step: (_owner, body) => call("POST", "/api/companion/step", body),
    voice: async (_owner, key) => {
        const response = await fetch(`/api/companion/voice/${encodeURIComponent(key)}`, {
            credentials: "same-origin",
        }).catch(() => null);
        return response?.ok ? response.blob() : null;
    },
};
