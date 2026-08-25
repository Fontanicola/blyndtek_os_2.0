import * as Sentry from "@sentry/nextjs";

type LogValue = string | number | boolean | null | undefined;

type LogDetails = Record<string, LogValue>;

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { error_message: error.message, error_stack: error.stack ?? null };
  }

  return { error_message: String(error), error_stack: null };
}

export function logServerEvent(scope: string, details: LogDetails = {}) {
  console.info(JSON.stringify({
    level: "info",
    scope,
    timestamp: new Date().toISOString(),
    ...details
  }));
}

export function logServerError(scope: string, error: unknown, details: LogDetails = {}) {
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { scope },
    extra: details
  });
  console.error(JSON.stringify({
    level: "error",
    scope,
    timestamp: new Date().toISOString(),
    ...details,
    ...errorDetails(error)
  }));
}
