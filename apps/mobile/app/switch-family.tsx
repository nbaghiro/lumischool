import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import * as api from "../api";
import { Button, Form, Say } from "../form";
import { finishSignIn, said, settled } from "../mode";
import { AuthPage, Postcard } from "../postcard";
import { BarButton } from "../tabs";

/** Moves the signed-in grown-up to another of their families. */
export default function SwitchFamily(): ReactNode {
    const [me, setMe] = useState<api.Me | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        void api.me().then((r) => {
            if (r.ok) setMe(r.value);
            else if (!settled(r.problem)) setProblem(said(r.problem));
        });
    }, []);

    const choose = async (family_id: string): Promise<void> => {
        setBusy(family_id);
        setProblem(null);
        const r = await api.switchFamily(family_id);
        setBusy(null);
        if (r.ok) await finishSignIn(r.value);
        else if (!settled(r.problem)) setProblem(said(r.problem));
    };

    const others = me?.families.filter((f) => f.family_id !== me.family.id) ?? [];

    return (
        <AuthPage
            map="choose"
            who={null}
            foot={[]}
            right={<BarButton label="Back" onPress={() => router.back()} />}
        >
            <Postcard
                kicker="Your families"
                title="Switch family"
                lead={me === null ? undefined : `You are in the ${me.family.name} family now.`}
                stamp="stamp-sign-in"
            >
                <Form>
                    {me !== null && others.length === 0 ? (
                        <Say text="You belong to one family. A grown-up of another family can invite you." />
                    ) : null}
                    {others.map((f) => (
                        <Button
                            key={f.family_id}
                            label={busy === f.family_id ? `Opening ${f.name}` : f.name}
                            form
                            busy={busy === f.family_id}
                            onPress={() => void choose(f.family_id)}
                        />
                    ))}
                    {problem === null ? null : <Say text={problem} />}
                </Form>
            </Postcard>
        </AuthPage>
    );
}
