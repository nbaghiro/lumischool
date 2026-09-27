// Plays a game's kit through Web Audio: each cue's layers as oscillators or filtered noise, panned,
// under a limit on voices, and the hums as loops that follow the level a game asks for.
import type { Cue } from "../motion/cues";
import {
    admit,
    HUMS,
    lengthOf,
    voice,
    type Hum,
    type Kit,
    type Played,
    type Sounding,
} from "../sound/kit";

export interface GameSound {
    hear(
        kit: Kit | undefined,
        cue: Cue,
        how?: { strength?: number; pitch?: number; pan?: number },
    ): void;
    /** The hums that should sound now; one left out fades away. */
    hum(hums: readonly Hum[]): void;
    /** Silences everything, for a pause, sound off or leaving the game. */
    hush(): void;
}

/** Seconds a hum takes to follow a new level, so an engine does not click as it speeds up. */
const FOLLOW = 0.25;

export function gameSound(ctx: () => AudioContext | undefined): GameSound {
    let sounding: Sounding[] = [];
    let noise: AudioBuffer | undefined;
    const loops = new Map<Hum["kind"], { gain: GainNode; stop(): void; tune(p: number): void }>();

    const noiseOf = (audio: AudioContext): AudioBuffer => {
        if (noise) return noise;
        const b = audio.createBuffer(1, audio.sampleRate, audio.sampleRate),
            d = b.getChannelData(0);
        let seed = 1;
        for (let i = 0; i < d.length; i++) {
            seed = (seed * 16807) % 2147483647;
            d[i] = (seed / 2147483647) * 2 - 1;
        }
        noise = b;
        return b;
    };

    const play = (audio: AudioContext, l: Played): void => {
        const t0 = audio.currentTime + l.delay,
            end = t0 + l.attack + l.decay;
        const gain = audio.createGain(),
            pan = audio.createStereoPanner();
        pan.pan.value = l.pan;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(
            Math.max(0.0002, 0.12 * l.gain),
            t0 + l.attack + 0.001,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        gain.connect(pan).connect(audio.destination);
        let source: AudioScheduledSourceNode;
        if (l.wave === "noise") {
            const n = audio.createBufferSource(),
                filter = audio.createBiquadFilter();
            n.buffer = noiseOf(audio);
            filter.type = "bandpass";
            filter.frequency.value = l.hz;
            filter.Q.value = 0.8;
            n.connect(filter).connect(gain);
            source = n;
        } else {
            const o = audio.createOscillator();
            o.type = l.wave;
            o.frequency.setValueAtTime(l.hz, t0);
            if (l.to !== undefined) o.frequency.exponentialRampToValueAtTime(l.to, end);
            o.connect(gain);
            source = o;
        }
        source.start(t0);
        source.stop(end + 0.02);
        source.onended = () => {
            source.disconnect();
            gain.disconnect();
            pan.disconnect();
        };
    };

    const loop = (audio: AudioContext, kind: Hum["kind"]) => {
        const recipe = HUMS[kind],
            gain = audio.createGain(),
            sway = audio.createOscillator(),
            depth = audio.createGain();
        gain.gain.value = 0;
        gain.connect(audio.destination);
        sway.frequency.value = recipe.sway;
        depth.gain.value = recipe.wave === "noise" ? recipe.hz * 0.3 : recipe.hz * 0.04;
        sway.connect(depth);
        let source: AudioScheduledSourceNode, tuned: AudioParam;
        if (recipe.wave === "noise") {
            const n = audio.createBufferSource(),
                filter = audio.createBiquadFilter();
            n.buffer = noiseOf(audio);
            n.loop = true;
            filter.type = "lowpass";
            filter.frequency.value = recipe.hz;
            depth.connect(filter.frequency);
            n.connect(filter).connect(gain);
            source = n;
            tuned = filter.frequency;
        } else {
            const o = audio.createOscillator();
            o.type = recipe.wave;
            o.frequency.value = recipe.hz;
            depth.connect(o.frequency);
            o.connect(gain);
            source = o;
            tuned = o.frequency;
        }
        source.start();
        sway.start();
        return {
            gain,
            tune: (p: number) => tuned.setTargetAtTime(recipe.hz * p, audio.currentTime, FOLLOW),
            stop: () => {
                source.stop();
                sway.stop();
                source.disconnect();
                sway.disconnect();
                depth.disconnect();
                gain.disconnect();
            },
        };
    };

    return {
        hear(kit, cue, how = {}) {
            const audio = ctx();
            if (!audio) return;
            const now = audio.currentTime,
                strength = how.strength ?? 0.6;
            if (!admit(sounding, cue, strength, now)) return;
            const layers = voice(kit, cue, how);
            sounding = [
                ...sounding.filter((v) => v.until > now),
                { cue, from: now, until: now + lengthOf(layers), strength },
            ];
            for (const l of layers) play(audio, l);
        },
        hum(hums) {
            const audio = ctx();
            if (!audio) return;
            for (const h of hums) {
                let l = loops.get(h.kind);
                if (!l) {
                    l = loop(audio, h.kind);
                    loops.set(h.kind, l);
                }
                const level = Math.max(0, Math.min(1, h.level)) * HUMS[h.kind].gain;
                l.gain.gain.setTargetAtTime(level, audio.currentTime, FOLLOW);
                l.tune(h.pitch ?? 1);
            }
            for (const [kind, l] of loops)
                if (!hums.some((h) => h.kind === kind))
                    l.gain.gain.setTargetAtTime(0, audio.currentTime, FOLLOW);
        },
        hush() {
            for (const l of loops.values()) l.stop();
            loops.clear();
            sounding = [];
        },
    };
}
