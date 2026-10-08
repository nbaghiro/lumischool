// The public catalogue's addresses and search descriptions. Family screens never enter this list.
export const SITE_ORIGIN = "https://lumischool.ai";

export interface PublicPage {
    path: string;
    title: string;
    description: string;
    parent?: string;
}

export const PUBLIC_PAGES: readonly PublicPage[] = [
    {
        path: "/",
        title: "Online Homeschool Lessons for Ages 5–12",
        description:
            "Homeschool lessons to use online or print. Explore maths, reading, science and more, with worked examples, practice and guidance for grown-ups.",
    },
    {
        path: "/learn/math/counting-to-five",
        title: "Counting to Five: Lesson and Printable Practice",
        description:
            "Help your child count up to five objects, touching each once. Read a worked example, try printable counting practice and check the answers together.",
        parent: "/",
    },
    {
        path: "/learn/math/more-fewer-same",
        title: "More, Fewer and the Same: Comparing Groups",
        description:
            "Teach more, fewer and the same by matching objects one to one. Includes a worked example, printable practice, answers and guidance for grown-ups.",
        parent: "/",
    },
    {
        path: "/learn/math/rounding-to-nearest-hundred",
        title: "Rounding to the Nearest Hundred: Lesson and Practice",
        description:
            "Use a number line to round three-digit numbers to the nearest hundred. Try a worked example and printable practice with explained answers.",
        parent: "/",
    },
    {
        path: "/how-it-works",
        title: "How Lumischool Works for Homeschool Families",
        description:
            "See how to choose lessons, learn online or print a day's work, and use the map and parent guidance to plan learning at home.",
    },
    {
        path: "/about",
        title: "About Lumischool and Its Lessons",
        description:
            "Learn how Lumischool approaches lessons for families teaching at home, checks generated questions and supports grown-ups with practical guidance.",
    },
    {
        path: "/privacy",
        title: "Privacy",
        description:
            "What Lumischool keeps about a family, why it is needed, and how to access or delete your data.",
    },
    {
        path: "/terms",
        title: "Terms of Use",
        description: "Read the terms for using Lumischool's website, lessons and apps.",
    },
    {
        path: "/support",
        title: "Help and Support",
        description:
            "Get help with Lumischool sign-in, children's views and family data. Contact support@lumischool.ai.",
    },
    {
        path: "/delete-account",
        title: "Delete Your Account",
        description:
            "How to delete a Lumischool account in the app or on the website, and what happens to your family's data.",
    },
];

/** /home remains an always-public entrance for a signed-in family; its canonical address is /. */
export const publicPage = (path: string): PublicPage | undefined =>
    PUBLIC_PAGES.find((page) => page.path === (path === "/home" ? "/" : path));

/** Build output is addressed only through the explicit public catalogue. */
export const publicFile = (page: PublicPage): string =>
    page.path === "/" ? "apps/site/index.html" : `site${page.path}/index.html`;

/** Public samples point to the same lessons and declared levels used by Explore. */
export const PUBLIC_LESSONS: Readonly<Record<string, string>> = {
    "/learn/math/counting-to-five": "k-counting-to-five",
    "/learn/math/more-fewer-same": "k-more-fewer-the-same",
    "/learn/math/rounding-to-nearest-hundred": "g3-numbers-to-a-thousand",
};

export const LEVEL_WORDS = { easy: "Easier", medium: "As written", hard: "Harder" } as const;

/** Retired catalogue entrances lead back to the marketing tour. */
export function publicRedirect(path: string): string | undefined {
    return [
        "/curriculum",
        "/curriculum/kindergarten",
        "/curriculum/grade-1",
        "/homeschool-math",
    ].includes(path.replace(/\/+$/, ""))
        ? "/home#subjects"
        : undefined;
}
