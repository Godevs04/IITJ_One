import type { CampaignPlacement, CampaignDisplayType } from '@iitj1/types';

export const PLACEMENT_LABELS: Record<CampaignPlacement, string> = {
  home_hero: 'Home Hero', inline_transport: 'Inline — Transport', inline_mess: 'Inline — Mess',
  modal: 'Modal', discover_feed: 'Discover Feed',
};

// Labels shown to the admin picking a Home layout (Phase 5). Values are unchanged for
// backward compatibility — only these display labels map them to the requested names.
// `fullscreen` is the dedicated Emergency alert layout (Phase 8) — highest visual
// priority, not dismissible, renders above every other layout on Home.
export const DISPLAY_TYPE_LABELS: Record<CampaignDisplayType, string> = {
  banner: 'Banner', card: 'Hero Card', carousel: 'Carousel', popup: 'Toast', fullscreen: 'Emergency Alert',
};
