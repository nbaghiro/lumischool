import { createResource, createSignal, onMount, onCleanup, For, Show, type JSX } from "solid-js";
import type { Picture } from "../painting";
import { isPicture } from "../painting";
import type { ArtworkSummary } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { Button } from "./form";
import { Field } from "./fields";
import { Portrait } from "./kids";
import { Say } from "./say";
import { Dialog, CloseX } from "./dialog";
import { PaintingWorkspace, type PaintingLayout } from "./painting";
import { IDEAS } from "./painting-ideas";
import { downloadPicture, pictureThumbnail, renderPicture } from "./painting-preview";
import {
    makePaintingRepository,
    loadPaintingRecovery,
    type PaintingRecovery,
    type PaintingGateway,
} from "./painting-repository";
import "./painting-gallery.css";

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

export function PaintingGallery(props: {
    gateway: PaintingGateway;
    storageKey: string;
    identityKey: string;
    /** Which arrangement the easel is laid out in; the gallery itself is the same in every one. */
    layout?: PaintingLayout;
    children: readonly Kid[];
}): JSX.Element {
    const [child, setChild] = createSignal("");
    const scope = () => ({ kid_id: child() || null });
    const [said, setSaid] = createSignal<{ text: string; tone: "success" | "error" }>();
    const [busy, setBusy] = createSignal(false);
    const [editor, setEditor] = createSignal<{
        document: Picture;
        revision: number;
        recovery?: PaintingRecovery;
        kid_id: string | null;
    }>();
    const [shelf, setShelf] = createSignal(false);
    const [preview, setPreview] = createSignal<{ document: Picture; artwork: ArtworkSummary }>();
    const [previewImage] = createResource(
        () => preview()?.document,
        async (document) => {
            try {
                return {
                    id: document.id,
                    url: (await renderPicture(document)).toDataURL("image/png"),
                };
            } catch {
                return null;
            }
        },
    );
    const [remove, setRemove] = createSignal<ArtworkSummary>();
    const [rename, setRename] = createSignal<{ document: Picture; artwork: ArtworkSummary }>();
    const [title, setTitle] = createSignal("");
    const [importing, setImporting] = createSignal(false);
    const [gallery, { refetch, mutate }] = createResource(child, async () => {
        const owner = scope();
        const [result, recovery] = await Promise.all([
            props.gateway.list(owner),
            loadPaintingRecovery(props.identityKey, owner).catch(() => []),
        ]);
        if ("error" in result)
            return {
                owner: owner.kid_id ?? "",
                artworks: [],
                recovery,
                next: null as string | null,
                error: "Your pictures could not be loaded. Try again when you are connected.",
            };
        return {
            owner: owner.kid_id ?? "",
            artworks: result.artworks,
            recovery,
            next: result.next,
            error: "",
        };
    });
    const saved = () => {
        if (shelf()) void refetch();
    };
    window.addEventListener("painting-saved", saved);
    onCleanup(() => window.removeEventListener("painting-saved", saved));
    const visible = () => (gallery()?.owner === child() ? gallery() : undefined);
    const ownerName = () => props.children.find((kid) => kid.id === child())?.name;
    /** The line under the name: what is happening, or what to do with the pictures under it. */
    const lead = (): string => {
        if (gallery.loading) return "Opening your pictures…";
        return visible()?.artworks.length ? "Open a picture to go on painting it." : "";
    };
    const fresh = (): Picture => ({
        version: 1,
        id: crypto.randomUUID(),
        title: "My painting",
        painting: {
            k: "painting",
            paper: "plain",
            w: innerWidth < 600 ? 20 : 30,
            h: innerWidth < 600 ? 30 : 20,
            marks: [],
        },
        activity: "draw",
        idea: "butterfly",
        fills: {},
        step: 0,
        guides: true,
    });
    const openEditor = (
        document: Picture,
        revision: number,
        recovery?: PaintingRecovery,
        kidId: string | null = child() || null,
    ) => {
        setEditor({ document, revision, recovery, kid_id: kidId });
        setShelf(false);
    };
    let actionScope = scope();
    const run = async (action: () => Promise<void>) => {
        if (busy()) return;
        actionScope = scope();
        setBusy(true);
        setSaid(undefined);
        try {
            await action();
        } catch {
            setSaid({
                text: "That did not save. Your picture is still here. Please try again.",
                tone: "error",
            });
        } finally {
            setBusy(false);
        }
    };
    const load = async (artwork: ArtworkSummary) => {
        const result = await props.gateway.load(artwork.id);
        if ("error" in result) throw new Error("load");
        return result;
    };
    const open = (artwork: ArtworkSummary) =>
        run(async () => {
            const result = await load(artwork);
            if (result.artwork.kid_id) setPreview(result);
            else
                openEditor(
                    result.document,
                    result.artwork.revision,
                    undefined,
                    result.artwork.kid_id,
                );
        });
    const save = async (document: Picture, revision: number) => {
        const thumbnail = await pictureThumbnail(document);
        const result = await props.gateway.save({
            scope: actionScope,
            document,
            expected_revision: revision,
            operation_id: crypto.randomUUID(),
            thumbnail,
        });
        if ("error" in result) throw new Error("save");
        await refetch();
        return result;
    };
    const Notice = (): JSX.Element => (
        <Show when={said()}>
            {(line) => (
                <Say
                    text={line().text}
                    tone={line().tone}
                    dismissible
                    onDismiss={() => setSaid(undefined)}
                />
            )}
        </Show>
    );
    /** Whose pictures, asked as the calendar asks it: a chip each, the child's own stamp beside their name. */
    const Chip = (chip: { who: string; name: string; kid?: Kid }): JSX.Element => (
        <button
            type="button"
            class="btn second pick"
            aria-pressed={child() === chip.who}
            aria-disabled={busy() ? true : undefined}
            onClick={() => {
                if (busy()) return;
                setChild(chip.who);
                setSaid(undefined);
            }}
        >
            <Show when={chip.kid}>{(kid) => <Portrait kid={kid()} kids={props.children} />}</Show>
            {chip.name}
        </button>
    );
    const legacy = (): Picture[] => {
        const read = (key: string): Record<string, unknown> => {
            try {
                const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
                return isRecord(value) ? value : {};
            } catch {
                return {};
            }
        };
        try {
            const data = read(props.storageKey);
            const wall: unknown[] = Array.isArray(data.wall) ? data.wall : [];
            const valid = (value: unknown): value is Picture =>
                isPicture(
                    value,
                    IDEAS.map((idea) => idea.id),
                );
            const pictures = [...wall, data.current].filter(valid);
            const recovered = Object.keys(localStorage)
                .filter((key) => key.startsWith(`${props.storageKey}.recovery.`))
                .slice(0, 10)
                .flatMap((key) => {
                    const current = read(key).current;
                    return valid(current)
                        ? [
                              {
                                  ...current,
                                  id: `recovery-${key.slice(-36)}`,
                                  title: `${current.title.slice(0, 55)} recovered`,
                              },
                          ]
                        : [];
                });
            return [
                ...new Map(pictures.map((picture) => [picture.id, picture])).values(),
                ...recovered,
            ].filter(
                (picture) =>
                    picture.painting.marks.length > 0 ||
                    Object.keys(picture.fills).length > 0 ||
                    picture.activity !== "draw",
            );
        } catch {
            return [];
        }
    };
    const [localPictures] = createSignal(legacy());
    const importPictures = () =>
        run(async () => {
            for (const picture of localPictures()) {
                const key = `${props.storageKey}.import.${actionScope.kid_id || "parent"}.${picture.id}`;
                const previous = localStorage.getItem(key);
                if (previous === "done") continue;
                const id = previous || crypto.randomUUID();
                localStorage.setItem(key, id);
                const found = await props.gateway.load(id);
                if ("error" in found) await save({ ...picture, id }, 0);
                localStorage.setItem(key, "done");
            }
            setImporting(false);
            setSaid({
                text: "Your device pictures are now in this gallery. The originals are still on this device.",
                tone: "success",
            });
        });
    onMount(async () => {
        const drafts = await loadPaintingRecovery(props.identityKey, scope()).catch(() => []);
        const latest = drafts.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
        if (latest) openEditor(latest.document, latest.revision, latest);
        else openEditor(fresh(), 0);
    });
    const morePictures = () =>
        run(async () => {
            const current = visible();
            if (!current?.next) return;
            const result = await props.gateway.list(scope(), current.next);
            if ("error" in result) throw new Error("list");
            if (current.owner !== child()) return;
            mutate({
                ...current,
                artworks: [...current.artworks, ...result.artworks],
                next: result.next,
            });
        });
    const watchMore = (element: HTMLButtonElement) => {
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) void morePictures();
        });
        observer.observe(element);
        onCleanup(() => observer.disconnect());
    };
    return (
        <>
            <Show when={shelf()}>
                <Dialog onClose={() => setShelf(false)}>
                    <section
                        class="postcard painting-gallery"
                        aria-label="Painting gallery"
                        onScroll={(event) => {
                            const node = event.currentTarget;
                            if (node.scrollHeight - node.scrollTop - node.clientHeight < 200)
                                void morePictures();
                        }}
                    >
                        <CloseX onClose={() => setShelf(false)} />
                        <header class="painting-gallery-head">
                            <div class="painting-gallery-headline">
                                <p class="kicker">Your family's paintings</p>
                                <h2 class="postcard-title">
                                    {ownerName() ? `${ownerName()}’s pictures` : "My pictures"}
                                </h2>
                                <output class="note">{lead()}</output>
                            </div>
                            <div class="painting-gallery-doing">
                                <Show when={props.children.length}>
                                    <fieldset class="painting-gallery-who">
                                        <legend class="sr">Whose pictures</legend>
                                        <Chip who="" name="My paintings" />
                                        <For each={props.children}>
                                            {(kid) => (
                                                <Chip who={kid.id} name={kid.name} kid={kid} />
                                            )}
                                        </For>
                                    </fieldset>
                                </Show>
                                <Button onClick={() => openEditor(fresh(), 0)}>New painting</Button>
                            </div>
                        </header>
                        <Notice />
                        <Show when={visible()?.error}>
                            {(text) => (
                                <Say
                                    tone="error"
                                    text={text()}
                                    action={{ label: "Try again", run: () => void refetch() }}
                                />
                            )}
                        </Show>
                        <Show when={!gallery.loading && visible() && !visible()?.artworks.length}>
                            <p class="note painting-gallery-empty">
                                No pictures here yet. Start a new painting and it will appear.
                            </p>
                        </Show>
                        <div class="painting-gallery-grid">
                            <For each={visible()?.artworks}>
                                {(artwork) => (
                                    <div class="painting-item">
                                        <button
                                            class="painting-picture"
                                            disabled={busy()}
                                            title={artwork.title}
                                            onClick={() => void open(artwork)}
                                        >
                                            <img
                                                src={artwork.thumbnail}
                                                alt={artwork.title}
                                                loading="lazy"
                                            />
                                        </button>
                                        <details class="painting-picture-menu">
                                            <summary aria-label={`Options for ${artwork.title}`}>
                                                •••
                                            </summary>
                                            <div>
                                                <button
                                                    disabled={busy()}
                                                    onClick={(event) => {
                                                        event.currentTarget
                                                            .closest("details")
                                                            ?.removeAttribute("open");
                                                        void run(async () => {
                                                            const item = await load(artwork);
                                                            setTitle(item.document.title);
                                                            setRename(item);
                                                        });
                                                    }}
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    disabled={busy()}
                                                    onClick={(event) => {
                                                        event.currentTarget
                                                            .closest("details")
                                                            ?.removeAttribute("open");
                                                        void run(async () => {
                                                            const item = await load(artwork);
                                                            await save(
                                                                {
                                                                    ...item.document,
                                                                    id: crypto.randomUUID(),
                                                                    title: `${item.document.title.slice(0, 60)} copy`,
                                                                },
                                                                0,
                                                            );
                                                        });
                                                    }}
                                                >
                                                    Make a copy
                                                </button>
                                                <button
                                                    disabled={busy()}
                                                    onClick={(event) => {
                                                        event.currentTarget
                                                            .closest("details")
                                                            ?.removeAttribute("open");
                                                        void run(async () => {
                                                            const item = await load(artwork);
                                                            await downloadPicture(item.document);
                                                        });
                                                    }}
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    disabled={busy()}
                                                    onClick={(event) => {
                                                        event.currentTarget
                                                            .closest("details")
                                                            ?.removeAttribute("open");
                                                        setRemove(artwork);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </For>
                        </div>
                        <Show when={visible()?.next}>
                            <button
                                type="button"
                                class="btn second"
                                aria-disabled={busy() ? true : undefined}
                                ref={watchMore}
                                onClick={() => void morePictures()}
                            >
                                More pictures
                            </button>
                        </Show>
                        <Show when={visible()?.recovery.length}>
                            <details class="painting-drafts">
                                <summary>Unfinished drafts on this device</summary>
                                <For each={visible()?.recovery}>
                                    {(entry) => (
                                        <button
                                            type="button"
                                            class="link"
                                            onClick={() =>
                                                openEditor(entry.document, entry.revision, entry)
                                            }
                                        >
                                            {entry.document.title} · Continue drawing
                                        </button>
                                    )}
                                </For>
                            </details>
                        </Show>
                        <Show when={localPictures().length}>
                            <button type="button" class="link" onClick={() => setImporting(true)}>
                                Bring in pictures saved on this device
                            </button>
                        </Show>
                    </section>
                </Dialog>
            </Show>
            <Show when={editor()} keyed>
                {(item) => (
                    <PaintingWorkspace
                        layout={props.layout ?? "now"}
                        pictures={visible()?.artworks.slice(0, 8)}
                        onOpenPicture={(artwork) => void open(artwork)}
                        storageKey={props.storageKey}
                        document={item.document}
                        repository={makePaintingRepository(
                            { kid_id: item.kid_id },
                            props.identityKey,
                            item.revision,
                            item.recovery,
                            props.gateway,
                        )}
                        onBack={() => {
                            setChild(item.kid_id ?? "");
                            setShelf(true);
                            void refetch();
                        }}
                        onNew={() => openEditor(fresh(), 0, undefined, item.kid_id)}
                    />
                )}
            </Show>
            <Show when={preview()}>
                {(item) => (
                    <Dialog onClose={() => setPreview(undefined)}>
                        <section class="postcard painting-gallery-dialog">
                            <CloseX onClose={() => setPreview(undefined)} />
                            <h2 class="painting-gallery-name">{item().document.title}</h2>
                            <img
                                src={
                                    previewImage()?.id === item().document.id
                                        ? previewImage()?.url
                                        : item().artwork.thumbnail
                                }
                                alt={item().document.title}
                            />
                            <div class="acts">
                                <Button
                                    onClick={() => {
                                        openEditor(
                                            item().document,
                                            item().artwork.revision,
                                            undefined,
                                            item().artwork.kid_id,
                                        );
                                        setPreview(undefined);
                                    }}
                                >
                                    Continue painting
                                </Button>
                                <Button
                                    second
                                    busy={busy()}
                                    onClick={() => void run(() => downloadPicture(item().document))}
                                >
                                    Download
                                </Button>
                            </div>
                        </section>
                    </Dialog>
                )}
            </Show>
            <Show when={rename()}>
                {(item) => (
                    <Dialog
                        onClose={() => {
                            if (!busy()) setRename(undefined);
                        }}
                    >
                        <form
                            class="postcard painting-gallery-dialog"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void run(async () => {
                                    const result = await save(
                                        {
                                            ...item().document,
                                            title: title().trim() || "My painting",
                                        },
                                        item().artwork.revision,
                                    );
                                    if (editor()?.document.id === item().document.id)
                                        setEditor({
                                            document: result.document,
                                            revision: result.artwork.revision,
                                            kid_id: result.artwork.kid_id,
                                        });
                                    setRename(undefined);
                                });
                            }}
                        >
                            <CloseX
                                onClose={() => {
                                    if (!busy()) setRename(undefined);
                                }}
                            />
                            <h2 class="painting-gallery-name">A name for your picture</h2>
                            <Notice />
                            <Field
                                label="Painting name"
                                name="title"
                                value={title()}
                                maxlength={70}
                                onInput={setTitle}
                            />
                            <div class="acts">
                                <Button submit busy={busy()}>
                                    Keep name
                                </Button>
                            </div>
                        </form>
                    </Dialog>
                )}
            </Show>
            <Show when={remove()}>
                {(item) => (
                    <Dialog
                        onClose={() => {
                            if (!busy()) setRemove(undefined);
                        }}
                    >
                        <section class="postcard painting-gallery-dialog">
                            <CloseX
                                onClose={() => {
                                    if (!busy()) setRemove(undefined);
                                }}
                            />
                            <h2 class="painting-gallery-name">Delete this picture?</h2>
                            <Notice />
                            <p>
                                {item().title} will be removed from this gallery. This cannot be
                                undone.
                            </p>
                            <div class="acts">
                                <Button second onClick={() => setRemove(undefined)}>
                                    Keep picture
                                </Button>
                                <Button
                                    busy={busy()}
                                    onClick={() =>
                                        void run(async () => {
                                            const result = await props.gateway.remove(
                                                item().id,
                                                item().revision,
                                            );
                                            if ("error" in result) throw new Error("delete");
                                            if (editor()?.document.id === item().id)
                                                setEditor({
                                                    document: fresh(),
                                                    revision: 0,
                                                    kid_id: item().kid_id,
                                                });
                                            setRemove(undefined);
                                            await refetch();
                                        })
                                    }
                                >
                                    Delete picture
                                </Button>
                            </div>
                        </section>
                    </Dialog>
                )}
            </Show>
            <Show when={importing()}>
                <Dialog onClose={() => setImporting(false)}>
                    <section class="postcard painting-gallery-dialog">
                        <CloseX onClose={() => setImporting(false)} />
                        <h2 class="painting-gallery-name">Bring your pictures along</h2>
                        <Notice />
                        <p>
                            Import {localPictures().length} pictures into{" "}
                            {ownerName() ? `${ownerName()}’s gallery` : "My paintings"}? Your device
                            originals will stay here too.
                        </p>
                        <div class="acts">
                            <Button busy={busy()} onClick={() => void importPictures()}>
                                Import pictures
                            </Button>
                            <Button second onClick={() => setImporting(false)}>
                                Not now
                            </Button>
                        </div>
                    </section>
                </Dialog>
            </Show>
        </>
    );
}
