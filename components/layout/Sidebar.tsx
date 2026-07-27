"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui";
import { ChevronDownIcon, LogoutIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { navigationItems, navigationSections } from "@/lib/navigation";
import type { Usuario } from "@/types/auth";
import type { NavItem } from "@/types/navigation";

type SidebarProps = {
  usuario: Usuario | null;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  mobile?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

function filterItems(items: NavItem[], role: Usuario["rol"] | null): NavItem[] {
  if (!role) {
    return [];
  }

  return items
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children ? filterItems(item.children, role) : undefined
    }))
    .filter((item) => !item.children || item.children.length > 0 || item.href);
}

function isActivePath(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavItemActive(pathname: string, item: NavItem) {
  if (!item.href) {
    return false;
  }

  if (item.exact) {
    return pathname === item.href;
  }

  return isActivePath(pathname, item.href);
}

function hasActiveItem(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => isNavItemActive(pathname, item) || (item.children ? hasActiveItem(pathname, item.children) : false));
}

type NavigationRowProps = {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  mobile: boolean;
  onClose?: () => void;
  level?: number;
  tone?: "default" | "ai-hub";
};

function NavigationRow({
  item,
  pathname,
  collapsed,
  mobile,
  onClose,
  level = 0,
  tone = "default"
}: NavigationRowProps) {
  const hasChildren = Boolean(item.children?.length);

  if (!item.href) {
    return null;
  }

  const isParentActive = hasChildren && item.children?.some((child) => isNavItemActive(pathname, child));
  const isActive = isNavItemActive(pathname, item) || isParentActive;

  return (
    <Link
      href={item.href}
      onClick={mobile ? onClose : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group mx-2 flex items-center gap-3 rounded-component px-3 py-2 no-underline transition-colors duration-fast ease-fast",
        "[&_svg]:h-5 [&_svg]:w-5",
        collapsed && "justify-center px-0",
        level > 0 && !collapsed && "ml-4 w-[calc(100%-1.75rem)]",
        tone === "ai-hub"
          ? isActive
            ? "border border-white/95 bg-[#A9DFF3]/95 text-[#334E68] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(56,189,248,0.12)] backdrop-blur-md"
            : "border border-white/90 bg-[#A9DFF3]/85 text-[#334E68] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_10px_rgba(56,189,248,0.08)] backdrop-blur-md hover:bg-[#BCEAF8]"
          : isActive
            ? "bg-white/80 text-carbon"
            : "hover:bg-white/70"
      )}
    >
      <span
        className={cn(
          "transition-colors duration-fast ease-fast",
          tone === "ai-hub"
            ? isActive
              ? "text-[#087EA4]"
              : "text-[#64748B] group-hover:text-[#164E63]"
            : isActive
              ? "text-signal"
              : "text-graphite group-hover:text-carbon",
          item.iconClassName
        )}
      >
        {item.icon}
      </span>
      {collapsed ? null : (
        <span
          className={cn(
            "text-sm font-label transition-colors duration-fast ease-fast",
            tone === "ai-hub"
              ? isActive
                ? "text-[#164E63]"
                : "text-[#334155] group-hover:text-[#164E63]"
              : isActive
                ? "text-signal"
                : "text-graphite group-hover:text-carbon"
          )}
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

type NavigationGroupProps = {
  groupKey: string;
  label: string;
  icon: ReactNode;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  mobile: boolean;
  onClose?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  tone?: "default" | "ai-hub";
  iconClassName?: string;
};

function NavigationGroup({
  groupKey,
  label,
  icon,
  items,
  pathname,
  collapsed,
  mobile,
  onClose,
  expanded,
  onToggleExpanded,
  tone = "default",
  iconClassName
}: NavigationGroupProps) {
  const isActive = hasActiveItem(pathname, items);
  const showChildren = !collapsed && expanded;

  return (
    <div>
      <button
        type="button"
        onClick={onToggleExpanded}
        title={collapsed ? label : undefined}
        aria-expanded={expanded}
        aria-controls={`${groupKey}-panel`}
        className={cn(
          "group mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-component px-3 py-2 text-left transition-colors duration-fast ease-fast",
          "[&_svg]:h-5 [&_svg]:w-5",
          tone === "ai-hub" && "[&_svg]:h-7 [&_svg]:w-7",
          collapsed && "justify-center px-0",
          tone === "ai-hub"
            ? isActive
              ? "border-2 border-[#E9FAFF]/95 bg-[radial-gradient(ellipse_at_center,rgba(174,232,249,0.98)_0%,rgba(93,194,230,0.96)_58%,rgba(48,168,214,0.98)_100%)] text-white shadow-[inset_0_2px_5px_rgba(255,255,255,0.72),inset_0_-3px_8px_rgba(14,116,144,0.2),0_0_0_3px_rgba(255,255,255,0.65),0_0_0_5px_rgba(125,211,252,0.45),0_8px_20px_rgba(56,189,248,0.2)] backdrop-blur-md hover:bg-[#83D5F0]"
              : "border-2 border-[#F3FCFF]/95 bg-[radial-gradient(ellipse_at_center,rgba(190,238,250,0.96)_0%,rgba(111,204,236,0.93)_58%,rgba(74,181,222,0.96)_100%)] text-white shadow-[inset_0_2px_5px_rgba(255,255,255,0.78),inset_0_-3px_8px_rgba(14,116,144,0.16),0_0_0_3px_rgba(255,255,255,0.7),0_0_0_5px_rgba(125,211,252,0.4),0_7px_18px_rgba(56,189,248,0.16)] backdrop-blur-md hover:bg-[#94DDF4]"
              : isActive
                ? "bg-white/80 text-signal"
              : "hover:bg-white/70"
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center transition-colors duration-fast ease-fast",
            iconClassName,
            tone === "ai-hub"
              ? "text-white"
              : isActive
                ? "text-carbon"
                : "text-graphite group-hover:text-carbon",
          )}
        >
          {icon}
        </span>
        {collapsed ? null : (
          <span
            className={cn(
              "text-sm font-label transition-colors duration-fast ease-fast",
            tone === "ai-hub"
              ? "text-[#087EA4]"
                : isActive
                  ? "text-signal"
                  : "text-graphite group-hover:text-carbon"
            )}
          >
            {label}
          </span>
        )}
        {!collapsed ? (
          <ChevronDownIcon
            className={cn(
              "ml-auto h-4 w-4 shrink-0 transition-transform duration-normal ease-normal",
              tone === "ai-hub" ? "text-[#087EA4]" : "text-graphite",
              expanded ? "rotate-180" : "rotate-0"
            )}
          />
        ) : null}
      </button>

      <div
        id={`${groupKey}-panel`}
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin] duration-normal ease-normal",
          showChildren ? "mt-1 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "mx-2 space-y-1 rounded-card px-2 py-2",
              tone === "ai-hub"
                ? "border border-[#76CFF0]/80 bg-[#DDF6FF]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_rgba(56,189,248,0.08)] backdrop-blur-md"
                : "border border-line-soft/80 bg-white/45"
            )}
          >
            {items.map((item) => (
              <NavigationRow
                key={item.href ?? item.label}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                mobile={mobile}
                onClose={onClose}
                level={1}
                tone={tone}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  usuario,
  isOpen = false,
  onClose,
  collapsed = false,
  mobile = false,
  onMouseEnter,
  onMouseLeave
}: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    "AI Hub": true,
    comercial: true,
    entrega: true,
    control: true
  });
  const visibleItems = useMemo(
    () => filterItems(navigationItems, usuario?.rol ?? null),
    [usuario?.rol]
  );
  const topLevelItems = visibleItems.filter((item) => item.section === "top-level");
  const displayName = usuario?.nombre ?? "";
  const displayRole = usuario?.rol ?? "";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/ai-hub")) {
      setExpandedParents((current) => ({ ...current, "AI Hub": true }));
    }
  }, [pathname]);

  useEffect(() => {
    const activeSection = navigationSections.find((section) =>
      visibleItems.some((item) => item.section === section.key && (isActivePath(pathname, item.href) || (item.children ? hasActiveItem(pathname, item.children) : false)))
    );

    if (activeSection) {
      setExpandedParents((current) => ({ ...current, [activeSection.key]: true }));
    }
  }, [pathname, visibleItems]);

  async function handleLogout() {
    if (!usuario) {
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {mobile ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-40 bg-canvas/40 transition-opacity duration-fast ease-fast md:hidden",
            isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
        />
      ) : null}

      <aside
        className={cn(
          "flex h-screen flex-col bg-canvas transition-[width] duration-normal ease-normal",
          collapsed ? "w-[76px]" : "w-[220px]",
          "md:sticky md:top-0",
          mobile
            ? "fixed inset-y-0 left-0 z-50 transition-transform duration-normal ease-normal md:hidden"
            : "hidden md:flex",
          mobile && (isOpen ? "translate-x-0" : "-translate-x-full")
        )}
        onMouseEnter={mobile ? undefined : onMouseEnter}
        onMouseLeave={mobile ? undefined : onMouseLeave}
      >
        <div className={cn("flex h-16 items-center border-b border-line-soft", collapsed ? "justify-center px-2" : "px-5")}>{collapsed ? (
          <div className="relative h-9 w-9 shrink-0">
            <Image
              src="/Favicon_Blyndtek.svg"
              alt="Blyndtek OS"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>
        ) : (
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek OS"
            width={132}
            height={28}
            className="h-7 w-[132px] max-w-none shrink-0"
            priority
          />
        )}</div>

        <nav className="flex-1 overflow-y-auto py-2">
          {topLevelItems.length > 0 ? (
            <div className="space-y-1">
              {topLevelItems.map((item) => (
                item.children?.length ? (
                  <NavigationGroup
                    key={item.label}
                    groupKey={item.label}
                    label={item.label}
                    icon={item.icon}
                    items={item.children}
                    pathname={pathname}
                    collapsed={collapsed}
                    mobile={mobile}
                    onClose={onClose}
                    expanded={expandedParents[item.label] ?? false}
                    onToggleExpanded={() =>
                      setExpandedParents((current) => ({
                        ...current,
                        [item.label]: !current[item.label]
                      }))
                    }
                    tone="ai-hub"
                    iconClassName={item.iconClassName}
                  />
                ) : (
                  <NavigationRow
                    key={item.href ?? item.label}
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    mobile={mobile}
                    onClose={onClose}
                  />
                )
              ))}
            </div>
          ) : null}

          {navigationSections.map((section, index) => {
            const sectionItems = visibleItems.filter((item) => item.section === section.key);

            if (sectionItems.length === 0) {
              return null;
            }

            return (
              <div key={section.key}>
                {!collapsed ? <div className={topLevelItems.length > 0 || index > 0 ? "pt-3" : "pt-1"} /> : null}
                <NavigationGroup
                  groupKey={section.key}
                  label={section.label}
                  icon={section.icon}
                  items={sectionItems}
                  pathname={pathname}
                  collapsed={collapsed}
                  mobile={mobile}
                  onClose={onClose}
                  expanded={expandedParents[section.key] ?? true}
                  onToggleExpanded={() =>
                    setExpandedParents((current) => ({
                      ...current,
                      [section.key]: !current[section.key]
                    }))
                  }
                />
              </div>
            );
          })}
        </nav>

        <div ref={menuRef} className={cn("relative border-t border-line-soft py-3", collapsed ? "px-2" : "px-3")}>
          {collapsed ? (
            <Link href="/perfil" title={displayName || "Perfil"} className="flex justify-center rounded-md p-1.5 transition-colors duration-fast ease-fast hover:bg-white/70">
              <UserAvatar name={usuario?.nombre ?? null} fotoUrl={usuario?.foto_url ?? null} size="sm" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-fast ease-fast hover:bg-white/70"
            >
              <UserAvatar name={usuario?.nombre ?? null} fotoUrl={usuario?.foto_url ?? null} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-label text-carbon">{displayName}</p>
                <p className="text-xs text-graphite">{displayRole}</p>
              </div>
            </button>
          )}

          {menuOpen ? (
            <div
              className={cn(
                "absolute bottom-full z-50 mb-2 overflow-hidden rounded-card border border-line-soft bg-white shadow-modal",
                collapsed ? "left-2 right-2" : "left-3 right-3"
              )}
            >
              <div className="border-b border-line-soft px-3 py-2">
                <p className="truncate text-sm font-label text-carbon">{displayName}</p>
                <p className="text-xs text-graphite">{displayRole}</p>
              </div>
              <Link
                href="/perfil"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
              >
                Configuración de perfil
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleLogout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
              >
                <LogoutIcon />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
