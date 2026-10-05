import * as SecureStore from "expo-secure-store";
import { ORIGIN } from "./origin";

/** What the app holds in the device's secure store, all of it issued by `origin`. */
export interface Held {
    /** The grown-up's session, sent as `Authorization: Bearer`. */
    session: string | null;
    /** The browser key the session and the children's views are bound to, sent as `X-Lumi-Device`. */
    device: string | null;
    /** The children's view the app is in, sent as `X-Kid-Session`; null in parent mode. */
    kid: string | null;
    /** The children the view is for, when the app opened it; empty when the page or a sign-in did. */
    kids: string[];
}

const EMPTY: Held = { session: null, device: null, kid: null, kids: [] };

const KEYS = {
    origin: "lumischool.origin",
    session: "lumischool.session",
    device: "lumischool.device",
    kid: "lumischool.kid",
    kids: "lumischool.kids",
} as const;

let held: Held = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

export interface Snapshot {
    loaded: boolean;
    held: Held;
}

let snapshot: Snapshot = { loaded, held };

function changed(): void {
    snapshot = { loaded, held };
    for (const listener of listeners) listener();
}

export const snapshotOf = (): Snapshot => snapshot;

export function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export const credentials = (): Held => held;

function idsOf(text: string | null): string[] {
    if (text === null) return [];
    try {
        const parsed: unknown = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch {
        return [];
    }
}

const write = (key: string, value: string | null): Promise<void> =>
    value === null ? SecureStore.deleteItemAsync(key) : SecureStore.setItemAsync(key, value);

/** Reads what the store holds, and forgets it when another origin issued it. */
export async function load(): Promise<void> {
    const origin = await SecureStore.getItemAsync(KEYS.origin);
    if (origin === ORIGIN) {
        const [session, device, kid, kids] = await Promise.all([
            SecureStore.getItemAsync(KEYS.session),
            SecureStore.getItemAsync(KEYS.device),
            SecureStore.getItemAsync(KEYS.kid),
            SecureStore.getItemAsync(KEYS.kids),
        ]);
        held = { session, device, kid, kids: idsOf(kids) };
    } else {
        await Promise.all([
            write(KEYS.session, null),
            write(KEYS.device, null),
            write(KEYS.kid, null),
            write(KEYS.kids, null),
        ]);
        await write(KEYS.origin, ORIGIN);
        held = EMPTY;
    }
    loaded = true;
    changed();
}

export async function keep(change: Partial<Held>): Promise<void> {
    held = { ...held, ...change };
    changed();
    await Promise.all([
        change.session === undefined ? null : write(KEYS.session, change.session),
        change.device === undefined ? null : write(KEYS.device, change.device),
        change.kid === undefined ? null : write(KEYS.kid, change.kid),
        change.kids === undefined ? null : write(KEYS.kids, JSON.stringify(change.kids)),
    ]);
}
