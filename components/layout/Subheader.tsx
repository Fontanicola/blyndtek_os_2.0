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
          <Link href={item.href} className={cn("flex items-center gap-2 rounded-component px-3 py-2 text-sm font-label transition-colors duration-fast ease-fast", active ? "bg-white/80 text-carbon" : "text-graphite hover:bg-white/70 hover:text-carbon")}>
          <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">{item.icon}</span><span>{item.label}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 text-sm font-label text-graphite"><span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">{item.icon}</span><span>{item.label}</span></div>
      )}
      {hasChildren ? <div className="flex items-center border-l border-line-soft pl-1">{item.children?.map((child) => <SubheaderItem key={child.href ?? child.label} item={child} pathname={pathname} depth={depth + 1} />)}</div> : null}
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
    <div className={cn("relative z-20 hidden shrink-0 overflow-visible border-b border-line-soft bg-canvas text-graphite shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-[max-height,opacity] duration-normal ease-normal md:block", open ? "max-h-16 opacity-100" : "max-h-0 opacity-100")} aria-label={`Subnavegación de ${context.label}`}>
      <div className={cn("flex min-h-12 items-center gap-3 px-3 py-1 transition-[transform,opacity] duration-normal ease-normal", open ? "translate-y-0 opacity-100" : "-translate-y-3 pointer-events-none opacity-0")}>
        <button type="button" onClick={toggle} aria-label="Cerrar subnavegación" title="Cerrar subnavegación" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-white/70 hover:text-carbon"><ArrowLeftIcon size={16} /></button>
        <div className="flex shrink-0 items-center gap-2 border-r border-line-soft pr-3"><span className="[&_svg]:h-4 [&_svg]:w-4">{context.icon}</span><span className="text-xs font-label text-carbon">{context.label}</span></div>
        <nav className="flex min-w-0 flex-wrap items-center gap-1">{context.items.map((item) => <SubheaderItem key={item.href ?? item.label} item={item} pathname={pathname} />)}</nav>
      </div>
      <button type="button" onClick={toggle} aria-label="Abrir subnavegación" title="Abrir subnavegación" className={cn("absolute left-0 top-0 z-40 flex h-8 w-9 items-center justify-center rounded-br-component bg-canvas text-graphite shadow-md transition-[opacity,transform] duration-normal ease-normal hover:bg-white hover:text-carbon", open ? "pointer-events-none -translate-x-2 opacity-0" : "translate-x-0 opacity-100")}><ArrowRightIcon size={16} /></button>
    </div>
  );
}
