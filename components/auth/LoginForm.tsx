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
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6 shrink-0 text-signal"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.5c-4.7 0-8.5 3.8-8.5 8.5 0 2.4.7 4.6 2 6.4" />
      <path d="M12 5.3c-3.7 0-6.7 3-6.7 6.7 0 1.6.6 3.2 1.6 4.5" />
      <path d="M12 7.2c-2.6 0-4.8 2.1-4.8 4.8 0 1.2.4 2.4 1.1 3.3" />
      <path d="M12 9.2c-1.5 0-2.8 1.2-2.8 2.8 0 .8.3 1.6.8 2.2" />
      <path d="M17.8 4.8c2.6 1.6 4.2 4.6 4.2 7.8 0 2.7-1 5.1-2.7 7" />
      <path d="M15.5 6.7c1.4 1.3 2.2 3.2 2.2 5.2 0 2.4-.9 4.6-2.6 6.2" />
      <path d="M9 15.2c.8 2.2 2.2 4.1 4 5.4" />
      <path d="M14.6 12.5c0 1.8-.5 3.4-1.5 4.8" />
      <path d="M11.9 12.4v2.1" />
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
      <div className="w-full max-w-[560px] rounded-[36px] border border-line bg-white p-8 shadow-modal sm:p-10">
        <div className="text-center">
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek"
            width={190}
            height={40}
            priority
            className="mx-auto h-auto w-[190px] max-w-full"
          />
          <p className="mt-3 text-sm leading-6 text-graphite">Accedé a tu cuenta</p>
        </div>

        <div className="mt-8 border-t border-line-soft" />

        {passkeySupported ? (
          <div className="mt-8 space-y-6">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              loading={status === "loading"}
              onClick={() => void handlePasskeyLogin()}
              className="w-full justify-center border-line-soft bg-white px-6 py-4 text-signal shadow-[0_18px_40px_rgba(15,23,42,0.08)] hover:bg-white hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]"
            >
              <FingerprintIcon />
              Touch ID
            </Button>
          </div>
        ) : null}

        <div className="mt-8 text-center">
          <p className="text-sm font-label text-graphite">Usar contraseña en su lugar</p>
        </div>

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
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={status === "loading"}
            className="mt-4 w-full"
          >
            Ingresar
          </Button>

          {status === "error" ? (
            <Badge variant="danger" className="inline-flex">
              {errorMessage}
            </Badge>
          ) : null}
        </form>
      </div>
    </section>
  );
}
