import {
  findEffectiveDateConflict,
  resolveMessPricingForDate,
  type MessPricingConfig,
  type MessPricingMeal,
  type MealKey,
  type DietType,
  type MessUpdateType,
  MEAL_KEYS,
} from '@iitj1/types';
import { getMessMenu, listMessPricing } from '../../../store';
import { createMessPricing, setMessPricingActive, updateMessPricing } from '../../messPricing';
import { createTemporaryMessUpdateService } from '../../messUpdates';
import { addDays, formatLongDate, formatShortDate, normalizeDate, rupees } from '../normalize';
import { ActionError, emptyResolution, str, type ActionContext, type ActionDefinition, type FieldSpec, type Params, type Resolution, type ValidationIssue } from './types';


const PLAN_LABEL: Record<string, string> = { regular: 'Regular plan (per day)', pay_and_use: 'Pay & Use (per meal)' };
const MEAL_LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };
const DIET_LABEL: Record<string, string> = { veg: 'Veg', nonVeg: 'Non-veg' };

const planField: FieldSpec = {
  name: 'plan',
  label: 'Plan',
  describe: 'regular (monthly/per-day plan) | pay_and_use (per meal)',
  kind: 'enum',
  enumValues: { regular: /^(regular|monthly|per day|daily|regular plan|mess plan)$/, pay_and_use: /^(pay ?(&|and|n) ?use|pay-and-use|payanduse|per meal|pay as you go|pay & use)$/ },
  enumLabels: PLAN_LABEL,
  required: true,
  question: 'Which pricing should I change — the Regular plan (per day) or Pay & Use (per meal)?',
};
const mealField: FieldSpec = {
  name: 'meal',
  label: 'Meal',
  describe: 'breakfast | lunch | snacks | dinner (Pay & Use only)',
  kind: 'enum',
  enumValues: { breakfast: /^breakfast$/, lunch: /^lunch$/, snacks: /^snacks?$/, dinner: /^dinner$/ },
  enumLabels: MEAL_LABEL,
  required: (p) => p.plan === 'pay_and_use',
  question: 'Which Pay & Use meal — breakfast, lunch, snacks or dinner?',
};
const dietField: FieldSpec = {
  name: 'diet',
  label: 'Veg / Non-veg',
  describe: 'veg | nonVeg',
  kind: 'enum',
  enumValues: { veg: /^(veg|vegetarian|v)$/, nonVeg: /^(non-?veg|non vegetarian|nonvegetarian|nv|nonveg)$/ },
  enumLabels: DIET_LABEL,
  required: true,
  question: 'Veg or non-veg?',
};
const priceField: FieldSpec = { name: 'price', label: 'New price', describe: 'New price in rupees', kind: 'money', required: true, question: 'What should the new price be?' };

function priceOf(c: Pick<MessPricingConfig, 'regular' | 'payAndUse'>, p: Params): number {
  const diet = p.diet as 'veg' | 'nonVeg';
  return p.plan === 'regular' ? c.regular[diet] : c.payAndUse[p.meal as MessPricingMeal][diet];
}

function withPrice(c: MessPricingConfig, p: Params): Pick<MessPricingConfig, 'regular' | 'payAndUse'> {
  const diet = p.diet as 'veg' | 'nonVeg';
  const price = Number(p.price);
  if (p.plan === 'regular') return { regular: { ...c.regular, [diet]: price }, payAndUse: c.payAndUse };
  const meal = p.meal as MessPricingMeal;
  return { regular: c.regular, payAndUse: { ...c.payAndUse, [meal]: { ...c.payAndUse[meal], [diet]: price } } };
}

function describeItem(p: Params): string {
  return [p.plan === 'regular' ? 'Regular plan' : 'Pay & Use', p.plan === 'pay_and_use' ? MEAL_LABEL[String(p.meal)] : null, DIET_LABEL[String(p.diet)]]
    .filter(Boolean)
    .join(' · ');
}

