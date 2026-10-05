/**
 * Evaluates a command's collected parameters against its backend definition:
 * normalize → resolve entities → required fields → business validation → preview.
 * Read-only: nothing here writes data.
 */
import { AI_ACTION_POLICIES, type AiActionName, type AiOption, type AiParamValue, type AiPreview, type AiQuestion, type AiResolvedEntity } from '@iitj1/types';
import { ACTIONS, type ActionContext, type Params } from './actions';
import type { FieldSpec, Resolution } from './actions/types';
import { normalizeBoolean, normalizeDate, normalizeEnum, normalizeMoney, normalizeText, type Normalized } from './normalize';

export type Evaluation =
  | {
      kind: 'question';
      params: Params;
      missingFields: string[];
      question: AiQuestion;
      entities: AiResolvedEntity[];
      errors: string[];
    }
  | {
      kind: 'invalid';
      params: Params;
      entities: AiResolvedEntity[];
      errors: string[];
    }
  | {
      kind: 'ready';
      params: Params;
      effective: Params;
      entities: AiResolvedEntity[];
      preview: AiPreview;
      resolution: Resolution;
    };

function normalizeField(field: FieldSpec, raw: AiParamValue, ctx: ActionContext): Normalized<AiParamValue> {
  switch (field.kind) {
    case 'date':
      return normalizeDate(raw, ctx.today);
    case 'money':
      return normalizeMoney(raw);
    case 'boolean':
      return normalizeBoolean(raw);
    case 'enum':
      return normalizeEnum(raw, field.enumValues ?? {});
    case 'time':
    case 'ref':
    case 'text':
      return normalizeText(raw, field.max ?? 200);
  }
}

/** Keeps only the action's own fields, normalized. Unknown keys from the interpreter are dropped. */
export function normalizeParams(action: AiActionName, raw: Record<string, AiParamValue>, ctx: ActionContext): { params: Params; errors: Record<string, string> } {
  const def = ACTIONS[action];
  const params: Params = {};
  const errors: Record<string, string> = {};
  for (const field of def.fields) {
    const value = raw[field.name];
    if (value === undefined || value === null || value === '') continue;
    const n = normalizeField(field, value, ctx);
    if (n.ok) params[field.name] = n.value;
    else errors[field.name] = n.error;
  }
  return { params, errors };
}

const isRequired = (f: FieldSpec, p: Params) => (typeof f.required === 'function' ? f.required(p) : !!f.required);

function enumOptions(f: FieldSpec): AiOption[] | undefined {
  if (f.kind === 'boolean') return [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }];
  if (f.kind !== 'enum' || !f.enumLabels) return undefined;
  return Object.entries(f.enumLabels).map(([value, label]) => ({ label, value }));
}

function ask(f: FieldSpec, p: Params, r: Resolution, note?: string): AiQuestion {
  const base = r.questions[f.name] ?? (typeof f.question === 'function' ? f.question(p) : f.question);
  const options = r.options[f.name] ?? enumOptions(f);
  return { field: f.name, text: note ? `${note} ${base}` : base, ...(options?.length ? { options } : {}) };
}

export async function evaluate(action: AiActionName, stored: Params, ctx: ActionContext, normalizeErrors: Record<string, string> = {}): Promise<Evaluation> {
  const def = ACTIONS[action];
  // Defaults take part in resolution (e.g. "today" picks the price list) but are not stored, so they keep
  // tracking the fields they depend on.
  const defaults = def.defaults?.(stored, ctx) ?? {};
  const resolution = await def.resolve({ ...defaults, ...stored }, ctx);
  const effective: Params = { ...resolution.params };
  const errors = { ...normalizeErrors, ...resolution.fieldErrors };
  for (const name of Object.keys(resolution.fieldErrors)) delete effective[name];
  const params: Params = Object.fromEntries(
    Object.entries(effective).filter(([k, v]) => stored[k] !== undefined || defaults[k] === undefined || defaults[k] !== v),
  );
  const missing = def.fields.filter((f) => isRequired(f, effective) && effective[f.name] === undefined);
  // Ask about a field we just rejected first, then fields in definition order.
  const firstErrored = missing.find((f) => errors[f.name]) ?? def.fields.find((f) => errors[f.name] && !isRequired(f, effective));
  const next = firstErrored ?? missing[0];
  if (next) {
    return {
      kind: 'question',
      params,
      missingFields: missing.map((f) => f.name),
      question: ask(next, params, resolution, errors[next.name]),
      entities: resolution.entities,
      errors: Object.values(errors),
    };
  }
  if (resolution.extraMissing) {
    return {
      kind: 'question',
      params,
      missingFields: [resolution.extraMissing.field],
      question: { field: resolution.extraMissing.field, text: resolution.extraMissing.question, ...(resolution.extraMissing.options ? { options: resolution.extraMissing.options } : {}) },
      entities: resolution.entities,
      errors: [],
    };
  }

  const issues = await def.validate(effective, resolution, ctx);
  const fieldIssue = issues.find((i) => i.field);
  if (fieldIssue?.field) {
    const field = def.fields.find((f) => f.name === fieldIssue.field)!;
    delete params[field.name];
    return {
      kind: 'question',
      params,
      missingFields: [field.name],
      question: ask(field, params, resolution, fieldIssue.message),
      entities: resolution.entities,
      errors: issues.map((i) => i.message),
    };
  }
  if (issues.length) return { kind: 'invalid', params, entities: resolution.entities, errors: issues.map((i) => i.message) };

  const policy = AI_ACTION_POLICIES[action];
  const preview = await def.preview(effective, resolution, ctx);
  return { kind: 'ready', params, effective, entities: resolution.entities, preview: { ...preview, risk: policy.risk, confirmLabel: policy.confirmLabel }, resolution };
}

/** What the interpreter is told about each action (names, fields, kinds) — no data. */
export function actionCatalog(): { action: AiActionName; label: string; fields: { name: string; kind: string; describe: string }[] }[] {
  return (Object.keys(ACTIONS) as AiActionName[]).map((action) => ({
    action,
    label: AI_ACTION_POLICIES[action].label,
    fields: ACTIONS[action].fields.map((f) => ({ name: f.name, kind: f.kind, describe: f.describe })),
  }));
}
