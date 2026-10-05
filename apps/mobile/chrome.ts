import { useSyncExternalStore } from "react";

let playing = false;
const listeners = new Set<() => void>();

/** Whether a game is on screen, when the bar and the tabs step aside so the game has the whole phone. */
export function setPlaying(on: boolean): void {
    if (on === playing) return;
    playing = on;
    for (const l of listeners) l();
}

export function usePlaying(): boolean {
    return useSyncExternalStore(
        (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        () => playing,
    );
}

let drawn = false;
const drawnListeners = new Set<() => void>();

/** Whether the first page since the app opened is drawn, which lets the opening splash go. */
export function firstPageDrawn(): void {
    if (drawn) return;
    drawn = true;
    for (const l of drawnListeners) l();
}

export function useFirstPageDrawn(): boolean {
    return useSyncExternalStore(
        (l) => {
            drawnListeners.add(l);
            return () => drawnListeners.delete(l);
        },
        () => drawn,
    );
}
