import type { MarketingHubPeriod } from "@/types/marketingHub";

export type MarketingGoal = {
  id: string | null;
  periodMonth: string;
  budgetUsd: number;
  leadsTarget: number;
  qualifiedLeadsTarget: number;
  wonLeadsTarget: number;
  revenueTargetUsd: number;
  targetCpl: number | null;
  targetCpql: number | null;
  targetCac: number | null;
  targetCashRoas: number | null;
};

export type MarketingExperiment = {
  id: string;
  title: string;
  hypothesis: string;
  status: "draft" | "planned" | "running" | "completed" | "cancelled";
  category: "creative" | "audience" | "offer" | "landing" | "funnel" | "channel" | "other";
  primaryMetric: string;
  targetValue: number | null;
  budgetUsd: number;
  startDate: string | null;
  endDate: string | null;
  campaignId: string | null;
  ownerId: string | null;
  variables: Record<string, unknown>;
  result: Record<string, unknown>;
  verdict: "winner" | "loser" | "inconclusive" | null;
  learning: string | null;
};

export type MarketingPriority = {
  id: string | null;
  date: string;
  title: string;
  reason: string;
  action: string;
  impact: "low" | "medium" | "high";
  confidence: number;
  effort: "low" | "medium" | "high";
  source: string;
  entityType: string | null;
  entityId: string | null;
  status: "suggested" | "accepted" | "in_progress" | "completed" | "dismissed";
  assignedTo: string | null;
  taskId: string | null;
  dueAt: string | null;
};

export type MarketingCommandCenter = {
  period: MarketingHubPeriod;
  generatedAt: string;
  goal: MarketingGoal;
  actuals: {
    spend: number;
    leads: number;
    qualifiedLeads: number;
    wonLeads: number;
    revenue: number;
    cpl: number | null;
    cpql: number | null;
    cac: number | null;
    cashRoas: number | null;
    leadToQualifiedRate: number | null;
    leadToWonRate: number | null;
  };
  pacing: {
    dayOfMonth: number;
    daysInMonth: number;
    elapsedPct: number;
    expectedSpend: number;
    projectedSpend: number;
    projectedLeads: number;
    budgetVariance: number;
    status: "not_configured" | "on_track" | "ahead" | "behind";
    trend: Array<{ date: string; actualSpend: number; plannedSpend: number; cumulativeSpend: number; cumulativePlan: number }>;
  };
  priorities: MarketingPriority[];
  experiments: MarketingExperiment[];
  dataHealth: {
    score: number;
    checks: Array<{ key: string; label: string; status: "healthy" | "warning" | "critical"; detail: string }>;
  };
  funnelHealth: {
    unassignedLeads: number;
    staleLeads: number;
    unattributedLeads: number;
    averageLeadAgeHours: number | null;
  };
  contentOperations: {
    luli: { id: string | null; name: string; openTasks: number; overdueTasks: number; capacityMinutes: number; automationEnabled: boolean };
    pipeline: Array<{ status: string; count: number }>;
    scheduledNext7Days: number;
    missingSchedule: number;
  };
  creativeSignals: Array<{
    adId: string;
    name: string;
    angle: string | null;
    format: string | null;
    spend: number;
    ctr: number;
    cpl: number | null;
    frequency: number;
    fatigue: "fresh" | "watch" | "fatigued";
    recommendation: string;
  }>;
  latestWeeklyReport: null | {
    weekStart: string;
    summary: string;
    wins: string[];
    risks: string[];
    learnings: string[];
    nextActions: string[];
  };
};
