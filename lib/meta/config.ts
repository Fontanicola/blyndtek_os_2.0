const REQUIRED_META_ENV = ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_GRAPH_API_VERSION"] as const;

export function getMetaConfig() {
  const missingEnvironmentVariables = REQUIRED_META_ENV.filter((key) => !process.env[key]?.trim());

  if (missingEnvironmentVariables.length > 0) {
    return { configured: false as const, missingEnvironmentVariables };
  }

  const rawAccountId = process.env.META_AD_ACCOUNT_ID!.trim();

  return {
    configured: true as const,
    missingEnvironmentVariables: [],
    accessToken: process.env.META_ACCESS_TOKEN!.trim(),
    adAccountId: rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`,
    graphApiVersion: process.env.META_GRAPH_API_VERSION!.trim(),
    businessId: process.env.META_BUSINESS_ID?.trim() || null,
    pageId: process.env.META_PAGE_ID?.trim() || null,
    pixelId: process.env.META_PIXEL_ID?.trim() || null,
    writeEnabled: process.env.META_WRITE_ENABLED?.trim().toLowerCase() === "true",
    tokenExpiresAt: process.env.META_TOKEN_EXPIRES_AT?.trim() || null
  };
}
