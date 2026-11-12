import type { AiActionName, AiParamValue } from '@iitj1/types';

/**
 * What an interpreter sees: the new message, a few recent turns and a compact summary of the pending
 * command. Never database contents, personal data or credentials.
 */
export interface InterpretRequest {
  message: string;
  recentMessages: { role: 'admin' | 'assistant'; text: string }[];
  pending: {
    action: AiActionName;
    collected: Record<string, AiParamValue>;
    missingFields: string[];
    askedField: string | null;
    awaitingConfirmation: boolean;
  } | null;
  /** IST date, YYYY-MM-DD. */
  today: string;
}

/**
 * A language interpreter. Returns UNTRUSTED output — the orchestrator validates it against
 * aiInterpretationSchema before using any of it.
 */
export interface AiInterpreter {
  readonly name: string;
  interpret(request: InterpretRequest): Promise<unknown>;
}
