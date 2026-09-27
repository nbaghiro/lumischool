import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeVoice, RATE, type Synth, type Utter } from "../voice";

/** A line the fake can end, since the browser's end handler takes an event a test has no way to make. */
interface Heard extends Utter {
    onend: (() => unknown) | null;
}

/** A synthesiser that records what it was asked to say, and ends a line when told to. */
function fake(): { synth: Synth<Heard>; said: Heard[]; cancels: number; end: () => void } {
    const said: Heard[] = [];
    const s = {
        cancels: 0,
        synth: {
            speak: (u: Heard) => {
                said.push(u);
            },
            cancel: () => {
                s.cancels += 1;
            },
        },
        said,
        end: () => said.at(-1)?.onend?.(),
    };
    return s;
}

const utter = (text: string): Heard => ({ text, rate: 1, onend: null, onerror: null });

describe("the device's voice", () => {
    it("reads nothing until the page has been touched, and then reads the line at a child's pace", () => {
        const f = fake();
        const v = makeVoice({ synth: () => f.synth, utter });
        assert.equal(v.available(), true);
        assert.equal(v.speak("Count the empty squares."), false);
        assert.equal(f.said.length, 0);
        v.touched();
        assert.equal(v.speak("Count the empty squares."), true);
        assert.equal(f.said[0]?.text, "Count the empty squares.");
        assert.equal(f.said[0]?.rate, RATE);
        assert.equal(v.speaking(), true);
        f.end();
        assert.equal(v.speaking(), false);
    });

    it("ends the line still being read before it starts another, and says so to whoever listens", () => {
        const f = fake();
        const v = makeVoice({ synth: () => f.synth, utter });
        v.touched();
        const heard: boolean[] = [];
        const off = v.onChange((s) => heard.push(s));
        v.speak("One.");
        v.speak("Two.");
        assert.equal(f.cancels, 2);
        assert.equal(f.said.length, 2);
        // still speaking across the change of line: one start, no stop between
        assert.deepEqual(heard, [true]);
        v.stop();
        assert.deepEqual(heard, [true, false]);
        off();
        v.speak("Three.");
        assert.deepEqual(heard, [true, false]);
    });

    it("is not available, and reads nothing, on a device with no synthesiser", () => {
        const v = makeVoice({ synth: () => null, utter });
        v.touched();
        assert.equal(v.available(), false);
        assert.equal(v.speak("Anything."), false);
        assert.equal(v.speaking(), false);
    });

    it("reads no empty line", () => {
        const f = fake();
        const v = makeVoice({ synth: () => f.synth, utter });
        v.touched();
        assert.equal(v.speak("   "), false);
        assert.equal(f.said.length, 0);
    });
});
