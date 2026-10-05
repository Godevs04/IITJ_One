/**
 * Built-in deterministic interpreter — the development/test provider (no network, no API key).
 *
 * It recognises the supported phrasings with patterns and extracts flat parameters. It is deliberately
 * conservative: anything it does not understand becomes `unsupported`, never a guess. Its output goes
 * through exactly the same validation as a real LLM's.
 */
import type { AiInterpretation } from '@iitj1/types';
import type { AiInterpreter, InterpretRequest } from './types';

type Params = NonNullable<AiInterpretation['parameters']>;

const INJECTION =
  /ignore (?:all |your |any |previous |prior |the |these |those )*(?:instructions|restrictions|rules|guardrails|limits|system|confirmation|permissions?|admin)|\b(?:drop|truncate|wipe|erase|dump)\b.*\b(?:database|collection|table|db|records)\b|(?:delete|cancel|remove) (?:all|every|the entire|entire|everything)|all (?:the )?(?:database )?records|\bsql\b|\bmongo|\$where|\bdb\.|<script|rm -rf|\bshell\b|execute (?:code|command|script|query|this)|\bcall (?:the )?notification\b|eval\(|system prompt|jailbreak|you are now|developer mode|api key|password|credentials/;

const DATE_RE =
  /\b(today|tonight|tomorrow|day after tomorrow|yesterday|(?:next |this )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)? (?:of )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:,? \d{4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/;
const TIME_RE = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))|\b(\d{1,2}:\d{2})\b/;
const PRICE_RE = /(?:₹|\brs\.?\s*|\binr\s*)\s*(-?\d+(?:\.\d+)?)|(-?\d+(?:\.\d+)?)\s*(?:rupees|rs\b)/;
const MESS_WORDS = /\b(?:price|prices|pricing|mess|pay ?(?:&|and|n) ?use|veg|non-?veg|breakfast|lunch|dinner|snacks?|thali|regular plan)\b|₹/;

const SMALL = new Set(['a', 'an', 'the', 'at', 'to', 'of', 'on', 'in', 'for', 'and', 'or', 'by', 'from']);

/** "the library will close at 6 PM today." → "Library Will Close at 6 PM Today" */
export function deriveTitle(text: string): string {
  const words = text.replace(/[.!?]+$/, '').replace(/^(?:that|the)\s+/i, '').split(/\s+/).slice(0, 8);
  const title = words
    .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : /^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
  return title.length > 60 ? `${title.slice(0, 59)}…` : title;
}

