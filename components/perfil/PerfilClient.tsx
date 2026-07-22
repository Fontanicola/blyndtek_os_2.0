"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Toast, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import type { Usuario } from "@/types/auth";

type PerfilClientProps = {
  usuario: Usuario;
};

type ToastState = {
  visible: boolean;
  message: string;
  type: "success" | "info" | "warning" | "error";
};

type PasskeyItem = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function getBrowserName() {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("Edg/")) {
    return "Edge";
  }

  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) {
    return "Chrome";
  }

  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  }

  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    return "Safari";
  }

  return "Browser";
}

function getDeviceName() {
  const uaNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = uaNavigator.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? "Dispositivo";

  if (/Mac/i.test(platform)) {
    return `MacBook — ${getBrowserName()}`;
  }

  if (/iPhone/i.test(platform)) {
    return `iPhone — ${getBrowserName()}`;
  }

  if (/iPad/i.test(platform)) {
    return `iPad — ${getBrowserName()}`;
  }

  if (/Win/i.test(platform)) {
    return `Windows — ${getBrowserName()}`;
  }

  if (/Linux/i.test(platform)) {
    return `Linux — ${getBrowserName()}`;
  }

  return `${platform} — ${getBrowserName()}`;
}

export function PerfilClient({ usuario }: PerfilClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<Usuario>(usuario);
  const [nombreDraft, setNombreDraft] = useState(usuario.nombre);
  const [savingName, setSavingName] = useState(false);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [savingPasskey, setSavingPasskey] = useState(false);
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info"
  });

  const nombreDirty = useMemo(() => nombreDraft.trim() !== profile.nombre.trim(), [nombreDraft, profile.nombre]);

  useEffect(() => {
    setProfile(usuario);
    setNombreDraft(usuario.nombre);
  }, [usuario]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPasskeyAvailable(Boolean(window.PublicKeyCredential));
  }, []);

  useEffect(() => {
    if (!passkeyAvailable) {
      return;
    }

    let active = true;

    async function loadPasskeys() {
      setLoadingPasskeys(true);

      try {
        const { data, error } = await supabase.auth.passkey.list();

        if (error) {
          throw error;
        }

        if (!active) {
          return;
        }

        const nextPasskeys = data ?? [];
        setPasskeys(nextPasskeys);

        const deviceName = getDeviceName();

        await Promise.all(
          nextPasskeys.map(async (passkey) => {
            await fetch("/api/perfil/passkeys", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                passkey_id: passkey.id,
                nombre_dispositivo: passkey.friendly_name ?? deviceName
              })
            });
          })
        );
      } catch {
        if (active) {
          setPasskeys([]);
        }
      } finally {
        if (active) {
          setLoadingPasskeys(false);
        }
      }
    }

    void loadPasskeys();

    return () => {
      active = false;
    };
  }, [passkeyAvailable, supabase]);

  function showToast(message: string, type: ToastState["type"] = "info") {
    setToast({ visible: true, message, type });
  }

  async function refreshProfile(nextProfile: Usuario) {
    setProfile(nextProfile);
    setNombreDraft(nextProfile.nombre);
    router.refresh();
  }

  async function handleSaveName() {
    const nextNombre = nombreDraft.trim();

    if (!nextNombre || !nombreDirty) {
      return;
    }

    setSavingName(true);

    try {
      const response = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nextNombre })
      });

      const payload = (await response.json()) as { data?: Usuario; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar el nombre.");
      }

      await refreshProfile(payload.data);
      showToast("Nombre actualizado.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo actualizar el nombre.", "error");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePhotoFile(file: File) {
    const formData = new FormData();
    formData.append("foto", file);

    setSubmittingPhoto(true);

    try {
      const response = await fetch("/api/perfil/foto", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { data?: Usuario; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo subir la foto.");
      }

      await refreshProfile(payload.data);
      showToast("Foto actualizada.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo subir la foto.", "error");
    } finally {
      setSubmittingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setSubmittingPhoto(true);

    try {
      const response = await fetch("/api/perfil/foto", {
        method: "DELETE"
      });

      const payload = (await response.json()) as { data?: Usuario; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo quitar la foto.");
      }

      await refreshProfile(payload.data);
      showToast("Foto eliminada.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo quitar la foto.", "error");
    } finally {
      setSubmittingPhoto(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordNueva || passwordNueva.length < 6) {
      showToast("La nueva contraseña debe tener al menos 6 caracteres.", "warning");
      return;
    }

    if (passwordNueva !== passwordConfirmacion) {
      showToast("Las contraseñas no coinciden.", "warning");
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch("/api/perfil/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password_actual: passwordActual,
          password_nueva: passwordNueva
        })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo cambiar la contraseña.");
      }

      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmacion("");
      showToast("Contraseña actualizada.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo cambiar la contraseña.", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function refreshPasskeys() {
    const { data, error } = await supabase.auth.passkey.list();

    if (error) {
      throw error;
    }

    setPasskeys(data ?? []);
    return data ?? [];
  }

  async function syncPasskeyRecord(passkeyId: string, nombreDispositivo: string) {
    const response = await fetch("/api/perfil/passkeys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        passkey_id: passkeyId,
        nombre_dispositivo: nombreDispositivo
      })
    });

    return response.ok;
  }

  async function removePasskeyRecord(passkeyId: string) {
    const response = await fetch("/api/perfil/passkeys", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ passkey_id: passkeyId })
    });

    return response.ok;
  }

  async function handleRegisterPasskey() {
    setSavingPasskey(true);

    try {
      const { data, error } = await supabase.auth.registerPasskey();

      if (error || !data) {
        throw error ?? new Error("No se pudo registrar el passkey.");
      }

      const deviceName = getDeviceName();

      try {
        await supabase.auth.passkey.update({
          passkeyId: data.id,
          friendlyName: deviceName
        });
      } catch {
        // If friendly-name sync fails, keep the authenticated passkey anyway.
      }

      const localSynced = await syncPasskeyRecord(data.id, deviceName);
      await refreshPasskeys();

      if (localSynced) {
        showToast("Passkey activado.", "success");
      } else {
        showToast(
          "Passkey activado, pero no se pudo guardar el registro local.",
          "warning"
        );
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo registrar el passkey.", "error");
    } finally {
      setSavingPasskey(false);
    }
  }

  async function handleDeletePasskey(passkeyId: string) {
    setDeletingPasskeyId(passkeyId);

    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId });

      if (error) {
        throw error;
      }

      const localRemoved = await removePasskeyRecord(passkeyId);
      await refreshPasskeys();

      if (localRemoved) {
        showToast("Passkey eliminado.", "success");
      } else {
        showToast(
          "Passkey eliminado, pero no se pudo quitar el registro local.",
          "warning"
        );
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo eliminar el passkey.", "error");
    } finally {
      setDeletingPasskeyId(null);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card padding="lg" className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <UserAvatar
                name={profile.nombre}
                fotoUrl={profile.foto_url}
                size="xl"
                className="h-24 w-24 border border-line-soft bg-paper"
                textClassName="text-2xl"
              />

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={submittingPhoto}
                  >
                    Cambiar foto
                  </Button>
                  {profile.foto_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemovePhoto()}
                      loading={submittingPhoto}
                      className="text-danger hover:text-danger"
                    >
                      Quitar foto
                    </Button>
                  ) : null}
                </div>

                <p className="text-xs text-graphite">PNG, JPG, WEBP o GIF. Máximo 5MB.</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  void handlePhotoFile(file);
                }
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Input
              label="Nombre"
              value={nombreDraft}
              onChange={(event) => setNombreDraft(event.target.value)}
            />
            <Button
              variant="primary"
              onClick={() => void handleSaveName()}
              disabled={!nombreDirty}
              loading={savingName}
              className={cn(!nombreDirty && "opacity-50")}
            >
              Guardar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-label text-graphite">Email</p>
              <div className="rounded-component bg-paper px-3 py-2 text-sm text-carbon">
                {profile.email}
              </div>
              <p className="text-xs text-graphite">No se puede modificar desde acá.</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-label text-graphite">Rol</p>
              <Badge variant={profile.rol === "admin" ? "signal" : "default"} className="w-fit">
                {profile.rol}
              </Badge>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-title text-carbon">Seguridad</h2>
            <p className="mt-1 text-sm text-graphite">Cambiá tu contraseña cuando lo necesites.</p>
          </div>

          {passkeyAvailable ? (
            <div className="space-y-4 rounded-card border border-line-soft bg-paper/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-title text-carbon">Inicio de sesión con Touch ID / huella</p>
                  <p className="text-sm text-graphite">
                    Registrá un passkey para entrar más rápido desde este dispositivo.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleRegisterPasskey()}
                  loading={savingPasskey}
                  className="shrink-0"
                >
                  Activar inicio de sesión con Touch ID / huella
                </Button>
              </div>

              <div className="space-y-3">
                {loadingPasskeys ? (
                  <p className="text-sm text-graphite">Buscando passkeys registradas...</p>
                ) : passkeys.length > 0 ? (
                  passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex flex-col gap-3 rounded-component border border-line-soft bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-label text-carbon">
                          {passkey.friendly_name ?? "Passkey"}
                        </p>
                        <p className="text-xs text-graphite">
                          Registrado el {formatDate(passkey.created_at)}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeletePasskey(passkey.id)}
                        loading={deletingPasskeyId === passkey.id}
                        className="self-start text-danger hover:text-danger"
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-graphite">Todavía no hay passkeys registradas.</p>
                )}
              </div>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handlePasswordChange}>
            <Input
              type="password"
              label="Contraseña actual"
              value={passwordActual}
              onChange={(event) => setPasswordActual(event.target.value)}
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="password"
                label="Nueva contraseña"
                value={passwordNueva}
                onChange={(event) => setPasswordNueva(event.target.value)}
                required
              />
              <Input
                type="password"
                label="Confirmar nueva contraseña"
                value={passwordConfirmacion}
                onChange={(event) => setPasswordConfirmacion(event.target.value)}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </>
  );
}
