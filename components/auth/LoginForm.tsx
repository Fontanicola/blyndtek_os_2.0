"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Badge, Button, Input } from "@/components/ui";
import { ArrowRightIcon, FingerprintIcon, LoaderIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import {
  deserializeCredentialRequestOptions,
  serializeCredentialRequestResponse
} from "@supabase/auth-js/dist/module/lib/webauthn";
import type { AuthenticationCredential } from "@supabase/auth-js/dist/module/lib/webauthn.dom";

type LoginStatus = "idle" | "loading" | "error";

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
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="h-4 w-4" />
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
