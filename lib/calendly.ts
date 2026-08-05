type CalendlyUser = {
  resource?: {
    uri?: string;
    name?: string;
    email?: string;
    current_organization?: string;
  };
};

type CalendlyWebhookSubscription = {
  resource?: {
    uri?: string;
    callback_url?: string;
    events?: string[];
    scope?: string;
    user?: string;
    organization?: string;
    state?: string;
  };
};

function getCalendlyToken() {
  const token = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error("Falta configurar CALENDLY_PERSONAL_ACCESS_TOKEN.");
  }

  return token;
}

export async function calendlyApiRequest(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.calendly.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getCalendlyToken()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Calendly respondió ${response.status}.`);
  }

  return response;
}

export async function getCalendlyCurrentUser() {
  const response = await calendlyApiRequest("/users/me");
  return (await response.json()) as CalendlyUser;
}

export async function getCalendlyWebhookSubscriptions(userUri: string) {
  const params = new URLSearchParams({ user: userUri, scope: "user" });
  const response = await calendlyApiRequest(`/webhook_subscriptions?${params.toString()}`);
  return (await response.json()) as { collection?: CalendlyWebhookSubscription["resource"][] };
}

export async function createCalendlyWebhookSubscription(input: {
  callbackUrl: string;
  userUri: string;
  events: string[];
}) {
  const response = await calendlyApiRequest("/webhook_subscriptions", {
    method: "POST",
    body: JSON.stringify({
      url: input.callbackUrl,
      events: input.events,
      user: input.userUri,
      scope: "user"
    })
  });

  return (await response.json()) as CalendlyWebhookSubscription;
}

export type CalendlyInvitee = {
  resource?: {
    uri?: string;
    email?: string;
    name?: string;
    status?: string;
    event?: string;
    start_time?: string;
    end_time?: string;
    cancel_url?: string;
    location?: { type?: string; join_url?: string; url?: string } | string;
  };
};

export async function getCalendlyInvitee(uri: string) {
  const parsed = new URL(uri);
  const response = await calendlyApiRequest(parsed.pathname);
  return (await response.json()) as CalendlyInvitee;
}

export type { CalendlyUser, CalendlyWebhookSubscription };
