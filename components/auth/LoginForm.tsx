"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type LoginStatus = "idle" | "loading" | "error";

export function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-modal">
      <div className="text-center">
        <h1 className="text-xl font-title text-carbon">Blyndtek OS</h1>
        <p className="mt-1 text-sm text-graphite">Accedé a tu cuenta</p>
      </div>

      <div className="mb-6 mt-8 border-t border-line-soft" />

      <form onSubmit={handleSubmit} className="space-y-4">
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
    </div>
  );
}
