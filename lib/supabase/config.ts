export function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export function buildSupabaseRestUrl(url: string, path: string): string {
  const normalizedBaseUrl = normalizeSupabaseUrl(url);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}/rest/v1${normalizedPath}`;
}
