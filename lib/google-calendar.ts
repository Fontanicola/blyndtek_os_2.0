import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

type GoogleTokenPayload = {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
  expiry_date?: number | null;
  scope?: string;
  token_type?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

function getGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error("Missing environment variable: GOOGLE_CLIENT_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing environment variable: GOOGLE_CLIENT_SECRET");
  }

  if (!redirectUri) {
    throw new Error("Missing environment variable: GOOGLE_REDIRECT_URI");
  }

  return { clientId, clientSecret, redirectUri };
}

function getEncryptionKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createHash("sha256").update(secret).digest();
}

export function buildGoogleCalendarAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleEnv();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return url.toString();
}

export function encryptGoogleToken(payload: GoogleTokenPayload) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptGoogleToken(token: string): GoogleTokenPayload | null {
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(token, "base64");

    if (buffer.length <= 28) {
      return null;
    }

    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted) as GoogleTokenPayload;
  } catch {
    try {
      return JSON.parse(token) as GoogleTokenPayload;
    } catch {
      return null;
    }
  }
}

export async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "No se pudo intercambiar el código de Google.");
  }

  const payload = (await response.json()) as GoogleTokenResponse;
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? null,
    expires_in: payload.expires_in,
    expiry_date: Date.now() + payload.expires_in * 1000,
    scope: payload.scope ?? "https://www.googleapis.com/auth/calendar",
    token_type: payload.token_type ?? "Bearer"
  } satisfies GoogleTokenPayload;
}

export async function refreshGoogleToken(payload: GoogleTokenPayload) {
  if (!payload.refresh_token) {
    return payload;
  }

  const { clientId, clientSecret } = getGoogleEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      refresh_token: payload.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "No se pudo refrescar el token de Google.");
  }

  const refreshed = (await response.json()) as GoogleTokenResponse;
  return {
    access_token: refreshed.access_token,
    refresh_token: payload.refresh_token,
    expires_in: refreshed.expires_in,
    expiry_date: Date.now() + refreshed.expires_in * 1000,
    scope: refreshed.scope ?? payload.scope ?? "https://www.googleapis.com/auth/calendar",
    token_type: refreshed.token_type ?? "Bearer"
  } satisfies GoogleTokenPayload;
}

export async function getValidGoogleToken(payload: GoogleTokenPayload) {
  if (payload.expiry_date && payload.expiry_date > Date.now() + 30_000) {
    return payload;
  }

  if (!payload.refresh_token) {
    return payload;
  }

  return refreshGoogleToken(payload);
}

export async function googleApiRequest(
  token: GoogleTokenPayload,
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Error en la API de Google Calendar.");
  }

  return response;
}

export type { GoogleTokenPayload };