/** The configuration the change is based on: the one in effect on the target date. */
async function resolveBase(p: Params, ctx: ActionContext, r: Resolution): Promise<void> {
  const all = await listMessPricing(ctx.campusId);
  r.data.all = all;
  const date = str(p.date);
  if (!date) return;
  const base = resolveMessPricingForDate(all, date);
  if (!base) {
    r.fieldErrors.date = 'There are no mess prices in effect on that date to change.';
    return;
  }
  r.data.base = base;
  r.entities.push({ field: 'date', kind: 'mess_pricing', id: String(base._id), label: `Price list from ${formatShortDate(base.effectiveFrom)}` });
}

async function validateChange(p: Params, r: Resolution, ctx: ActionContext, mode: 'create' | 'update'): Promise<ValidationIssue[]> {
  const date = String(p.date);
  if (date < ctx.today) return [{ field: 'date', message: "Prices can't be changed for a past date." }];
  const base = r.data.base as MessPricingConfig;
  const current = priceOf(base, p);
  if (current === Number(p.price)) return [{ field: 'price', message: `${describeItem(p)} is already ${rupees(current)}.` }];
  const all = r.data.all as MessPricingConfig[];
  if (mode === 'update') {
    if (base.effectiveFrom === date && base.effectiveFrom <= ctx.today) {
      return [{ field: 'date', message: 'The price list in effect today started today and can no longer be edited. Pick a later date, such as tomorrow.' }];
    }
    return [];
  }
  const conflict = findEffectiveDateConflict(all, { effectiveFrom: date, isActive: true });
  if (conflict) return [{ field: 'date', message: `There's already a price list starting ${formatShortDate(date)} — say “change the price” to edit it, or pick another date.` }];
  return [];
}

function changePreview(p: Params, r: Resolution, ctx: ActionContext, mode: 'create' | 'update') {
  const base = r.data.base as MessPricingConfig;
  const date = String(p.date);
  const editsInPlace = mode === 'update' && base.effectiveFrom === date;
  return {
    title: mode === 'create' ? 'Schedule mess price' : 'Change mess price',
    subtitle: describeItem(p),
    rows: [
      { label: 'Price', before: rupees(priceOf(base, p)), value: rupees(Number(p.price)) + (p.plan === 'regular' ? ` + ${base.regularGstPercent}% GST` : '') },
      { label: 'Applies from', value: date === ctx.today ? `Today (${formatShortDate(date)})` : formatShortDate(date) },
      {
        label: 'How',
        value: editsInPlace
          ? `Edits the scheduled price list starting ${formatShortDate(date)}`
          : `New price list from ${formatShortDate(date)} — all other prices stay the same`,
      },
    ],
    warnings: [],
    notification: 'No — the app shows the new price from that date',
  };
}

async function executeChange(p: Params, r: Resolution, ctx: ActionContext, mode: 'create' | 'update') {
  const base = r.data.base as MessPricingConfig;
  const date = String(p.date);
  const prices = withPrice(base, p);
  const result =
    mode === 'update' && base.effectiveFrom === date
      ? await updateMessPricing(String(base._id), prices, ctx.admin.email, ctx.today)
      : await createMessPricing(
          { campusId: ctx.campusId, effectiveFrom: date, regular: prices.regular, regularGstPercent: base.regularGstPercent, payAndUse: prices.payAndUse, isActive: true, note: 'Changed with AI Admin' },
          ctx.admin.email,
          ctx.today,
        );
  if (!result.ok) {
    throw new ActionError('message' in result ? result.message : result.reason === 'conflict' ? 'Another price list already starts on that date.' : 'Price list not found.');
  }
  const what = `${describeItem(p)} → ${rupees(Number(p.price))} from ${formatShortDate(date)}`;
  return { summary: what, message: `Done — ${what}.` };
}

const changeFields = (dateRequired: boolean): FieldSpec[] => [
  planField,
  mealField,
  dietField,
  priceField,
  {
    name: 'date',
    label: 'Effective date',
    describe: dateRequired ? 'Date the new price starts' : 'Date the new price starts (default today)',
    kind: 'date',
    required: dateRequired,
    question: 'From which date should the new price apply?',
  },
];

