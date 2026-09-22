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
