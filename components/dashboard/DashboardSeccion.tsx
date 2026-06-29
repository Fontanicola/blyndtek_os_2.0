"use client";

import type { ReactNode } from "react";

type DashboardSeccionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardSeccion({ title, description, children, className }: DashboardSeccionProps) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-label uppercase tracking-[0.12em] text-graphite">{title}</h2>
          {description ? <p className="mt-1 text-sm text-graphite">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

