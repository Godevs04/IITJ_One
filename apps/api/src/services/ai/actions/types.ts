import type { AiActionName, AiOption, AiParamValue, AiPreview, AiResolvedEntity } from '@iitj1/types';

export type Params = Record<string, AiParamValue>;

export interface ActionContext {
  campusId: string;
  /** IST calendar date. */
  today: string;
  now: Date;
  admin: { email: string; role: string };
  commandId: string;
}

/** One backend-defined parameter. The backend — never the model — decides what is required. */
export interface FieldSpec {
  name: string;
  label: string;
  /** Shown to the interpreter so it knows what to extract. */
  describe: string;
  kind: 'text' | 'date' | 'time' | 'money' | 'enum' | 'boolean' | 'ref';
  max?: number;
  enumValues?: Record<string, RegExp>;
  enumLabels?: Record<string, string>;
  required?: boolean | ((p: Params) => boolean);
  question: string | ((p: Params) => string);
}

export interface Resolution {
  /** Params after resolution (e.g. a time matched to the timetable's spelling). */
  params: Params;
  entities: AiResolvedEntity[];
  /** A value that was supplied but cannot be used — the field is cleared and asked again with this note. */
  fieldErrors: Record<string, string>;
  /** Choices for a field's question (e.g. the bus's trips that day). */
  options: Record<string, AiOption[]>;
  /** Overrides a field's question text (e.g. "B3 has trips at 5:00 PM and 6:30 PM…"). */
  questions: Record<string, string>;
  /** Something required that isn't a single field (e.g. "what should change?"). Asked after fields. */
  extraMissing?: { field: string; question: string; options?: AiOption[] };
  /** Data the preview/executor need (ids, before-values). Never sent to the model. */
  data: Record<string, unknown>;
}

export interface ValidationIssue {
  /** When set, the field is cleared and asked again. */
  field?: string;
  message: string;
}

export interface ActionDefinition {
  name: AiActionName;
  fields: FieldSpec[];
  /** Values used when a field wasn't given (not stored — recomputed so they track other fields). */
  defaults?: (p: Params, ctx: ActionContext) => Params;
  resolve: (p: Params, ctx: ActionContext) => Promise<Resolution>;
  validate: (p: Params, r: Resolution, ctx: ActionContext) => Promise<ValidationIssue[]>;
  preview: (p: Params, r: Resolution, ctx: ActionContext) => Promise<Omit<AiPreview, 'risk' | 'confirmLabel'>>;
  /** Runs the shared service(s). Throws on failure. Audit ids are captured by the caller. */
  execute: (p: Params, r: Resolution, ctx: ActionContext) => Promise<{ summary: string; message: string }>;
}

export function emptyResolution(params: Params): Resolution {
  return { params: { ...params }, entities: [], fieldErrors: {}, options: {}, questions: {}, data: {} };
}

export const str = (v: AiParamValue | undefined): string | undefined => (v === undefined ? undefined : String(v));

/** A failure whose message is safe and useful to show the admin (anything else is reported generically). */
export class ActionError extends Error {}
