import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn, everyMark } from "../../__tests__/check";
import { motionOf } from "../../drawing";
import { ICON_LABEL, ICONS, icon } from "../icon";

test("every icon has the word it sits beside, and the set is one drawing on one box", () => {
    assert.deepEqual(Object.keys(ICON_LABEL).sort(), [...ICONS].sort());
    for (const name of ICONS) {
        assert.ok(ICON_LABEL[name].length > 1, `${name} has no word`);
        assert.doesNotMatch(ICON_LABEL[name], /[—!]/, name);
        // two squares, so a 44 px target holds it with room
        assert.deepEqual(icon.box({ name, on: false }), { w: 2, h: 2 });
    }
    assert.deepEqual(
        [...ICONS].sort(),
        icon.takes
            .filter((t) => !t.params.on)
            .map((t) => t.params.name)
            .sort(),
    );
});

test("an icon is hidden from a screen reader, draws its lines round, and holds still", () => {
    for (const take of icon.takes) {
        assert.equal(icon.describe(take.params), null);
        const { marks } = drawn(icon, take.params, { paper: false });
        const round = [...everyMark(marks)].filter(
            ({ mark }) => mark.kind === "group" && mark.o.round,
        );
        assert.equal(round.length, 1, take.label);
    }
    assert.match(motionOf(icon).still ?? "", /answer a press/);
});

test("the page an icon is on lays a disc behind it, grey on paper", () => {
    const on = drawn(icon, { name: "journal", on: true }, { paper: true }).marks[0];
    assert.ok(on?.kind === "plain" && on.p.kind === "circle" && on.p.fill === "#E2E2E2");
});
