"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Badge, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  deserializeCredentialRequestOptions,
  serializeCredentialRequestResponse
} from "@supabase/auth-js/dist/module/lib/webauthn";
import type { AuthenticationCredential } from "@supabase/auth-js/dist/module/lib/webauthn.dom";

type LoginStatus = "idle" | "loading" | "error";

function FingerprintIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 72 64"
      fill="none"
      className="h-8 w-9 shrink-0 text-signal"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform="translate(3 0) scale(1.03 1)">
        <path d="M7 35C7 18 18 7 32 7c15 0 25 11 25 27" />
        <path d="M10 43c3-5 2-10 3-16 1-10 9-16 19-16 12 0 21 9 21 21 0 4-.2 8-1 12" />
        <path d="M15 48c4-6 2-13 3-20 1-8 6-13 14-13 10 0 17 7 17 17 0 6-.6 11-1.8 16" />
        <path d="M21 52c4-7 2-15 3-23 .7-6 3.8-10 8-10 7 0 12 5 12 13 0 7-.8 14-2.5 20" />
        <path d="M27 55c3-7 2-15 2-23 0-5 1-9 3-9 4 0 7 3 7 9 0 8-1 16-3 23" />
        <path d="M32 57c1.5-6 2-13 2-20 0-5-.5-8-2-9" />
        <path d="M11 23c4-8 11-12 21-12" />
        <path d="M42 13c7 4 11 11 11 20" />
        <path d="M17 36c0 6-1 11-4 16" />
        <path d="M23 42c-.5 5-2 10-4 14" />
        <path d="M47 27c0 3 0 6-.3 9" />
        <path d="M57 39v3" />
      </g>
    </svg>
  );
}

export function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const conditionalAbortRef = useRef<AbortController | null>(null);
  const conditionalLoginStartedRef = useRef(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleConditionalPasskeyLogin = useCallback(async () => {
    if (conditionalLoginStartedRef.current) {
      return;
    }

    conditionalLoginStartedRef.current = true;
    conditionalAbortRef.current?.abort();

    const controller = new AbortController();
    conditionalAbortRef.current = controller;

    try {
      const { data: options, error: optionsError } = await supabase.auth.passkey.startAuthentication();

      if (optionsError || !options) {
        return;
      }

      const publicKeyOptions = deserializeCredentialRequestOptions(options.options) as PublicKeyCredentialRequestOptions;
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
        mediation: "conditional",
        signal: controller.signal
      })) as AuthenticationCredential | null;

      if (!credential) {
        return;
      }

      const serialized = serializeCredentialRequestResponse(credential);
      const { error: verifyError } = await supabase.auth.passkey.verifyAuthentication({
        challengeId: options.challenge_id,
        credential: serialized
      });

      if (verifyError) {
        return;
      }

      setStatus("idle");
      window.location.href = "/dashboard";
    } catch {
      // Conditional UI is intentionally silent if the browser cancels or does not complete.
    } finally {
      conditionalLoginStartedRef.current = false;
      if (conditionalAbortRef.current === controller) {
        conditionalAbortRef.current = null;
      }
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function initializePasskeySupport() {
      const supported = typeof window !== "undefined" && Boolean(window.PublicKeyCredential);
      if (cancelled) {
        return;
      }

      setPasskeySupported(supported);

      if (!supported) {
        return;
      }

      try {
        const credentialApi = window.PublicKeyCredential as typeof window.PublicKeyCredential & {
          isConditionalMediationAvailable?: () => Promise<boolean>;
        };
        const available = await credentialApi.isConditionalMediationAvailable?.();

        if (cancelled) {
          return;
        }
        if (available) {
          void handleConditionalPasskeyLogin();
        }
      } catch {
        // Silent fallback to the explicit button and password form.
      }
    }

    void initializePasskeySupport();

    return () => {
      cancelled = true;
      conditionalAbortRef.current?.abort();
    };
  }, [handleConditionalPasskeyLogin]);

  useEffect(() => {
    if (!passkeySupported || !showPasswordForm) {
      return;
    }

    emailInputRef.current?.focus();
  }, [passkeySupported, showPasswordForm]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("idle");
    window.location.href = "/dashboard";
  }

  async function handlePasskeyLogin() {
    conditionalAbortRef.current?.abort();
    setStatus("loading");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPasskey();

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("idle");
    window.location.href = "/dashboard";
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[1680px] rounded-[36px] border border-line bg-white p-8 shadow-modal sm:p-12 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-20 lg:p-16">
        <div className="flex flex-col justify-center text-center lg:text-left">
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek"
            width={260}
            height={55}
            priority
            className="mx-auto h-auto w-[260px] max-w-full lg:mx-0"
          />
        </div>

        <div className="mt-10 border-t border-line-soft pt-10 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
          {passkeySupported ? (
            <div className="space-y-6">
              <Button
                type="button"
                variant="secondary"
                loading={status === "loading"}
                onClick={() => void handlePasskeyLogin()}
                className="mx-auto flex w-full max-w-[340px] justify-center border-line-soft bg-white px-5 py-3.5 text-base text-signal shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-white hover:shadow-[0_6px_12px_rgba(15,23,42,0.08)]"
              >
                <FingerprintIcon />
                Touch ID
              </Button>
            </div>
          ) : null}

          {passkeySupported ? (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowPasswordForm((current) => !current)}
                className="text-sm font-label text-graphite transition-colors duration-fast ease-fast hover:text-carbon"
              >
                Usar contraseña en su lugar
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={passkeySupported && !showPasswordForm ? "sr-only" : "mt-8 space-y-4"}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@blyndtek.com"
              required
              autoComplete="username webauthn"
              autoFocus={!passkeySupported || showPasswordForm}
              ref={emailInputRef}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password webauthn"
              rightAction={
                <button
                  type="submit"
                  aria-label="Ingresar"
                  title="Ingresar"
                  disabled={status === "loading"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-signal text-white shadow-[0_2px_6px_rgba(31,68,255,0.22)] transition-all duration-fast ease-fast hover:bg-signal/90 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 animate-spin">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
                      <path d="M10 3a7 7 0 0 1 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3.5 10h10" />
                      <path d="m10.5 6.5 3.5 3.5-3.5 3.5" />
                      <path d="M16.5 4.5v11" />
                    </svg>
                  )}
                </button>
              }
            />
            {status === "error" ? (
              <Badge variant="danger" className="inline-flex">
                {errorMessage}
              </Badge>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
