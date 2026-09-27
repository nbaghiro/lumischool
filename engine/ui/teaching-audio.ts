import { voice } from "./voice";
/** One owner for narration. Changing the step or leaving cancels both network and playback. */
export function teachingAudio(): {
    stop(): void;
    read(
        text: string,
        mode: "off" | "device" | "gemini",
        slow: boolean,
        source?: (signal: AbortSignal) => Promise<Blob | null>,
    ): Promise<void>;
} {
    let controller: AbortController | null = null;
    let player: HTMLAudioElement | null = null;
    let url: string | null = null;
    const stop = () => {
        controller?.abort();
        controller = null;
        player?.pause();
        player = null;
        if (url) URL.revokeObjectURL(url);
        url = null;
        voice().stop();
    };
    return {
        stop,
        async read(text, mode, slow, source) {
            stop();
            if (mode === "off") return;
            const request = new AbortController();
            controller = request;
            voice().touched();
            if (mode === "gemini" && source) {
                try {
                    const blob = await source(request.signal);
                    if (request.signal.aborted) return;
                    if (blob) {
                        url = URL.createObjectURL(blob);
                        player = new Audio(url);
                        player.playbackRate = slow ? 0.85 : 1;
                        await player.play();
                        return;
                    }
                } catch {
                    if (request.signal.aborted) return;
                }
            }
            voice().speak(text, slow ? 0.75 : 0.9);
        },
    };
}
