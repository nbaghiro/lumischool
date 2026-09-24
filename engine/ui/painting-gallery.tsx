import { createResource, createSignal, onCleanup, For, Show, type JSX } from "solid-js";
import type { Picture } from "../painting";
import { isPicture } from "../painting";
import type { ArtworkSummary } from "../../server/api";
import { Select } from "./select";
import { Dialog, CloseX } from "./dialog";
import { PaintingWorkspace } from "./painting";
import { IDEAS } from "./painting-ideas";
import { downloadPicture, pictureThumbnail, renderPicture } from "./painting-preview";
import {
    makePaintingRepository,
    loadPaintingRecovery,
    type PaintingRecovery,
    type PaintingGateway,
} from "./painting-repository";
import "./painting-gallery.css";

export function PaintingGallery(props: {
    gateway: PaintingGateway;
    storageKey: string;
    identityKey: string;
    children: readonly { id: string; name: string }[];
}): JSX.Element {
    const [child, setChild] = createSignal("");
    const scope = () => ({ kid_id: child() || null });
    const [message, setMessage] = createSignal("");
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
        setMessage("");
        try {
            await action();
        } catch {
            setMessage("That did not save. Your picture is still here. Please try again.");
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
        <Show when={message()}>
            <p role="alert">{message()}</p>
        </Show>
    );
    const legacy = (): Picture[] => {
        const read = (key: string): Record<string, unknown> => {
            try {
                const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
                return value && typeof value === "object" && !Array.isArray(value)
                    ? (value as Record<string, unknown>)
                    : {};
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
            setMessage(
                "Your device pictures are now in this gallery. The originals are still on this device.",
            );
        });
    openEditor(fresh(), 0);
    return (
        <>
            <Show when={shelf()}>
                <Dialog onClose={() => setShelf(false)}>
                    <section class="postcard painting-gallery" aria-label="Painting gallery">
                        <CloseX onClose={() => setShelf(false)} />
                        <header class="painting-gallery-heading">
                            <div>
                                <p class="eyebrow">A little room to make</p>
                                <h1>{ownerName() ? `${ownerName()}’s pictures` : "My pictures"}</h1>
                            </div>
                            <label>
                                Whose pictures
                                <Select
                                    value={child()}
                                    disabled={busy()}
                                    onChange={(event) => {
                                        setChild(event.currentTarget.value);
                                        setMessage("");
                                    }}
                                >
                                    <option value="">My paintings</option>
                                    <For each={props.children}>
                                        {(kid) => <option value={kid.id}>{kid.name}</option>}
                                    </For>
                                </Select>
                            </label>
                        </header>
                        <p class="painting-gallery-note">
                            A fresh idea, or a picture to come back to.
                        </p>
                        <Show when={message()}>
                            <output class="painting-gallery-notice">{message()}</output>
                        </Show>
                        <Show when={gallery.loading}>
                            <output>Opening your pictures…</output>
                        </Show>
                        <Show when={visible()?.error}>
                            <p role="alert" class="painting-gallery-notice">
                                {visible()?.error}{" "}
                                <button onClick={() => void refetch()}>Try again</button>
                            </p>
                        </Show>
                        <div class="painting-gallery-grid">
                            <button class="painting-new" onClick={() => openEditor(fresh(), 0)}>
                                <span aria-hidden="true">＋</span>
                                <strong>New painting</strong>
                            </button>
                            <For each={visible()?.recovery}>
                                {(entry) => (
                                    <button
                                        class="painting-recovery"
                                        onClick={() =>
                                            openEditor(entry.document, entry.revision, entry)
                                        }
                                    >
                                        <strong>{entry.document.title}</strong>
                                        <span>Saved on this device</span>
                                        <span>Continue painting</span>
                                    </button>
                                )}
                            </For>
                            <For
                                each={visible()?.artworks.filter(
                                    (artwork) =>
                                        !visible()?.recovery.some(
                                            (entry) => entry.document.id === artwork.id,
                                        ),
                                )}
                            >
                                {(artwork) => (
                                    <article class="painting-gallery-card">
                                        <button
                                            class="painting-picture"
                                            disabled={busy()}
                                            onClick={() => void open(artwork)}
                                        >
                                            <img
                                                src={artwork.thumbnail}
                                                alt={artwork.title}
                                                loading="lazy"
                                            />
                                            <strong>{artwork.title}</strong>
                                            <small>
                                                Edited{" "}
                                                {new Date(artwork.updated_at).toLocaleDateString(
                                                    undefined,
                                                    { month: "short", day: "numeric" },
                                                )}
                                            </small>
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
                                    </article>
                                )}
                            </For>
                        </div>
                        <Show when={visible()?.next}>
                            <button
                                disabled={busy()}
                                class="painting-import"
                                onClick={() =>
                                    void run(async () => {
                                        const current = visible();
                                        if (!current?.next) return;
                                        const result = await props.gateway.list(
                                            scope(),
                                            current.next,
                                        );
                                        if ("error" in result) throw new Error("list");
                                        mutate({
                                            ...current,
                                            artworks: [...current.artworks, ...result.artworks],
                                            next: result.next,
                                        });
                                    })
                                }
                            >
                                More pictures
                            </button>
                        </Show>
                        <Show when={localPictures().length}>
                            <button class="painting-import" onClick={() => setImporting(true)}>
                                Bring in pictures saved on this device
                            </button>
                        </Show>
                    </section>
                </Dialog>
            </Show>
            <Show when={editor()} keyed>
                {(item) => (
                    <PaintingWorkspace
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
                    />
                )}
            </Show>
            <Show when={preview()}>
                {(item) => (
                    <Dialog onClose={() => setPreview(undefined)}>
                        <section class="postcard painting-gallery-dialog">
                            <CloseX onClose={() => setPreview(undefined)} />
                            <h2>{item().document.title}</h2>
                            <img
                                src={
                                    previewImage()?.id === item().document.id
                                        ? previewImage()?.url
                                        : item().artwork.thumbnail
                                }
                                alt={item().document.title}
                            />
                            <div class="painting-gallery-actions">
                                <button
                                    class="primary"
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
                                </button>
                                <button
                                    onClick={() => void run(() => downloadPicture(item().document))}
                                >
                                    Download
                                </button>
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
                            <h2>A name for your picture</h2>
                            <Notice />
                            <label>
                                Painting name
                                <input
                                    value={title()}
                                    maxLength={70}
                                    onInput={(event) => setTitle(event.currentTarget.value)}
                                />
                            </label>
                            <button type="submit" disabled={busy()}>
                                Keep name
                            </button>
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
                            <h2>Delete this picture?</h2>
                            <Notice />
                            <p>
                                {item().title} will be removed from this gallery. This cannot be
                                undone.
                            </p>
                            <div class="painting-gallery-actions">
                                <button onClick={() => setRemove(undefined)}>Keep picture</button>
                                <button
                                    disabled={busy()}
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
                                </button>
                            </div>
                        </section>
                    </Dialog>
                )}
            </Show>
            <Show when={importing()}>
                <Dialog onClose={() => setImporting(false)}>
                    <section class="postcard painting-gallery-dialog">
                        <CloseX onClose={() => setImporting(false)} />
                        <h2>Bring your pictures along</h2>
                        <Notice />
                        <p>
                            Import {localPictures().length} pictures into{" "}
                            {ownerName() ? `${ownerName()}’s gallery` : "My paintings"}? Your device
                            originals will stay here too.
                        </p>
                        <div class="painting-gallery-actions">
                            <button disabled={busy()} onClick={() => void importPictures()}>
                                Import pictures
                            </button>
                            <button onClick={() => setImporting(false)}>Not now</button>
                        </div>
                    </section>
                </Dialog>
            </Show>
        </>
    );
}
