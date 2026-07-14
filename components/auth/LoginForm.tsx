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
      className="h-5 w-5 shrink-0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.5 5.5A6.5 6.5 0 0 1 20 10.5" />
      <path d="M4.5 10.5A7.5 7.5 0 0 1 18 5.5" />
      <path d="M4 13.5c0-4.4 3.6-8 8-8s8 3.6 8 8c0 2.1-.7 4-1.9 5.5" />
      <path d="M9 12.5c0-1.7 1.3-3 3-3s3 1.3 3 3v2c0 2.2-.9 4.1-2.5 5.5" />
      <path d="M11 8.8c-.8 0-1.5.2-2.2.5" />
      <path d="M14.2 8.9c.6.4 1.1.9 1.4 1.5" />
      <path d="M12 15.5c0 1.6-.6 3.1-1.7 4.2" />
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
    <section className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-line bg-white shadow-modal">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(31,68,255,0.08),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(31,68,255,0.05),_transparent_32%)]" />
      <div className="relative grid min-h-[560px] md:grid-cols-[0.92fr_1.08fr]">
        <div className="hidden flex-col items-start justify-center gap-6 border-r border-line-soft p-10 md:flex">
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek"
            width={230}
            height={48}
            priority
            className="h-auto w-[230px] max-w-full"
          />

          <p className="text-3xl font-title tracking-tight text-carbon md:text-4xl">
            Join the dots
          </p>
        </div>

        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md rounded-[28px] border border-line-soft bg-white/95 p-8 shadow-modal backdrop-blur">
            <div className="text-center">
              <Image
                src="/Logo_Blyndtek_plataforma_negro.svg"
                alt="Blyndtek"
                width={190}
                height={40}
                priority
                className="mx-auto h-auto w-[190px] max-w-full"
              />
              <p className="mt-2 text-sm leading-6 text-graphite">Accedé a tu cuenta</p>
            </div>

            <div className="mt-7 border-t border-line-soft" />

            {passkeySupported && !showPasswordForm ? (
              <div className="mt-6 space-y-4">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  loading={status === "loading"}
                  onClick={() => void handlePasskeyLogin()}
                  className="w-full"
                >
                  <FingerprintIcon />
                  Entrar con Touch ID
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
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
        </div>
      </div>
    </section>
  );
}
