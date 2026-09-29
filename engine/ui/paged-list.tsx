import "./paged-list.css";
import { createEffect, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { failureText } from "./failure";
import { pager, type PagedState, type Source } from "./paged";

export interface Paged<T> {
    state: () => PagedState<T>;
    more: () => void;
    again: () => void;
}

/**
 * A list read a page at a time from `source`, started again whenever `filters` changes. With `lazy`
 * the first page waits for the list's end to come near.
 */
export function createPaged<T, F>(
    source: Source<T, F>,
    filters: () => F,
    opts: { limit: number; lazy?: boolean },
): Paged<T> {
    const [state, setState] = createSignal<PagedState<T>>({
        items: [],
        total: null,
        status: "idle",
        failure: null,
        done: false,
        pages: 0,
        added: 0,
    });
    let alive = true;
    onCleanup(() => {
        alive = false;
    });
    const p = pager(
        source,
        filters(),
        (s) => {
            if (alive) setState(s);
        },
        opts,
    );
    createEffect(on(filters, (f) => p.restart(f), { defer: true }));
    return { state, more: p.more, again: p.again };
}

/**
 * A focus handler for a list's element: focus arriving on its last item, by Tab or an arrow, reads the
 * next page, and the item keeps the focus, since a page is added after it.
 */
export const readOnLastFocus =
    (paged: Paged<unknown>) =>
    (e: FocusEvent): void => {
        const list = e.currentTarget;
        if (!(e.target instanceof Element) || !(list instanceof Element)) return;
        const item = e.target.closest("li");
        if (item && item.parentElement === list && item === list.lastElementChild) paged.more();
    };

/**
 * The end of a list that scrolls on with no control to press: the next page is read while the end is
 * still a window below the view, a quiet line says so while it comes, and a screen reader hears how
 * many arrived. A failure is one line with a retry that also happens on the next scroll.
 */
export function ListEnd(props: {
    paged: Paged<unknown>;
    /** What a screen reader hears when a page arrives, such as "6 more lessons". */
    arrived: (n: number) => string;
    local: boolean;
    /** The box the list scrolls in, when it is not the page, such as a dialog's. */
    root?: () => Element | undefined;
}): JSX.Element {
    const [end, setEnd] = createSignal<HTMLElement>();
    const [heard, setHeard] = createSignal("");
    onMount(() => {
        const el = end();
        if (!el) return;
        let near = false;
        const root = props.root?.() ?? null;
        const io = new IntersectionObserver(
            (seen) => {
                near = seen.some((e) => e.isIntersecting);
                if (near) props.paged.more();
            },
            { root, rootMargin: "100% 0px" },
        );
        io.observe(el);
        onCleanup(() => io.disconnect());
        createEffect(
            on(
                () => props.paged.state(),
                (s) => {
                    if (s.status === "ready") {
                        setHeard(s.pages > 1 && s.added > 0 ? props.arrived(s.added) : "");
                        // a page that leaves the end still near reads the next, which the observer,
                        // reporting only changes, would not say
                        if (near && !s.done) {
                            io.unobserve(el);
                            io.observe(el);
                        }
                    }
                    if (s.status === "failed") {
                        const retry = (): void => props.paged.again();
                        const scroller = root ?? window;
                        scroller.addEventListener("scroll", retry, { passive: true, once: true });
                        onCleanup(() => scroller.removeEventListener("scroll", retry));
                    }
                },
            ),
        );
    });
    return (
        <div class="paged-end" ref={setEnd}>
            <p class="paged-said" aria-live="polite">
                <Show
                    when={props.paged.state().status === "loading"}
                    fallback={<span class="sr">{heard()}</span>}
                >
                    <span class="paged-loading">Loading more</span>
                </Show>
            </p>
            <Show when={props.paged.state().failure}>
                {(f) => (
                    <p class="paged-failed" role="alert">
                        <span>{failureText(f(), props.local)}</span>
                        <button
                            type="button"
                            class="paged-retry"
                            onClick={() => props.paged.again()}
                        >
                            Try again
                        </button>
                    </p>
                )}
            </Show>
        </div>
    );
}
