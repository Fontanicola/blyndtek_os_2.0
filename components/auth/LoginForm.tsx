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
      viewBox="0 0 40 42"
      fill="none"
      className="h-8 w-8 shrink-0 text-signal"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 3.8c-8.9 0-16.2 7.2-16.2 16.2 0 3.1.9 6 2.4 8.5" />
      <path d="M20 7.8c-6.7 0-12.2 5.4-12.2 12.2 0 2.5.8 5 2.2 7.1" />
      <path d="M20 11.8c-4.5 0-8.2 3.7-8.2 8.2 0 2.3.8 4.5 2.2 6.4" />
      <path d="M20 15.8c-2.3 0-4.2 1.9-4.2 4.2 0 3.8 1.4 7.5 3.8 10.4" />
      <path d="M20 19.8c0 5.1 1.5 10 4.4 13.9" />
      <path d="M20 3.8c8.9 0 16.2 7.2 16.2 16.2 0 2.8-.7 5.5-2 7.8" />
      <path d="M26.4 5.1c5.7 2.5 9.8 8.2 9.8 14.9" />
      <path d="M29.5 9.5c3.1 2.7 5 6.6 5 10.9 0 3.8-1.1 7.4-3.1 10.4" />
      <path d="M27.1 13.8c2 1.6 3.3 4.1 3.3 6.8 0 4.7-1.5 9-4.2 12.6" />
      <path d="M24.5 17.3c1.2 1.1 1.9 2.6 1.9 4.3 0 4.1-1.3 7.9-3.7 11.2" />
      <path d="M12.3 30.1c1.3 1.9 3 3.6 4.9 4.9" />
    </svg>
  );
}

export function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const conditionalAbortRef = useRef<AbortController | null>(null);
  const conditionalLoginStartedRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);

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
      <div className="w-full max-w-[1040px] rounded-[36px] border border-line bg-white p-8 shadow-modal sm:p-12 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:p-14">
        <div className="flex flex-col justify-center text-center lg:text-left">
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek"
            width={260}
            height={55}
            priority
            className="mx-auto h-auto w-[260px] max-w-full lg:mx-0"
          />
          <p className="mt-5 text-base leading-7 text-graphite">Accedé a tu cuenta</p>
        </div>

        <div className="mt-10 border-t border-line-soft pt-10 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
          {passkeySupported ? (
            <div className="space-y-6">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                loading={status === "loading"}
                onClick={() => void handlePasskeyLogin()}
                className="w-full justify-center border-line-soft bg-white px-6 py-4 text-signal shadow-[0_6px_14px_rgba(15,23,42,0.08)] hover:bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.11)]"
              >
                <FingerprintIcon />
                Touch ID
              </Button>
            </div>
          ) : null}

          {passkeySupported ? (
            <div className="mt-6 text-center">
              <p className="text-sm font-label text-graphite">Usar contraseña en su lugar</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@blyndtek.com"
              required
              autoComplete="username webauthn"
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password webauthn"
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
