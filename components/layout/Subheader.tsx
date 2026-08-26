"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { navigationItems, navigationSections } from "@/lib/navigation";
import type { NavItem } from "@/types/navigation";
import type { NavegacionSeccionKey } from "@/types/navegacion";
import type { Usuario } from "@/types/auth";

type SubheaderProps = { usuario: Usuario | null };

function isActivePath(pathname: string, href?: string, exact = false) {
  if (!href) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function filterItems(items: NavItem[], role: Usuario["rol"] | null): NavItem[] {
  if (!role) return [];
  return items
    .filter((item) => item.roles.includes(role))
    .map((item) => ({ ...item, children: item.children ? filterItems(item.children, role) : undefined }))
    .filter((item) => Boolean(item.href) || Boolean(item.children?.length));
}

function activeContext(pathname: string, items: NavItem[], hidden: NavegacionSeccionKey[], focusActive: boolean) {
  const topLevel = items.find((item) => item.section === "top-level" && item.children?.length && (isActivePath(pathname, item.href, item.exact) || item.children.some((child) => child.children?.some((nested) => isActivePath(pathname, nested.href, nested.exact)) || isActivePath(pathname, child.href, child.exact))));
  if (topLevel) return { label: topLevel.label, icon: topLevel.icon, items: topLevel.children ?? [] };

  const section = navigationSections.find((candidate) => {
    if (focusActive && hidden.includes(candidate.key)) return false;
    return items.some((item) => item.section === candidate.key && isActivePath(pathname, item.href, item.exact));
  });
  if (!section) return null;
  return { label: section.label, icon: section.icon, items: items.filter((item) => item.section === section.key) };
}

function SubheaderItem({ item, pathname, depth = 0 }: { item: NavItem; pathname: string; depth?: number }) {
  const hasChildren = Boolean(item.children?.length);
  const active = isActivePath(pathname, item.href, item.exact) || item.children?.some((child) => isActivePath(pathname, child.href, child.exact) || child.children?.some((nested) => isActivePath(pathname, nested.href, nested.exact)));

  return (
    <div className={cn("flex items-center gap-1", depth > 0 && "ml-2")}> 
      {item.href ? (
          <Link href={item.href} className={cn("flex items-center gap-2 rounded-component px-3 py-2 text-sm font-label transition-colors duration-fast ease-fast", active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
          <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">{item.icon}</span><span>{item.label}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 text-sm font-label text-white/55"><span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">{item.icon}</span><span>{item.label}</span></div>
      )}
      {hasChildren ? <div className="flex items-center border-l border-white/15 pl-1">{item.children?.map((child) => <SubheaderItem key={child.href ?? child.label} item={child} pathname={pathname} depth={depth + 1} />)}</div> : null}
    </div>
  );
}

export function Subheader({ usuario }: SubheaderProps) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(true);
  const items = useMemo(() => filterItems(navigationItems, usuario?.rol ?? null), [usuario?.rol]);
  const context = activeContext(pathname, items, [], false);

  useEffect(() => {
    const stored = window.localStorage.getItem("blyndtek-subheader-open");
    if (stored !== null) setOpen(stored === "true");
  }, []);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      window.localStorage.setItem("blyndtek-subheader-open", String(next));
      return next;
    });
  }

  if (!context) return null;

  return (
    <div className={cn("relative z-20 hidden shrink-0 overflow-visible bg-signal text-white shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition-[max-height,opacity] duration-normal ease-normal md:block", open ? "max-h-32 opacity-100" : "max-h-0 opacity-100")} aria-label={`Subnavegación de ${context.label}`}>
      <div className={cn("flex min-h-16 items-center gap-6 px-6 py-2 transition-[transform,opacity] duration-normal ease-normal", open ? "translate-y-0 opacity-100" : "-translate-y-3 pointer-events-none opacity-0")}>
        <div className="flex shrink-0 items-center gap-2 border-r border-white/15 pr-6"><span className="[&_svg]:h-5 [&_svg]:w-5">{context.icon}</span><span className="text-sm font-label text-white">{context.label}</span></div>
        <nav className="flex min-w-0 flex-wrap items-center gap-1">{context.items.map((item) => <SubheaderItem key={item.href ?? item.label} item={item} pathname={pathname} />)}</nav>
        <button type="button" onClick={toggle} aria-label="Cerrar subnavegación" title="Cerrar subnavegación" className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-component text-white/75 transition-colors duration-fast ease-fast hover:bg-white/10 hover:text-white"><ArrowLeftIcon size={16} /></button>
      </div>
      <button type="button" onClick={toggle} aria-label="Abrir subnavegación" title="Abrir subnavegación" className={cn("absolute left-3 top-0 z-40 flex h-8 w-9 items-center justify-center rounded-b-component bg-signal text-white shadow-md transition-[opacity,transform] duration-normal ease-normal hover:bg-signal-hover", open ? "pointer-events-none -translate-y-2 opacity-0" : "translate-y-0 opacity-100")}><ArrowRightIcon size={16} /></button>
    </div>
  );
}
