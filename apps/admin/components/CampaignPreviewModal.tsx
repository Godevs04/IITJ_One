'use client';

import { Button } from './Button';
import { StatusPill } from './ui';
import { PLACEMENT_LABELS, DISPLAY_TYPE_LABELS } from '@/lib/campaignLabels';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import type { CampaignDoc } from '@/lib/types';

interface CampaignPreviewModalProps {
  campaign: CampaignDoc;
  onClose: () => void;
}

/** A rough WYSIWYG mockup of how the campaign will render on mobile — image, title, subtitle, description, CTA. */
export function CampaignPreviewModal({ campaign, onClose }: CampaignPreviewModalProps) {
  const primaryImage = campaign.visuals?.images?.[0] || campaign.visuals?.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[1.25rem] border border-border/80 bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Preview</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
            Close
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            <StatusPill label={campaign.status} tone={campaign.status === 'published' ? 'success' : 'neutral'} />
            {campaign.featured ? <StatusPill label="Featured" tone="warning" /> : null}
            {!campaign.isEnabled ? <StatusPill label="Disabled" tone="danger" /> : null}
          </div>

          <div
            className="overflow-hidden rounded-xl border border-border"
            style={campaign.visuals?.themeColor ? { backgroundColor: campaign.visuals.themeColor } : undefined}
          >
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={optimizeCloudinaryUrl(primaryImage, 640)} alt={campaign.title} className="h-40 w-full object-cover" />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-sand text-xs text-muted">
                No image
              </div>
            )}
          </div>

          <div>
            <p className="text-base font-semibold text-ink">{campaign.title}</p>
            {campaign.subtitle ? <p className="text-sm font-medium text-muted">{campaign.subtitle}</p> : null}
            {campaign.description ? <p className="mt-1 text-sm text-muted">{campaign.description}</p> : null}
          </div>

          {campaign.tags && campaign.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {campaign.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {campaign.cta ? (
            <Button className="w-full" onClick={onClose}>
              {campaign.cta.label}
            </Button>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted">
            <dt>Placement</dt>
            <dd className="text-right text-ink">{PLACEMENT_LABELS[campaign.placement]}</dd>
            <dt>Display type</dt>
            <dd className="text-right text-ink">{DISPLAY_TYPE_LABELS[campaign.displayType]}</dd>
            <dt>Window</dt>
            <dd className="text-right text-ink">
              {new Date(campaign.startDate).toLocaleDateString()} – {new Date(campaign.endDate).toLocaleDateString()}
            </dd>
            <dt>Views</dt>
            <dd className="text-right text-ink">{campaign.impressionCount ?? 0}</dd>
            <dt>Clicks</dt>
            <dd className="text-right text-ink">{campaign.clickCount ?? 0}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
