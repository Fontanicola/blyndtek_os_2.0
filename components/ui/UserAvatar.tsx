"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type UserAvatarProps = {
  name?: string | null;
  fotoUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  textClassName?: string;
};

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-xs",
  lg: "h-20 w-20 text-2xl",
  xl: "h-24 w-24 text-3xl"
};

function getInitials(value: string | null | undefined) {
  const clean = value?.trim();

  if (!clean) {
    return "--";
  }

  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, fotoUrl, size = "md", className, textClassName }: UserAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [fotoUrl]);

  const initials = useMemo(() => getInitials(name), [name]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-signal-light font-label text-signal",
        sizeClasses[size],
        className
      )}
    >
      {fotoUrl && !hasImageError ? (
        <Image
          src={fotoUrl}
          alt={name ? `Foto de ${name}` : "Foto de usuario"}
          fill
          unoptimized
          sizes="128px"
          className="object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className={cn("relative z-10", textClassName)}>{initials}</span>
      )}
    </span>
  );
}