function sentence(text: string): string {
  const t = text.trim().replace(/^["“]|["”]$/g, '');
  if (!t) return t;
  const s = t[0].toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function extractSlots(t: string): Params {
  const p: Params = {};
  const date = DATE_RE.exec(t);
  if (date) p.date = date[1];
  const time = TIME_RE.exec(t);
  if (time) p.time = (time[1] ?? time[2]).replace(/\./g, '');
  const price = PRICE_RE.exec(t);
  if (price) p.price = price[1] ?? price[2];
  if (/\bnon[- ]?veg(?:etarian)?\b/.test(t)) p.diet = 'nonVeg';
  else if (/\begg\b/.test(t)) p.diet = 'egg';
  else if (/\bveg(?:etarian)?\b/.test(t)) p.diet = 'veg';
  const meal = /\b(breakfast|lunch|snacks?|dinner)\b/.exec(t);
  if (meal) p.meal = meal[1].replace(/s$/, '') === 'snack' ? 'snacks' : meal[1];
  if (/pay ?(?:&|and|n) ?use|per meal/.test(t)) p.plan = 'pay_and_use';
  else if (/\bregular\b|\bmonthly\b|per day/.test(t)) p.plan = 'regular';
  const route = /\b(?:route|bus)\s*(?:no\.?|number|#)?\s*(\d+)\b/.exec(t) ?? /\bb\s?(\d+)\b/.exec(t);
  if (route) p.route = /\bb\s?\d/.test(route[0]) ? `B${route[1]}` : `Route ${route[1]}`;
  if (/(?:leaving|from) campus|\bdeparture\b|outbound/.test(t)) p.direction = 'departure';
  else if (/(?:to|returning to|coming to|back to) campus|\barrival\b|return trip/.test(t)) p.direction = 'arrival';
  if (/without (?:a |any )?(?:push|notification)|no (?:push|notification)|don'?t (?:notify|send)/.test(t)) p.notification = false;
  else if (/(?:with|and send|send|and) (?:a )?(?:push|notification)|and notify/.test(t)) p.notification = true;
  if (/\b(?:mess|food|dining)\s+(?:notice|announcement)\b/.test(t)) p.category = 'mess';
  else if (/\b(?:transport|bus|buses)\s+(?:notice|announcement)\b/.test(t)) p.category = 'transport';
  else if (/\b(?:institute|academic|academics|office)\s+(?:notice|announcement)\b/.test(t)) p.category = 'institute';
  else if (/\b(?:orientation|freshers?)\s+(?:notice|announcement)\b/.test(t)) p.category = 'orientation';
  const tod = /\b(morning|afternoon|evening|night)\b/.exec(t);
  if (tod) p.timeOfDay = tod[1];
  const until = /(?:until|till|through)\s+([a-z0-9\/\-]+)/i.exec(t);
  if (until && DATE_RE.test(until[1])) p.until = DATE_RE.exec(until[1])![1];
  return p;
}

function detectQuery(t: string, slots: Params): AiInterpretation | null {
  const asks = /^(?:what|which|show|list|how much|how many|are there|is there|tell me|give me|when)\b/.test(t) || /\?\s*$/.test(t);
  if (!asks || /^(?:can you |could you |please )?(?:post|cancel|delete|remove|add|change|update|create)\b/.test(t)) return null;
  const pick = (keys: string[]) => Object.fromEntries(keys.filter((k) => slots[k] !== undefined).map((k) => [k, slots[k]]));
  if (MESS_WORDS.test(t) && !/\bbus/.test(t)) return { intent: 'query', query: 'mess_pricing', parameters: pick(['plan', 'meal', 'diet']) };
  if (/\b(?:alert|alerts)\b/.test(t)) return { intent: 'query', query: 'transport_alerts', parameters: {} };
  if (/\b(?:bus|buses|trips?|transport|shuttle|route)\b/.test(t)) return { intent: 'query', query: 'buses', parameters: pick(['date', 'route']) };
  if (/\bnotices?\b/.test(t)) return { intent: 'query', query: 'notices', parameters: {} };
  if (/\bholidays?\b/.test(t)) return { intent: 'query', query: 'holidays', parameters: {} };
  return null;
}

function after(re: RegExp, raw: string): string | undefined {
  const m = re.exec(raw);
  return m?.[1]?.trim().replace(/[.!?]+$/, '') || undefined;
}

function detectCommand(raw: string, t: string, slots: Params): AiInterpretation | null {
  // Holidays
  if (/\bholiday\b/.test(t)) {
    if (/\b(?:remove|delete|cancel|drop|scrap)\b/.test(t)) {
      return {
        intent: 'command',
        action: 'remove_holiday',
        parameters: {
          holiday:
            after(/(?:remove|delete|cancel|drop|scrap)\s+(?:the\s+)?holiday\s+(?:for|called|named)?\s*(.+?)[.!]?$/i, raw) ??
            after(/(?:remove|delete|cancel|drop|scrap)\s+(?:the\s+)?(.+?)\s+holiday/i, raw) ??
            after(/holiday\s+(?:for|on|called|named)\s+(.+)$/i, raw) ??
            '',
        },
      };
    }
    if (/\b(?:move|change|reschedule|rename|update|edit|shift|turn (?:off|on)|deactivate|activate|disable)\b/.test(t)) {
      const params: Params = {
        holiday:
          after(/(?:turn off|turn on|deactivate|activate|disable)\s+(?:the\s+)?holiday\s+(?:for|called|named)?\s*(.+?)[.!]?$/i, raw) ??
          after(/(?:move|change|reschedule|update|edit|shift|turn off|turn on|deactivate|activate|disable)\s+(?:the\s+)?(.+?)\s+holiday/i, raw) ??
          '',
      };
      const renameMatch = /rename\s+(?:the\s+)?holiday\s+(.+?)\s+to\s+(.+)$/i.exec(raw);
      if (renameMatch) {
        params.holiday = renameMatch[1].trim();
        params.name = renameMatch[2].trim();
      }
      const newDate = /\b(?:to|on)\s+(.+?)[.!]?$/i.exec(raw);
      if (newDate && DATE_RE.test(newDate[1].toLowerCase()) && !renameMatch) params.date = DATE_RE.exec(newDate[1].toLowerCase())![1];
      if (/turn off|deactivate|disable/.test(t)) params.active = false;
      if (/turn on|\bactivate\b/.test(t)) params.active = true;
      return { intent: 'command', action: 'update_holiday', parameters: params };
    }
    if (/\b(?:add|declare|create|make|mark|set)\b/.test(t)) {
      const forNamed = after(/holiday\s+(?:for|called|named)\s+(.+?)(?:\s+(?:on|as)\b.*|[.!]?$)/i, raw);
      const asHoliday =
        after(/(?:add|declare|create|make|mark|set)\s+(?:a\s+)?(.+?)\s+on\s+[a-z0-9\s,]+?\s+as\s+(?:a\s+|an\s+)?(?:institute\s+)?holiday\b/i, raw) ??
        after(/(?:add|declare|create|make|mark|set)\s+(?:a\s+)?(.+?)\s+as\s+(?:a\s+|an\s+)?(?:institute\s+)?holiday\b/i, raw) ??
        after(/(?:add|declare|create|make|mark|set)\s+(?:a\s+)?(?:institute\s+)?holiday\s+(?:for|called|named)?\s*(.+?)[.!]?$/i, raw);
      let name: string | undefined = forNamed ?? asHoliday;
      if (name && (/\b(?:next|this)\s+(?:week|month)\b/i.test(name) || /^\d{4}-\d{2}-\d{2}$/.test(name) || DATE_RE.test(name.toLowerCase()))) {
        name = undefined;
      }
      const params: Params = {};
      if (name) params.name = name.replace(/^(?:the)\s+/i, '');
      if (slots.date) params.date = slots.date;
      return { intent: 'command', action: 'create_holiday', parameters: params };
    }
  }

  // Notices
  if (/\bnotices?\b|\bannouncement\b/.test(t)) {
    const ref = after(/(?:notice|announcement)\s+(?:about|regarding|on|for|titled|called|named|that says|saying)\s+(.+?)(?:\s+(?:to say|to read|until|till|so it)\b.*)?$/i, raw);
    if (/\b(?:remove|delete|take down|unpublish|withdraw)\b/.test(t)) return { intent: 'command', action: 'delete_notice', parameters: ref ? { notice: ref } : {} };
    if (/\b(?:edit|update|change|modify|extend|fix|correct)\b/.test(t)) {
      const params: Params = ref ? { notice: ref } : {};
      const title = after(/title\s+(?:to|as)\s+["“]?([^"”]+)["”]?$/i, raw) ?? after(/title\s+["“](.+?)["”]/i, raw);
      if (title) params.title = title.replace(/^["“]|["”]$/g, '').trim();
      const body = after(/(?:to say|to read|message to|text to)\s+(.+)$/i, raw);
      if (body) params.body = sentence(body);
      const until = /(?:until|till|extend (?:it )?to)\s+(.+)$/i.exec(raw);
      if (until && DATE_RE.test(until[1].toLowerCase())) params.until = DATE_RE.exec(until[1].toLowerCase())![1];
      return { intent: 'command', action: 'update_notice', parameters: params };
    }
    if (/\b(?:post|publish|create|add|put up|make|send|write|issue)\b/.test(t)) {
      const body = after(/(?:notice|announcement)\s*(?:saying|that says|stating|to say|:|-)?\s*(?:that\s+)?(.+)$/i, raw);
      const params: Params = {};
      const cleaned = body?.replace(/\s*,?\s*(?:without (?:a |any )?(?:push|notification)|and notify (?:students|everyone)|with (?:a )?(?:push|notification))\s*$/i, '');
      if (cleaned) {
        params.body = sentence(cleaned);
        params.title = deriveTitle(cleaned);
      }
      const explicitTitle = /(?:titled|with title)\s+["“](.+?)["”]/i.exec(raw) ?? /(?:titled|with title)\s+([^,]+?)\s+saying\b/i.exec(raw);
      if (explicitTitle) params.title = explicitTitle[1].trim();
      if (slots.category) params.category = slots.category;
      if (slots.until) params.until = slots.until;
      if (slots.date) params.date = slots.date;
      if (slots.notification !== undefined) params.notification = slots.notification;
      if (/\b(?:important|urgent)\b/.test(t)) params.important = true;
      return { intent: 'command', action: 'create_notice', parameters: params };
    }
  }

  // "Tell students …" — a transport alert when it is about buses, otherwise a notice.
  const broadcast = /^(?:please\s+)?(?:tell|inform|notify|let|warn|alert)\s+(?:all\s+|the\s+)?(?:students|everyone|everybody|riders|people|users|residents)\s+(?:know\s+)?(?:that\s+)?(.+)$/i.exec(raw.trim());
  if (broadcast) {
    const message = sentence(broadcast[1]);
    if (/\b(?:bus|buses|route|b\d|transport|shuttle|trip|trips)\b/i.test(broadcast[1])) {
      return { intent: 'command', action: 'create_transport_alert', parameters: { title: deriveTitle(broadcast[1]), message, ...(slots.date ? { date: slots.date } : {}) } };
    }
    return { intent: 'command', action: 'create_notice', parameters: { title: deriveTitle(broadcast[1]), body: message } };
  }

  // Transport alerts
  if (/\balert\b/.test(t)) {
    if (/\b(?:edit|update|change|end|turn off|switch off|deactivate|disable|extend|take down|turn on|activate|delete|remove)\b/.test(t)) {
      const params: Params = {};
      const ref = after(/alert\s+(?:about|for|on|regarding|titled|called)\s+(.+?)(?:\s+(?:to say|until|till)\b.*)?$/i, raw) ?? after(/(?:the\s+)(.+?)\s+alert/i, raw);
      if (ref && !/^(?:the\s+)?alert$/i.test(ref)) params.alert = ref;
      if (/turn off|switch off|deactivate|disable|\bend\b|take down|delete|remove/.test(t)) params.active = false;
      else if (/turn on|\bactivate\b/.test(t)) params.active = true;
      const until = /(?:until|till|extend (?:it )?to)\s+(.+)$/i.exec(raw);
      if (until && DATE_RE.test(until[1].toLowerCase())) params.until = DATE_RE.exec(until[1].toLowerCase())![1];
      const message = after(/(?:to say|message to)\s+(.+)$/i, raw);
      if (message) params.message = sentence(message);
      return { intent: 'command', action: 'update_transport_alert', parameters: params };
    }
    if (/\b(?:post|create|add|put up|publish|issue|send|make)\b/.test(t)) {
      const message = after(/alert\s*(?:saying|that says|that|:|-)?\s*(?:that\s+)?(.+)$/i, raw);
      return { intent: 'command', action: 'create_transport_alert', parameters: message ? { message: sentence(message), title: deriveTitle(message), ...(slots.date ? { date: slots.date } : {}) } : {} };
    }
  }

  // Bus cancellation
  if (
    (/\b(?:cancel|cancelled|call off|scrap|suspend|stop|don't run|not run)\b/.test(t) || /needs to be cancelled/.test(t)) &&
    /\b(?:bus|buses|route|trip|trips|service|b\s?\d)\b/.test(t)
  ) {
    const params: Params = {};
    for (const k of ['route', 'date', 'time', 'direction', 'timeOfDay']) if (slots[k] !== undefined) params[k] = slots[k];
    const reasonMatch = /(?:because|due to|reason:?)\s+(.+)$/i.exec(raw);
    if (reasonMatch) {
      params.reason = reasonMatch[1].trim().replace(/[.!?]+$/, '');
    }
    return { intent: 'command', action: 'cancel_bus_trip', parameters: params };
  }

  // Mess pricing vs Temporary Mess Update
  const isPricingCommand =
    PRICE_RE.test(t) ||
    /\b(?:price|prices|pricing|rates?|cost|rupees?|rs\b|₹)\b/.test(t) ||
    /\bpay\s*(?:&|and|n)\s*use\b/.test(t) ||
    /\bregular\s+plan\b/.test(t);

  if (isPricingCommand) {
    const messParams = (): Params => {
      const params: Params = {};
      for (const k of ['plan', 'meal', 'diet', 'price', 'date']) if (slots[k] !== undefined) params[k] = slots[k];
      return params;
    };
    if (/\b(?:deactivate|disable|turn off|withdraw)\b/.test(t)) {
      return { intent: 'command', action: 'deactivate_mess_pricing', parameters: slots.date ? { date: slots.date } : {} };
    }
    if (/\b(?:schedule|create|add|set up)\b/.test(t)) {
      return { intent: 'command', action: 'create_mess_pricing', parameters: messParams() };
    }
    if (/\b(?:change|update|set|raise|lower|increase|decrease|make|revise|reduce|cut)\b/.test(t)) {
      const params = messParams();
      if (!Object.keys(params).length) return null;
      return { intent: 'command', action: 'update_mess_pricing', parameters: params };
    }
  }

  // Temporary Mess Update
  const isMessUpdateCommand =
    /\b(?:menu|mess\s+update|replace|substitute|serve.*instead|unavailable|not available|out of stock|special|timing|timings)\b/.test(t) ||
    (/\b(?:change|update|modify)\b/.test(t) && /\b(?:menu|breakfast|lunch|dinner|snacks?|food)\b/.test(t));

  if (isMessUpdateCommand) {
    const params: Params = {};
    if (slots.date) params.date = slots.date;
    if (slots.meal) params.meal = slots.meal;
    if (slots.diet) {
      params.diet = slots.diet === 'nonVeg' ? 'non-veg' : slots.diet;
    }

    const reasonMatch = /(?:because|due to|reason:?)\s+(.+)$/i.exec(raw);
    if (reasonMatch) {
      params.reason = reasonMatch[1].trim().replace(/[.!?]+$/, '');
    }

    if (/\b(?:special\s+(?:dinner|lunch|breakfast|snacks?|menu)|special\b)/.test(t)) {
      params.updateType = 'special_menu';
      const specialMatch = /(?:special\s+(?:dinner|lunch|breakfast|snacks?|menu)?\s*(?:with|featuring|of|includes?|having)?\s+)(.+?)(?:\s+because|\s+due to|[.!]?$)/i.exec(raw);
      if (specialMatch && specialMatch[1].trim() && !/^(?:dinner|lunch|breakfast|snacks?|menu|tomorrow|today)$/i.test(specialMatch[1].trim())) {
        params.specialItems = specialMatch[1].trim();
      }
    } else if (/\btimings?\b/.test(t)) {
      params.updateType = 'timing_change';
      const timeMatch = /(?:timing(?:s)?\s*(?:is|are)?\s*(?:changed|shifted|updated)?\s*(?:to\s+)?)(.+?)(?:\s+because|\s+due to|[.!]?$)/i.exec(raw);
      if (timeMatch && /\d/.test(timeMatch[1])) {
        params.newTiming = timeMatch[1].trim();
      }
    } else if (/\b(?:unavailable|not available|out of stock|no\s+[a-z]+(?:\s+today|\s+tomorrow))\b/.test(t)) {
      if (/\b(?:instead|replace|serve)\b/.test(t)) {
        params.updateType = 'item_substitution';
      } else {
        params.updateType = 'item_unavailable';
      }
      const unavailMatch =
        /(?:([a-z\s]+?)\s+is\s+(?:currently\s+)?(?:un|not )available)/i.exec(raw) ??
        /(?:no\s+([a-z\s]+?)\s+(?:today|tomorrow|for\s+[a-z]+))/i.exec(raw);
      if (unavailMatch) {
        params.originalItem = unavailMatch[1]
          .replace(/\b(?:tomorrow|today|breakfast|lunch|dinner|snacks?|mess|food|the)\b/gi, '')
          .trim();
      }
    } else if (/\b(?:replace|instead|substitute|serve\s+[a-z\s]+\s+instead)\b/.test(t)) {
      params.updateType = 'item_substitution';
    }

    const serveInsteadOf = /serve\s+([a-z\s]+?)\s+instead\s+of\s+([a-z\s]+?)(?:\s+because|\s+due to|[.!]?$)/i.exec(raw);
    if (serveInsteadOf) {
      params.replacementItem = serveInsteadOf[1].trim();
      params.originalItem = serveInsteadOf[2].trim();
      params.updateType = 'item_substitution';
    }

    const replaceWith = /replace\s+([a-z\s]+?)\s+with\s+([a-z\s]+?)(?:\s+because|\s+due to|[.!]?$)/i.exec(raw);
    if (replaceWith) {
      params.originalItem = replaceWith[1].replace(/\b(?:tomorrow|today|breakfast|lunch|dinner|snacks?|the)\b/gi, '').trim();
      params.replacementItem = replaceWith[2].trim();
      params.updateType = 'item_substitution';
    }

    const serveInstead = /serve\s+([a-z\s]+?)\s+instead(?:\s+because|\s+due to|[.!]?$)/i.exec(raw);
    if (serveInstead && !params.replacementItem) {
      params.replacementItem = serveInstead[1].trim();
      params.updateType = 'item_substitution';
    }

    const replaceJust = /\breplace\s+([a-z\s]+?)(?:\s+tomorrow|\s+today|\s+for\s+[a-z]+|[.!]?$)/i.exec(raw);
    if (replaceJust && !params.originalItem) {
      params.originalItem = replaceJust[1].replace(/\b(?:tomorrow|today|breakfast|lunch|dinner|snacks?|the)\b/gi, '').trim();
      params.updateType = 'item_substitution';
    }

    if (Object.keys(params).length === 0) return null;
    return { intent: 'command', action: 'temporary_mess_update', parameters: params };
  }

  return null;
}

export function interpretWithRules(req: InterpretRequest): AiInterpretation {
  const raw = req.message.trim().replace(/[’‘]/g, "'");
  const t = raw.toLowerCase();
  const pending = req.pending;

  if (INJECTION.test(t)) return { intent: 'unsupported' };
  if (/\btomorrow\b/.test(t) && /\byesterday\b/.test(t)) return { intent: 'unsupported' };
  if (/^(?:please\s+)?(?:cancel|forget|scrap|drop|abort|stop)\s+(?:that|it|this)\b|never ?mind|^(?:cancel|stop|abort)[.!]*$|^forget it\b/.test(t)) return { intent: 'cancel_pending' };
  if (/^(?:yes|yep|yeah|yup|y|confirm(?:ed)?|go ahead|do it|ok(?:ay)?|sure|proceed|looks good|post it|send it)[.! ]*$/.test(t)) return { intent: 'confirm' };
  if (/^(?:hi|hello|hey|help|what can you do)\b/.test(t) && t.length < 40) return { intent: 'help' };

  const slots = extractSlots(t);
  const query = detectQuery(t, slots);
  if (query) return query;

  const command = detectCommand(raw, t, slots);
  if (command) {
    if (pending && command.action === pending.action) return { intent: 'update_pending', parameters: command.parameters ?? {} };
    return command;
  }

  if (pending) {
    const params: Params = { ...slots };
    const reasonMatch = /(?:because|due to|reason:?)\s+(.+)$/i.exec(raw);
    if (reasonMatch) {
      params.reason = reasonMatch[1].trim().replace(/[.!?]+$/, '');
    }
    const asked = pending.askedField;
    if (asked && params[asked] === undefined) {
      let answer = raw
        .replace(/^(?:actually|no|ok|okay|sorry|um+)[,\s]+/i, '')
        .replace(/^(?:make (?:it|that)|change (?:it|that) to|it'?s|it is|serve|use)\s+/i, '')
        .replace(/[.!]+$/, '')
        .trim();

      if (asked === 'updateType') {
        const lower = answer.toLowerCase();
        if (/replace|substitution|instead/.test(lower)) answer = 'item_substitution';
        else if (/special/.test(lower)) answer = 'special_menu';
        else if (/timing/.test(lower)) answer = 'timing_change';
        else if (/unavailable/.test(lower)) answer = 'item_unavailable';
        else if (/general/.test(lower)) answer = 'general_update';
      } else if (asked === 'diet') {
        const lower = answer.toLowerCase();
        if (/non-?veg/.test(lower)) answer = 'non-veg';
        else if (/veg/.test(lower)) answer = 'veg';
        else if (/both|all/.test(lower)) answer = 'both';
      }

      if (answer) params[asked] = answer;
    }
    if (Object.keys(params).length) return { intent: 'update_pending', parameters: params };
  }
  return { intent: 'unsupported' };
}


export class RulesInterpreter implements AiInterpreter {
  readonly name = 'rules';
  async interpret(request: InterpretRequest): Promise<unknown> {
    return interpretWithRules(request);
  }
}
