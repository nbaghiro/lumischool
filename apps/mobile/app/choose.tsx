import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { familyName } from "../../../school/family/names";
import * as api from "../api";
import { Link, Say } from "../form";
import { finishSignIn, said, signInAsked } from "../mode";
import { Addressed, AuthPage, GROWN_FOOT, Postcard, Stack, type StampName } from "../postcard";

const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** The stamps pictured for the cards, by the card's place in the stack, as the web seeds them. */
const STAMPS = {
    parent: ["stamp-cottage-0", "stamp-cottage-1", "stamp-cottage-2", "stamp-cottage-3"],
    tutor: ["stamp-tent-0", "stamp-tent-1", "stamp-tent-2", "stamp-tent-3"],
} as const satisfies Record<string, readonly StampName[]>;

function stampFor(f: api.FamilyChoice, i: number): StampName {
    const row = STAMPS[f.kid_id === null ? "parent" : "tutor"];
    return row[i % row.length] ?? row[0];
}

export default function Choose(): ReactNode {
    const asked = signInAsked();
    const families = asked?.families ?? [];
    const [problem, setProblem] = useState("");
    const [busy, setBusy] = useState(false);

    const choose = async (family_id: string): Promise<void> => {
        if (busy) return;
        if (asked === null) {
            router.replace("/sign-in");
            return;
        }
        setBusy(true);
        setProblem("");
        const r = await api.chooseFamily(asked.challenge, { family_id });
        setBusy(false);
        if (r.ok) await finishSignIn(r.value);
        else setProblem(said(r.problem));
    };

    const n = COUNT[families.length] ?? String(families.length);

    return (
        <AuthPage map="choose" who="grown-ups" foot={GROWN_FOOT}>
            <Postcard
                note
                kicker="Signed in"
                title="Which family?"
                lead={`This address belongs to ${n} families. Choose the one to open. You can switch later.`}
                links={
                    <Link
                        label="Start a new family"
                        onPress={() =>
                            router.push({ pathname: "/start", params: { after: "code" } })
                        }
                    />
                }
            >
                {problem === "" ? null : <Say text={problem} />}
            </Postcard>
            <Stack>
                {families.map((f, i) => (
                    <Addressed
                        key={f.family_id}
                        name={familyName(f.name)}
                        line={
                            f.kid_id === null ? "You are a parent here" : "You tutor a child here"
                        }
                        stamp={stampFor(f, i)}
                        busy={busy}
                        onChoose={() => void choose(f.family_id)}
                    />
                ))}
            </Stack>
        </AuthPage>
    );
}
