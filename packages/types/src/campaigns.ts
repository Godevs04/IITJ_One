export type CampaignPlacement = 'home_hero' | 'inline_transport' | 'inline_mess' | 'modal' | 'discover_feed';
export type CampaignActionType = 'link' | 'deep_link' | 'phone' | 'whatsapp' | 'payment' | 'survey';
export type CampaignStatus = 'draft' | 'published' | 'paused' | 'archived';

export interface CampaignDoc {
  _id?: string;
  campusId: string;
  title: string;
  description: string;

  // Placement & Display
  placement: CampaignPlacement;
  visuals: {
    imageUrl?: string;
    videoUrl?: string;
    themeColor?: string;
  };

  // Targeting
  targeting: {
    minAppVersion?: string;
    maxAppVersion?: string;
    roles?: string[]; // 'student', 'faculty', etc.
    hostels?: string[];
  };

  // Call to Action
  action?: {
    type: CampaignActionType;
    payload: string; // URL, phone number, deep link path
    label: string;
  };

  // Lifecycle
  status: CampaignStatus;
  startDate: string;
  endDate: string;

  // Analytics
  trackingId: string;

  // System
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export type CampaignCreateInput = Omit<CampaignDoc, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;
