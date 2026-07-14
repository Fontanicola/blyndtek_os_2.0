export function isValidGitHubRepo(value: string) {
  return /^[^/\s]+\/[^/\s]+$/.test(value.trim());
}

export function normalizeGitHubRepo(value: string) {
  return value.trim();
}

export function extractPullRequestNumber(prUrl: string | null | undefined) {
  if (!prUrl) {
    return null;
  }

  const match = prUrl.match(/\/pull\/(\d+)(?:[/?#]|$)/i);
  return match ? Number(match[1]) : null;
}

export function estimateAiDevCostUsd(tokensEntrada: number | null | undefined, tokensSalida: number | null | undefined) {
  const entrada = Math.max(0, Number(tokensEntrada ?? 0));
  const salida = Math.max(0, Number(tokensSalida ?? 0));

  return Number(((entrada / 1_000_000) * 3 + (salida / 1_000_000) * 15).toFixed(6));
}
