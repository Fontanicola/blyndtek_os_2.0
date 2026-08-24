export type MetaPeriod = "7d" | "30d" | "90d" | "year";
export type MetaConnectionStatus = "not_configured" | "connected" | "degraded" | "error";

export type MetaKpis = {
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  landingPageViews: number;
  platformLeads: number;
  crmLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  collectedRevenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
  cashRoas: number | null;
};

export type MetaTrendPoint = {
  date: string;
  spend: number;
  platformLeads: number;
  crmLeads: number;
};

export type MetaCampaignRow = {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  spend: number;
  impressions: number;
  linkClicks: number;
  platformLeads: number;
  crmLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  collectedRevenue: number;
  ctr: number;
  cpl: number | null;
  cpql: number | null;
  cashRoas: number | null;
};

export type MetaCreativeRow = {
  id: string;
  adId: string;
  adName: string;
  creativeName: string;
  status: string;
  thumbnailUrl: string | null;
  title: string | null;
  body: string | null;
  format: string | null;
  spend: number;
  impressions: number;
  linkClicks: number;
  platformLeads: number;
  ctr: number;
  cpl: number | null;
};

export type MetaFunnelStage = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
  conversionFromLead: number | null;
};

export type MetaRun = {
  id: string;
  status: "running" | "success" | "partial" | "error";
  triggerType: "manual" | "cron";
  startedAt: string;
  finishedAt: string | null;
  records: number;
  errorMessage: string | null;
};

export type MetaRecommendation = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  rationale: string;
  recommendedAction: string;
  detectedAt: string;
};

export type MetaOverview = {
  connection: {
    status: MetaConnectionStatus;
    accountName: string | null;
    adAccountId: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
    missingEnvironmentVariables: string[];
    writeAccessEnabled: false;
  };
  period: MetaPeriod;
  periodStart: string;
  kpis: MetaKpis;
  trend: MetaTrendPoint[];
  campaigns: MetaCampaignRow[];
  creatives: MetaCreativeRow[];
  funnel: MetaFunnelStage[];
  recommendations: MetaRecommendation[];
  runs: MetaRun[];
};
