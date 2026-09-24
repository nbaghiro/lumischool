import { Icon } from "./icon";
import { onMount, onCleanup, type JSX } from "solid-js";
import type { Picture } from "../painting";
import type { PaintingRepository } from "./painting-save";
import { mountPainting } from "./painting-workspace";
import "./painting.css";

export function PaintingWorkspace(props: {
    storageKey: string;
    document: Picture;
    repository: PaintingRepository;
    onBack: () => void;
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
            ref={(el) => {
                root = el;
            }}
        >
            <div id="workspace">
                <header class="painting-header">
                    <button id="back" aria-label="Open your pictures" title="Your pictures">
                        <Icon name="pictures" />
                    </button>
                    <input
                        id="title"
                        aria-label="Painting name"
                        maxLength={70}
                        value="My painting"
                    />
                    <output id="save-state" hidden />
                    <button class="done" id="done">
                        Done
                    </button>
                    <button id="options" aria-label="Paper and options" title="Paper and options">
                        •••
                    </button>
                </header>
                <div class="paper-area" id="paper-area">
                    <aside id="reference" hidden></aside>
                    <div id="paper"></div>
                </div>
                <footer class="materials-dock">
                    <div class="tool-line">
                        <div id="basics"></div>
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
