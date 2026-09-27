import { For, onMount, onCleanup, Show, type JSX } from "solid-js";
import type { Picture } from "../painting";
import type { ArtworkSummary } from "../../server/api";
import type { PaintingRepository } from "./painting-save";
import { mountPainting } from "./painting-workspace";
import "./painting.css";
import "./postcard.css";

/**
 * The arrangement the easel is laid out in. `now` is the page itself; the other four are the
 * directions being tried at `/painting?v1` to `?v4`, which differ in idea, not in where a bar sits.
 */
export type PaintingLayout = "now" | "box" | "hand" | "pages" | "table";

export function PaintingWorkspace(props: {
    storageKey: string;
    document: Picture;
    repository: PaintingRepository;
    layout: PaintingLayout;
    /** The gallery's first pictures, for the rail the pages layout keeps beside the sheet. */
    pictures?: ArtworkSummary[];
    onOpenPicture?: (artwork: ArtworkSummary) => void;
    onBack: () => void;
    onNew: () => void;
}): JSX.Element {
    let root: HTMLDivElement | undefined;
    onMount(() => {
        if (!root) return;
        const dispose = mountPainting(root, props.storageKey, props);
        onCleanup(dispose);
    });
    return (
        <div
            class="painting-room"
            data-layout={props.layout}
            ref={(el) => {
                root = el;
            }}
        >
            <div id="workspace">
                <header class="painting-header">
                    <input
                        id="title"
                        aria-label="Painting name"
                        maxLength={70}
                        value="My painting"
                    />
                    <output id="save-state" hidden />
                    <button id="clear" aria-label="Clear the sheet">
                        Clear<span class="wide-only"> the sheet</span>
                    </button>
                    <button id="fresh" aria-label="New painting">
                        New<span class="wide-only"> painting</span>
                    </button>
                    <button class="done" id="done">
                        Save
                    </button>
                    <button id="gallery">Gallery</button>
                </header>
                <div class="paper-area" id="paper-area">
                    <aside id="reference" hidden></aside>
                    {/* The pages layout's own piece: every picture already made, laid beside the one
                        being painted, which is a page of the same book. */}
                    <Show when={props.layout === "pages"}>
                        <div class="pages-rail" aria-label="Your pictures">
                            <p class="kicker">Your pictures</p>
                            <div class="pages-rail-now" aria-current="page">
                                <span>This page</span>
                            </div>
                            <For each={props.pictures}>
                                {(artwork) => (
                                    <button
                                        class="pages-card"
                                        title={artwork.title}
                                        onClick={() => props.onOpenPicture?.(artwork)}
                                    >
                                        <img src={artwork.thumbnail} alt={artwork.title} />
                                    </button>
                                )}
                            </For>
                        </div>
                    </Show>
                    <div class="paper-taped">
                        <span class="postcard-tape" aria-hidden="true" />
                        <span class="postcard-tape r" aria-hidden="true" />
                        <div id="paper"></div>
                    </div>
                </div>
                <footer class="materials-dock">
                    {/* The paint box's own piece: the lid, which is the whole of how it opens. */}
                    <Show when={props.layout === "box"}>
                        <button id="box-lid" aria-expanded="false">
                            <span class="box-grip" aria-hidden="true" />
                            Paint box
                        </button>
                    </Show>
                    <div class="tool-line">
                        <div id="basics" aria-label="What you draw with"></div>
                        <div id="helpers" aria-label="More ways to paint"></div>
                        <button class="materials-button" id="materials">
                            <span aria-hidden="true">＋</span> Materials
                        </button>
                        <div id="modes" aria-label="Active drawing tools"></div>
                        <div class="dock-divider"></div>
                        <div id="sizes"></div>
                        <div class="dock-divider"></div>
                        <button id="undo" aria-label="Undo" title="Undo"></button>
                        <button id="redo" aria-label="Redo" title="Redo"></button>
                    </div>
                    <div class="colour-line">
                        <div id="colours" aria-label="Paint colours"></div>
                        <button id="mix-open">Mix colours</button>
                    </div>
                </footer>
            </div>
            <dialog id="drawer" aria-labelledby="drawer-title">
                <header>
                    <div>
                        <span class="eyebrow">THE PAINTER’S TABLE</span>
                        <h2 id="drawer-title">Painting</h2>
                    </div>
                    <button id="close" aria-label="Close panel">
                        ×
                    </button>
                </header>
                <div id="drawer-content"></div>
            </dialog>
            <div id="legacy" hidden>
                <div id="tools"></div>
                <div id="paints"></div>
            </div>
            <p id="say" class="sr" aria-live="polite"></p>
        </div>
    );
}
