"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Toast, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Usuario } from "@/types/auth";

type PerfilClientProps = {
  usuario: Usuario;
};

type ToastState = {
  visible: boolean;
  message: string;
  type: "success" | "info" | "warning" | "error";
};

export function PerfilClient({ usuario }: PerfilClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<Usuario>(usuario);
  const [nombreDraft, setNombreDraft] = useState(usuario.nombre);
  const [savingName, setSavingName] = useState(false);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
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
              <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Email</p>
              <div className="rounded-component bg-paper px-3 py-2 text-sm text-carbon">
                {profile.email}
              </div>
              <p className="text-xs text-graphite">No se puede modificar desde acá.</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Rol</p>
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
