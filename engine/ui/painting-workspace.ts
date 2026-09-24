import { paintingAutosave, type PaintingRepository } from "./painting-save";
import { pictureThumbnail, compositePicture } from "./painting-preview";
import { paintingValue, type Picture } from "../painting";
import { IDEAS, ideaOf, pictureSvg } from "./painting-ideas";
import { mix, isPigment, type Pigment } from "../pigment";
import type { Mirror, PaintPart } from "../answer";
import { glyph, mountEasel, readState, type EaselState, type Tool } from "./painting-easel";

export function mountPainting(
    root: HTMLElement,
    key: string,
    options: { document: Picture; repository: PaintingRepository; onBack: () => void },
): () => void {
    const $ = (id: string): HTMLElement => {
        const node = root.querySelector<HTMLElement>(`#${id}`);
        if (!node) throw new Error(`Missing ${id}`);
        return node;
    };
    const dialog = root.querySelector<HTMLDialogElement>("#drawer");
    const nameInput = root.querySelector<HTMLInputElement>("#title");
    if (!dialog || !nameInput) throw new Error("Painting table is incomplete");
    const panel = dialog,
        titleInput = nameInput;
    const KEY = key;
    const object = (v: unknown): v is Record<string, unknown> =>
        !!v && typeof v === "object" && !Array.isArray(v);
    let current = structuredClone(options.document);
    let initialState: EaselState | null = null;
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(`${KEY}.preferences`) ?? "null");
        initialState = readState(stored);
    } catch {
        /* Tools can start fresh when device storage is unavailable. */
    }
    let disposed = false;
    const autosave = paintingAutosave({
        repository: options.repository,
        initial: current,
        thumbnail: pictureThumbnail,
        status: (text) => {
            if (disposed) return;
            const output = $("save-state");
            output.textContent = text;
            output.title = text;
            output.dataset.warning = String(text !== "Saved" && text !== "Saving…");
        },
        identity: (id) => {
            current.id = id;
        },
    });
    if (autosave) {
        $("save-state").textContent = options.repository?.recovery
            ? "Saved on this device · waiting to sync"
            : options.repository?.revision
              ? "Saved"
              : "A fresh sheet";
        void autosave.flush();
    }
    const retry = () => {
        void autosave?.flush();
    };
    window.addEventListener("online", retry);
    titleInput.value = current.title;
    let state: EaselState | null = initialState;
    let ready = false,
        restoring = false;
    let undo: Picture[] = [],
        redo: Picture[] = [];
    let strokeMode: "free" | "line" | "circle" | "box" = "free";
    let steady = true;
    let last = current.painting;
    const say = (text: string) => {
        $("say").textContent = text;
    };
    function save() {
        current.title = titleInput.value.trim() || "My painting";
        autosave.change(current);
    }
    function fit() {
        const box = $("paper-area").getBoundingClientRect();
        const guided = current.activity === "trace" || current.activity === "follow";
        const width = Math.max(
            180,
            Math.min(
                box.width - (guided && innerWidth > 1000 ? 240 : 0),
                ((box.height - (guided && innerWidth <= 1000 ? 150 : 12)) * current.painting.w) /
                    current.painting.h,
            ),
        );
        $("paper").style.width = `${width}px`;
        $("workspace").style.setProperty("--painting-view-width", `${width}px`);
    }
    fit();
    const easel = mountEasel({
        paper: $("paper"),
        tools: $("tools"),
        paints: $("paints"),
        painting: current.painting,
        state: initialState,
        rasterScale: 32,
        strokeScale: 1.5,
        strokeMode: () => strokeMode,
        steady: () => steady,
        say,
        onState(next) {
            state = next;
            if (ready) {
                refresh();
                try {
                    localStorage.setItem(`${KEY}.preferences`, JSON.stringify(state));
                } catch {
                    /* Drawing does not depend on preferences. */
                }
            }
        },
        onChange(next) {
            if (ready && !restoring && JSON.stringify(last) !== JSON.stringify(next)) {
                undo.push(structuredClone(current));
                if (undo.length > 50) undo.shift();
                redo = [];
            }
            current.painting = next;
            last = next;
            fit();
            if (ready) {
                save();
                refresh();
            }
        },
    });
    const observer = new ResizeObserver(fit);
    observer.observe($("paper-area"));
    const names: Record<Tool, string> = {
        pencil: "Pencil",
        water: "Watercolour",
        marker: "Felt pen",
        crayon: "Crayon",
        eraser: "Eraser",
        blend: "Blend",
        fill: "Fill",
        stamp: "Stamp",
        stencil: "Stencil",
        dropper: "Pick colour",
    };
    function button(label: string, action: () => void, host?: HTMLElement): HTMLButtonElement {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.title = label;
        b.setAttribute("aria-label", label);
        b.addEventListener("click", action);
        host?.append(b);
        return b;
    }
    function toolButton(tool: Tool, host: HTMLElement) {
        const b = button(
            names[tool],
            () => {
                strokeMode = "free";
                easel.select(tool);
                if (tool !== "stamp" && tool !== "stencil") panel.close();
                else showMaterials();
            },
            host,
        );
        b.className = "material-tool";
        b.dataset.choice = tool;
        const source = root.querySelector(`[data-tool="${tool}"].ez-tool svg`);
        if (source) b.prepend(source.cloneNode(true));
        b.setAttribute("aria-pressed", String(state?.tool === tool));
        return b;
    }
    const colours: Pigment[] = [
        "yellow",
        "orange",
        "red",
        "pink",
        "blue",
        "green",
        "brown",
        "black",
        "white",
        "sky",
    ];
    function hex(parts: PaintPart[]) {
        return mix(
            parts.filter((p): p is PaintPart & { pigment: Pigment } => isPigment(p.pigment)),
        );
    }
    function pots(host: HTMLElement, action: (p: Pigment) => void) {
        colours.forEach((p) => {
            const b = button(`${p} paint`, () => action(p), host);
            b.className = "paint-pot";
            b.textContent = "";
            b.style.setProperty("--paint", mix([{ pigment: p, parts: 1 }]));
            b.dataset.pigment = p;
        });
    }
    pots($("colours"), (p) => easel.colour([{ pigment: p, parts: 1 }]));
    $("undo").append(glyph("undo"));
    $("redo").append(glyph("undo"));
    function history(back: boolean) {
        const from = back ? undo : redo,
            to = back ? redo : undo,
            next = from.pop();
        if (!next) return;
        to.push(structuredClone(current));
        current = structuredClone(next);
        titleInput.value = current.title;
        restoring = true;
        easel.load(current.painting);
        restoring = false;
        refresh();
        say(back ? "Undone" : "Redone");
    }
    $("undo").addEventListener("click", () => history(true));
    $("redo").addEventListener("click", () => history(false));
    root.addEventListener(
        "keydown",
        (e) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                panel.open
            )
                return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                e.stopImmediatePropagation();
                history(!e.shiftKey);
            }
        },
        true,
    );
    function refresh() {
        const basics = $("basics");
        const visible: Tool[] = ["pencil", "marker", "fill", "eraser"];
        if (state && !visible.includes(state.tool)) visible.push(state.tool);
        for (const child of basics.querySelectorAll<HTMLButtonElement>("button")) {
            if (!visible.some((tool) => tool === child.dataset.choice)) child.remove();
        }
        for (const tool of visible) {
            const b =
                basics.querySelector<HTMLButtonElement>(`[data-choice="${tool}"]`) ??
                toolButton(tool, basics);
            b.setAttribute("aria-pressed", String(state?.tool === tool));
            const source = root.querySelector(`[data-tool="${tool}"].ez-tool svg`);
            if (source) {
                b.querySelector("svg")?.remove();
                b.prepend(source.cloneNode(true));
            }
        }
        root.querySelectorAll<HTMLButtonElement>("#colours button").forEach((b) =>
            b.setAttribute(
                "aria-pressed",
                String(
                    state?.paint.length === 1 &&
                        paintingValue(state.paint[0]).pigment === b.dataset.pigment,
                ),
            ),
        );
        $("undo").toggleAttribute("disabled", !undo.length);
        $("redo").toggleAttribute("disabled", !redo.length);
        $("mix-open").style.setProperty(
            "--mixed",
            state?.paint.length ? hex(state.paint) : "white",
        );
        renderActivity();
        const modes = $("modes");
        modes.replaceChildren();
        if (current.activity !== "draw") {
            const b = button(
                `${ideaOf(current.idea).name} · ${current.activity === "colour" ? "picture" : "guide"}`,
                showPictureOptions,
                modes,
            );
            b.className = "picture-chip";
            b.innerHTML = pictureSvg(ideaOf(current.idea), { reference: true });
        }
        if (strokeMode !== "free") {
            const b = button(
                `Turn off ${strokeMode === "circle" ? "oval" : strokeMode} tool`,
                () => {
                    strokeMode = "free";
                    refresh();
                },
                modes,
            );
            b.replaceChildren();
            const icon = document.createElement("span");
            icon.className = `shape-preview shape-${strokeMode}`;
            icon.setAttribute("aria-hidden", "true");
            b.append(icon);
        }
        if (state && state.mirror !== "none") {
            const b = button(
                `Turn off ${state.mirror === "two" ? "mirror" : state.mirror === "four" ? "four ways" : "six ways"}`,
                () => easel.symmetry("none"),
                modes,
            );
            b.replaceChildren(glyph(`mirror-${state.mirror}`));
        }
        const lift = root.querySelector<HTMLButtonElement>(".ez-lift");
        if (lift && !lift.hidden)
            button("Lift stencil", () => lift.click(), modes).replaceChildren(glyph("lift"));
    }
    const sizes = root.querySelector(".ez-sizes");
    if (sizes) $("sizes").append(sizes);
    function show(title: string) {
        // Return the real contextual controls before clearing the panel.
        panel.querySelectorAll(".ez-stamps").forEach((node) => $("tools").append(node));
        $("drawer-title").textContent = title;
        $("drawer-content").replaceChildren();
        $("drawer-content").className = "";
        if (!panel.open) panel.showModal();
        return $("drawer-content");
    }
    $("close").addEventListener("click", () => panel.close());
    panel.addEventListener("click", (e) => {
        const r = panel.getBoundingClientRect();
        if (
            e.target === panel &&
            (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        )
            panel.close();
    });
    function note(host: HTMLElement, text: string) {
        const p = document.createElement("p");
        p.className = "panel-note";
        p.textContent = text;
        host.append(p);
    }
    function showMaterials() {
        const host = show("Your materials");
        const extras = document.createElement("div");
        extras.className = "library-extras";
        host.append(extras);
        for (const item of [
            {
                title: "Colouring pictures",
                open: () => showIdeas("colour"),
                preview: pictureSvg(ideaOf("butterfly"), { reference: true }),
            },
            {
                title: "Tracing guides",
                open: () => showIdeas("trace"),
                preview: pictureSvg(ideaOf("flower"), { ghost: true }),
            },
            {
                title: "Drawing helpers",
                open: showHelpers,
                preview: pictureSvg(ideaOf("night"), { outlines: true }),
            },
        ]) {
            const b = button(item.title, item.open, extras);
            const art = document.createElement("div");
            art.innerHTML = item.preview;
            b.prepend(art);
        }
        if (current.activity !== "draw")
            button(
                `On your paper: ${ideaOf(current.idea).name}`,
                showPictureOptions,
                host,
            ).className = "library-current";
        const toolsHeading = document.createElement("h3");
        toolsHeading.textContent = "Draw and paint";
        host.append(toolsHeading);
        const grid = document.createElement("div");
        grid.className = "material-grid";
        host.append(grid);
        for (const tool of [
            "pencil",
            "marker",
            "crayon",
            "water",
            "eraser",
            "blend",
            "fill",
            "dropper",
            "stamp",
            "stencil",
        ] satisfies Tool[])
            toolButton(tool, grid);
        for (const row of root.querySelectorAll<HTMLElement>(".ez-stamps"))
            if (!row.hidden) host.append(row);
        if (state?.tool === "stamp")
            note(
                host,
                "Choose a print, then tap the paper. Tap the selected print again to flip it.",
            );
        if (state?.tool === "stencil")
            note(
                host,
                "Choose a shape, then tap the paper. Paint over it and lift the stencil to see your picture.",
            );
        if (state?.tool === "stamp" || state?.tool === "stencil")
            button("Use this material", () => panel.close(), host).className = "primary";
        const heading = document.createElement("h3");
        heading.textContent = "Make a pattern";
        host.append(heading);
        const patterns = document.createElement("div");
        patterns.className = "pattern-choices";
        host.append(patterns);
        for (const mode of ["none", "two", "four", "six"] satisfies Mirror[]) {
            const b = button(
                { none: "Off", two: "Mirror", four: "Four ways", six: "Six ways" }[mode],
                () => {
                    easel.symmetry(mode);
                    panel.close();
                },
                patterns,
            );
            b.prepend(glyph(`mirror-${mode}`));
            b.setAttribute("aria-pressed", String(state?.mirror === mode));
        }
    }
    $("materials").addEventListener("click", showMaterials);
    function gallery() {
        save();
        void autosave.leave().then((safe) => {
            if (safe) options.onBack();
        });
    }
    $("back").addEventListener("click", gallery);
    $("done").addEventListener("click", gallery);
    titleInput.addEventListener("input", save);
    $("options").addEventListener("click", () => {
        const host = show("Your paper");
        const row = document.createElement("div");
        row.className = "pattern-choices";
        host.append(row);
        for (const kind of ["plain", "squared"] as const) {
            const b = button(
                kind === "plain" ? "Plain paper" : "Squared paper",
                () => {
                    easel.load({ ...current.painting, paper: kind });
                    panel.close();
                },
                row,
            );
            b.prepend(glyph(kind));
            b.setAttribute("aria-pressed", String(current.painting.paper === kind));
        }
        button(
            "Download picture",
            () => {
                void download();
            },
            host,
        ).className = "primary";
        note(
            host,
            "Draw with a mouse, finger or pen. Undo: Ctrl/⌘ Z. Redo: Ctrl/⌘ Shift Z. On the paper, arrow keys move and Space starts or stops a line.",
        );
    });

    function change(action: () => void) {
        undo.push(structuredClone(current));
        if (undo.length > 50) undo.shift();
        redo = [];
        action();
        save();
        refresh();
    }
    function showIdeas(activity: "colour" | "trace") {
        const host = show(
            activity === "colour"
                ? "A picture to colour"
                : activity === "trace"
                  ? "Follow a little line"
                  : "Let’s draw it together",
        );
        note(
            host,
            activity === "colour"
                ? "Pick a picture, then tap a colour into each shape."
                : activity === "trace"
                  ? "Trace the gentle lines. Make it yours along the way."
                  : "One little shape at a time. Your drawing can be different.",
        );
        const cards = document.createElement("div");
        cards.className = "idea-cards";
        host.append(cards);
        IDEAS.forEach((idea) => {
            const b = button(
                idea.name,
                () => {
                    change(() => {
                        if (current.idea !== idea.id) current.fills = {};
                        current.activity = activity;
                        current.idea = idea.id;
                        current.step = 0;
                        current.guides = true;
                    });
                    strokeMode = "free";
                    panel.close();
                    easel.select(activity === "colour" ? "fill" : "marker");
                },
                cards,
            );
            const preview = document.createElement("div");
            preview.innerHTML = pictureSvg(idea, { reference: true });
            b.prepend(preview);
        });
        note(
            host,
            "Added to this paper. Your drawing stays; Undo brings back the previous picture.",
        );
        button("Back to materials", showMaterials, host).className = "library-back";
    }
    let sceneKey = "";
    function renderActivity() {
        const idea = ideaOf(current.idea);
        const interactive = current.activity === "colour" && state?.tool === "fill";
        const sheet = root.querySelector<HTMLElement>("#paper .ez-sheet");
        if (!sheet) return;
        const key = JSON.stringify([
            current.activity,
            current.idea,
            current.fills,
            current.step,
            current.guides,
            interactive,
            current.painting.w,
            current.painting.h,
        ]);
        if (key === sceneKey) return;
        sceneKey = key;
        sheet.querySelectorAll(".idea-layer").forEach((n) => n.remove());
        const options = { w: current.painting.w, h: current.painting.h };
        const layer = (svg: string, type: string, under = false) => {
            const holder = document.createElement("div");
            holder.className = `idea-layer ${type}`;
            holder.innerHTML = svg;
            if (under) sheet.prepend(holder);
            else sheet.append(holder);
            return holder;
        };
        if (current.activity === "colour") {
            layer(
                pictureSvg(idea, { ...options, fills: current.fills, fillOnly: true }),
                "idea-colours",
                true,
            );
            layer(pictureSvg(idea, { ...options, outlines: true }), "idea-outlines");
            if (interactive) {
                const hit = layer(pictureSvg(idea, { ...options, hit: true }), "idea-hits");
                const fillRegion = (target: EventTarget | null) => {
                    if (!(target instanceof Element)) return;
                    const region = target.closest("[data-region]")?.getAttribute("data-region");
                    if (!region || !state) return;
                    const colour = hex(state.paint);
                    if (current.fills[region] === colour) return;
                    change(() => {
                        current.fills[region] = colour;
                    });
                    say("A little more colour");
                };
                // An empty part of the sheet must not trigger the underlying flood fill.
                hit.addEventListener("pointerdown", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fillRegion(e.target);
                });
                hit.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        fillRegion(e.target);
                    }
                });
            }
        } else if (current.activity !== "draw" && current.guides) {
            layer(
                pictureSvg(idea, {
                    ...options,
                    ghost: true,
                    step: current.activity === "follow" ? current.step : undefined,
                }),
                "idea-guide",
                true,
            );
        }
        const reference = $("reference");
        reference.replaceChildren();
        reference.hidden = current.activity !== "trace" && current.activity !== "follow";
        if (!reference.hidden) {
            const kicker = document.createElement("span");
            kicker.className = "eyebrow";
            kicker.textContent =
                current.activity === "follow" ? "ONE LITTLE STEP" : "A LITTLE INSPIRATION";
            const preview = document.createElement("div");
            preview.className = "reference-picture";
            preview.innerHTML = pictureSvg(idea, {
                reference: true,
                step: current.activity === "follow" ? current.step : undefined,
            });
            const text = document.createElement("p");
            text.textContent =
                current.activity === "follow"
                    ? (idea.steps[current.step] ?? "Make it your own")
                    : idea.hint;
            reference.append(kicker, preview, text);
            if (current.activity === "follow") {
                const steps = document.createElement("div");
                steps.className = "step-actions";
                reference.append(steps);
                const prev = button(
                    "Previous step",
                    () =>
                        change(() => {
                            current.step--;
                        }),
                    steps,
                );
                prev.textContent = "←";
                prev.disabled = current.step === 0;
                const count = document.createElement("span");
                count.textContent = `${current.step + 1} / ${idea.steps.length}`;
                steps.append(count);
                const next = button(
                    "Next step",
                    () =>
                        change(() => {
                            current.step++;
                        }),
                    steps,
                );
                next.textContent = "→";
                next.disabled = current.step >= idea.steps.length - 1;
            }
            const toggle = button(
                current.guides ? "Hide tracing lines" : "Show tracing lines",
                () =>
                    change(() => {
                        current.guides = !current.guides;
                    }),
                reference,
            );
            toggle.className = "guide-toggle";
        }
        document.body.dataset.activity = current.activity;
        requestAnimationFrame(fit);
    }
    function showPictureOptions() {
        const host = show(ideaOf(current.idea).name);
        const preview = document.createElement("div");
        preview.className = "selected-picture";
        preview.innerHTML = pictureSvg(ideaOf(current.idea), { reference: true });
        host.append(preview);
        const choices = document.createElement("div");
        choices.className = "pattern-choices";
        host.append(choices);
        for (const kind of ["colour", "trace"] as const) {
            const b = button(
                kind === "colour" ? "Colouring picture" : "Tracing guide",
                () => {
                    change(() => {
                        current.activity = kind;
                        current.guides = true;
                    });
                    easel.select(kind === "colour" ? "fill" : "marker");
                    showPictureOptions();
                },
                choices,
            );
            b.setAttribute(
                "aria-pressed",
                String(
                    kind === "colour" ? current.activity === kind : current.activity !== "colour",
                ),
            );
        }
        if (current.activity !== "colour") {
            const label = document.createElement("label");
            label.className = "steady-toggle";
            const stepwise = document.createElement("input");
            stepwise.type = "checkbox";
            stepwise.checked = current.activity === "follow";
            stepwise.addEventListener("change", () =>
                change(() => {
                    current.activity = stepwise.checked ? "follow" : "trace";
                    current.step = 0;
                }),
            );
            label.append(stepwise, "One step at a time");
            host.append(label);
        }
        button("Keep painting", () => panel.close(), host).className = "primary";
        button(
            "Remove from paper",
            () => {
                change(() => {
                    current.activity = "draw";
                });
                panel.close();
                easel.select("marker");
            },
            host,
        ).className = "library-back";
        note(host, "Your own marks stay on the paper. Removing a picture can be undone.");
    }
    function showHelpers() {
        const host = show("A little helping hand");
        const label = document.createElement("label");
        label.className = "steady-toggle";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = steady;
        checkbox.addEventListener("change", () => {
            steady = checkbox.checked;
        });
        label.append(checkbox, "Steady hand");
        host.append(label);
        note(host, "Gently smooths small wobbles. Your line is still your own.");
        const choices = document.createElement("div");
        choices.className = "shape-choices";
        host.append(choices);
        for (const mode of ["free", "line", "circle", "box"] as const) {
            const b = button(
                { free: "Freehand", line: "Straight line", circle: "Oval", box: "Box" }[mode],
                () => {
                    strokeMode = mode;
                    easel.select("marker");
                    panel.close();
                    refresh();
                },
                choices,
            );
            const preview = document.createElement("div");
            preview.className = `shape-preview shape-${mode}`;
            b.prepend(preview);
            b.setAttribute("aria-pressed", String(strokeMode === mode));
        }
        note(host, "Choose a shape, then drag on the paper. Every shape can be undone.");
        button("Back to materials", showMaterials, host).className = "library-back";
    }
    async function download() {
        const source = root.querySelector<HTMLCanvasElement>("#paper .ez-paint");
        if (!source) return;
        const snapshot = structuredClone(current),
            marks = document.createElement("canvas");
        marks.width = source.width;
        marks.height = source.height;
        marks.getContext("2d")?.drawImage(source, 0, 0);
        const output = document.createElement("canvas");
        output.width = marks.width;
        output.height = marks.height;
        try {
            await compositePicture(snapshot, output, marks);
            const a = document.createElement("a");
            a.href = output.toDataURL("image/png");
            a.download = `${snapshot.title}.png`;
            a.click();
        } catch {
            say("Could not download this picture. Your saved work is still here.");
        }
    }

    let wells: PaintPart[][] = [[], [], []],
        well = 0;
    let mixHistory: PaintPart[][][] = [[], [], []];
    let favourites: PaintPart[][] = [];
    const MIX_KEY = `${KEY}.mixes`;
    function validMix(v: unknown): v is PaintPart[] {
        return (
            Array.isArray(v) &&
            v.length <= 15 &&
            v.every(
                (p) =>
                    object(p) &&
                    typeof p.pigment === "string" &&
                    isPigment(p.pigment) &&
                    typeof p.parts === "number" &&
                    Number.isInteger(p.parts) &&
                    p.parts > 0 &&
                    p.parts <= 60,
            )
        );
    }
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(MIX_KEY) ?? "null");
        if (object(stored)) {
            if (
                Array.isArray(stored.wells) &&
                stored.wells.length === 3 &&
                stored.wells.every(validMix)
            )
                wells = stored.wells;
            if (Array.isArray(stored.favourites))
                favourites = stored.favourites
                    .filter(validMix)
                    .filter((p) => p.length)
                    .slice(0, 8);
        }
    } catch {
        /* Mixing can still work when browser storage is unavailable. */
    }
    function saveMixes() {
        try {
            localStorage.setItem(MIX_KEY, JSON.stringify({ wells, favourites }));
        } catch {
            say("Your mixes will stay here until you close this page.");
        }
    }
    function showMix() {
        const host = show("Let’s make a new colour");
        host.classList.add("mix-bench");
        note(host, "A dab of this. A drop of that. What will you make?");
        const potsRow = document.createElement("div");
        potsRow.className = "mix-pots bench-pots";
        host.append(potsRow);
        const wellsRow = document.createElement("div");
        wellsRow.className = "bench-wells";
        host.append(wellsRow);
        const ingredients = document.createElement("div");
        ingredients.className = "ingredient-drops";
        ingredients.setAttribute("aria-live", "polite");
        host.append(ingredients);
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Peek at the recipe";
        const recipe = document.createElement("p");
        details.append(summary, recipe);
        host.append(details);
        const actions = document.createElement("div");
        actions.className = "mix-actions";
        host.append(actions);
        const use = button(
            "Paint with this",
            () => {
                easel.colour(paintingValue(wells[well]));
                panel.close();
            },
            actions,
        );
        use.className = "primary";
        const back = button(
            "Undo last dab",
            () => {
                const previous = paintingValue(mixHistory[well]).pop();
                if (previous) wells[well] = previous;
                update();
            },
            actions,
        );
        back.prepend(glyph("undo"));
        const wash = button(
            "Wash this well",
            () => {
                paintingValue(mixHistory[well]).push(structuredClone(paintingValue(wells[well])));
                wells[well] = [];
                update();
            },
            actions,
        );
        wash.prepend(glyph("wash"));
        const collection = document.createElement("div");
        collection.className = "mix-collection";
        host.append(collection);
        const keepMix = button(
            "Keep this colour",
            () => {
                if (!paintingValue(wells[well]).length) return;
                if (!favourites.some((p) => hex(p) === hex(paintingValue(wells[well]))))
                    favourites = [structuredClone(paintingValue(wells[well])), ...favourites].slice(
                        0,
                        8,
                    );
                update();
                say("Your colour is on the little shelf");
            },
            host,
        );
        keepMix.className = "keep-mix";
        pots(potsRow, (pigment) => {
            if (paintingValue(wells[well]).reduce((n, p) => n + p.parts, 0) >= 60) {
                say("This well is full. Try another one.");
                return;
            }
            paintingValue(mixHistory[well]).push(structuredClone(paintingValue(wells[well])));
            const found = paintingValue(wells[well]).find((p) => p.pigment === pigment);
            if (found) found.parts++;
            else paintingValue(wells[well]).push({ pigment, parts: 1 });
            update();
            const pot = potsRow.querySelector<HTMLElement>(`[data-pigment="${pigment}"]`),
                bowlTarget = wellsRow.children[well];
            if (
                pot &&
                bowlTarget instanceof HTMLElement &&
                !matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
                const from = pot.getBoundingClientRect(),
                    to = bowlTarget.getBoundingClientRect(),
                    area = host.getBoundingClientRect();
                const dab = document.createElement("span");
                dab.className = "flying-dab";
                dab.style.background = hex([{ pigment, parts: 1 }]);
                dab.style.left = `${from.x + from.width / 2 - area.x}px`;
                dab.style.top = `${from.y + from.height / 2 - area.y}px`;
                host.append(dab);
                const fall = dab.animate(
                    [
                        { transform: "translate(-50%, -50%) scale(.65)", opacity: 1 },
                        {
                            transform: `translate(${to.x + to.width / 2 - from.x - from.width / 2}px, ${to.y + to.height / 2 - from.y - from.height / 2}px) scale(1.6)`,
                            opacity: 0,
                        },
                    ],
                    { duration: 430, easing: "ease-in" },
                );
                fall.finished.then(
                    () => dab.remove(),
                    () => dab.remove(),
                );
            }
            const bowl = wellsRow.children[well];
            if (
                bowl instanceof HTMLElement &&
                !matchMedia("(prefers-reduced-motion: reduce)").matches
            )
                bowl.animate(
                    [
                        { transform: "rotate(-2deg) scale(.96)" },
                        { transform: "rotate(2deg) scale(1.025)" },
                        { transform: "none" },
                    ],
                    { duration: 300 },
                );
        });
        for (let i = 0; i < 3; i++) {
            const b = button(
                `Mixing well ${i + 1}`,
                () => {
                    well = i;
                    update();
                },
                wellsRow,
            );
            b.className = "bench-well";
            b.innerHTML = `<span class="well-paint"></span><span class="well-label">${["A little mix", "Another idea", "One more try"][i]}</span>`;
        }
        function update() {
            saveMixes();
            [...wellsRow.children].forEach((b, i) => {
                if (!(b instanceof HTMLElement)) return;
                b.style.setProperty(
                    "--well-paint",
                    paintingValue(wells[i]).length ? hex(paintingValue(wells[i])) : "#fffef9",
                );
                b.setAttribute("aria-pressed", String(i === well));
            });
            ingredients.replaceChildren();
            if (!paintingValue(wells[well]).length) {
                ingredients.textContent = "Pick a pot to drop some paint in.";
            }
            paintingValue(wells[well]).forEach((p) => {
                const group = document.createElement("span");
                group.className = "ingredient-group";
                group.setAttribute("aria-label", `${p.parts} dabs of ${p.pigment}`);
                for (let i = 0; i < Math.min(6, p.parts); i++) {
                    const drop = document.createElement("span");
                    drop.className = "ingredient-drop";
                    drop.style.background = hex([{ pigment: p.pigment, parts: 1 }]);
                    group.append(drop);
                }
                if (p.parts > 6) {
                    const more = document.createElement("small");
                    more.textContent = `+${p.parts - 6}`;
                    group.append(more);
                }
                ingredients.append(group);
            });
            recipe.textContent =
                paintingValue(wells[well])
                    .map((p) => `${p.pigment} ${p.parts}`)
                    .join(" + ") || "An empty well, ready for an idea.";
            use.disabled = keepMix.disabled = !paintingValue(wells[well]).length;
            back.disabled = !paintingValue(mixHistory[well]).length;
            wash.disabled = !paintingValue(wells[well]).length;
            collection.replaceChildren();
            if (favourites.length) {
                const label = document.createElement("span");
                label.textContent = "Your little colour shelf";
                collection.append(label);
                favourites.forEach((p, i) => {
                    const b = button(
                        `Use saved mix ${i + 1}`,
                        () => {
                            easel.colour(p);
                            panel.close();
                        },
                        collection,
                    );
                    b.className = "paint-pot";
                    b.textContent = "";
                    b.style.setProperty("--paint", hex(p));
                });
            }
        }
        update();
    }
    $("mix-open").addEventListener("click", showMix);
    ready = true;
    if (!initialState) easel.select("marker");
    refresh();

    return () => {
        save();
        disposed = true;
        window.removeEventListener("online", retry);
        void autosave?.leave();
        observer.disconnect();
        easel.dispose();
        panel.close();
    };
}
