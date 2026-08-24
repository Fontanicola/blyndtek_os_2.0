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

export type MarketingIntelligenceOverview = {
  summary: {
    profiledLeads: number;
    tierA: number;
    tierB: number;
    audienceEligible: number;
    averageScore: number;
    averageCompleteness: number;
    qualifiedRate: number | null;
    wonRate: number | null;
  };
  idealCustomer: {
    confidence: "low" | "medium" | "high";
    sampleSize: number;
    topIndustries: Array<{ value: string; count: number }>;
    topSources: Array<{ value: string; count: number }>;
    topCampaigns: Array<{ value: string; count: number }>;
    winningSignals: string[];
    narrative: string;
  };
  profiles: Array<{
    leadId: string;
    name: string;
    company: string;
    stage: string;
    source: string | null;
    campaign: string | null;
    score: number;
    fitScore: number;
    intentScore: number;
    engagementScore: number;
    completeness: number;
    tier: "A" | "B" | "C" | "D";
    touchpoints: number;
    lastTouchAt: string | null;
    nextBestAction: string | null;
    audienceEligible: boolean;
    audienceStatus: string;
    positiveSignals: string[];
    missingData: string[];
  }>;
  channels: Array<{ channel: string; touchpoints: number; leads: number }>;
  learningTrend: Array<{ date: string; profiled: number; tierA: number; eligible: number }>;
  lastRun: { status: string; triggerType: string; startedAt: string; finishedAt: string | null; profilesProcessed: number; errorMessage: string | null } | null;
};
