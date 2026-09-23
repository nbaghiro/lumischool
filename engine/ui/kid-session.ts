import type { Answer, Failure } from "./wire";
const KEY = "lumischool-kid-session";
let memory: string | null = null;

export function kidCredential(): string | null {
    try {
        return sessionStorage.getItem(KEY) ?? memory;
    } catch {
        return memory;
    }
}

export function keepKidCredential(credential: string): boolean {
    memory = credential;
    try {
        sessionStorage.setItem(KEY, credential);
        return sessionStorage.getItem(KEY) === credential;
    } catch {
        return false;
    }
}

export function kidQueueName(): string {
    // The public key id partitions queues without putting a secret in a database name.
    const credential = kidCredential();
    return `lumischool-kid-${credential?.split(".").slice(0, 2).join("-") || "closed"}`;
}

/** Empty credentials retain child mode after expiry or sign-out. Only an adult unlock clears it. */
export const inKidMode = (): boolean => kidCredential() !== null;
export function clearKidMode(): void {
    memory = null;
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* In-memory mode remains cleared. */
    }
}

export const PARENT_CHANGE = "lumischool.parent-change";
export function parentChanged(): void {
    try {
        localStorage.setItem(PARENT_CHANGE, `${Date.now()}:${Math.random()}`);
    } catch {
        /* Focus rechecks the server. */
    }
}

/** Refuse sign-in before creating a session that this tab cannot retain safely. */
export function authBrowserProblem(): Failure | null {
    try {
        const probe = "lumischool-auth-probe";
        sessionStorage.setItem(probe, "ready");
        const kept = sessionStorage.getItem(probe) === "ready";
        sessionStorage.removeItem(probe);
        if (!kept) throw new Error("Storage unavailable");
    } catch {
        return {
            error: "bad-request",
            status: 0,
            problem: "Allow this site to save browser data, then try signing in again.",
        };
    }
    if (typeof navigator === "undefined" || !navigator.locks)
        return {
            error: "bad-request",
            status: 0,
            problem: "Please update your browser to sign in safely across tabs.",
        };
    return null;
}

/** Cookie changes serialize across tabs. Revocation remains available in restricted browsers. */
export async function withBrowserAuthLock(
    run: () => Promise<Answer>,
    signingIn = true,
): Promise<Answer> {
    const failure = signingIn ? authBrowserProblem() : null;
    if (failure) return { ok: false, failure };
    if (typeof navigator !== "undefined" && navigator.locks)
        return navigator.locks.request("lumischool-auth-cookie", run);
    return run();
}
