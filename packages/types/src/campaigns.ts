import { z } from 'zod';

/**
 * Discover (Campaign Platform) — Phase 1: backend foundation only.
 * Extends the original campaign draft (type/placement/visuals/targeting/
 * action/status/dates/trackingId/audit fields) rather than replacing it —
 * every field name below that also existed in the original draft keeps its
 * exact name and meaning.
 */

export const CAMPAIGN_TYPES = ['banner', 'announcement', 'event', 'survey', 'promotion', 'alert'] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_PLACEMENTS = ['home_hero', 'inline_transport', 'inline_mess', 'modal', 'discover_feed'] as const;
export type CampaignPlacement = (typeof CAMPAIGN_PLACEMENTS)[number];

/** How the campaign is visually presented — independent of `placement` (where it appears). */
export const CAMPAIGN_DISPLAY_TYPES = ['banner', 'card', 'carousel', 'popup', 'fullscreen'] as const;
export type CampaignDisplayType = (typeof CAMPAIGN_DISPLAY_TYPES)[number];

export const CAMPAIGN_ACTION_TYPES = ['link', 'deep_link', 'phone', 'whatsapp', 'payment', 'survey', 'none'] as const;
export type CampaignActionType = (typeof CAMPAIGN_ACTION_TYPES)[number];

export const CAMPAIGN_STATUSES = ['draft', 'published', 'paused', 'archived'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

const optionalUrl = z.string().trim().url().optional().or(z.literal(''));

export const campaignVisualsSchema = z.object({
  imageUrl: optionalUrl,
  /** Future-ready multi-image support (e.g. a carousel) — `imageUrl` above stays the primary/single image for existing consumers. */
  images: z.array(z.string().trim().url()).max(10, 'A campaign can have at most 10 images.').default([]),
  videoUrl: optionalUrl,
  themeColor: z.string().trim().max(20).optional(),
});

export const campaignTargetingSchema = z.object({
  minAppVersion: z.string().trim().max(20).optional(),
  maxAppVersion: z.string().trim().max(20).optional(),
  roles: z.array(z.string()).default([]),
  hostels: z.array(z.string()).default([]),
});

/** The CTA button shown on the campaign — distinct from `deepLink` below, which is where tapping the campaign body/image itself navigates. */
export const campaignCtaSchema = z.object({
  label: z.string().trim().min(1).max(60),
  actionType: z.enum(CAMPAIGN_ACTION_TYPES),
  payload: z.string().trim().min(1).max(500),
});

/**
 * Independent, simultaneous contact/action methods for the Campaign Details
 * page (Phase 4) — distinct from `cta` (one single button) since a campaign
 * may reasonably expose several of these at once (e.g. a sponsor with both a
 * website and an Instagram). All optional; a campaign can set any subset.
 */
export const campaignLinksSchema = z.object({
  website: optionalUrl,
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  instagram: optionalUrl,
  email: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().email().optional()),
  locationUrl: optionalUrl,
});

const campaignBaseSchema = z.object({
  campusId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  /** Short secondary line shown under the title — distinct from the longer `description`. */
  subtitle: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),

  type: z.enum(CAMPAIGN_TYPES),
  category: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(40, 'Each tag must be 40 characters or fewer.'))
    .max(20, 'A campaign can have at most 20 tags.')
    .default([]),

  placement: z.enum(CAMPAIGN_PLACEMENTS),
  displayType: z.enum(CAMPAIGN_DISPLAY_TYPES),
  visuals: campaignVisualsSchema.default({ images: [] }),
  targeting: campaignTargetingSchema.default({ roles: [], hostels: [] }),

  /** Where tapping the campaign's body/image navigates — an in-app route/screen key. */
  deepLink: z.string().trim().max(500).optional(),
  /** An external URL destination — distinct from `deepLink` (in-app) and independent of the CTA button's own payload. */
  externalLink: optionalUrl,
  /** The CTA button, if the campaign has one — separate from `deepLink`/`externalLink`. */
  cta: campaignCtaSchema.optional(),
  /** Contact/action methods shown on the Campaign Details page — see campaignLinksSchema. */
  links: campaignLinksSchema.optional(),

  status: z.enum(CAMPAIGN_STATUSES).default('draft'),
  /** Independent kill-switch from `status` — matches CampusApp.isEnabled's convention. A paused/archived campaign is already hidden regardless, but this lets an admin disable a published one without losing its lifecycle state. */
  isEnabled: z.boolean().default(true),
  featured: z.boolean().default(false),
  /** Lower number sorts first among concurrently-active campaigns — matches the Campus Directory Role.priority convention. */
  priority: z.number().int().default(0),

  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),

  /** Correlates with the existing generic analytics-event pipeline (AnalyticsEventDoc) — not a replacement for it. */
  trackingId: z.string().trim().max(100).optional(),
  impressionCount: z.number().int().min(0).default(0),
  clickCount: z.number().int().min(0).default(0),
});

export const campaignCreateSchema = campaignBaseSchema.refine(
  (v) => new Date(v.endDate) > new Date(v.startDate),
  { message: 'endDate must be after startDate', path: ['endDate'] },
);

export const campaignUpdateSchema = campaignBaseSchema.omit({ campusId: true }).partial();

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
export type CampaignLinks = z.infer<typeof campaignLinksSchema>;

/** Stored/served shape — audit + lifecycle fields are stamped server-side, never client-submitted. */
export interface CampaignDoc extends CampaignCreateInput {
  _id?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  /** Soft-delete marker — omitted/null means active, mirrors NoticeDoc. */
  deletedAt?: string | null;
}
