import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Sharing from "expo-sharing";
import * as Speech from "expo-speech";
import { setPlaying } from "./chrome";
import type { Paper, Start, ToApp } from "../../engine/host";

/** The script a hosted page runs before its own, so it starts in host mode (.docs/mobile.md). */
export function beforeLoad(start: Start, kidCredential: string | null): string {
    const kid =
        kidCredential === null
            ? ""
            : `try{sessionStorage.setItem("lumischool-kid-session",${JSON.stringify(kidCredential)})}catch(e){}`;
    return `window.lumischoolHost=${JSON.stringify(start)};${kid}true;`;
}

/** The script that hands a message to the page, which its side of engine/host.ts reads. */
export const receive = (text: string): string =>
    `window.lumischool&&window.lumischool.receive(${JSON.stringify(text)});true;`;

const FEEL: Record<ToApp["told"]["feel"], () => Promise<void>> = {
    right: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    again: () => Haptics.selectionAsync(),
    done: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

export function feel(told: ToApp["told"]): void {
    FEEL[told.feel]().catch(() => undefined);
}

export function speak(s: ToApp["speak"]): void {
    Speech.stop().catch(() => undefined);
    Speech.speak(s.text, { rate: s.rate });
}

export function hush(): void {
    Speech.stop().catch(() => undefined);
}

/** A sheet's size in points, which expo-print takes as its page size. */
const PAGE: Record<Paper, { width: number; height: number }> = {
    a4: { width: 595, height: 842 },
    letter: { width: 612, height: 792 },
};

/** Prints a sheet the page laid out, and says whether it went to a printer. */
export async function print(p: ToApp["print"]): Promise<boolean> {
    try {
        await Print.printAsync({ html: p.html, ...PAGE[p.paper] });
        return true;
    } catch {
        return false;
    }
}

const PNG = "data:image/png;base64,";

/** Hands a picture to the share sheet, since a web view has no download. */
export async function share(s: ToApp["share"]): Promise<void> {
    const base = s.name.replace(/\.png$/i, "").replace(/[^\w-]+/g, "-") || "picture";
    const file = new File(Paths.cache, `${base}.png`);
    try {
        if (file.exists) file.delete();
        file.create();
        file.write(s.png.slice(PNG.length), { encoding: "base64" });
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri, { mimeType: "image/png", UTI: "public.png" });
        }
    } catch {
        // the share sheet was closed or the file could not be written; the painting is still saved
    }
}

const { OrientationLock } = ScreenOrientation;

/** How a game may be held: a game with `hint` turns to landscape, and the app is portrait otherwise. */
export function hold(playing: ToApp["playing"]): void {
    setPlaying(playing.portrait !== null);
    const lock =
        playing.portrait === "hint"
            ? ScreenOrientation.lockAsync(OrientationLock.LANDSCAPE)
            : playing.portrait === null
              ? ScreenOrientation.lockAsync(OrientationLock.PORTRAIT_UP)
              : ScreenOrientation.unlockAsync();
    lock.catch(() => undefined);
}