export const updateMessPricingAction: ActionDefinition = {
  name: 'update_mess_pricing',
  fields: changeFields(false),
  defaults: (_p, ctx) => ({ date: ctx.today }),
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    await resolveBase(p, ctx, r);
    return r;
  },
  validate: (p, r, ctx) => validateChange(p, r, ctx, 'update'),
  preview: async (p, r, ctx) => changePreview(p, r, ctx, 'update'),
  execute: (p, r, ctx) => executeChange(p, r, ctx, 'update'),
};

export const createMessPricingAction: ActionDefinition = {
  name: 'create_mess_pricing',
  fields: changeFields(true),
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    await resolveBase(p, ctx, r);
    return r;
  },
  validate: (p, r, ctx) => validateChange(p, r, ctx, 'create'),
  preview: async (p, r, ctx) => changePreview(p, r, ctx, 'create'),
  execute: (p, r, ctx) => executeChange(p, r, ctx, 'create'),
};

export const deactivateMessPricingAction: ActionDefinition = {
  name: 'deactivate_mess_pricing',
  fields: [
    {
      name: 'date',
      label: 'Price list',
      describe: 'Start date of the price list to deactivate',
      kind: 'date',
      required: true,
      question: 'Which price list should I deactivate? Tell me the date it starts.',
    },
  ],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const all = (await listMessPricing(ctx.campusId)).filter((c) => c.isActive);
    const current = resolveMessPricingForDate(all, ctx.today);
    r.options.date = all
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
      .slice(0, 6)
      .map((c) => ({ label: `From ${formatShortDate(c.effectiveFrom)}${current?._id === c._id ? ' (in effect)' : c.effectiveFrom > ctx.today ? ' (scheduled)' : ''}`, value: c.effectiveFrom }));
    const date = str(p.date);
    if (!date) return r;
    const target = all.find((c) => c.effectiveFrom === date);
    if (!target) {
      r.fieldErrors.date = `There's no active price list starting ${formatShortDate(date)}.`;
      return r;
    }
    r.data.target = target;
    r.data.all = all;
    r.data.isCurrent = current?._id === target._id;
    r.entities.push({ field: 'date', kind: 'mess_pricing', id: String(target._id), label: `Price list from ${formatShortDate(date)}` });
    return r;
  },
  validate: async (_p, r, ctx) => {
    const target = r.data.target as MessPricingConfig;
    const remaining = (r.data.all as MessPricingConfig[]).filter((c) => c._id !== target._id);
    if (r.data.isCurrent && !resolveMessPricingForDate(remaining, ctx.today)) {
      return [{ message: 'Deactivating this would leave no mess price in effect today. Schedule or activate another price list first.' }];
    }
    return [];
  },
  preview: async (_p, r) => {
    const t = r.data.target as MessPricingConfig;
    return {
      title: 'Deactivate mess prices',
      subtitle: `Price list from ${formatShortDate(t.effectiveFrom)}`,
      rows: [
        { label: 'Status', value: r.data.isCurrent ? 'In effect now' : 'Scheduled' },
        { label: 'Regular', value: `Veg ${rupees(t.regular.veg)} · Non-veg ${rupees(t.regular.nonVeg)}` },
      ],
      warnings: [r.data.isCurrent ? 'The app will fall back to the previous price list immediately.' : 'This scheduled change will not take effect.'],
      notification: 'No',
    };
  },
  execute: async (_p, r, ctx) => {
    const t = r.data.target as MessPricingConfig;
    const result = await setMessPricingActive(String(t._id), false, ctx.admin.email, ctx.today);
    if (!result.ok) throw new ActionError('message' in result ? result.message : 'Price list not found.');
    return { summary: `Deactivated price list from ${formatShortDate(t.effectiveFrom)}`, message: `Done — the price list from ${formatShortDate(t.effectiveFrom)} is deactivated.` };
  },
};

// ─── Temporary Mess Menu Updates ─────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

const WEEKDAY_NAMES_MAP = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function getWeekdayForDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_NAMES_MAP[dt.getUTCDay()];
}

