// Public reading pages use the visitor catalogue only, never a family's lessons or answers.
import { For, Show, type JSX } from "solid-js";
import type { PackLesson } from "../../engine/pack";
import { gradeName } from "../../engine/grade";
import { SITE } from "../../engine/ui/snapshots/site";
import { publicPage } from "../../school/public";
import { Bar, Footer } from "./page";

/** Crawlable text is read from the same compiled lesson as the illustrated sheet. */
function Practice(props: { lesson: PackLesson; sampleUrl: string }): JSX.Element {
    const l = props.lesson;
    return (
        <div class="public-lesson-area" id="lesson">
            <div data-public-lesson data-lesson-url={props.sampleUrl} />
            <article class="public-lesson-fallback">
                <p class="kicker">{gradeName(l.grade)} · Maths · As written</p>
                <h2>{l.title}</h2>
                <p>{l.goal}</p>
                <p class="note">
                    The illustrated lesson loads here when JavaScript is available. You can also
                    read the lesson below.
                </p>
                <For each={l.levels.medium.sections}>
                    {(section) => (
                        <section>
                            <h3>
                                {section.type === "look" || section.type === "example"
                                    ? "Look together"
                                    : section.type === "do" || section.type === "exercises"
                                      ? "Your turn"
                                      : section.type === "try"
                                        ? "Try a little more"
                                        : section.type.charAt(0).toUpperCase() +
                                          section.type.slice(1)}
                            </h3>
                            <For each={section.blocks}>
                                {(block) =>
                                    block.k === "say" ? (
                                        <p>{block.text}</p>
                                    ) : block.k === "ask" ? (
                                        <For each={block.questions}>{(q) => <p>{q.ask}</p>}</For>
                                    ) : null
                                }
                            </For>
                        </section>
                    )}
                </For>
                <details class="public-answers">
                    <summary>For grown-ups</summary>
                    <For each={l.levels.medium.grownUps}>{(text) => <p>{text}</p>}</For>
                </details>
            </article>
            <p class="public-next">
                <a class="btn second" href="/home#/map">
                    Explore the sample map
                </a>{" "}
                <a class="btn" href={`/explore/${l.id}`}>
                    Open in your family's lessons
                </a>
            </p>
        </div>
    );
}

