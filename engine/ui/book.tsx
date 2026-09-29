// The chapters a book lesson's sitting reads, as pages of text on the sheet: one page at a time, its
// lines numbered down the margin as a question cites them, with the page before and after a press
// away. The page keeps one height whatever it holds, so the roll can measure a sheet before its book
// has loaded. It is for the screen only; on paper a family reads any printed edition.

import "./book.css";
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { bookPages, chaptersLabel, type PackBook } from "../pack";

/** Lines to a page, which with the heading fills a page the height the stylesheet gives it. */
const LINES = 20;

export function BookPages(props: {
    /** The book's text, null while it loads or when it could not be read. */
    book: PackBook | null;
    chapters: readonly number[];
}): JSX.Element {
    const pages = createMemo(() =>
        props.book ? bookPages(props.book, props.chapters, LINES) : [],
    );
    const [at, setAt] = createSignal(0);
    const page = () => pages()[Math.min(at(), Math.max(0, pages().length - 1))];
    return (
        <div class="bk ls-on-screen" aria-label={`The book, ${chaptersLabel(props.chapters)}`}>
            <Show
                when={page()}
                fallback={
                    <p class="bk-none">
                        {props.book
                            ? "This sitting names no chapter of the book."
                            : `${chaptersLabel(props.chapters)} of the book will show here. A printed copy of the book works just as well.`}
                    </p>
                }
            >
                {(p) => (
                    <>
                        <div class="bk-page">
                            <Show when={p().opens}>
                                <h4 class="bk-title">{`Chapter ${p().chapter}: ${p().title}`}</h4>
                            </Show>
                            <ol class="bk-lines">
                                <For each={p().lines}>
                                    {(line) => (
                                        <li
                                            value={line.n}
                                            classList={{ "bk-starts": line.starts }}
                                            data-n={line.n}
                                        >
                                            {line.text}
                                        </li>
                                    )}
                                </For>
                            </ol>
                        </div>
                        <div class="bk-turn">
                            <button
                                type="button"
                                class="ls-hint"
                                disabled={at() === 0}
                                onClick={() => setAt(at() - 1)}
                            >
                                Page before
                            </button>
                            <span class="bk-where" aria-live="polite">
                                {`Chapter ${p().chapter}, page ${at() + 1} of ${pages().length}`}
                            </span>
                            <button
                                type="button"
                                class="ls-hint"
                                disabled={at() >= pages().length - 1}
                                onClick={() => setAt(at() + 1)}
                            >
                                Next page
                            </button>
                        </div>
                    </>
                )}
            </Show>
        </div>
    );
}
