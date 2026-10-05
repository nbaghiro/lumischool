import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentOf, faceOf, firstUrl, pick, withoutPseudo, type Rule } from "../printable";

const rules: Rule[] = [
    { kind: "style", selector: ".sheet", text: ".sheet { color: red; }" },
    { kind: "style", selector: ".catalogue", text: ".catalogue { color: blue; }" },
    { kind: "style", selector: ".sheet::before", text: '.sheet::before { content: "x"; }' },
    {
        kind: "media",
        condition: "print",
        rules: [{ kind: "style", selector: ".sheet", text: ".sheet { break-before: page; }" }],
    },
    {
        kind: "media",
        condition: "screen and (max-width: 700px)",
        rules: [{ kind: "style", selector: ".sheet", text: ".sheet { width: 100%; }" }],
    },
    {
        kind: "media",
        condition: "(max-width: 700px)",
        rules: [{ kind: "style", selector: ".catalogue", text: ".catalogue { gap: 0; }" }],
    },
    { kind: "font", text: "@font-face { src: url(/a.woff2); }", src: "url(/a.woff2)", face: "a|" },
    { kind: "dropped" },
    { kind: "other", text: "@property --x { syntax: '*'; inherits: true; }" },
];

describe("a printable sheet", () => {
    it("keeps the rules that reach the sheet, the paper's media and the fonts", () => {
        const kept = pick(rules, {
            matches: (s) => s === ".sheet",
            font: (r) => r.text.replace("/a.woff2", "data:font/woff2;base64,AA"),
        });
        assert.deepEqual(kept, [
            ".sheet { color: red; }",
            '.sheet::before { content: "x"; }',
            "@media print {\n.sheet { break-before: page; }\n}",
            "@font-face { src: url(data:font/woff2;base64,AA); }",
            "@property --x { syntax: '*'; inherits: true; }",
        ]);
    });

    it("tests a pseudo-element's rule on the element it decorates", () => {
        assert.equal(withoutPseudo(".a::before, .b:after"), ".a, .b");
        assert.equal(withoutPseudo(".a:hover"), ".a:hover");
    });

    it("reads a font's address and names a face the same from its rule and the page", () => {
        assert.equal(firstUrl('url("/f/a.woff2") format("woff2"), url(/b.woff)'), "/f/a.woff2");
        assert.equal(firstUrl("local(Andika)"), null);
        assert.equal(
            faceOf('"Andika"', "U+0000-00FF, U+0131"),
            faceOf("Andika", "u+0000-00ff,u+0131"),
        );
    });

    it("makes one document with the paper's size, the page's origin and the sheet", () => {
        const html = documentOf({
            title: "Bonds <to> ten",
            base: "https://lumischool.test/",
            paper: "letter",
            css: [".sheet { color: red; }", "x::after { content: '</style>'; }"],
            body: '<div class="sheet"></div>',
        });
        assert.match(html, /^<!doctype html>/);
        assert.match(html, /@page \{ size: letter; \}/);
        assert.match(html, /<base href="https:\/\/lumischool.test\/">/);
        assert.match(html, /<title>Bonds &lt;to&gt; ten<\/title>/);
        assert.match(html, /<body><div class="sheet"><\/div><\/body>/);
        assert.equal(html.match(/<\/style/gi)?.length, 1);
    });
});