export function Written(props: {
    path: string;
    sample?: PackLesson;
    sampleUrl?: string;
}): JSX.Element {
    const page = publicPage(props.path);
    if (!page) return null;
    const lesson = props.sample;
    const parent = publicPage(page.parent ?? "/");
    return (
        <>
            <a class="site-skip" href="#main">
                Skip to the main content
            </a>
            <div class="public-bar" data-public-bar>
                <Bar written />
            </div>
            <main id="main" class="public-written" classList={{ "public-practice": !!lesson }}>
                <section class="public-hero">
                    <div class="site-wrap public-hero-in">
                        <div class="public-introduction">
                            <nav class="public-breadcrumbs" aria-label="Breadcrumb">
                                <a href="/home">Home</a>
                                <Show when={parent && parent.path !== "/"}>
                                    <span> / </span>
                                    <a href={parent?.path}>{parent?.title}</a>
                                </Show>
                                <span> / </span>
                                <span aria-current="page">
                                    {lesson ? "A sample lesson" : "Explore"}
                                </span>
                            </nav>
                            <p class="kicker">
                                {lesson
                                    ? `${gradeName(lesson.grade)} · A lesson to try`
                                    : "For families teaching at home"}
                            </p>
                            <h1>{lesson?.title ?? page.title}</h1>
                            <p class="lead">
                                {lesson?.goal ??
                                    "Follow a curiosity, revisit an idea, or find their next step. The same lessons, on screen and on paper."}
                            </p>
                            <p class="public-hero-note">
                                {lesson
                                    ? "Read together · Choose a level · Print for later"
                                    : "For ages 5 to 12 · On screen and on paper"}
                            </p>
                        </div>
                        <Show when={!lesson}>
                            <figure class="public-map-note">
                                <img
                                    src={SITE[0]?.src}
                                    alt="The garden on Lumischool's illustrated learning map"
                                />
                                <figcaption>Small discoveries. A world that grows.</figcaption>
                            </figure>
                        </Show>
                    </div>
                </section>
                <div class="site-wrap public-content" id="public-content">
                    <Show when={lesson}>
                        {(l) => <Practice lesson={l()} sampleUrl={props.sampleUrl ?? ""} />}
                    </Show>
                    <Show when={props.path === "/how-it-works"}>
                        <p class="site-legal-lead">
                            Choose a lesson, work through it together, and build a routine that fits
                            your family.
                        </p>
                        <section>
                            <h2>1. Look through the public lessons</h2>
                            <p>
                                The sample map and selected practice pages can be explored without
                                an account. Try{" "}
                                <a href="/learn/math/counting-to-five">counting to five</a> or{" "}
                                <a href="/learn/math/rounding-to-nearest-hundred">
                                    rounding to the nearest hundred
                                </a>{" "}
                                to see the kind of explanation and parent guidance you can use.
                            </p>
                        </section>
                        <section>
                            <h2>2. Start a family</h2>
                            <p>
                                A grown-up signs in with an email code and sets up the family. From
                                the grown-up view, choose lessons and open a child's view. Children
                                do not need an email address.
                            </p>
                        </section>
                        <section>
                            <h2>3. Work online or on paper</h2>
                            <p>
                                Online lessons combine written explanations, drawings and questions.
                                The grown-up can also print a day's work. Read early questions
                                aloud, use real objects when useful, and let the child's explanation
                                guide your pace.
                            </p>
                        </section>
                        <section>
                            <h2>4. Use the map to see the journey</h2>
                            <p>
                                The map places lessons in illustrated worlds. Work in a subject
                                helps bring parts of its world to life. A grown-up can choose the
                                world's guide and weather. There are no streaks or timers pushing
                                the child to hurry.
                            </p>
                            <a href="/home#/map">Explore the sample child's map</a>
                        </section>
                        <section>
                            <h2>5. Review and adjust</h2>
                            <p>
                                Use the grown-up screens to review the child's work and plan the
                                next lessons. Revisit skills that need more practice. The catalogue
                                includes more than maths, but coverage varies: inspect the{" "}
                                <a href="/home#subjects">subjects we teach</a> when planning.
                            </p>
                        </section>
                        <section>
                            <h2>Questions about access</h2>
                            <p>
                                Contact{" "}
                                <a href="mailto:support@lumischool.ai">support@lumischool.ai</a> for
                                help with getting started or questions about access. Read the{" "}
                                <a href="/privacy">privacy policy</a> before creating a family.
                            </p>
                        </section>
                    </Show>
                    <Show when={props.path === "/about"}>
                        <p class="site-legal-lead">
                            Lumischool is a lesson platform for children aged 5 to 12 and the
                            grown-ups who teach them at home.
                        </p>
                        <section>
                            <h2>One lesson, online or in print</h2>
                            <p>
                                The lessons use a consistent hand-drawn style on squared paper.
                                Worked examples introduce an idea; practice lets children try it;
                                guidance helps the grown-up notice mistakes and explain the next
                                step. Families can use the lessons alongside their own books and
                                activities.
                            </p>
                        </section>
                        <section>
                            <h2>How questions are checked</h2>
                            <p>
                                Lessons are written as structured content. Before publication,
                                automated checks work through the values a generated question can
                                take and verify its answer rules. This helps catch inconsistent
                                questions and answers. Automated checks do not establish educational
                                effectiveness or replace a grown-up's judgment about whether a
                                lesson suits a child.
                            </p>
                        </section>
                        <section>
                            <h2>See the work for yourself</h2>
                            <p>
                                The <a href="/home#subjects">subjects section</a> is made from the
                                current lesson catalogue. The public samples include answers and
                                parent notes, so you can inspect the teaching before opening an
                                account. Subject coverage varies and is not a claim of
                                accreditation.
                            </p>
                        </section>
                        <section>
                            <h2>A family space</h2>
                            <p>
                                Grown-ups manage family access and children's views. The site does
                                not use analytics or advertising trackers. The{" "}
                                <a href="/privacy">privacy policy</a> explains the account data
                                needed to provide the service and how it can be deleted.
                            </p>
                        </section>
                        <section>
                            <h2>Contact Lumischool</h2>
                            <p>
                                Send support questions or a lesson correction to{" "}
                                <a href="mailto:support@lumischool.ai">support@lumischool.ai</a>.
                                Include the lesson title and the question you want us to look at.
                                Never send sign-in codes.
                            </p>
                        </section>
                    </Show>
                </div>
            </main>
            <Footer />
        </>
    );
}
