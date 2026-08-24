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
  videoPlays3s: number;
  videoPlays15s: number;
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
  videoPlays3s: number;
  videoPlays15s: number;
  hookRate: number | null;
  holdRate: number | null;
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
  status: "open" | "acknowledged";
  ruleKey: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  rationale: string;
  recommendedAction: string;
  detectedAt: string;
  lastDetectedAt: string;
  occurrences: number;
};

export type MetaActionStatus = "draft" | "pending_approval" | "approved" | "rejected" | "cancelled" | "executed" | "failed";

export type MetaAction = {
  id: string;
  recommendationId: string | null;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  rationale: string;
  proposedAction: string;
  proposedPayload: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high";
  status: MetaActionStatus;
  requestedAt: string;
  reviewedAt: string | null;
  notes: string | null;
  errorMessage: string | null;
  simulatedAt: string | null;
  simulationResult: Record<string, unknown> | null;
  executedAt: string | null;
  metaRequestId: string | null;
};

export type MetaExecutionPolicy = {
  executionEnabled: boolean;
  dryRunOnly: boolean;
  allowPause: boolean;
  allowResume: false;
  allowBudgetChanges: false;
  cooldownMinutes: number;
  environmentWriteEnabled: boolean;
};

export type MetaGuardrails = {
  targetCpl: number;
  targetCpql: number;
  targetCashRoas: number;
  minLinkCtr: number;
  maxFrequency: number;
  maxAttributionGapPct: number;
  minSpendForAlert: number;
  staleSyncHours: number;
};

export type MetaOverview = {
  connection: {
    status: MetaConnectionStatus;
    accountName: string | null;
    adAccountId: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
    tokenExpiresAt: string | null;
    missingEnvironmentVariables: string[];
    writeAccessEnabled: boolean;
  };
  period: MetaPeriod;
  periodStart: string;
  healthScore: number;
  guardrails: MetaGuardrails;
  kpis: MetaKpis;
  trend: MetaTrendPoint[];
  campaigns: MetaCampaignRow[];
  creatives: MetaCreativeRow[];
  funnel: MetaFunnelStage[];
  recommendations: MetaRecommendation[];
  actions: MetaAction[];
  executionPolicy: MetaExecutionPolicy;
  runs: MetaRun[];
};
