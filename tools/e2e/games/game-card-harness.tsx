// A page of game cards for tools/e2e/game-card.e2e.ts, mounted over any app page so the palette and fonts
// are the app's own: three cards in a column, each result written into the page for the test to read.
import { For } from "solid-js";
import { render } from "solid-js/web";
import type { CardResult } from "../../../engine/ui/game-card-rules";

const CARDS = [
    { game: "jump", level: 0 },
    { game: "golf", level: 0 },
    { game: "shut", level: 0 },
];

const host = document.createElement("div");
host.id = "card-harness";
host.style.cssText =
    "position:absolute;inset:0;z-index:50;background:var(--paper);padding:16px;display:grid;gap:16px;width:520px";
document.body.appendChild(host);
const out = document.createElement("pre");
out.id = "card-results";
out.textContent = "[]";
const results: CardResult[] = [];

void import("../../../engine/ui/game-card").then(({ GameCard }) => {
    render(
        () => (
            <For each={CARDS}>
                {(c) => (
                    <GameCard
                        game={c.game}
                        level={c.level}
                        onResult={(r) => {
                            results.push(r);
                            out.textContent = JSON.stringify(results);
                        }}
                    />
                )}
            </For>
        ),
        host,
    );
    host.appendChild(out);
});
