// The site's written pages: privacy, terms, support and account deletion, which the app stores link
// to by address. A lawyer reviews the privacy and terms text before the apps are submitted
// (.docs/mobile.md, "Store submission").

import "./legal.css";
import { isServer } from "solid-js/web";
import { For, type JSX } from "solid-js";
import { Mark } from "../../engine/ui/mark";
import { Footer } from "./page";

// TODO: the operating company's legal name and postal address, which the owner has still to give.
const OPERATOR = "lumischool";
const CONTACT = "support@lumischool.ai";
const UPDATED = "5 October 2026";

/** A page's sections, each a heading and its paragraphs; a paragraph that is a list is an array. */
interface Written {
    title: string;
    lead: string;
    sections: { heading: string; body: (string | string[])[] }[];
}

/** By path, in step with `SITE_PAGES` in server/pages.ts and the paths main.tsx draws this page for. */
const LEGAL: Record<string, Written> = {
    "/privacy": {
        title: "Privacy",
        lead: `This page says what ${OPERATOR} keeps about a family, why, who else handles it, and how to get a copy of it or delete it. It covers the website at lumischool.ai and the iPhone, iPad and Android apps, which show the same pages and use the same account.`,
        sections: [
            {
                heading: "Who we are",
                body: [
                    `The service is run by ${OPERATOR}. Questions about this page, and every request it describes, go to ${CONTACT}.`,
                ],
            },
            {
                heading: "What we keep",
                body: [
                    "For each grown-up who signs in:",
                    [
                        "the email address used to sign in, and the name they give, if any;",
                        "the families they belong to and their role in each;",
                        "the sessions their browsers and devices hold, so a signed-in device stays signed in;",
                        "their choices about weekly letters.",
                    ],
                    "For each child a parent adds, only what the add-a-child form asks for: the name the family calls them, which can be a nickname, and the grade their year is drawn for. We do not ask for a surname, a birth date, a school, a photograph or a gender.",
                    "While a child uses a children's view that a parent opened, we keep a record of their work: the answers they give, the drawings and marks a question asks for, the hints they open, the games they play, their paintings, and how long each question was on screen. Progress, rewards and plans are worked out from that record and not stored apart from it.",
                    "We keep the parent's consent to that record, with the version of the notice they agreed to and when.",
                ],
            },
            {
                heading: "What we do not do",
                body: [
                    [
                        "We do not show advertising, and we do not sell or rent any data.",
                        "We do not use analytics, advertising or tracking software, in the website or in the apps, and we do not track anyone across other companies' apps or websites.",
                        "The apps do not use the camera, the microphone, contacts or location.",
                        "Children do not have email addresses or passwords with us, and nothing we send by email is addressed to a child.",
                    ],
                ],
            },
            {
                heading: "Why we keep it",
                body: [
                    "We keep this data to run the service the family signed up for: to sign grown-ups in, to show each child their lessons, map and progress, to show grown-ups what their children have done, and, when a parent turns them on, to send weekly letters. We do not use it for anything else.",
                ],
            },
            {
                heading: "Who else handles it",
                body: [
                    "A small number of companies run parts of the service for us. Each handles data only to provide that part:",
                    [
                        "Render runs our server, and Neon runs our database, both in the United States.",
                        "Cloudflare carries traffic to the site and the apps and protects them from abuse.",
                        "Resend delivers the sign-in emails, which never contain a child's details. It also delivers weekly letters. A detailed letter carries a child's name and a summary of their learning, and is sent only when the receiving parent has turned detailed letters on. A private-link letter carries no learning details.",
                        "Some optional teaching features for grown-ups use Google's Gemini API. A request carries the lesson's material and the answers given in that lesson, never a name, an email address or an account identifier, and is made with storage at Google turned off.",
                    ],
                ],
            },
            {
                heading: "How long we keep it",
                body: [
                    "We keep a family's data while the family's account is open. When a grown-up deletes their account or closes a family, we delete the records straight away from our database. Copies remain in our database provider's short restore history until it expires.",
                ],
            },
            {
                heading: "Children's privacy",
                body: [
                    "The service is meant for children aged 5 to 12 learning with a parent. Only a parent can add a child, and they agree to the notice beside the add-a-child form first. A parent can see what their child has done in the app at any time. To export a child's record, withdraw consent or delete the record, a parent writes to us, and we do it.",
                ],
            },
            {
                heading: "Your choices",
                body: [
                    `From the account page, on the website or in the apps, a grown-up can change or stop weekly letters, close a family, and delete their own account. To get a copy of the family's data, withdraw consent for a child, or delete one child's record, write to ${CONTACT} from the address you sign in with and we will do it.`,
                ],
            },
            {
                heading: "Changes",
                body: [
                    `We will change this page when what we do changes, and say so to grown-ups who sign in when the change is one they would want to know about. This version is from ${UPDATED}.`,
                ],
            },
        ],
    },
    "/terms": {
        title: "Terms of use",
        lead: `These terms apply to the website at lumischool.ai and the apps, which ${OPERATOR} runs. By signing in, you agree to them.`,
        sections: [
            {
                heading: "Accounts",
                body: [
                    "An account belongs to a grown-up, who signs in with a code sent to their email address. Children use the service only through a children's view that a grown-up in their family opens, and the grown-up is responsible for how it is used.",
                    "Keep your email account secure, since it is how you sign in. Tell us if you think someone else has used your account.",
                ],
            },
            {
                heading: "Using the service",
                body: [
                    "Use the service for teaching and learning in your family. Do not try to reach another family's data, disrupt the service, or copy the lessons and drawings in bulk.",
                    "The service is free today. If we ever charge for any part of it, we will say so in the apps and on this site before anyone is charged.",
                ],
            },
            {
                heading: "What is ours and what is yours",
                body: [
                    "The lessons, drawings, games and software are ours, and you may use them within the service and print them for your family. What your children make in it, such as answers and paintings, is your family's, and you can ask us for a copy or delete it at any time.",
                ],
            },
            {
                heading: "The service as it is",
                body: [
                    "We work to keep the lessons correct and the service running, but we provide it as it is, without warranties beyond those the law requires, and we may change or stop parts of it. To the extent the law allows, we are not liable for indirect losses arising from its use.",
                ],
            },
            {
                heading: "Ending",
                body: [
                    "You can delete your account at any time, as described on the account deletion page. We may close an account that breaks these terms, and will tell the grown-up first unless the law or the safety of a child prevents it.",
                ],
            },
            {
                heading: "Contact",
                body: [
                    `Questions about these terms go to ${CONTACT}. This version is from ${UPDATED}.`,
                ],
            },
        ],
    },
    "/support": {
        title: "Help and support",
        lead: `For any question about lumischool, write to ${CONTACT}. We answer within two working days.`,
        sections: [
            {
                heading: "Signing in",
                body: [
                    "Enter your email address and we send you a code. If it has not arrived after a few minutes, check your spam folder, then ask for a new one. A code works once, for a short time.",
                ],
            },
            {
                heading: "A child's view",
                body: [
                    "A grown-up opens a children's view from the app or the website. To get back to the grown-up screens on a phone or tablet, open the menu under the child's name, choose For grown-ups, and hold the button until it lets you in.",
                ],
            },
            {
                heading: "Your data",
                body: [
                    "The privacy page says what we keep and why. To delete your account, the account deletion page has the steps. To get a copy of your family's data, write to us.",
                ],
            },
            {
                heading: "When writing to us",
                body: [
                    "Write from the address you sign in with, and say which device and app you use and what you saw. Do not send us your sign-in codes; we never ask for them.",
                ],
            },
        ],
    },
    "/delete-account": {
        title: "Delete your account",
        lead: "A grown-up can delete their lumischool account at any time, in the app or on the website, and the steps are the same in both.",
        sections: [
            {
                heading: "In the app or on the website",
                body: [
                    [
                        "Sign in as the grown-up whose account it is.",
                        "In the app, tap your picture at the top and choose Your account. On the website, open Account.",
                        "Choose Delete my account, and type your email address to confirm. If you signed in more than a few minutes ago, you are asked to sign in again first.",
                    ],
                ],
            },
            {
                heading: "What is deleted",
                body: [
                    "Your sign-in, your name, your email address and every session your devices hold are deleted, and you are signed out everywhere.",
                    "If you are the only parent in a family, the family is closed with your account, and with it every child's record: their names, their answers, drawings and paintings, and your consent. If another parent remains in the family, it stays open for them, with its children's records, and they are told that you left.",
                    "Deleted records are removed from our database straight away, and from our database provider's short restore history when it expires. We keep nothing about a deleted account apart from that.",
                ],
            },
            {
                heading: "Without the app",
                body: [
                    `If you cannot sign in, write to ${CONTACT} from the email address of the account, and we will delete it and confirm by reply.`,
                ],
            },
        ],
    },
};

export function Legal(props: { path: string }): JSX.Element {
    const page = LEGAL[props.path];
    if (page === undefined) return null;
    if (!isServer) document.title = `${page.title} · lumischool`;
    return (
        <>
            <header class="site-bar">
                <div class="site-wrap site-bar-in">
                    <Mark href="/home" />
                </div>
            </header>
            <main id="main" class="site-wrap site-legal">
                <h1>{page.title}</h1>
                <p class="site-legal-lead">{page.lead}</p>
                <For each={page.sections}>
                    {(section) => (
                        <section>
                            <h2>{section.heading}</h2>
                            <For each={section.body}>
                                {(part) =>
                                    typeof part === "string" ? (
                                        <p>{part}</p>
                                    ) : (
                                        <ul>
                                            <For each={part}>{(line) => <li>{line}</li>}</For>
                                        </ul>
                                    )
                                }
                            </For>
                        </section>
                    )}
                </For>
            </main>
            <Footer />
        </>
    );
}