export const temporaryMessUpdateAction: ActionDefinition = {
  name: 'temporary_mess_update',
  fields: [
    {
      name: 'date',
      label: 'Date',
      describe: 'Date of the meal (e.g. today, tomorrow, YYYY-MM-DD)',
      kind: 'date',
      required: true,
      question: 'Which day is this update for?',
    },
    {
      name: 'meal',
      label: 'Meal',
      describe: 'breakfast | lunch | snacks | dinner',
      kind: 'enum',
      enumValues: {
        breakfast: /^breakfast$/,
        lunch: /^lunch$/,
        snacks: /^snacks?$/,
        dinner: /^dinner$/,
      },
      enumLabels: MEAL_LABEL,
      required: true,
      question: 'Which meal should I update?',
    },
    {
      name: 'updateType',
      label: 'Change type',
      describe: 'item_substitution | item_unavailable | special_menu | timing_change | general_update',
      kind: 'enum',
      enumValues: {
        item_substitution: /^(?:item_)?substitut(?:e|ion)|replace(?:ment)?|serve.*instead|instead$/,
        item_unavailable: /^(?:item_)?unavailable|not available|out of stock|unavailable$/,
        special_menu: /^special(?:_menu)?|feast$/,
        timing_change: /^timing(?:_change)?|timings?$/,
        general_update: /^general(?:_update)?|menu update|other$/,
      },
      enumLabels: {
        item_substitution: 'Replace an item',
        item_unavailable: 'Item unavailable',
        special_menu: 'Add a special item',
        timing_change: 'Change timing',
        general_update: 'General update',
      },
      required: true,
      question: 'What would you like to change?',
    },
    {
      name: 'diet',
      label: 'Diet',
      describe: 'veg | non-veg | both',
      kind: 'enum',
      enumValues: {
        veg: /^(?:veg|vegetarian)$/,
        'non-veg': /^(?:non-?veg|non-?vegetarian)$/,
        both: /^(?:both|all)$/,
      },
      enumLabels: { veg: 'Veg', 'non-veg': 'Non-veg', both: 'Both' },
      required: false,
      question: 'Is this change for veg, non-veg, or both?',
    },
    {
      name: 'originalItem',
      label: 'Affected item',
      describe: 'Item being replaced or unavailable',
      kind: 'text',
      required: (p) => p.updateType === 'item_substitution' || p.updateType === 'item_unavailable',
      question: (p) => (p.updateType === 'item_unavailable' ? 'Which item is unavailable?' : 'Which item should be replaced?'),
    },
    {
      name: 'replacementItem',
      label: 'Replacement dish',
      describe: 'Replacement dish to serve',
      kind: 'text',
      required: (p) => p.updateType === 'item_substitution',
      question: (p) => (p.originalItem ? `What should be served instead of ${p.originalItem}?` : 'What should be served instead?'),
    },
    {
      name: 'specialItems',
      label: 'Special items',
      describe: 'Dishes for the special menu',
      kind: 'text',
      required: (p) => p.updateType === 'special_menu',
      question: 'What special items will be served?',
    },
    {
      name: 'newTiming',
      label: 'New timing',
      describe: 'Adjusted meal hours (e.g. 7:30 AM - 10:30 AM)',
      kind: 'text',
      required: (p) => p.updateType === 'timing_change',
      question: 'What is the updated timing for this meal?',
    },
    {
      name: 'reason',
      label: 'Reason',
      describe: 'Reason for the temporary change (optional)',
      kind: 'text',
      required: false,
      question: 'What is the reason for this change? (optional)',
    },
  ],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);

    // 1. Resolve date
    let targetDate: string | undefined;
    if (p.date) {
      const normalized = normalizeDate(p.date, ctx.today);
      if (normalized.ok) {
        targetDate = normalized.value;
        r.params.date = targetDate;
      } else {
        r.fieldErrors.date = normalized.error;
      }
    } else {
      r.questions.date = 'Which day is this update for?';
      r.options.date = [
        { label: `Today (${formatShortDate(ctx.today)})`, value: ctx.today },
        { label: `Tomorrow (${formatShortDate(addDays(ctx.today, 1))})`, value: addDays(ctx.today, 1) },
      ];
      return r;
    }

    if (!targetDate) return r;

    // Load recurring mess menus to find backend items
    const weekday = getWeekdayForDate(targetDate);
    const vegMenu = await getMessMenu(ctx.campusId, 'veg');
    const nonVegMenu = await getMessMenu(ctx.campusId, 'non-veg');

    const getItemsForMeal = (mealKey: MealKey): string[] => {
      const items: string[] = [];
      for (const menu of [vegMenu, nonVegMenu]) {
        if (!menu?.days) continue;
        const dayEntry = menu.days.find((d) => d.day === weekday);
        if (dayEntry?.meals?.[mealKey]) {
          const m = dayEntry.meals[mealKey];
          items.push(...m.vegItems, ...m.nonVegItems, ...m.compulsoryItems);
        }
      }
      return [...new Set(items)];
    };

    // 2. Meal resolution and backend-derived disambiguation
    const originalItemStr = str(p.originalItem)?.toLowerCase().trim();
    if (originalItemStr && !p.meal) {
      const matchingMeals: MealKey[] = [];
      for (const m of MEAL_KEYS) {
        const dishes = getItemsForMeal(m);
        if (dishes.some((d) => d.toLowerCase().includes(originalItemStr))) {
          matchingMeals.push(m);
        }
      }

      if (matchingMeals.length > 1) {
        const dateWord =
          targetDate === ctx.today
            ? 'today'
            : targetDate === addDays(ctx.today, 1)
              ? 'tomorrow'
              : `on ${formatShortDate(targetDate)}`;
        const mealList = matchingMeals.map(capitalize).join(' and ');
        r.questions.meal = `I found ${p.originalItem} on ${dateWord}'s ${mealList} menus. Which meal should I update?`;
        r.options.meal = matchingMeals.map((m) => ({ label: capitalize(m), value: m }));
        return r;
      } else if (matchingMeals.length === 1) {
        r.params.meal = matchingMeals[0];
      }
    }

    if (!r.params.meal && !p.meal) {
      r.questions.meal = 'Which meal should I update?';
      r.options.meal = [
        { label: 'Breakfast', value: 'breakfast' },
        { label: 'Lunch', value: 'lunch' },
        { label: 'Snacks', value: 'snacks' },
        { label: 'Dinner', value: 'dinner' },
      ];
      return r;
    }

    const currentMeal = (r.params.meal || p.meal) as MealKey;

    // 3. updateType resolution
    if (!p.updateType) {
      r.questions.updateType = 'What would you like to change?';
      r.options.updateType = [
        { label: 'Replace an item', value: 'item_substitution' },
        { label: 'Add a special item', value: 'special_menu' },
        { label: 'Change timing', value: 'timing_change' },
      ];
      return r;
    }

    // 4. Item resolution options from recurring menu
    if (p.updateType === 'item_substitution' || p.updateType === 'item_unavailable') {
      const mealItems = getItemsForMeal(currentMeal);
      if (!p.originalItem && mealItems.length > 0) {
        r.options.originalItem = mealItems.map((item) => ({ label: item, value: item }));
      }
    }

    // Diet options if diet is asked
    r.options.diet = [
      { label: 'Veg', value: 'veg' },
      { label: 'Non-veg', value: 'non-veg' },
      { label: 'Both', value: 'both' },
    ];

    r.data.date = targetDate;
    r.data.meal = currentMeal;
    return r;
  },
  validate: async (p, _r, ctx) => {
    const issues: ValidationIssue[] = [];
    const date = str(p.date);
    if (!date) {
      issues.push({ field: 'date', message: 'Date is required.' });
    } else if (date < ctx.today) {
      issues.push({ field: 'date', message: 'Cannot create a mess update for a past date.' });
    }

    if (!p.meal) {
      issues.push({ field: 'meal', message: 'Meal is required.' });
    }

    if (!p.updateType) {
      issues.push({ field: 'updateType', message: 'Update type is required.' });
    }

    if (p.updateType === 'item_substitution') {
      if (!p.originalItem) issues.push({ field: 'originalItem', message: 'The item to replace is required.' });
      if (!p.replacementItem) issues.push({ field: 'replacementItem', message: 'The replacement item is required.' });
    } else if (p.updateType === 'item_unavailable') {
      if (!p.originalItem) issues.push({ field: 'originalItem', message: 'The unavailable item is required.' });
    } else if (p.updateType === 'special_menu') {
      if (!p.specialItems) issues.push({ field: 'specialItems', message: 'Special menu items are required.' });
    } else if (p.updateType === 'timing_change') {
      if (!p.newTiming) issues.push({ field: 'newTiming', message: 'The updated meal timing is required.' });
    }

    return issues;
  },
  preview: async (p, _r, ctx) => {
    const date = String(p.date);
    const meal = String(p.meal) as MealKey;
    const diet = (p.diet ? String(p.diet) : 'both') as DietType;
    const updateType = String(p.updateType) as MessUpdateType;
    const reason = p.reason ? String(p.reason) : null;
    const dateLabel =
      date === ctx.today
        ? `Today (${formatLongDate(date)})`
        : date === addDays(ctx.today, 1)
          ? `Tomorrow (${formatLongDate(date)})`
          : formatLongDate(date);

    let updateHeadline = '';
    let updateDescription = '';

    switch (updateType) {
      case 'item_substitution':
        updateHeadline = `${p.replacementItem} instead of ${p.originalItem}`;
        updateDescription = `${p.replacementItem} will be served instead of ${p.originalItem}`;
        break;
      case 'item_unavailable':
        updateHeadline = `${p.originalItem} unavailable`;
        updateDescription = `${p.originalItem} is unavailable and will not be served`;
        break;
      case 'special_menu':
        updateHeadline = `Special ${capitalize(meal)}`;
        updateDescription = `Special menu featuring ${p.specialItems}`;
        break;
      case 'timing_change':
        updateHeadline = `Timing: ${p.newTiming}`;
        updateDescription = `Meal timing updated to ${p.newTiming}`;
        break;
      case 'general_update':
      default:
        updateHeadline = `Menu update for ${capitalize(meal)}`;
        updateDescription = String(p.replacementItem || 'Menu update');
        break;
    }

    return {
      title: `${capitalize(meal)} Update`,
      subtitle: `${dateLabel} · ${updateHeadline}`,
      rows: [
        { label: 'Meal', value: capitalize(meal) },
        { label: 'Date', value: dateLabel },
        ...(diet !== 'both' ? [{ label: 'Diet', value: capitalize(diet) }] : []),
        { label: 'Update', value: updateDescription },
        ...(reason ? [{ label: 'Reason', value: reason }] : []),
        { label: 'Mess update', value: '✓ Active in-app meal update' },
        { label: 'Student communication', value: '✓ Publish campus announcement\n✓ Send push notification' },
        { label: 'Auto-expiry', value: `After ${capitalize(meal)} (${formatShortDate(date)})` },
      ],
      warnings: [
        'This will publish a temporary mess update on the menu, post a campus announcement, and notify students via push notification.',
      ],
      notification: 'Push notification will be sent to students subscribed to Mess updates (iitj_mess).',
    };
  },
  execute: async (p, _r, ctx) => {
    const date = String(p.date);
    const meal = String(p.meal) as MealKey;
    const diet = (p.diet ? String(p.diet) : 'both') as DietType;
    const updateType = String(p.updateType) as MessUpdateType;
    const originalItem = p.originalItem ? String(p.originalItem) : undefined;
    const replacementItem = p.replacementItem ? String(p.replacementItem) : undefined;
    const specialItems = p.specialItems
      ? Array.isArray(p.specialItems)
        ? p.specialItems.map(String)
        : String(p.specialItems).split(/,\s*/)
      : undefined;
    const newTiming = p.newTiming ? { label: String(p.newTiming) } : undefined;
    const reason = p.reason ? String(p.reason) : undefined;

    await createTemporaryMessUpdateService(
      {
        campusId: ctx.campusId,
        date,
        meal,
        diet,
        updateType,
        originalItem,
        replacementItem,
        specialItems,
        newTiming,
        reason,
        sendPush: true,
        createNotice: true,
      },
      ctx.admin.email,
    );

    const what = `${capitalize(meal)} update on ${formatShortDate(date)}`;
    return {
      summary: `Created temporary mess update for ${what}, published campus announcement, and sent push notification`,
      message: `Done — temporary update for ${what} is active. A campus announcement has been published and push notification dispatched.`,
    };
  },
};

