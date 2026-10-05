import { config } from '../../../config';
import { HostedInterpreter, type HostedProvider } from './http';
import { RulesInterpreter } from './rules';
import type { AiInterpreter } from './types';

let override: AiInterpreter | null = null;
let cached: AiInterpreter | null = null;

/** AI_PROVIDER selects the interpreter; 'rules' (default) needs no key and makes no network calls. */
export function getInterpreter(): AiInterpreter {
  if (override) return override;
  if (cached) return cached;
  const { provider, apiKey, model, timeoutMs } = config.ai;
  cached = ['anthropic', 'openai', 'gemini'].includes(provider)
    ? new HostedInterpreter(provider as HostedProvider, apiKey, model, timeoutMs)
    : new RulesInterpreter();
  return cached;
}

/** Tests only: substitute an interpreter (e.g. one returning malformed output). Pass null to restore. */
export function setInterpreterForTests(interpreter: AiInterpreter | null): void {
  override = interpreter;
}

export type { AiInterpreter, InterpretRequest } from './types';
