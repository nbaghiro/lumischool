// What a page keeps of its reads while it is open, so a screen opened again draws at once from what
// the last one read and asks again behind it (.docs/parent-app.md, "Moving between screens"). A read
// answers synchronously when it holds a value, which a resource takes as resolved in the same pass,
// and a write the API accepted marks every read stale, so the next one waits for the network.

import {
    createEffect,
    createResource,
    createSignal,
    on,
    type Accessor,
    type ResourceReturn,
} from "solid-js";
import type { Failure } from "./wire";

/** A value now, or one still on its way. */
export type Maybe<T> = T | Promise<T>;

/** `f` of a value now or later: synchronous when the value already is. */
export const after = <A, B>(a: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> =>
    a instanceof Promise ? a.then(f) : f(a);

/** Two values at once, both already asked for: synchronous when both already are. */
export const both = <A, B>(a: Maybe<A>, b: Maybe<B>): Maybe<[A, B]> =>
    after(a, (x) => after(b, (y): [A, B] => [x, y]));

/** A shared read: its value as a signal, and a way to ask for it that answers at once when it can. */
export interface Held<T> {
    /** The last value read, or undefined before the first. */
    value: Accessor<T | undefined>;
    /** The value held, at once, or the network's answer when nothing is held or what is held is stale. */
    read(): Maybe<T | Failure>;
    /** Ask the network, whatever is held. */
    refresh(): Promise<T | Failure>;
    /** The next read waits for the network, while the value held stays shown. */
    stale(): void;
}

/**
 * A value held is given at once and asked for again behind every screen that uses it, so a change
 * made elsewhere shows on the next move; reads within this many milliseconds of an answer, the
 * bar's and the screen's on one move, share it.
 */
const AGAIN = 250;

const sameValue = (a: unknown, b: unknown): boolean =>
    a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * One shared read over `ask`. A failure is never held, so a read after one asks again. `keep` holds a
 * value that cannot change, such as a pack named by its digest, through every write.
 */
export function held<T extends object>(
    ask: () => Promise<T | Failure>,
    o: { keep?: boolean } = {},
): Held<T> {
    const [value, setValue] = createSignal<T | undefined>(undefined, { equals: sameValue });
    let asked = 0;
    let dirty = false;
    let flight: Promise<T | Failure> | null = null;
    const refresh = (): Promise<T | Failure> =>
        (flight ??= ask().then(
            (v) => {
                flight = null;
                if (!("error" in v)) {
                    asked = Date.now();
                    dirty = false;
                    setValue(() => v);
                }
                return v;
            },
            (e: unknown) => {
                flight = null;
                throw e;
            },
        ));
    return {
        value,
        read() {
            const v = value();
            if (v === undefined || dirty) return refresh();
            if (!o.keep && !flight && Date.now() - asked > AGAIN) void refresh();
            return v;
        },
        refresh,
        stale() {
            if (!o.keep) dirty = true;
        },
    };
}

/** A shared read per key, such as one child's record, each made the first time its key is asked. */
export function heldBy<T extends object>(
    ask: (key: string) => Promise<T | Failure>,
): { of(key: string): Held<T>; stale(): void } {
    const each = new Map<string, Held<T>>();
    return {
        of(key) {
            let h = each.get(key);
            if (!h) each.set(key, (h = held(() => ask(key))));
            return h;
        },
        stale() {
            for (const h of each.values()) h.stale();
        },
    };
}

/**
 * A screen's resource over shared reads: resolved in the same pass when every read it makes is held,
 * so the screen draws at once, and asked again whenever one of `from` changes behind it.
 */
export function createHeld<T>(
    load: () => Maybe<T>,
    from: readonly Held<object>[],
): ResourceReturn<T> {
    const made = createResource(load);
    createEffect(
        on(
            () => from.map((h) => h.value()),
            () => void made[1].refetch(),
            { defer: true },
        ),
    );
    return made;
}
