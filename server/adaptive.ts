// One turn of the adaptive tutor: the model chooses the next move on a question, this file checks it
// and falls back to the question's own hint when it cannot. The key stays here.

import { acceptMove, authoredMove, type AdaptiveContext, type TutorMove } from "../school/adaptive";
import {
    ADAPTIVE_INSTRUCTION,
    ADAPTIVE_PROMPT_VERSION,
    ADAPTIVE_SCHEMA,
    adaptiveEnvelope,
} from "../school/assistant/adaptive";
import { geminiInteraction, type TutorConfig } from "./gemini-tutoring";

export interface AdaptiveTurn {
    move: TutorMove;
    promptVersion: string;
    model: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    /** What the model proposed, kept for the parent's record and the transcript. */
    proposal: unknown;
    /** Why the proposal was not used, where it was not. */
    refused: { reason: string; detail: string } | null;
    problem: string | null;
    retried: boolean;
}

export async function adaptiveTurn(
    config: TutorConfig,
    context: AdaptiveContext,
    fetcher: typeof fetch = fetch,
    deadlineMs = 3500,
): Promise<AdaptiveTurn> {
    const began = Date.now();
    const envelope = adaptiveEnvelope(context);
    const deadline = AbortSignal.timeout(deadlineMs);
    let result = await geminiInteraction(
        config,
        envelope,
        ADAPTIVE_INSTRUCTION,
        ADAPTIVE_SCHEMA,
        fetcher,
        deadline,
    );
    let checked = result.problem ? null : acceptMove(result.output, context);
    let refused = checked && "refused" in checked ? checked.refused : null;
    let retried = false;
    if (refused && !deadline.aborted) {
        retried = true;
        const retry = await geminiInteraction(
            config,
            {
                ...envelope,
                correction: `The last move was refused: ${refused.detail}. Send one valid move.`,
            },
            ADAPTIVE_INSTRUCTION,
            ADAPTIVE_SCHEMA,
            fetcher,
            deadline,
        );
        const second = retry.problem ? null : acceptMove(retry.output, context);
        result = {
            ...retry,
            inputTokens: result.inputTokens + retry.inputTokens,
            outputTokens: result.outputTokens + retry.outputTokens,
        };
        checked = second;
        refused = second && "refused" in second ? second.refused : null;
    }
    const move = checked && "move" in checked ? checked.move : authoredMove(context);
    return {
        move,
        promptVersion: ADAPTIVE_PROMPT_VERSION,
        model: result.model,
        latencyMs: Date.now() - began,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        proposal: result.output,
        refused,
        problem: result.problem,
        retried,
    };
}
