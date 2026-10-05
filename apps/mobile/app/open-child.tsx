import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import * as api from "../api";
import { Button, Check, Form, Say } from "../form";
import { enterChild, said, settled } from "../mode";
import { AuthPage, Postcard } from "../postcard";
import { BarButton } from "../tabs";

/** Chooses the children a children's view is for, and switches the app into it. */
export default function OpenChild(): ReactNode {
    const [kids, setKids] = useState<api.Child[] | null>(null);
    const [chosen, setChosen] = useState<readonly string[]>([]);
    const [problem, setProblem] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void api.children().then((r) => {
            if (!r.ok) {
                if (!settled(r.problem)) setProblem(said(r.problem));
                return;
            }
            setKids(r.value);
            const only = r.value[0];
            if (r.value.length === 1 && only !== undefined) setChosen([only.id]);
        });
    }, []);

    const toggle = (id: string, on: boolean): void =>
        setChosen((c) => (on ? [...c.filter((k) => k !== id), id] : c.filter((k) => k !== id)));

    const open = async (): Promise<void> => {
        if (chosen.length === 0) {
            setProblem("Choose a child first.");
            return;
        }
        setBusy(true);
        setProblem(null);
        const r = await api.openChildren([...chosen]);
        setBusy(false);
        if (r.ok) await enterChild(r.value, [...chosen]);
        else if (!settled(r.problem)) setProblem(said(r.problem));
    };

    return (
        <AuthPage
            map="choose"
            who={null}
            foot={[]}
            right={<BarButton label="Back" onPress={() => router.back()} />}
        >
            <Postcard
                kicker="The children's view"
                title="Open a child's view"
                lead="This phone becomes the children's view until a grown-up leaves it with the parent PIN. Choose more than one child and the view asks who is learning."
                stamp="stamp-kid"
            >
                <Form>
                    {kids !== null && kids.length === 0 ? (
                        <Say text="There are no children in this family yet. Add one from Home." />
                    ) : null}
                    {(kids ?? []).map((k) => (
                        <Check
                            key={k.id}
                            label={k.name}
                            checked={chosen.includes(k.id)}
                            onChange={(on) => toggle(k.id, on)}
                        />
                    ))}
                    <Button
                        label={busy ? "Opening the view" : "Open the children's view"}
                        form
                        busy={busy}
                        onPress={() => void open()}
                    />
                    {problem === null ? null : <Say text={problem} />}
                </Form>
            </Postcard>
        </AuthPage>
    );
}
