import type { CampaignCreateInput, CampaignUpdateInput } from '@iitj1/types';
import { apiFetch, campusId } from './api';
import type { AdminCampaignsResponse, CampaignDoc } from './types';

export interface CampaignListOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  placement?: string;
  status?: string;
  effectiveStatus?: 'draft' | 'published' | 'expired' | 'paused' | 'archived';
  featured?: boolean;
  isEnabled?: boolean;
  sort?: 'asc' | 'desc';
}

export function listCampaigns(opts: CampaignListOptions = {}): Promise<AdminCampaignsResponse> {
  return apiFetch<AdminCampaignsResponse>('/admin/campaigns', {
    query: {
      campus: campusId,
      page: String(opts.page ?? 1),
      limit: String(opts.limit ?? 20),
      search: opts.search,
      type: opts.type,
      placement: opts.placement,
      status: opts.status,
      effectiveStatus: opts.effectiveStatus,
      featured: opts.featured === undefined ? undefined : String(opts.featured),
      isEnabled: opts.isEnabled === undefined ? undefined : String(opts.isEnabled),
      sort: opts.sort,
    },
  });
}

/**
 * `targeting`/`impressionCount`/`clickCount` are optional here even though
 * they're required on `CampaignCreateInput` (the post-Zod-defaults output
 * type) — the server fills them in via the same defaults if omitted, so the
 * client-facing shape only needs to require what a create form actually sets.
 */
export type CampaignCreateFormInput = Partial<Omit<CampaignCreateInput, 'campusId'>> &
  Pick<CampaignCreateInput, 'title' | 'type' | 'placement' | 'displayType' | 'startDate' | 'endDate'>;

export function createCampaign(input: CampaignCreateFormInput): Promise<CampaignDoc> {
  return apiFetch<CampaignDoc>('/admin/campaigns', {
    method: 'POST',
    body: { campusId, ...input },
  });
}

export function updateCampaign(id: string, input: CampaignUpdateInput): Promise<CampaignDoc> {
  return apiFetch<CampaignDoc>(`/admin/campaigns/${id}`, { method: 'PUT', body: input });
}

export function deleteCampaign(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/campaigns/${id}`, { method: 'DELETE' });
}

export function restoreCampaign(id: string): Promise<CampaignDoc> {
  return apiFetch<CampaignDoc>(`/admin/campaigns/${id}/restore`, { method: 'POST' });
}
