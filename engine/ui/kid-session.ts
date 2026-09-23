const KEY = "lumischool-kid-session";
let memory: string | null = null;

export function kidCredential(): string | null {
    try {
        return sessionStorage.getItem(KEY) ?? memory;
    } catch {
        return memory;
    }
}

export function keepKidCredential(credential: string): void {
    memory = credential;
    try {
        sessionStorage.setItem(KEY, credential);
    } catch {
        /* A blocked store keeps this view only until the page closes. */
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

/** Cookie-changing sign-ins share one browser. Serialize them so first sign-ins cannot race its binding cookie. */
export async function withBrowserAuthLock<T>(run: () => Promise<T>): Promise<T> {
    if (typeof navigator !== "undefined" && navigator.locks) {
        return navigator.locks.request("lumischool-auth-cookie", run);
    }
    return run();
}
