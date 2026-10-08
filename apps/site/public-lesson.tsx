// The same sheet and level choices as Explore, fed only the three published sample lessons.
import { createSignal, onCleanup, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { LEVELS, readLesson, type Level, type PackLesson } from "../../engine/pack";
import { LessonSheet } from "../../engine/ui/lesson";
import { scenes, scenesIn, type SceneDrawer } from "../../engine/ui/scene";
import { Seg } from "../../engine/ui/fields";
import { matches } from "../../engine/ui/viewport";
import { LEVEL_WORDS } from "../../school/public";
import { subjectFacts } from "../../school/tracks";

function SampleSheet(props: { lesson: PackLesson; draw: SceneDrawer }): JSX.Element {
    const [level, setLevel] = createSignal<Level>("medium");
    const [key, setKey] = createSignal(false);
    const narrow = matches("(max-width: 700px)");
    const [width, setWidth] = createSignal(Math.min(innerWidth - 32, 820));
    const resized = (): void => {
        setWidth(Math.min(innerWidth - 32, 820));
    };
    addEventListener("resize", resized);
    onCleanup(() => removeEventListener("resize", resized));
    const levels = LEVELS.filter((l) => props.lesson.levels[l] !== undefined);
    return (
        <>
            <div class="public-lesson-tools">
                <Seg
                    legend="The level"
                    name="sample-level"
                    options={levels.map((value) => ({ value, label: LEVEL_WORDS[value] }))}
                    value={level()}
                    onChange={setLevel}
                />
                <label class="public-key">
                    <input
                        type="checkbox"
                        checked={key()}
                        onChange={(e) => setKey(e.currentTarget.checked)}
                    />{" "}
                    Answers and parent notes
                </label>
                <button class="btn second" onClick={() => window.print()}>
                    Print this lesson
                </button>
            </div>
            <div class="public-sheet" data-level={level()}>
                <LessonSheet
                    lesson={props.lesson}
                    level={level()}
                    strip={{ label: subjectFacts(props.lesson.subject).title, date: null }}
                    width={width()}
                    narrow={narrow()}
                    limits={{ sheets: "look", key: key() }}
                    draw={props.draw}
                />
            </div>
        </>
    );
}

export async function openLesson(host: HTMLElement, url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("The sample lesson is unavailable");
    const read = readLesson(await response.json());
    if (!read.ok) throw new Error("The sample lesson could not be read");
    const draw = await scenes(scenesIn(read.lesson));
    render(() => <SampleSheet lesson={read.lesson} draw={draw} />, host);
    host.classList.add("public-lesson-ready");
}
