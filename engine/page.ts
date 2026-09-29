// A list read one page at a time, with the same shape whether it is cut from Postgres or from a sorted
// list in memory (.docs/pagination.md).

export interface Page<T> {
    items: T[];
    /** Where the next page starts, or null on the last page. Opaque to everyone but readCursor. */
    next: string | null;
    /** How many items the whole list holds under this query, when the source counts them. */
    total?: number;
}

/** A place in a list's order: the sort key of the last item a page held, most significant first. */
export type Key = readonly (string | number)[];

/** What one part of a key must be: a string, a number, or a string matching a pattern. */
export type KeyPart = "string" | "number" | RegExp;

export type CursorProblem = "unreadable" | "other-query";

const MAX_CURSOR = 512;

/** Strings compare by code unit, so the order agrees with Postgres's "C" collation and never with a locale. */
export function compareKeys(a: Key, b: Key): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const x = a[i],
            y = b[i];
        if (x === y || x === undefined || y === undefined) continue;
        if (typeof x !== typeof y) return typeof x === "number" ? -1 : 1;
        return x < y ? -1 : 1;
    }
    return a.length - b.length;
}

function canonical(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
    if (typeof v === "object" && v !== null)
        return `{${Object.entries(v)
            .filter(([, x]) => x !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`)
            .join(",")}}`;
    return JSON.stringify(v) ?? "null";
}

const fnv = (s: string, seed: number): number => {
    let h = seed;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
};

/**
 * A short name for a list and what narrows it (its filters and search words), which a cursor carries so
 * it is refused under any other. It is not a secret: a cursor a caller forges still only moves within
 * rows the caller may read.
 */
export function queryHash(query: unknown): string {
    const s = canonical(query);
    return fnv(s, 2166136261).toString(36) + fnv(s, 3355443211).toString(36);
}

function toBase64url(s: string): string {
    let bin = "";
    for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): string | null {
    try {
        const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        return null;
    }
}

export function cursorOf(key: Key, query: string): string {
    return toBase64url(JSON.stringify([query, ...key]));
}

const fits = (v: unknown, part: KeyPart): v is string | number =>
    part === "number"
        ? typeof v === "number" && Number.isFinite(v)
        : typeof v === "string" && (part === "string" || part.test(v));

/**
 * The key a cursor holds, or why it is refused: it is not one this module wrote, its key is not the
 * list's shape, or it was made for another query or list.
 */
export function readCursor(
    raw: unknown,
    query: string,
    shape: readonly KeyPart[],
): { key: Key } | { problem: CursorProblem } {
    if (typeof raw !== "string" || raw.length > MAX_CURSOR || !/^[A-Za-z0-9_-]+$/.test(raw))
        return { problem: "unreadable" };
    const text = fromBase64url(raw);
    if (text === null) return { problem: "unreadable" };
    let read: unknown;
    try {
        read = JSON.parse(text);
    } catch {
        return { problem: "unreadable" };
    }
    if (!Array.isArray(read) || read.length !== shape.length + 1) return { problem: "unreadable" };
    const parts: readonly unknown[] = read;
    const made = parts[0];
    const rest = parts.slice(1);
    const key: (string | number)[] = [];
    for (const [i, part] of shape.entries()) {
        const v = rest[i];
        if (!fits(v, part)) return { problem: "unreadable" };
        key.push(v);
    }
    if (typeof made !== "string") return { problem: "unreadable" };
    if (made !== query) return { problem: "other-query" };
    return { key };
}

/** A page size from a request: a whole number clamped to 1..max, or `fallback` when none is given. */
export function limitOf(raw: unknown, max: number, fallback: number = max): number {
    const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (typeof n !== "number" || !Number.isFinite(n)) return Math.min(fallback, max);
    return Math.max(1, Math.min(max, Math.trunc(n)));
}

/**
 * A page of a list already narrowed and sorted by `keyOf` in `compareKeys` order, which does not change
 * while it is read, such as a pack's index. The page starts after `after`, wherever it now falls.
 */
export function pageOfList<T>(
    sorted: readonly T[],
    keyOf: (item: T) => Key,
    at: { after: Key | null; limit: number; query: string },
): Page<T> {
    let start = 0;
    if (at.after !== null) {
        let hi = sorted.length;
        while (start < hi) {
            const mid = (start + hi) >> 1;
            const item = sorted[mid];
            if (item !== undefined && compareKeys(keyOf(item), at.after) <= 0) start = mid + 1;
            else hi = mid;
        }
    }
    const items = sorted.slice(start, start + at.limit);
    const last = items.at(-1);
    return {
        items,
        next:
            last !== undefined && start + items.length < sorted.length
                ? cursorOf(keyOf(last), at.query)
                : null,
        total: sorted.length,
    };
}
