import { isGameAttempt, type GameAttempt } from "../answer";
import * as api from "./api";

interface Pending {
    family: string;
    user: string;
    kid: string;
    attempt: GameAttempt;
}
const PREFIX = "lumischool.game-attempt.v1.";

export function gameRecording(family: string, user: string, changed: () => void) {
    let busy = false;
    let closed = false;
    const pending = (): Pending[] => {
        const result: Pending[] = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key?.startsWith(PREFIX)) continue;
                try {
                    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
                    if (
                        typeof value !== "object" ||
                        value === null ||
                        !("family" in value) ||
                        !("user" in value) ||
                        !("kid" in value) ||
                        !("attempt" in value)
                    )
                        continue;
                    if (
                        value.family === family &&
                        value.user === user &&
                        typeof value.kid === "string" &&
                        isGameAttempt(value.attempt)
                    )
                        result.push({ family, user, kid: value.kid, attempt: value.attempt });
                } catch {
                    /* A corrupt entry must not prevent recovery of the other attempts. */
                }
            }
        } catch {
            return result;
        }
        return result;
    };
    const flush = async () => {
        if (busy || closed) return;
        busy = true;
        try {
            const who = await api.me({ ask: true });
            if (!who || "error" in who || who.family.id !== family || who.user.id !== user) return;
            for (const entry of pending()) {
                if (closed) return;
                const sent = await api.append(
                    [
                        {
                            id: entry.attempt.id,
                            kid_id: entry.kid,
                            kind: "game-attempted",
                            at: entry.attempt.completedAt,
                            data: entry.attempt,
                        },
                    ],
                    family,
                    user,
                );
                if (!Array.isArray(sent)) return;
                localStorage.removeItem(PREFIX + entry.attempt.id);
                changed();
            }
        } finally {
            busy = false;
        }
    };
    const retry = () => {
        void flush().catch(() => undefined);
    };
    window.addEventListener("online", retry);
    const timer = window.setInterval(retry, 15000);
    retry();
    return {
        pending: (kid: string) =>
            pending()
                .filter((entry) => entry.kid === kid)
                .map((entry) => entry.attempt),
        record(kid: string, attempt: GameAttempt): boolean {
            if (!isGameAttempt(attempt)) return false;
            if (pending().length >= 200) return false;
            try {
                localStorage.setItem(
                    PREFIX + attempt.id,
                    JSON.stringify({ family, user, kid, attempt }),
                );
            } catch {
                return false;
            }
            changed();
            retry();
            return true;
        },
        dispose() {
            closed = true;
            clearInterval(timer);
            window.removeEventListener("online", retry);
        },
    };
}
