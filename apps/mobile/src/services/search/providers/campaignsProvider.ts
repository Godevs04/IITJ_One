import { readCachedModule } from '@/services/sync';
import { matchesAppVersionTargeting } from '@/utils/campaignTargeting';
import type { CampaignDoc } from '@/types/campus';
import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

function getEntries(): SearchEntry[] {
  // The public endpoint already only ever serves published+enabled campaigns
  // within their date window (see getActiveCampaigns) — the cached module is
  // never anything else, so no extra status filtering is needed here, only
  // the same app-version targeting check Home/Discover already apply.
  const campaigns = readCachedModule<CampaignDoc[]>('campaigns') ?? [];

  return campaigns
    .filter((c) => c._id && matchesAppVersionTargeting(c))
    .map((c) => ({
      id: `campaign-${c._id}`,
      title: c.title,
      subtitle: c.subtitle,
      module: 'Discover',
      icon: 'compass-outline',
      category: c.category,
      // description/tags aren't dedicated SearchEntry fields — folded into
      // keywords, same as messProvider's dish names and directoryProvider's aliases.
      keywords: [...(c.description ? [c.description] : []), ...(c.tags ?? [])],
      route: `/discover/${c._id}` as never,
    }));
}

registerSearchProvider({ id: 'campaigns', getEntries });
