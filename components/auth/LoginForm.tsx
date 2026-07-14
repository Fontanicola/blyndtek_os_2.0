"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Badge, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(true);

  useEffect(() => {
    const supported = typeof window !== "undefined" && Boolean(window.PublicKeyCredential);
    setPasskeySupported(supported);
    setShowPasswordForm(!supported);
  }, []);

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

        {passkeySupported && !showPasswordForm ? (
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

            <div className="text-center">
              <button
                type="button"
                className="text-sm font-label text-graphite transition-colors hover:text-carbon"
                onClick={() => setShowPasswordForm(true)}
              >
                Usar contraseña en su lugar
              </button>
            </div>
          </div>
        ) : null}

        {(!passkeySupported || showPasswordForm) ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {passkeySupported ? (
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm font-label text-graphite transition-colors hover:text-carbon"
                  onClick={() => setShowPasswordForm(false)}
                >
                  Usar Touch ID
                </button>
              </div>
            ) : null}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@blyndtek.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
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
        ) : null}

        {passkeySupported && !showPasswordForm && status === "error" ? (
          <div className="mt-4">
            <Badge variant="danger" className="inline-flex">
              {errorMessage}
            </Badge>
          </div>
        ) : null}
      </div>
    </section>
  );
}
