"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

type Props = { children: React.ReactNode };
let initialized = false;

function parseSampleRate(value: string | undefined) {
  const parsed = Number(value ?? "0.1");
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.1;
}

export function BlyndtekPostHogProvider({ children }: Props) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  useEffect(() => {
    if (!key || initialized) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: "identified_only",
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-private]",
        sampleRate: parseSampleRate(process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_SAMPLE_RATE)
      },
      capture_exceptions: true
    });
    initialized = true;
  }, [key]);

  if (!key) return children;
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
