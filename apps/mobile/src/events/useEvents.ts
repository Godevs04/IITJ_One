import { useMemo } from 'react';
import type { CampaignDoc, OrganizationDoc } from '@iitj1/types';
import { useCampusModule } from '@/hooks/useCampusModule';
import { clubsFrom, eventsFromCampaigns, type ClubItem, type EventItem } from './eventsLogic';

/** Events and clubs, built from the campaigns and Campus Directory data the app already syncs (offline-cached). */
export function useEvents(): { events: EventItem[]; clubs: ClubItem[]; loaded: boolean } {
  const campaigns = useCampusModule<CampaignDoc[]>('campaigns');
  const organizations = useCampusModule<OrganizationDoc[]>('campusDirectoryOrganizations');
  return useMemo(() => {
    const events = eventsFromCampaigns(campaigns ?? [], organizations ?? []);
    return { events, clubs: clubsFrom(organizations ?? [], events), loaded: campaigns != null };
  }, [campaigns, organizations]);
}
