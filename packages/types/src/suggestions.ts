/**
 * Shared feedback/suggestion category vocabulary — used by the mobile
 * category chips, the backend's validation enum, and the admin panel's
 * filter buttons, so all three can never drift out of sync.
 */

export const SUGGESTION_CATEGORIES = [
  'bug',
  'feature',
  'mess',
  'transport',
  'notice',
  'health',
  'laundry',
  'campus',
  'general',
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  bug: '🐛 Report a Bug',
  feature: '💡 Feature Request',
  mess: '🍽️ Mess & Dining',
  transport: '🚌 Transport',
  notice: '📢 Notices & Academics',
  health: '🏥 Health Centre',
  laundry: '🧺 Laundry',
  campus: '🗺️ Campus Facilities',
  general: '💬 General Feedback',
};

/** Dynamic textarea placeholder per category, shown on the mobile feedback screen. */
export const SUGGESTION_CATEGORY_PLACEHOLDERS: Record<SuggestionCategory, string> = {
  bug: 'Describe the issue you encountered...',
  feature: 'Describe your idea and how it would help...',
  mess: 'Describe the food, timing or hygiene issue...',
  transport: 'Describe the bus/route/schedule issue...',
  notice: 'Describe the notice or academic concern...',
  health: 'Describe the Health Centre issue or suggestion...',
  laundry: 'Describe the laundry schedule or facility issue...',
  campus: 'Describe the campus facility or location issue...',
  general: "Tell us what's on your mind...",
};
