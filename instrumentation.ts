export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
    return;
  } else {
    return;
  }

  process.on("uncaughtException", (error) => {
    console.error(JSON.stringify({
      level: "fatal",
      scope: "process",
      event: "uncaught_exception",
      timestamp: new Date().toISOString(),
      error_message: error.message,
      error_stack: error.stack ?? null
    }));
  });

  process.on("unhandledRejection", (reason) => {
    console.error(JSON.stringify({
      level: "error",
      scope: "process",
      event: "unhandled_rejection",
      timestamp: new Date().toISOString(),
      error_message: reason instanceof Error ? reason.message : String(reason),
      error_stack: reason instanceof Error ? reason.stack ?? null : null
    }));
  });
}
