import { cn } from "@/lib/cn";

type LogoSize = "xs" | "sm" | "md" | "lg";

type SystemBrand = {
  short: string;
  logo: string;
  background: string;
  foreground: string;
};

const DEFAULT_BRAND: SystemBrand = {
  short: "SYS",
  logo: "",
  background: "#eef1f4",
  foreground: "#425466"
};

const SYSTEM_BRANDS: Array<{ matches: string[]; brand: SystemBrand }> = [
  {
    matches: ["blyndtek os", "blyndtek os 2.0"],
    brand: { short: "BT", logo: "/Logo_Blyndtek_isotipo.svg", background: "#e9f7fb", foreground: "#087ea4" }
  },
  {
    matches: ["blyndtek web"],
    brand: { short: "BT", logo: "/Logo_Blyndtek_isotipo.svg", background: "#edf4ff", foreground: "#163a70" }
  },
  {
    matches: ["funes", "funes exclusivos"],
    brand: { short: "FE", logo: "https://funesexclusivos.com/logo-funes.svg", background: "#f3f0e9", foreground: "#171717" }
  },
  {
    matches: ["control de obra", "control de obra ha", "ha control de obra"],
    brand: { short: "HA", logo: "https://ha-control-de-obra.vercel.app/HA_Logo.svg", background: "#fff3e8", foreground: "#b85d16" }
  },
  {
    matches: ["trackit"],
    brand: { short: "TR", logo: "https://www.get-trackit.app/Favicon_new.svg", background: "#eef7ff", foreground: "#1769aa" }
  },
  {
    matches: ["arc", "arc global"],
    brand: { short: "ARC", logo: "https://arc-chi-ashen.vercel.app/arc-global-logo.svg", background: "#f0efff", foreground: "#4d42a8" }
  }
];

const sizeClasses: Record<LogoSize, string> = {
  xs: "h-6 w-6 rounded-[7px] text-[8px]",
  sm: "h-8 w-8 rounded-[9px] text-[9px]",
  md: "h-10 w-10 rounded-[11px] text-[10px]",
  lg: "h-12 w-12 rounded-[13px] text-xs"
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function getSystemBrand(name: string): SystemBrand {
  const normalized = normalize(name);
  return SYSTEM_BRANDS.find((entry) => entry.matches.some((candidate) => normalized === candidate || normalized.includes(candidate)))?.brand ?? {
    ...DEFAULT_BRAND,
    short: normalized.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase() || DEFAULT_BRAND.short
  };
}

export function SystemLogo({ name, size = "sm", className }: { name: string; size?: LogoSize; className?: string }) {
  const brand = getSystemBrand(name);
  return (
    <span
      aria-label={`Logo de ${name}`}
      role="img"
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-black/5 bg-white bg-contain bg-center bg-no-repeat font-label tracking-tight shadow-sm", sizeClasses[size], className)}
      style={{ backgroundColor: brand.background, backgroundImage: brand.logo ? `url(${JSON.stringify(brand.logo)})` : undefined, color: brand.foreground }}
    >
      <span className={brand.logo ? "sr-only" : undefined}>{brand.short}</span>
    </span>
  );
}

export function SystemIdentity({ name, detail, size = "sm", className }: { name: string; detail?: string | null; size?: LogoSize; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <SystemLogo name={name} size={size} />
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-label text-carbon">{name}</span>
        {detail ? <span className="block truncate text-xs text-graphite">{detail}</span> : null}
      </span>
    </span>
  );
}
