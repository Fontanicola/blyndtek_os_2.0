export type MarketingHubPeriod = "7d" | "30d" | "90d" | "year";

export type MarketingHubOverview = {
  web: {
    sessions: number; visitors: number; pageViews: number; engagedSessions: number;
    engagementRate: number | null; formStarts: number; leads: number; conversionRate: number | null;
    whatsappClicks: number; calendlyClicks: number;
  };
  trend: Array<{ date: string; sessions: number; pageViews: number; engagedSessions: number; formStarts: number; leads: number; whatsappClicks: number }>;
  pages: Array<{ path: string; sessions: number; pageViews: number; leads: number; conversionRate: number | null }>;
  sources: Array<{ source: string; medium: string; campaign: string; sessions: number; leads: number; conversionRate: number | null }>;
  leads: Array<{
    id: string; createdAt: string; name: string; company: string; email: string | null; phone: string | null;
    stage: string; ownerId: string | null; source: string | null; campaign: string | null; campaignId: string | null;
    adsetId: string | null; adId: string | null; landingUrl: string | null; sessionId: string | null;
    capiStatus: string | null; discardReason: string | null;
  }>;
  whatsapp: { clicks: number; conversations: number; qualified: number; unread: number; averageFirstResponseMinutes: number | null };
  instagram: {
    connected: boolean; missingPermissions: string[]; followers: number | null; reach: number; interactions: number;
    media: Array<{ id: string; caption: string | null; mediaType: string | null; thumbnailUrl: string | null; permalink: string | null; postedAt: string | null; likes: number; comments: number; reach: number; interactions: number }>;
  };
};

